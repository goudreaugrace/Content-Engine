/**
 * Lightweight similarity search over the article corpus. Used by the new-article
 * form (Phase B) to surface "looks like an existing article" before submission,
 * cutting duplicate KAs at the source.
 *
 * Approach: TF-IDF cosine similarity over `title + summary + body[:1000]`.
 * Country overlap is a multiplicative boost — articles that share a country
 * with the query rank higher than otherwise-equal matches.
 *
 * Why TF-IDF over embeddings? POC-scale corpus (<100 docs) doesn't justify an
 * extra Claude/OpenAI call per query, and TF-IDF is good enough at catching
 * the common duplicate cases ("how to expense report" vs "how to file expense
 * report"). If recall becomes the bottleneck, swap `tokenize` + `vectorize`
 * for an embedding call — the rest of the API is shape-compatible.
 */

export type SimilarityCandidate = {
  /** Any object with an id, title, body, and country tag list. */
  id: string;
  title: string;
  body: string;
  countries: string[];
};

export type SimilarityMatch<T extends SimilarityCandidate = SimilarityCandidate> = {
  item: T;
  /** Cosine similarity in [0, 1]. Country overlap multiplies this up to ~1.25× before clamp. */
  score: number;
  /** Country codes the query and the match share. Useful for the UI to explain the score. */
  sharedCountries: string[];
};

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","for","of","to","in","on",
  "at","by","with","from","as","is","are","was","were","be","been","being","do",
  "does","did","done","have","has","had","this","that","these","those","it","its",
  "i","you","he","she","we","they","them","their","my","your","our","not","no",
  "so","than","can","will","just","when","where","what","which","who","whom",
  "how","why","there","here","into","over","under","about","also","more","most",
  "some","any","all","each","every","other","such","up","down","out","off","again",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics so "cómo" matches "como"
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Build a term-frequency map for a single document.
 */
function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const w of tokens) tf.set(w, (tf.get(w) ?? 0) + 1);
  return tf;
}

/**
 * Build inverse-document-frequency map across the corpus. log((N+1)/(df+1)) + 1
 * — the +1 smoothing prevents idf=0 for ubiquitous terms and avoids /0.
 */
function buildIdf(docs: Map<string, number>[]): Map<string, number> {
  const idf = new Map<string, number>();
  const N = docs.length;
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of doc.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  }
  return idf;
}

function dot(a: Map<string, number>, b: Map<string, number>): number {
  let sum = 0;
  // iterate the smaller map for fewer lookups
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [term, va] of small) {
    const vb = big.get(term);
    if (vb !== undefined) sum += va * vb;
  }
  return sum;
}

function magnitude(v: Map<string, number>): number {
  let s = 0;
  for (const x of v.values()) s += x * x;
  return Math.sqrt(s);
}

function docText(c: SimilarityCandidate): string {
  // Body is potentially large; cap to first ~1000 chars for the TF-IDF input.
  // Most duplicate signal lives in title + summary anyway.
  return `${c.title}\n${c.body.slice(0, 1000)}`;
}

export type FindSimilarOptions = {
  /** Maximum results to return. Default 5. */
  limit?: number;
  /** Minimum cosine score before country boost. Default 0.18 — tuned for the seed corpus. */
  threshold?: number;
};

/**
 * Find the top-N most similar candidates to the query. Returns descending by score.
 * Candidates with score below `threshold` (after country boost) are excluded.
 */
export function findSimilar<T extends SimilarityCandidate>(
  query: { title: string; summary: string; countries: string[] },
  corpus: T[],
  opts: FindSimilarOptions = {},
): SimilarityMatch<T>[] {
  if (corpus.length === 0) return [];
  const limit = opts.limit ?? 5;
  const threshold = opts.threshold ?? 0.18;

  // Build TF maps for the query and every corpus document.
  const queryTokens = tokenize(`${query.title}\n${query.summary}`);
  if (queryTokens.length === 0) return [];
  const queryTf = termFreq(queryTokens);
  const docTfs = corpus.map((c) => termFreq(tokenize(docText(c))));

  // IDF is computed over corpus + query so query-only terms don't get NaN.
  const idf = buildIdf([queryTf, ...docTfs]);

  // Convert TF maps to TF-IDF weight maps.
  const weight = (tf: Map<string, number>): Map<string, number> => {
    const w = new Map<string, number>();
    for (const [term, freq] of tf) {
      const i = idf.get(term) ?? 0;
      w.set(term, freq * i);
    }
    return w;
  };
  const qWeight = weight(queryTf);
  const qMag = magnitude(qWeight);
  if (qMag === 0) return [];

  const querySetCountries = new Set(
    query.countries.map((c) => c.toUpperCase()),
  );

  const matches: SimilarityMatch<T>[] = [];
  for (let i = 0; i < corpus.length; i++) {
    const dWeight = weight(docTfs[i]);
    const dMag = magnitude(dWeight);
    if (dMag === 0) continue;

    const cosine = dot(qWeight, dWeight) / (qMag * dMag);

    // Country boost: 1.0 baseline + up to 0.25 for full overlap. Clamp final
    // score at 1.0 so the consumer can treat it as a normalized signal.
    const shared = corpus[i].countries.filter((c) =>
      querySetCountries.has(c.toUpperCase()),
    );
    const boost =
      query.countries.length > 0
        ? 1 + 0.25 * (shared.length / query.countries.length)
        : 1;
    const score = Math.min(1, cosine * boost);

    if (score >= threshold) {
      matches.push({ item: corpus[i], score, sharedCountries: shared });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}
