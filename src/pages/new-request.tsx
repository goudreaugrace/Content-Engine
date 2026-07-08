import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  Chip,
  Checkbox,
  ListItemText,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import PublicIcon from "@mui/icons-material/PublicOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import LinkIcon from "@mui/icons-material/Link";
import {
  api,
  currentUser,
  type AudienceProfile,
  type ContentType,
  type Country,
  type MarketProfile,
  type SectorProfile,
  type SimilarMatch,
} from "../lib/api";

// ────────────────────────────────────────────────────────────
// Static reference data
// ────────────────────────────────────────────────────────────
// Phase P2.1 — content-type cards. Each card has a one-line description plus
// a real PepsiCo example so the writer can pattern-match what they're trying
// to make to the right type without guessing.
const contentTypes = [
  {
    value: "FAQ",
    label: "FAQ",
    description: "A short answer to a common question.",
    example: "e.g. 'How do I enroll in the wellness program?'",
  },
  {
    value: "Policy",
    label: "Policy",
    description: "Official rules + scope + effective date.",
    example: "e.g. 'Remote work policy — North America 2026'",
  },
  {
    value: "How-To",
    label: "How-to",
    description: "Step-by-step instructions to complete a task.",
    example: "e.g. 'How to submit an expense report'",
  },
  {
    value: "Topic Page",
    label: "Topic page",
    description: "Broad hub or overview, often linking to related articles.",
    example: "e.g. 'New parent leave benefits hub'",
  },
] as const;

// Static label lookup for markets so we don't need to wait on the
// market-profile fetch to render chips in the picker. Kept as a
// fallback / display-only reference; the picker itself is driven by
// the sector cascade from marketProfiles.
const MARKET_LABELS: Record<string, { label: string; code: string }> = {
  us: { label: "United States", code: "en-US" },
  mx: { label: "Mexico", code: "es-MX" },
  br: { label: "Brazil", code: "pt-BR" },
  uk: { label: "United Kingdom", code: "en-GB" },
  in: { label: "India", code: "en-IN" },
  global: { label: "Global (corporate)", code: "all" },
};

// Wizard step config — labels for the stepper across the top, plus a stable
// index reference. Three steps: basics, content, SEO & submit.
const STEP_LABELS = ["Basics", "Content", "SEO & submit"] as const;
type StepIndex = 0 | 1 | 2;

// ────────────────────────────────────────────────────────────
// SEO suggestion heuristics
// ────────────────────────────────────────────────────────────
/**
 * Most authors don't know what to write in the SEO fields, so step 3
 * pre-fills these with sensible suggestions the user can accept verbatim or
 * edit. Heuristic — no API call — so suggestions appear instantly.
 *
 * Patterns:
 *   - Title: start with the article title; if too short, append the content
 *     type and "guide"; if too long, truncate at a word boundary near 57.
 *   - Meta: take the brief; pad with content-type framing if too short; trim
 *     to the last sentence boundary inside 158 if too long.
 *   - Keywords: longest 4–6 non-stopword tokens pulled from title + brief.
 */
type SeoSuggestionInput = {
  title: string;
  summary: string;
  contentType: ContentType;
  audienceLabels: string[];
};

function suggestSeoTitle(input: SeoSuggestionInput): string {
  const base = input.title.trim();
  if (!base) return "";
  if (base.length >= 30 && base.length <= 60) return base;

  // Too short — add a tail that anchors content type for findability.
  if (base.length < 30) {
    const suffix =
      input.contentType === "FAQ"
        ? " — answers & FAQ"
        : input.contentType === "Policy"
          ? " — policy overview"
          : input.contentType === "How-To"
            ? " — step-by-step guide"
            : " — topic guide";
    const candidate = base + suffix;
    if (candidate.length <= 60) return candidate;
    return candidate.slice(0, 60).replace(/\s+\S*$/, "").trim();
  }

  // Too long — cut at last word boundary that fits.
  return base.slice(0, 60).replace(/\s+\S*$/, "").trim();
}

function suggestMetaDescription(input: SeoSuggestionInput): string {
  const base = input.summary.trim();
  const audience = input.audienceLabels.join(", ");
  const verb =
    input.contentType === "FAQ"
      ? "Answers"
      : input.contentType === "Policy"
        ? "Policy details"
        : input.contentType === "How-To"
          ? "Step-by-step"
          : "Overview";
  const audienceTail = audience ? ` Written for ${audience}.` : "";

  // Pad if too short.
  if (base.length < 140) {
    const padded =
      base.length === 0
        ? `${verb} for ${input.title.trim() || "this topic"}.${audienceTail}`
        : `${verb}: ${base}${base.endsWith(".") ? "" : "."}${audienceTail}`;
    if (padded.length >= 140 && padded.length <= 160) return padded;
    if (padded.length > 160) return trimToSentence(padded, 158);
    // Still too short — append a generic close.
    return (
      padded +
      " Includes context, common pitfalls, and where to get help."
    ).slice(0, 160);
  }

  // Trim if too long.
  if (base.length > 160) return trimToSentence(base, 158);
  return base;
}

function trimToSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastDot = cut.lastIndexOf(". ");
  if (lastDot > max * 0.6) return cut.slice(0, lastDot + 1);
  // Fall back to word boundary.
  return cut.replace(/\s+\S*$/, "").trim() + "…";
}

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","to","in","on","at","by","for","with",
  "from","as","is","are","was","were","be","been","being","this","that","these",
  "those","it","its","i","you","he","she","we","they","them","their","my",
  "your","our","not","no","so","than","can","will","just","when","where","what",
  "which","who","how","why","there","here","into","over","under","about","also",
  "more","most","some","any","all","each","every","other","such","up","down",
  "out","off","again","do","does","did","done","have","has","had","new",
]);

function suggestKeywords(input: SeoSuggestionInput): string[] {
  const text = `${input.title} ${input.summary}`.toLowerCase();
  const tokens = text
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  // De-dupe preserving order, take top 5.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of tokens) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * Required H2 sections per content type. The form renders these as a checklist
 * so authors can see at a glance what the agent will be asked to produce, and
 * Phase C's rules engine validates the resulting article against the same list.
 */
const REQUIRED_SECTIONS: Record<ContentType, string[]> = {
  FAQ: ["Question", "Answer", "Related"],
  Policy: ["Overview", "Policy", "Effective date", "Contact"],
  "How-To": ["Overview", "Steps", "Troubleshooting"],
  "Topic Page": ["Overview", "Details", "Resources"],
};

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export default function NewRequest() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [form, setForm] = useState({
    title: "",
    contentType: "FAQ" as ContentType,
    // Sector is the corporate tier above market. Sector is single-select
    // and drives the market picker (cascade). Default PFNA matches the
    // default US market so the wizard opens with a valid state.
    sector: "pfna" as string,
    // Markets is multi-select, filtered to markets belonging to the
    // chosen sector. When sector === "global", this holds ["global"] and
    // the specific-market picker is hidden.
    markets: ["us"] as string[],
    audience: [] as string[],
    countries: [] as string[],
    summary: "",
    sourceText: "",
    files: [] as File[],
    seoTitle: "",
    metaDescription: "",
    keywords: [] as string[],
    // ── GEO (Generative Engine Optimization) ──
    // Optional at submission — these can also be filled later via the
    // article detail's Search & AI discovery panel. Pre-fill happens via
    // the agent during drafting; the wizard exposes the fields up front
    // so motivated authors can author-hint the agent.
    geoSummary: "",
    keyQuestions: [] as string[],
    entities: [] as string[],
    globalJustification: "",
  });
  const [keywordDraft, setKeywordDraft] = useState("");
  const [questionDraft, setQuestionDraft] = useState("");
  const [entityDraft, setEntityDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<AudienceProfile[]>([]);
  const [countryCatalog, setCountryCatalog] = useState<Country[]>([]);
  const [showAllCountries, setShowAllCountries] = useState(false);
  // Wizard step index (0-based). Stepper labels live in STEP_LABELS below.
  const [currentStep, setCurrentStep] = useState(0);

  /**
   * Tracks whether each SEO field is still showing an auto-generated
   * suggestion (true) or has been touched by the user (false). The first
   * time the user lands on step 3 with empty fields, we pre-fill all three
   * from suggestions and mark them as auto. The moment the user types into
   * a field, it flips to false and we never auto-regenerate that field
   * unless the user explicitly clicks "Regenerate".
   */
  const [seoAuto, setSeoAuto] = useState({
    title: true,
    meta: true,
    keywords: true,
  });
  const [globalConfirmOpen, setGlobalConfirmOpen] = useState(false);
  // The market the user *intends* to switch to once they confirm the Global gate.
  // We hold the change until the confirmation modal closes successfully.
  const [pendingMarket, setPendingMarket] = useState<string | null>(null);

  // Phase B — duplicate detection state.
  const [similarMatches, setSimilarMatches] = useState<SimilarMatch[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  // Persists across the user's session — they can dismiss the panel for the
  // current query, and we won't re-show until the title/summary changes.
  const [similarDismissed, setSimilarDismissed] = useState(false);
  // If the user explicitly picks "Mark as replacement," remember which article.
  // This stays in lockstep with the form, so changing the title doesn't clear it
  // (the user already made the decision); they can clear it manually.
  const [replacesArticle, setReplacesArticle] =
    useState<SimilarMatch | null>(null);

  const [marketProfiles, setMarketProfiles] = useState<MarketProfile[]>([]);
  const [sectorProfiles, setSectorProfiles] = useState<SectorProfile[]>([]);

  useEffect(() => {
    api
      .listAudiences()
      .then(setAudiences)
      .catch(() => setAudiences([]));
    api
      .listCountries()
      .then(setCountryCatalog)
      .catch(() => setCountryCatalog([]));
    api
      .listMarkets()
      .then(setMarketProfiles)
      .catch(() => setMarketProfiles([]));
    api
      .listSectors()
      .then(setSectorProfiles)
      .catch(() => setSectorProfiles([]));
  }, []);

  // Sector-driven derived state.
  const isGlobal = form.sector === "global";
  // Markets that belong to the currently-selected sector. The Markets
  // picker is populated from this list — cascading filter from the
  // sector choice.
  const marketsInSector = useMemo(
    () => marketProfiles.filter((m) => m.sectorId === form.sector),
    [marketProfiles, form.sector],
  );
  const singleMarket =
    !isGlobal && form.markets.length === 1 ? form.markets[0] : null;

  // Phase D — when the user picks exactly one specific market AND the country
  // picker is empty, seed it with that market's defaultCountries
  // (admin-configured). Multi-market or Global stays manual.
  useEffect(() => {
    if (form.countries.length > 0) return;
    if (!singleMarket) return;
    const profile = marketProfiles.find((p) => p.id === singleMarket);
    if (profile?.defaultCountries && profile.defaultCountries.length > 0) {
      setForm((f) => ({ ...f, countries: profile.defaultCountries! }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleMarket, marketProfiles]);

  // Phase P2.4 — audience defaults to "All employees" when exactly one
  // specific market is selected AND audience hasn't been chosen yet.
  // Removes one decision from the wizard's first step for the common case.
  // User can still override by tapping the audience selector.
  useEffect(() => {
    if (form.audience.length > 0) return;
    if (!singleMarket) return;
    const allEmployees = audiences.find((a) => a.id === "all");
    if (allEmployees) {
      setForm((f) => ({ ...f, audience: [allEmployees.label] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleMarket, audiences]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ───────────── Country filtering ─────────────
  // Default the country picker to the countries that map to the selected
  // market (e.g. US → US, CA). With Global or multi-market we show everything
  // — there's no single "default" to filter to.
  const visibleCountries = useMemo(() => {
    if (showAllCountries || !singleMarket) return countryCatalog;
    return countryCatalog.filter((c) => c.defaultMarketId === singleMarket);
  }, [countryCatalog, singleMarket, showAllCountries]);

  // When the (single) market changes, prune countries that no longer belong
  // to its default set. Skipped in multi-market / Global / "show all" modes.
  useEffect(() => {
    if (showAllCountries || !singleMarket) return;
    setForm((f) => ({
      ...f,
      countries: f.countries.filter(
        (code) =>
          countryCatalog.find((c) => c.code === code)?.defaultMarketId ===
          singleMarket,
      ),
    }));
    // We deliberately depend only on singleMarket — prune happens exactly
    // when the user switches to a different single market.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleMarket]);

  // Phase B — Debounced duplicate-detection lookup. Fires once the title and
  // summary together cross a usable length, with a 600ms debounce so we don't
  // hammer the server on every keystroke.
  useEffect(() => {
    const title = form.title.trim();
    const summary = form.summary.trim();
    const combinedLen = title.length + summary.length;
    if (combinedLen < 12) {
      setSimilarMatches([]);
      setSimilarLoading(false);
      return;
    }
    // The user dismissed the panel for this title — wait for it to change.
    if (similarDismissed) return;

    setSimilarLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await api.findSimilarArticles({
          title,
          summary,
          countries: form.countries,
        });
        setSimilarMatches(res.matches);
      } catch {
        // Silent: this is a hint, not blocking.
        setSimilarMatches([]);
      } finally {
        setSimilarLoading(false);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [form.title, form.summary, form.countries, similarDismissed]);

  // Any change to the title or summary re-opens the panel — the user's
  // earlier dismissal applied to a different query.
  useEffect(() => {
    setSimilarDismissed(false);
  }, [form.title, form.summary]);

  // ───────────── Progressive disclosure ─────────────
  // The SEO section unlocks once the author has picked at least one market
  // AND at least one audience — that's when SEO recommendations make sense.
  const seoUnlocked = form.markets.length > 0 && form.audience.length > 0;

  // Build the suggestion input from the current basics + content state.
  // Recomputes on every render — cheap, all-local string ops.
  const seoSuggestionInput: SeoSuggestionInput = {
    title: form.title,
    summary: form.summary,
    contentType: form.contentType,
    audienceLabels: form.audience,
  };

  /**
   * Generate fresh suggestions for any field that's still in "auto" mode.
   * Fields the user has touched are left alone. Called automatically when
   * the user lands on step 3 with empty fields, and by the manual
   * "Regenerate suggestions" button.
   */
  const populateSeoSuggestions = (options?: { force?: boolean }) => {
    setForm((f) => {
      const next = { ...f };
      if (options?.force || seoAuto.title) {
        next.seoTitle = suggestSeoTitle(seoSuggestionInput);
      }
      if (options?.force || seoAuto.meta) {
        next.metaDescription = suggestMetaDescription(seoSuggestionInput);
      }
      if (options?.force || seoAuto.keywords) {
        next.keywords = suggestKeywords(seoSuggestionInput);
      }
      return next;
    });
    if (options?.force) {
      // Force re-marks all fields as auto so subsequent edits trip the flag.
      setSeoAuto({ title: true, meta: true, keywords: true });
    }
  };

  /**
   * Auto-populate the first time the user lands on step 3 with all SEO
   * fields empty. After this, we don't auto-update unless they hit the
   * Regenerate button — once they've seen the suggestion, it's their copy.
   */
  useEffect(() => {
    if (currentStep !== 2) return;
    const allEmpty =
      !form.seoTitle.trim() &&
      !form.metaDescription.trim() &&
      form.keywords.length === 0;
    if (!allEmpty) return;
    if (!form.title.trim()) return;
    populateSeoSuggestions();
    // We only auto-populate ONCE per session per visit to step 3 with empty
    // fields. Dep array is intentionally narrow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ───────────── Live SEO hints ─────────────
  const seoTitleLen = form.seoTitle.trim().length;
  const seoTitleStatus: "empty" | "short" | "good" | "long" =
    seoTitleLen === 0
      ? "empty"
      : seoTitleLen < 30
        ? "short"
        : seoTitleLen > 60
          ? "long"
          : "good";
  const metaLen = form.metaDescription.trim().length;
  const metaStatus: "empty" | "short" | "good" | "long" =
    metaLen === 0
      ? "empty"
      : metaLen < 140
        ? "short"
        : metaLen > 160
          ? "long"
          : "good";

  // ───────────── Required-section checklist ─────────────
  const requiredForType = REQUIRED_SECTIONS[form.contentType];

  // ───────────── Per-step validation ─────────────
  // Each step has its own gate so the Next button is only enabled when the
  // current step's required fields are valid. The Submit button on the last
  // step requires ALL steps to be valid (defense against a previously-valid
  // step being mutated via the back nav and breaking).
  const step0Valid =
    !!form.title.trim() &&
    form.markets.length > 0 &&
    (!isGlobal || form.globalJustification.trim().length >= 10) &&
    form.audience.length > 0 &&
    form.countries.length > 0;

  const step1Valid =
    !!(form.summary.trim() || form.sourceText.trim());

  const step2Valid =
    seoTitleStatus === "good" &&
    metaStatus !== "empty" &&
    metaStatus !== "short";

  const stepValid = [step0Valid, step1Valid, step2Valid];
  const canAdvance = stepValid[currentStep];
  const canSubmit = step0Valid && step1Valid && step2Valid;

  const goNext = () => {
    if (currentStep < 2) setCurrentStep((s) => (s + 1) as StepIndex);
  };
  const goBack = () => {
    if (currentStep > 0) setCurrentStep((s) => (s - 1) as StepIndex);
  };
  /**
   * Stepper click handler. Lets the user jump back to any completed step or
   * forward into a step whose prerequisites are valid. Forward jumps to a
   * step whose earlier steps fail are blocked — keeps the wizard sequential
   * without becoming a hard rail.
   */
  const goToStep = (target: number) => {
    if (target === currentStep) return;
    if (target < currentStep) {
      setCurrentStep(target as StepIndex);
      return;
    }
    // Forward: require every step BEFORE the target to be valid.
    for (let i = 0; i < target; i++) {
      if (!stepValid[i]) return;
    }
    setCurrentStep(target as StepIndex);
  };

  // ───────────── Sector change handler ─────────────
  // Sector is the cascade parent. Switching sector resets `markets` to
  // the markets that belong to the new sector. Switching TO "global"
  // opens the justification gate; only on confirm do we finalize the
  // switch. Switching AWAY from "global" clears the justification.
  const handleSectorChange = (nextSector: string) => {
    if (nextSector === form.sector) return;
    if (nextSector === "global") {
      // Gate: require justification before flipping to Global sector.
      setPendingMarket("global");
      setGlobalConfirmOpen(true);
      return;
    }
    // Non-global: cascade markets to the sector's members.
    const kids = marketProfiles.filter((m) => m.sectorId === nextSector);
    const nextMarkets = kids.length > 0 ? [kids[0].id] : [];
    setForm((f) => ({
      ...f,
      sector: nextSector,
      markets: nextMarkets,
      globalJustification: "",
    }));
  };

  // ───────────── Market multi-select toggle (no global involved) ─────────────
  // Sector already scopes the visible markets. This handler just enforces
  // "keep at least one market selected."
  const handleMarketToggle = (id: string) => {
    setForm((f) => {
      const next = f.markets.includes(id)
        ? f.markets.filter((m) => m !== id)
        : [...f.markets, id];
      return { ...f, markets: next.length === 0 ? [id] : next };
    });
  };

  const confirmGlobal = () => {
    if (form.globalJustification.trim().length < 10) return;
    // Confirmed → set sector to global and mark markets as ["global"] so
    // downstream code recognizes the corporate-content case.
    setForm((f) => ({ ...f, sector: "global", markets: ["global"] }));
    setPendingMarket(null);
    setGlobalConfirmOpen(false);
  };

  const cancelGlobal = () => {
    setPendingMarket(null);
    setGlobalConfirmOpen(false);
    // Leave the existing sector + markets alone.
  };

  // ───────────── Keyword chip handlers ─────────────
  const addKeyword = () => {
    const k = keywordDraft.trim();
    if (!k) return;
    if (!form.keywords.includes(k)) {
      update("keywords", [...form.keywords, k]);
      setSeoAuto((s) => ({ ...s, keywords: false }));
    }
    setKeywordDraft("");
  };
  const removeKeyword = (k: string) => {
    update(
      "keywords",
      form.keywords.filter((x) => x !== k),
    );
    setSeoAuto((s) => ({ ...s, keywords: false }));
  };

  // ───────────── GEO chip handlers ─────────────
  const addQuestion = () => {
    const q = questionDraft.trim();
    if (!q) return;
    if (!form.keyQuestions.includes(q)) {
      update("keyQuestions", [...form.keyQuestions, q]);
    }
    setQuestionDraft("");
  };
  const removeQuestion = (q: string) =>
    update(
      "keyQuestions",
      form.keyQuestions.filter((x) => x !== q),
    );
  const addEntity = () => {
    const e = entityDraft.trim();
    if (!e) return;
    if (!form.entities.includes(e)) {
      update("entities", [...form.entities, e]);
    }
    setEntityDraft("");
  };
  const removeEntity = (e: string) =>
    update(
      "entities",
      form.entities.filter((x) => x !== e),
    );

  // ───────────── Submit ─────────────
  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Phase P1.3 — instead of throwing the writer back to a generic list,
      // capture the created job id and route them to the job-detail page,
      // which polls for the article and auto-redirects when it's ready.
      const created = await api.createJob({
        title: form.title.trim(),
        contentType: form.contentType,
        summary: form.summary.trim(),
        audience: form.audience
          .map((label) => {
            const a = audiences.find((o) => o.label === label);
            if (!a) return label;
            return [
              `${a.label} — ${a.summary}`,
              `Tone: ${a.toneOfVoice}`,
              `Reading context: ${a.readingContext}`,
              `Guidelines: ${a.contentGuidelines}`,
            ].join("\n");
          })
          .join("\n\n"),
        markets: form.markets,
        sectors: [form.sector],
        sourceText: form.sourceText.trim(),
        submittedBy: currentUser(),
        countries: form.countries,
        seo: {
          title: form.seoTitle.trim(),
          metaDescription: form.metaDescription.trim(),
          keywords: form.keywords,
          // GEO fields — all optional. Send only when populated so the
          // server payload stays terse for the common case.
          summary: form.geoSummary.trim() || undefined,
          keyQuestions:
            form.keyQuestions.length > 0 ? form.keyQuestions : undefined,
          entities: form.entities.length > 0 ? form.entities : undefined,
        },
        globalJustification: isGlobal
          ? form.globalJustification.trim()
          : undefined,
        replacesArticleId: replacesArticle?.id,
      });
      navigate(`/jobs/${created.id}?from=new`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setSubmitting(false);
    }
  };

  // ───────────── Render ─────────────
  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        New Article
      </Typography>
      <Typography
        color="text.secondary"
        sx={{ mt: 0.75, mb: 5, maxWidth: "60ch" }}
      >
        Tell the agent what to create. It drafts in the sector's corporate
        framing and the market's locale voice, checks DEEx guidelines, and runs
        SEO checks before the article appears for review.
      </Typography>

      {/* ─── Wizard stepper ─── */}
      {/* Three steps: Basics → Content → SEO & submit. Clicking a completed
          step jumps back; forward jumps allowed only when prior steps are
          valid (enforced in goToStep). */}
      <Stepper
        activeStep={currentStep}
        sx={{
          mb: 5,
          "& .MuiStepLabel-label": { fontSize: "0.875rem", fontWeight: 500 },
          "& .MuiStepLabel-root": { cursor: "pointer" },
        }}
      >
        {STEP_LABELS.map((label, i) => {
          const completed = i < currentStep && stepValid[i];
          return (
            <Step key={label} completed={completed}>
              <StepLabel onClick={() => goToStep(i)}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ─── Step 1: Basics ─── */}
      {currentStep === 0 && (
      <Stack spacing={3.5}>
        {/* ─────────── Title (with live SEO hint) ─────────── */}
        <Field
          label="Title"
          required
          hint="Phrase as a question or the specific problem the article solves. Titles that match how people search rank better."
        >
          <TextField
            fullWidth
            autoFocus
            placeholder="e.g. How do I refresh my driver login token?"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </Field>

        {/* Phase P2.1 — content-type card picker. Each card shows name +
            description + a PepsiCo-flavored example so the writer can
            recognize the right type without a tooltip dance. */}
        <Field label="Content type" required>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 1.5,
              mt: 0.5,
            }}
          >
            {contentTypes.map((c) => {
              const selected = form.contentType === c.value;
              return (
                <Box
                  key={c.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => update("contentType", c.value as ContentType)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      update("contentType", c.value as ContentType);
                    }
                  }}
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    cursor: "pointer",
                    border: `1px solid ${selected ? t.pepsiBlue : t.border}`,
                    bgcolor: selected ? t.pepsiBlueSubtle : t.surface,
                    transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                    "&:hover": {
                      borderColor: t.pepsiBlue,
                      bgcolor: selected ? t.pepsiBlueSubtle : t.surfaceContainerLow,
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      color: selected ? t.pepsiBlueStrong : t.ink,
                      mb: 0.5,
                    }}
                  >
                    {c.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: t.slate,
                      lineHeight: 1.45,
                      mb: 0.75,
                    }}
                  >
                    {c.description}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      color: t.granite,
                      fontStyle: "italic",
                      lineHeight: 1.4,
                    }}
                  >
                    {c.example}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Field>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}>
          {/* ─── Sector (cascade parent) ─── */}
          <Field
            label="Sector"
            required
            sx={{ flex: 1 }}
            hint={
              isGlobal
                ? "Corporate content — one version, no market-specific drafting."
                : "PepsiCo tier that owns this content. Sets the corporate framing."
            }
          >
            <TextField
              select
              fullWidth
              value={form.sector}
              onChange={(e) => handleSectorChange(e.target.value)}
              SelectProps={{
                MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
              }}
            >
              {sectorProfiles.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={{ py: 0.75 }}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    {s.id === "global" && (
                      <PublicIcon sx={{ fontSize: 16, color: t.ember }} />
                    )}
                    <Box>
                      <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
                        {s.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.6875rem",
                          color: t.granite,
                          fontFamily: theme.palette.fonts.mono,
                        }}
                      >
                        {s.id}
                      </Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Field>

          {/* ─── Markets (cascades from Sector) ─── */}
          {!isGlobal && (
            <Field
              label="Markets"
              sx={{ flex: 1 }}
              hint={
                marketsInSector.length === 0
                  ? "No markets assigned to this sector yet."
                  : "One or more markets inside this sector."
              }
            >
              <TextField
                select
                fullWidth
                value={form.markets}
                onChange={() => {}}
                disabled={marketsInSector.length === 0}
                SelectProps={{
                  multiple: true,
                  displayEmpty: true,
                  renderValue: (selected) => {
                    const vals = selected as string[];
                    if (vals.length === 0) {
                      return (
                        <Typography component="span" sx={{ color: t.granite }}>
                          Select markets…
                        </Typography>
                      );
                    }
                    return (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {vals.map((v) => {
                          const label =
                            marketProfiles.find((p) => p.id === v)?.name ??
                            MARKET_LABELS[v]?.label ??
                            v;
                          return <Chip key={v} label={label} size="small" />;
                        })}
                      </Box>
                    );
                  },
                  MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
                }}
              >
                {marketsInSector.map((m) => {
                  const checked = form.markets.includes(m.id);
                  return (
                    <MenuItem
                      key={m.id}
                      value={m.id}
                      sx={{ py: 0.5 }}
                      onClick={(e) => {
                        e.preventDefault();
                        handleMarketToggle(m.id);
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={checked}
                        sx={{ mr: 1, p: 0.5 }}
                      />
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ flex: 1 }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
                            {m.name}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.6875rem",
                              color: t.granite,
                              fontFamily: theme.palette.fonts.mono,
                            }}
                          >
                            {m.languageCode}
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  );
                })}
              </TextField>
            </Field>
          )}
        </Stack>

        {/* ─────────── Audience ─────────── */}
        <Field
          label="Audience"
          required
          hint="Who should read this? The agent uses each persona's tone, reading context, and search-intent profile to tailor the draft. Pick multiple if the article truly applies to several segments."
        >
          <TextField
            select
            fullWidth
            value={form.audience}
            onChange={(e) =>
              update(
                "audience",
                typeof e.target.value === "string"
                  ? e.target.value.split(",")
                  : (e.target.value as unknown as string[]),
              )
            }
            SelectProps={{
              multiple: true,
              displayEmpty: true,
              renderValue: (selected) => {
                const vals = selected as string[];
                if (vals.length === 0) {
                  return (
                    <Typography component="span" sx={{ color: t.granite }}>
                      Select audience…
                    </Typography>
                  );
                }
                return (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {vals.map((v) => (
                      <Chip key={v} label={v} size="small" />
                    ))}
                  </Box>
                );
              },
              MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
            }}
          >
            {audiences.map((opt) => (
              <MenuItem key={opt.id} value={opt.label} sx={{ py: 0.5 }}>
                <Checkbox
                  size="small"
                  checked={form.audience.includes(opt.label)}
                  sx={{ mr: 1, p: 0.5 }}
                />
                <ListItemText
                  primary={opt.label}
                  primaryTypographyProps={{ fontSize: "0.875rem" }}
                />
              </MenuItem>
            ))}
          </TextField>
        </Field>

        {/* ─────────── Countries ─────────── */}
        <Field
          label="Countries"
          required
          hint={
            isGlobal || !singleMarket
              ? "Pick every country this article actually applies to."
              : "Defaults to countries grouped under the selected market. Toggle 'Show all' to include others."
          }
        >
          <TextField
            select
            fullWidth
            value={form.countries}
            onChange={(e) =>
              update(
                "countries",
                typeof e.target.value === "string"
                  ? e.target.value.split(",")
                  : (e.target.value as unknown as string[]),
              )
            }
            SelectProps={{
              multiple: true,
              displayEmpty: true,
              renderValue: (selected) => {
                const codes = selected as string[];
                if (codes.length === 0) {
                  return (
                    <Typography component="span" sx={{ color: t.granite }}>
                      Select countries…
                    </Typography>
                  );
                }
                return (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {codes.map((c) => (
                      <Chip key={c} label={c} size="small" />
                    ))}
                  </Box>
                );
              },
              MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
            }}
          >
            {visibleCountries.map((c) => (
              <MenuItem key={c.code} value={c.code} sx={{ py: 0.5 }}>
                <Checkbox
                  size="small"
                  checked={form.countries.includes(c.code)}
                  sx={{ mr: 1, p: 0.5 }}
                />
                <ListItemText
                  primary={c.name}
                  secondary={c.code}
                  primaryTypographyProps={{ fontSize: "0.875rem" }}
                  secondaryTypographyProps={{
                    fontSize: "0.6875rem",
                    fontFamily: theme.palette.fonts.mono,
                  }}
                />
              </MenuItem>
            ))}
          </TextField>
          {/* "Show all countries" toggle only makes sense when filtering to
              a single market's defaults. Multi-market / Global already shows
              everything. */}
          {singleMarket && (
            <FormControlLabel
              sx={{ mt: 0.5, ml: -0.5 }}
              control={
                <Switch
                  size="small"
                  checked={showAllCountries}
                  onChange={(e) => setShowAllCountries(e.target.checked)}
                />
              }
              label={
                <Typography
                  sx={{ fontSize: "0.75rem", color: t.slate }}
                >
                  Show all countries
                </Typography>
              }
            />
          )}
        </Field>
      </Stack>
      )}

      {/* ─── Step 2: Content ─── */}
      {currentStep === 1 && (
      <Stack spacing={3.5}>
        {/* ─────────── Brief ─────────── */}
        <Field
          label="Brief"
          hint="The longer + more specific your brief, the closer the AI's draft will be. Aim for 3–5 sentences covering: what the article is about, who it's for, and the main steps or rules."
        >
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder={`e.g. How drivers refresh their login token when the route app shows "session expired".

Cover: which screens to tap, what to do if the refresh fails after 3 tries, and the on-call number for after-hours support.

Audience is route drivers in the US, often on a phone between stops.`}
            value={form.summary}
            onChange={(e) => update("summary", e.target.value)}
          />
        </Field>

        {/* ─────────── Phase B: duplicate-detection panel ─────────── */}
        {(similarLoading ||
          similarMatches.length > 0 ||
          replacesArticle) && (
          <Box
            sx={{
              p: 2,
              border: `1px solid ${t.pepsiBlue}`,
              borderRadius: 1.5,
              bgcolor: t.pepsiBlueSubtle + "40",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: replacesArticle ? 1 : similarMatches.length > 0 ? 1.5 : 0 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <LinkIcon sx={{ fontSize: 16, color: t.pepsiBlueStrong }} />
                <Typography
                  sx={{ fontSize: "0.8125rem", fontWeight: 600, color: t.pepsiBlueStrong }}
                >
                  {replacesArticle
                    ? "Replacing an existing article"
                    : similarLoading
                      ? "Checking for similar articles…"
                      : `Found ${similarMatches.length} similar article${similarMatches.length === 1 ? "" : "s"}`}
                </Typography>
                {similarLoading && (
                  <CircularProgress size={12} sx={{ color: t.pepsiBlue }} />
                )}
              </Stack>
              {!replacesArticle && similarMatches.length > 0 && (
                <Button
                  size="small"
                  onClick={() => setSimilarDismissed(true)}
                  sx={{ minHeight: 0, py: 0, fontSize: "0.6875rem", color: t.slate }}
                >
                  Dismiss
                </Button>
              )}
            </Stack>

            {replacesArticle ? (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: t.surface,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{ fontSize: "0.875rem", fontWeight: 500, color: t.ink }}
                    >
                      {replacesArticle.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.6875rem",
                        color: t.granite,
                        fontFamily: theme.palette.fonts.mono,
                        mt: 0.25,
                      }}
                    >
                      {replacesArticle.id} · {replacesArticle.market} ·{" "}
                      {replacesArticle.contentType}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => setReplacesArticle(null)}
                    startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                  >
                    Clear
                  </Button>
                </Stack>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: t.slate,
                    mt: 1,
                    lineHeight: 1.5,
                  }}
                >
                  When this submission is approved, it'll be linked to the
                  article above so reviewers know it's a deliberate replacement.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1}>
                {similarMatches.map((m) => (
                  <Box
                    key={m.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: t.surface,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            fontWeight: 500,
                            color: t.ink,
                            lineHeight: 1.35,
                          }}
                        >
                          {m.title}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mt: 0.5 }}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography
                            sx={{
                              fontSize: "0.6875rem",
                              color: t.granite,
                              fontFamily: theme.palette.fonts.mono,
                            }}
                          >
                            {m.id}
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.6875rem", color: t.slate }}
                          >
                            {m.market} · {m.contentType} · {m.status}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${Math.round(m.score * 100)}% match`}
                            sx={{
                              height: 18,
                              fontSize: "0.625rem",
                              bgcolor:
                                m.score > 0.4
                                  ? "rgba(213, 110, 12, 0.12)" // ember-tinted
                                  : t.mist,
                              color:
                                m.score > 0.4 ? t.emberStrong : t.slate,
                            }}
                          />
                          {m.sharedCountries.length > 0 && (
                            <Typography
                              sx={{ fontSize: "0.6875rem", color: t.granite }}
                            >
                              shares: {m.sharedCountries.join(", ")}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={0.5} flexShrink={0}>
                        <Button
                          size="small"
                          onClick={() =>
                            window.open(`/articles/${m.id}`, "_blank")
                          }
                          startIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                          sx={{ fontSize: "0.75rem", minHeight: 0 }}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setReplacesArticle(m)}
                          sx={{ fontSize: "0.75rem", minHeight: 0 }}
                        >
                          Replace this
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                <Typography
                  sx={{ fontSize: "0.75rem", color: t.slate, mt: 0.5 }}
                >
                  Continue submitting as a new article, or pick "Replace this"
                  to link the new submission to an existing one.
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        {/* ─────────── Source material ─────────── */}
        <Field
          label="Source material"
          hint="Optional. Paste notes, an outline, or a draft. The agent uses this as fact, not invention."
        >
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder="Paste any existing content, talking points, or notes…"
            value={form.sourceText}
            onChange={(e) => update("sourceText", e.target.value)}
          />
          <Box sx={{ mt: 1.5 }}>
            <Button
              variant="outlined"
              component="label"
              size="small"
              startIcon={<AttachFileIcon sx={{ fontSize: 14 }} />}
            >
              Attach files (.docx, .pdf)
              <input
                type="file"
                hidden
                multiple
                accept=".docx,.pdf"
                onChange={(e) =>
                  update(
                    "files",
                    e.target.files ? Array.from(e.target.files) : [],
                  )
                }
              />
            </Button>
            {form.files.length > 0 && (
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ mt: 1.5, flexWrap: "wrap" }}
                useFlexGap
              >
                {form.files.map((f) => (
                  <Chip
                    key={f.name}
                    label={f.name}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Field>

      </Stack>
      )}

      {/* ─── Step 3: SEO & submit ─── */}
      {currentStep === 2 && (
      <Stack spacing={3.5}>
        {/* SEO is its own step now — no collapsible wrapper, fields render
            directly. The step is gated behind valid basics + content, so by
            the time the user sees this they're committed. */}
        <Box>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: "1.125rem", fontWeight: 500, color: t.ink }}>
              SEO & search
            </Typography>
            <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
              How this article gets found.
            </Typography>
          </Stack>
          {/* AI suggestion banner. Visible whenever at least one SEO field is
              still in its auto-suggested state — gives the user a one-click
              "regenerate" affordance + a clear cue that the fields below
              aren't blank but pre-filled. */}
          {(seoAuto.title || seoAuto.meta || seoAuto.keywords) && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                mt: 1.5,
                mb: 2,
                p: 1.5,
                bgcolor: t.pepsiBlueSubtle,
                borderRadius: 2,
              }}
            >
              <AutoAwesomeIcon
                sx={{ fontSize: 16, color: t.pepsiBlueStrong, flexShrink: 0 }}
              />
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  color: t.pepsiBlueStrong,
                  flex: 1,
                }}
              >
                We've pre-filled these fields based on your title and brief.
                Edit anything that doesn't fit, or skip the step entirely.
              </Typography>
              <Button
                size="small"
                onClick={() => populateSeoSuggestions({ force: true })}
                startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: t.pepsiBlueStrong,
                  fontSize: "0.75rem",
                  whiteSpace: "nowrap",
                }}
              >
                Regenerate
              </Button>
            </Stack>
          )}
          <Stack spacing={2.5}>
              <Field
                label="SEO title"
                required
                hint="Shown in portal search and the page title. Different from the display title — write it as the user would search."
              >
                <TextField
                  fullWidth
                  placeholder="e.g. Refresh driver login token: 2-minute fix"
                  value={form.seoTitle}
                  onChange={(e) => {
                    update("seoTitle", e.target.value);
                    setSeoAuto((s) => ({ ...s, title: false }));
                  }}
                  helperText={
                    <Box
                      component="span"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.6875rem",
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          color:
                            seoTitleStatus === "good"
                              ? t.successInk
                              : seoTitleStatus === "empty"
                                ? t.granite
                                : t.errorInk,
                        }}
                      >
                        {seoTitleStatus === "empty" && "Aim for 30–60 characters"}
                        {seoTitleStatus === "short" && "A little short — aim for 30+"}
                        {seoTitleStatus === "good" && "Looks good"}
                        {seoTitleStatus === "long" && "Trim to 60 or fewer"}
                      </Box>
                      <Box component="span" sx={{ color: t.granite }}>
                        {seoTitleLen} / 60
                      </Box>
                    </Box>
                  }
                />
              </Field>
              <Field
                label="Meta description"
                required
                hint="The search-result snippet. Set expectation in one sentence."
              >
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="A short walkthrough for drivers whose route-app login token has expired, with the screens to tap and what to do if it fails."
                  value={form.metaDescription}
                  onChange={(e) => {
                    update("metaDescription", e.target.value);
                    setSeoAuto((s) => ({ ...s, meta: false }));
                  }}
                  helperText={
                    <Box
                      component="span"
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.6875rem",
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          color:
                            metaStatus === "good"
                              ? t.successInk
                              : metaStatus === "empty"
                                ? t.granite
                                : t.errorInk,
                        }}
                      >
                        {metaStatus === "empty" && "Aim for 140–160 characters"}
                        {metaStatus === "short" &&
                          "Add a bit more detail (140+)"}
                        {metaStatus === "good" && "Looks good"}
                        {metaStatus === "long" && "Trim to 160 or fewer"}
                      </Box>
                      <Box component="span" sx={{ color: t.granite }}>
                        {metaLen} / 160
                      </Box>
                    </Box>
                  }
                />
              </Field>
              <Field
                label="Keywords"
                hint="Terms people might search to find this. Add a few, hit Enter."
              >
                <TextField
                  fullWidth
                  placeholder="Type a keyword and press Enter…"
                  value={keywordDraft}
                  onChange={(e) => setKeywordDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                />
                {form.keywords.length > 0 && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ mt: 1, flexWrap: "wrap" }}
                    useFlexGap
                  >
                    {form.keywords.map((k) => (
                      <Chip
                        key={k}
                        label={k}
                        size="small"
                        onDelete={() => removeKeyword(k)}
                      />
                    ))}
                  </Stack>
                )}
              </Field>

              {/* ── AI discovery (GEO) ──
                  Optional fields that improve retrieval by RAG / enterprise
                  copilots. Sits below the SEO fields in the same step so
                  the wizard keeps a single "make this findable" concern;
                  motivated authors fill in, casual authors skip and the
                  agent backfills later. */}
              <Box
                sx={{
                  pt: 3,
                  mt: 1,
                  borderTop: `1px solid ${theme.palette.tokens.border}`,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="baseline"
                  spacing={1}
                  sx={{ mb: 0.5 }}
                >
                  <Typography
                    variant="overline"
                    sx={{
                      color: theme.palette.tokens.slate,
                      letterSpacing: "0.08em",
                      fontSize: "0.6875rem",
                    }}
                  >
                    AI discovery
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: theme.palette.tokens.granite,
                    }}
                  >
                    Optional · helps RAG and enterprise copilots cite this
                  </Typography>
                </Stack>
                <Stack spacing={3}>
                  <Field
                    label="Quotable summary"
                    hint="2-3 factual sentences a retrieval system can lift and cite verbatim."
                  >
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={5}
                      placeholder="Example: Maternity leave at PepsiCo provides 16 weeks paid for primary caregivers. Eligibility starts at 90 days of employment. File through the Workday Leave portal."
                      value={form.geoSummary}
                      onChange={(e) => update("geoSummary", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Key questions answered"
                    hint="Natural-language questions this article answers. Each adds a retrievable Q&A anchor for LLMs."
                  >
                    <TextField
                      fullWidth
                      placeholder="Type a question and press Enter…"
                      value={questionDraft}
                      onChange={(e) => setQuestionDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addQuestion();
                        }
                      }}
                    />
                    {form.keyQuestions.length > 0 && (
                      <Stack spacing={0.75} sx={{ mt: 1 }}>
                        {form.keyQuestions.map((q) => (
                          <Chip
                            key={q}
                            label={q}
                            size="small"
                            onDelete={() => removeQuestion(q)}
                            sx={{
                              height: "auto",
                              py: 0.5,
                              alignSelf: "flex-start",
                              maxWidth: "100%",
                              "& .MuiChip-label": {
                                whiteSpace: "normal",
                                lineHeight: 1.4,
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Field>
                  <Field
                    label="Entity anchors"
                    hint="Named programs, policies, systems, or products this article authoritatively covers."
                  >
                    <TextField
                      fullWidth
                      placeholder="Type an entity and press Enter… (e.g. Workday Leave Portal)"
                      value={entityDraft}
                      onChange={(e) => setEntityDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEntity();
                        }
                      }}
                    />
                    {form.entities.length > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ mt: 1, flexWrap: "wrap" }}
                        useFlexGap
                      >
                        {form.entities.map((e) => (
                          <Chip
                            key={e}
                            label={e}
                            size="small"
                            variant="outlined"
                            onDelete={() => removeEntity(e)}
                          />
                        ))}
                      </Stack>
                    )}
                  </Field>
                </Stack>
              </Box>
            </Stack>
        </Box>

        {/* ─────────── Required sections preview ─────────── */}
        <Box
          sx={{
            p: 1.75,
            borderRadius: 2,
            // M3 tinted surface — replaces the dashed border with a quiet
            // background tint that reads as "informational" instead of "stub".
            bgcolor: t.surfaceContainerLow,
          }}
        >
          <Typography
            variant="overline"
            sx={{ display: "block", mb: 1, color: t.slate }}
          >
            The agent will produce these sections
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            {requiredForType.map((s) => (
              <Stack
                key={s}
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{
                  fontSize: "0.8125rem",
                  color: t.slate,
                }}
              >
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 14, color: t.pepsiBlue }}
                />
                <span>{s}</span>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Per-step wizard nav. Back is hidden on step 0; Submit replaces Next
          on the final step. Next/Submit are gated by the current step's
          validation so the user gets a clear "do this first" signal. */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1.5}
      >
        <Button onClick={() => navigate("/")} disabled={submitting}>
          Cancel
        </Button>
        <Stack direction="row" spacing={1} alignItems="center">
          {currentStep > 0 && (
            <Button
              onClick={goBack}
              disabled={submitting}
              startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            >
              Back
            </Button>
          )}
          {currentStep < 2 ? (
            <Button
              variant="contained"
              onClick={goNext}
              disabled={!canAdvance || submitting}
              endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={submit}
              disabled={!canSubmit || submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                )
              }
            >
              {submitting ? "Sending to agent…" : "Create article"}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* ─────────── Global market confirmation dialog ─────────── */}
      <Dialog
        open={globalConfirmOpen}
        onClose={cancelGlobal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PublicIcon sx={{ color: t.ember }} />
            <span>Use the Global sector?</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: t.slate,
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Most articles should belong to a specific sector so the right
            market agents draft locale-tuned versions. The Global sector is
            reserved for corporate content that applies identically across
            sectors and triggers an extra human review. Briefly explain why
            this content really is cross-sector.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Global brand-safety policy that applies identically in every region."
            value={form.globalJustification}
            onChange={(e) => update("globalJustification", e.target.value)}
            helperText={`${form.globalJustification.trim().length} / 10 minimum`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelGlobal}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmGlobal}
            disabled={form.globalJustification.trim().length < 10}
          >
            Confirm Global
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Field({
  label,
  hint,
  required,
  sx,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  sx?: object;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box sx={sx}>
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="baseline"
        sx={{ mb: 1 }}
      >
        <Typography
          sx={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: theme.palette.tokens.ink,
          }}
        >
          {label}
        </Typography>
        {required && (
          <Typography
            sx={{ fontSize: "0.875rem", color: theme.palette.tokens.ember }}
          >
            *
          </Typography>
        )}
      </Stack>
      {children}
      {hint && (
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 0.75, color: "text.secondary" }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
}
