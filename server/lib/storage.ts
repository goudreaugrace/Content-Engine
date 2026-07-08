import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function readJsonOr<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (e: any) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  // Atomic write: write to temp file then rename. Prevents partial reads.
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

// --- Per-file mutex so concurrent upserts don't clobber each other ---
const locks = new Map<string, Promise<void>>();
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  locks.set(
    key,
    prev.then(() => next),
  );
  try {
    await prev;
    return await fn();
  } finally {
    release();
    // Clean up if no one chained after us
    if (locks.get(key) === prev.then(() => next)) locks.delete(key);
  }
}

// ---- Path helpers ----
const paths = {
  jobs: path.join(DATA_DIR, "jobs.json"),
  articles: path.join(DATA_DIR, "articles.json"),
  emails: path.join(DATA_DIR, "emails.json"),
  marketProfile: (id: string) => path.join(DATA_DIR, "market-profiles", `${id}.json`),
  sectorProfile: (id: string) => path.join(DATA_DIR, "sector-profiles", `${id}.json`),
  deexRules: path.join(DATA_DIR, "deex-rules.json"),
  countryCatalog: path.join(DATA_DIR, "country-catalog.json"),
  publishedArticles: path.join(DATA_DIR, "published-articles.json"),
};

/**
 * Backward-compat shim. After Phase A, Articles must carry `countries: string[]`
 * and `seo: ArticleSEO`. Older seed entries written before the migration may
 * be missing those fields; this pass fills them with safe defaults at read
 * time so downstream code can assume the new shape.
 *
 * Defaults are deliberately empty (not heuristic-derived), so the article
 * detail UI can show "—" rather than fabricated data. A separate seed-data
 * backfill (task #57) writes real values to disk for the 16 demo articles.
 */
function withArticleDefaults<T>(raw: T): T {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as any;
  if (!Array.isArray(obj.countries)) obj.countries = [];
  if (!obj.seo || typeof obj.seo !== "object") {
    obj.seo = { title: "", metaDescription: "", keywords: [] };
  } else {
    if (typeof obj.seo.title !== "string") obj.seo.title = "";
    if (typeof obj.seo.metaDescription !== "string") obj.seo.metaDescription = "";
    if (!Array.isArray(obj.seo.keywords)) obj.seo.keywords = [];
  }
  return obj as T;
}

type CollectionName = "jobs" | "articles" | "emails" | "publishedArticles";

// ---- Generic accessors for arrays-of-records ----
export async function loadAll<T>(file: CollectionName): Promise<T[]> {
  const all = await readJsonOr<T[]>(paths[file], []);
  if (file === "articles") {
    return all.map((a) => withArticleDefaults(a));
  }
  return all;
}

export async function saveAll<T>(file: CollectionName, data: T[]): Promise<void> {
  await writeJson(paths[file], data);
}

export async function loadById<T extends { id: string }>(
  file: CollectionName,
  id: string,
): Promise<T | undefined> {
  const all = await loadAll<T>(file);
  return all.find((x) => x.id === id);
}

export async function upsert<T extends { id: string }>(
  file: CollectionName,
  item: T,
): Promise<T> {
  return withLock(file, async () => {
    const all = await loadAll<T>(file);
    const idx = all.findIndex((x) => x.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.unshift(item);
    await saveAll(file, all);
    return item;
  });
}

/** Atomic read-modify-write — use when the new value depends on the current one. */
export async function mutate<T extends { id: string }>(
  file: CollectionName,
  id: string,
  patch: (current: T) => T,
): Promise<T> {
  return withLock(file, async () => {
    const all = await loadAll<T>(file);
    const idx = all.findIndex((x) => x.id === id);
    if (idx < 0) throw new Error(`${file}/${id} not found`);
    all[idx] = patch(all[idx]);
    await saveAll(file, all);
    return all[idx];
  });
}

/** Delete by id. Returns true if a record was removed. */
export async function remove(
  file: CollectionName,
  id: string,
): Promise<boolean> {
  return withLock(file, async () => {
    const all = await loadAll<{ id: string }>(file);
    const idx = all.findIndex((x) => x.id === id);
    if (idx < 0) return false;
    all.splice(idx, 1);
    await saveAll(file, all);
    return true;
  });
}

// ---- Country catalog ----
import type { AudienceProfile, MarketProfile, SectorProfile, DEExRules, Country } from "./types";

export async function loadCountryCatalog(): Promise<Country[]> {
  // Re-read on every call. The catalog is ~30 entries and reads only happen
  // on the new-article form load + on POST /api/jobs validation. Caching it
  // here caused a startup race where an empty-fallback got cached before the
  // file was first written; cost of skipping the cache is negligible.
  return readJsonOr<Country[]>(paths.countryCatalog, []);
}

// ---- Market profiles ----

export async function loadMarketProfile(id: string): Promise<MarketProfile | null> {
  return readJsonOr<MarketProfile | null>(paths.marketProfile(id), null);
}

export const KNOWN_MARKET_IDS = ["us", "mx", "br", "uk", "in"] as const;

export async function loadAllMarketProfiles(): Promise<MarketProfile[]> {
  const profiles = await Promise.all(KNOWN_MARKET_IDS.map((id) => loadMarketProfile(id)));
  return profiles.filter((p): p is MarketProfile => p !== null);
}

export async function saveMarketProfile(profile: MarketProfile): Promise<MarketProfile> {
  return withLock(`market-${profile.id}`, async () => {
    await writeJson(paths.marketProfile(profile.id), profile);
    return profile;
  });
}

// ---- Sector profiles ----

/** Sector ids seeded in server/data/sector-profiles/. The list is stable
 *  enough to hardcode; use loadAllSectorProfiles() from route handlers so
 *  a missing file doesn't crash the request. */
export const KNOWN_SECTOR_IDS = [
  "global",
  "pfna",
  "pbna",
  "latam",
  "europe",
  "amesa",
  "apac",
] as const;

export async function loadSectorProfile(
  id: string,
): Promise<SectorProfile | null> {
  return readJsonOr<SectorProfile | null>(paths.sectorProfile(id), null);
}

export async function loadAllSectorProfiles(): Promise<SectorProfile[]> {
  const profiles = await Promise.all(
    KNOWN_SECTOR_IDS.map((id) => loadSectorProfile(id)),
  );
  return profiles.filter((p): p is SectorProfile => p !== null);
}

export async function saveSectorProfile(
  profile: SectorProfile,
): Promise<SectorProfile> {
  return withLock(`sector-${profile.id}`, async () => {
    await writeJson(paths.sectorProfile(profile.id), profile);
    return profile;
  });
}

// ---- DEEx rules ----
export async function loadDEExRules(): Promise<DEExRules | null> {
  return readJsonOr<DEExRules | null>(paths.deexRules, null);
}

// ---- Audience profiles ----
export const KNOWN_AUDIENCE_IDS = [
  "all",
  "leaders",
  "sales",
  "merchandisers",
  "plant",
  "warehouse",
  "drivers",
] as const;

const audienceProfilePath = (id: string) =>
  path.join(DATA_DIR, "audience-profiles", `${id}.json`);

export async function loadAudienceProfile(
  id: string,
): Promise<AudienceProfile | null> {
  return readJsonOr<AudienceProfile | null>(audienceProfilePath(id), null);
}

export async function loadAllAudienceProfiles(): Promise<AudienceProfile[]> {
  const profiles = await Promise.all(
    KNOWN_AUDIENCE_IDS.map((id) => loadAudienceProfile(id)),
  );
  return profiles.filter((p): p is AudienceProfile => p !== null);
}

export async function saveAudienceProfile(
  profile: AudienceProfile,
): Promise<AudienceProfile> {
  return withLock(`audience-${profile.id}`, async () => {
    await writeJson(audienceProfilePath(profile.id), profile);
    return profile;
  });
}
