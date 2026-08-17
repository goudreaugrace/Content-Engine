import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  IconButton,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  api,
  currentUser,
  type AudienceProfile,
  type ContentType,
  type Country,
  type Market,
  type MarketProfile,
  type SectorProfile,
  type SimilarMatch,
} from "../lib/api";
import ArticleDocument from "../components/article-document";
import ArticleReadingFrame from "../components/article-reading-frame";
import { usePersonaMode } from "../lib/persona";

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
    value: "Knowledge Article",
    label: "Knowledge Article",
    description: "Step-by-step instructions to complete a task.",
    example: "e.g. 'How to submit an expense report'",
  },
  {
    value: "Topic Page",
    label: "Topic Page",
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
// index reference. Three steps: basics, article editor, final review.
const STEP_LABELS = ["Basics", "Article", "Review"] as const;
type StepIndex = 0 | 1 | 2;

const knowledgeBases = [
  {
    id: "mypepsico-general",
    name: "mypepsico Knowledge",
    description: "General employee-facing articles and FAQs.",
  },
  {
    id: "hr-people",
    name: "HR and People",
    description: "Benefits, leave, payroll, workplace policies, and manager guidance.",
  },
  {
    id: "it-service",
    name: "IT Service Desk",
    description: "Access, devices, applications, security, and technical how-to articles.",
  },
  {
    id: "data-analytics",
    name: "Data and Analytics",
    description: "Dashboards, reporting tools, metrics, and data governance guidance.",
  },
  {
    id: "sales-frontline",
    name: "Sales and Frontline",
    description: "Field, warehouse, merchandising, route, and customer-facing guidance.",
  },
] as const;

const demoPeople = [
  {
    name: "Demo User",
    email: "content-owner@pepsico.com",
    manager: {
      name: "Jessica Smith",
      email: "jessica.smith@pepsico.com",
      role: "People Manager",
    },
  },
];

const approverOptions = [
  { name: "Jessica Smith", email: "jessica.smith@pepsico.com", role: "People Manager" },
  { name: "Robert Chen", email: "robert.chen@pepsico.com", role: "IT Service Owner" },
  { name: "Maria Alvarez", email: "maria.alvarez@pepsico.com", role: "HR Operations Lead" },
  { name: "Global Content Governance", email: "portal-gov@pepsico.com", role: "Governance Queue" },
];

type TemplateField = {
  key: string;
  label: string;
  placeholder: string;
  minRows?: number;
};

type ArticleSectionField = TemplateField & {
  faqItemId?: string;
  customId?: string;
  required?: boolean;
};

type CustomSection = {
  id: string;
  title: string;
  body: string;
};

type TopicResource = {
  id: string;
  label: string;
  url: string;
  description: string;
};

type AssistantAction = "fill" | "polish" | "employee";

type AssistantSuggestion = {
  action: AssistantAction;
  target: string;
  targetLabel: string;
  text: string;
};

type SelectionTarget = {
  type: "summary" | "faqQuestion" | "section";
  key: string;
  faqItemId?: string;
};

const CONTENT_TEMPLATES: Record<ContentType, TemplateField[]> = {
  FAQ: [
    {
      key: "question",
      label: "Question",
      placeholder: "What question should this FAQ answer?",
      minRows: 2,
    },
    {
      key: "answer",
      label: "Answer",
      placeholder: "Write the direct answer first, then add timing, scope, exceptions, and the next best action.",
      minRows: 6,
    },
  ],
  Policy: [
    { key: "description", label: "Description", placeholder: "Explain what the policy provides in plain terms. Name the actual rule, benefit, or requirement in the first few lines.", minRows: 5 },
    { key: "whoApplies", label: "Eligibility and scope", placeholder: "Who is covered, who is not, country or role limits, and any important thresholds. Use a vertical list when possible.", minRows: 5 },
    { key: "policyDetails", label: "Policy details", placeholder: "Write the official rule, requirement, or standard. Keep process steps out unless they are part of the policy itself.", minRows: 7 },
    { key: "exceptions", label: "Exceptions", placeholder: "What exceptions exist, and who can approve them?", minRows: 3 },
    { key: "effectiveDate", label: "Effective date and review", placeholder: "When does this policy start, change, expire, or need its next review?", minRows: 2 },
    { key: "relatedContent", label: "Related content", placeholder: "Link to separate how-to articles, forms, or related policies instead of repeating them here.", minRows: 3 },
  ],
  "Knowledge Article": [
    { key: "beforeStart", label: "Before you start", placeholder: "What should the employee have ready before following the steps?", minRows: 4 },
    { key: "steps", label: "Steps", placeholder: "Write the task in order. One action per line works well.", minRows: 8 },
    { key: "commonIssues", label: "Common issues", placeholder: "Add known errors, edge cases, or troubleshooting guidance.", minRows: 5 },
    { key: "whatNext", label: "What to do next", placeholder: "Tell the employee what confirmation, follow-up, or support path comes after the steps.", minRows: 3 },
  ],
  "Topic Page": [
    { key: "overview", label: "Overview", placeholder: "Explain the topic and when employees should use this page.", minRows: 5 },
    { key: "details", label: "Details", placeholder: "Add the context employees need before choosing a resource. Keep this overview short and link to separate articles for detailed instructions.", minRows: 5 },
    { key: "keyResources", label: "Key resources", placeholder: "List the main links, tools, teams, or documents this page should connect.", minRows: 5 },
    { key: "relatedTopics", label: "Related topics", placeholder: "Adjacent topics that should link to this page or from this page.", minRows: 4 },
  ],
};

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
          : input.contentType === "Knowledge Article"
            ? " — step-by-step guide"
            : " — topic guide";
    const candidate = base + suffix;
    if (candidate.length >= 30 && candidate.length <= 60) return candidate;
    if (candidate.length < 30) return `${candidate} for employees`;
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
        : input.contentType === "Knowledge Article"
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

function suggestKeyQuestions(input: SeoSuggestionInput): string[] {
  const title = input.title.trim();
  const fallbackTopic = title || "this article";
  if (/^(how|what|when|where|why|who|can|do|does|is|are)\b/i.test(title)) {
    return [title.endsWith("?") ? title : `${title}?`];
  }
  if (input.contentType === "FAQ") return [`What should I know about ${fallbackTopic}?`];
  if (input.contentType === "Policy") return [`Who does ${fallbackTopic} apply to?`];
  if (input.contentType === "Knowledge Article") return [`How do I complete ${fallbackTopic}?`];
  return [`Where can I find resources for ${fallbackTopic}?`];
}

function ensureSentence(value: string): string {
  const text = value.trim();
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function firstParagraph(value: string): string {
  return value.trim().split(/\n{2,}/)[0]?.trim() ?? "";
}

function buildLeadFallback(input: {
  title: string;
  contentType: ContentType;
  audience: string[];
  countryLabels: string[];
}) {
  const title = input.title.trim() || "this article";
  const audience = input.audience.length ? input.audience.join(", ") : "employees";
  const countries = input.countryLabels.length ? ` in ${input.countryLabels.join(", ")}` : "";
  if (input.contentType === "FAQ") {
    return `Use this FAQ when ${audience}${countries} need a clear answer to ${title}. It gives the direct answer first, then adds the timing, scope, or exception details employees should know.`;
  }
  if (input.contentType === "Policy") {
    return `Use this policy article to understand what applies to ${audience}${countries}, what the rule requires, and how exceptions or compliance questions should be handled.`;
  }
  if (input.contentType === "Topic Page") {
    return `Use this topic page as a starting point for ${title}. It brings together the overview, key resources, and related topics employees are most likely to need.`;
  }
  return `Use this article when ${audience}${countries} need to complete ${title}. It explains what to prepare, the steps to follow, common issues, and where to get help.`;
}

function buildAiTemplateAnswers(input: {
  title: string;
  contentType: ContentType;
  lead: string;
  audience: string[];
  countryLabels: string[];
  sourceText: string;
}): Record<string, string> {
  const title = input.title.trim() || "this request";
  const lead = ensureSentence(input.lead) || buildLeadFallback(input);
  const audience = input.audience.length ? input.audience.join(", ") : "employees";
  const scope = input.countryLabels.length ? input.countryLabels.join(", ") : "the selected country";
  const sourceNote = firstParagraph(input.sourceText);
  const grounding = sourceNote
    ? ` Use the approved source note as the factual baseline: ${ensureSentence(sourceNote)}`
    : "";

  if (input.contentType === "FAQ") {
    return {
      question: title.endsWith("?") ? title : `What should I know about ${title}?`,
      answer: `${lead}${grounding} If the situation is urgent or the guidance does not match the employee's role, confirm the correct path with the owning team before taking action.`,
    };
  }

  if (input.contentType === "Policy") {
    return {
      description: `${lead}${grounding} State the policy outcome in plain language before adding background or ownership details.`,
      whoApplies: `This policy applies to ${audience} in ${scope}. If a local agreement, role requirement, or country rule is stricter, follow the stricter local guidance.`,
      policyDetails: `${lead}${grounding} Employees should follow the approved process, use company systems of record, and keep any required documentation so decisions can be traced later.`,
      exceptions: "Exceptions should be limited, documented, and approved by the accountable owner before the employee acts outside the standard process.",
      effectiveDate: "Use the effective date and next review date provided by the policy owner. If either date is not confirmed, keep this article in review until the approver supplies it.",
      relatedContent: "Link to separate how-to instructions, forms, and related policies instead of repeating long procedures inside this policy article.",
    };
  }

  if (input.contentType === "Topic Page") {
    return {
      overview: `${lead}${grounding} This page should help employees understand where to start and which related resources matter most.`,
      keyResources: "- MyPepsiCo search results for this topic\n- The owning team or support queue\n- Any approved policy, form, training, or process document referenced by the article",
      relatedTopics: "Link to adjacent articles instead of repeating long instructions. Add parent, child, or replacement articles when the same topic appears elsewhere.",
    };
  }

  return {
    beforeStart: `Before you start, confirm this guidance applies to your role and country (${scope}). Have any required employee ID, case number, approval, receipt, or supporting document ready.${grounding}`,
    steps: "1. Open MyPepsiCo and search for the tool, policy, or support path named in this article.\n2. Review the employee details, country, and business context before submitting anything.\n3. Follow the prompts in the approved system of record.\n4. Save or copy the confirmation number when the action is complete.\n5. Watch for approval, correction, or follow-up messages until the request is closed.",
    commonIssues: "### The system does not show the option you need\n\nConfirm you are using the correct country, role, and employee profile. If the option is still missing, open a support case.\n\n### The request is returned for correction\n\nRead the approver comment, correct only the requested fields, and resubmit the same request instead of creating a duplicate.",
    whatNext: "After the request is submitted, save the confirmation number and watch for approval, correction, or follow-up messages. If the expected confirmation does not arrive, contact the owning support team with the article title and any case number.",
  };
}

function lightlyPolish(value: string): string {
  const text = value.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  if (!text) return "";
  return ensureSentence(text);
}

function buildArticleMarkdown(input: {
  title: string;
  lead: string;
  fields: TemplateField[];
  answers: Record<string, string>;
}) {
  const title = input.title.trim() || "Untitled article";
  const lead = input.lead.trim();
  const sections = input.fields
    .map((field) => {
      const value = (input.answers[field.key] ?? "").trim();
      if (!value) return "";
      return `## ${field.label}\n\n${value}`;
    })
    .filter(Boolean)
    .join("\n\n");
  return [`# ${title}`, lead, sections].filter(Boolean).join("\n\n");
}

function marketForPreview(marketId: string | undefined): Market {
  const map: Record<string, Market> = {
    us: "US",
    mx: "MX",
    br: "BR",
    uk: "UK",
    in: "IN",
    global: "Global",
  };
  return map[marketId ?? ""] ?? "Global";
}

/**
 * Required H2 sections per content type. The form renders these as a checklist
 * so authors can see at a glance what the agent will be asked to produce, and
 * Phase C's rules engine validates the resulting article against the same list.
 */
const REQUIRED_SECTIONS: Record<ContentType, string[]> = {
  FAQ: ["Question", "Answer", "Related"],
  Policy: ["Description", "Eligibility and scope", "Policy details", "Effective date"],
  "Knowledge Article": ["Before you start", "Steps", "Common issues"],
  "Topic Page": ["Overview", "Details", "Resources"],
};

function articleLengthStatus(characterCount: number): {
  label: string;
  tone: "success" | "warning" | "error";
  helper: string;
} {
  if (characterCount < 500) {
    return {
      label: "Too thin",
      tone: "error",
      helper: "mypepsico guidance says articles under 500 characters usually do not answer enough on their own.",
    };
  }
  if (characterCount <= 6000) {
    return {
      label: "Healthy length",
      tone: "success",
      helper: "This is inside the recommended working range for a readable knowledge article.",
    };
  }
  if (characterCount <= 7500) {
    return {
      label: "Long but acceptable",
      tone: "warning",
      helper: "Consider accordions, lists, or moving standalone topics into related articles.",
    };
  }
  return {
    label: "Over limit",
    tone: "error",
    helper: "The guideline maximum is 7,500 characters. This likely needs to be split or shortened.",
  };
}

function displayLanguage(code: string): string {
  const names: Record<string, string> = {
    "en-US": "English (en-US)",
    "en-GB": "English (en-GB)",
    "es-MX": "Spanish (es-MX)",
    "pt-BR": "Portuguese (pt-BR)",
    "en-IN": "English (en-IN)",
  };
  return names[code] ?? code;
}

function detectDraftLanguage(text: string): string {
  const lower = text.toLowerCase();
  if (/[ãõç]/i.test(text) || /\b(você|para|não|solicitação|artigo)\b/.test(lower)) return "pt-BR";
  if (/[ñáéíóú¿¡]/i.test(text) || /\b(usted|para|solicitud|artículo|empleados)\b/.test(lower)) return "es-MX";
  return "en-US";
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export default function NewRequest() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [personaMode] = usePersonaMode();
  const me = currentUser();
  const manager =
    demoPeople.find((person) => person.email === me.email)?.manager ??
    approverOptions[0];

  const [form, setForm] = useState({
    title: "",
    contentType: "FAQ" as ContentType,
    knowledgeBase: "mypepsico-general",
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
    templateAnswers: {} as Record<string, string>,
    sectionHeadings: {} as Record<string, string>,
    faqItems: [{ id: "faq-1", question: "", answer: "" }],
    customSections: [] as CustomSection[],
    policyMeta: {
      effectiveDate: "",
      nextReviewDate: "",
      policyOwner: "",
      exceptionApprover: "",
    },
    topicResources: [
      { id: "resource-1", label: "", url: "", description: "" },
    ] as TopicResource[],
    vaReady: true,
    approverEmail: manager.email,
    files: [] as File[],
    seoTitle: "",
    metaDescription: "",
    keywords: [] as string[],
    globalJustification: "",
  });
  const [migrationForm, setMigrationForm] = useState({
    sourceTitle: "",
    sourceContent: "",
    contentType: "Knowledge Article" as ContentType,
    marketId: "us",
    sectorId: "pfna",
    countries: ["US"] as string[],
  });
  const [migrationSubmitting, setMigrationSubmitting] = useState(false);
  const [migrationUploading, setMigrationUploading] = useState(false);
  const [migrationUpload, setMigrationUpload] = useState<{
    id: string;
    kind: "pdf" | "doc";
    title: string;
    fileName: string;
    filePath: string;
    mimeType: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiWriting, setAiWriting] = useState<"draft" | "polish" | null>(null);
  const [enhancerOpen, setEnhancerOpen] = useState(false);
  const [enhancerTarget, setEnhancerTarget] = useState("article");
  const [enhancerPrompt, setEnhancerPrompt] = useState("");
  const [reviewEditKey, setReviewEditKey] = useState<string | null>(null);
  const [activeEditorTarget, setActiveEditorTarget] = useState<SelectionTarget>({
    type: "summary",
    key: "lead",
  });
  const [activeInlineEditorTarget, setActiveInlineEditorTarget] =
    useState<SelectionTarget | null>(null);
  const [editorSelections, setEditorSelections] = useState<
    Record<string, { start: number; end: number }>
  >({});
  const [improveMenuAnchor, setImproveMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [improveMenuTarget, setImproveMenuTarget] =
    useState<SelectionTarget | null>(null);
  const [knowledgeStepCount, setKnowledgeStepCount] = useState(1);
  const [assistantSuggestion, setAssistantSuggestion] =
    useState<AssistantSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audiences, setAudiences] = useState<AudienceProfile[]>([]);
  const [countryCatalog, setCountryCatalog] = useState<Country[]>([]);
  const [showAllCountries, setShowAllCountries] = useState(false);
  // Wizard step index (0-based). Stepper labels live in STEP_LABELS below.
  const [currentStep, setCurrentStep] = useState(0);

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
  const [similarExpanded, setSimilarExpanded] = useState(false);
  // If the user explicitly picks "Mark as replacement," remember which article.
  // This stays in lockstep with the form, so changing the title doesn't clear it
  // (the user already made the decision); they can clear it manually.
  const [replacesArticle, setReplacesArticle] =
    useState<SimilarMatch | null>(null);

  const [marketProfiles, setMarketProfiles] = useState<MarketProfile[]>([]);
  const [sectorProfiles, setSectorProfiles] = useState<SectorProfile[]>([]);

  useEffect(() => {
    if (personaMode !== "non-admin") {
      navigate("/", { replace: true });
    }
  }, [navigate, personaMode]);

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

  // Phase D — when the user picks exactly one specific market AND the market
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
  const updateTemplateAnswer = (key: string, value: string) =>
    setForm((f) => ({
      ...f,
      templateAnswers: { ...f.templateAnswers, [key]: value },
    }));
  const updateSectionHeading = (key: string, value: string) =>
    setForm((f) => ({
      ...f,
      sectionHeadings: { ...f.sectionHeadings, [key]: value },
    }));
  const updateFaqItem = (
    id: string,
    patch: Partial<{ question: string; answer: string }>,
  ) =>
    setForm((f) => ({
      ...f,
      faqItems: f.faqItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  const addFaqItem = (question = "") =>
    setForm((f) => ({
      ...f,
      faqItems: [
        ...f.faqItems,
        { id: `faq-${Date.now().toString(36)}`, question, answer: "" },
      ],
    }));
  const removeFaqItem = (id: string) =>
    setForm((f) => ({
      ...f,
      faqItems:
        f.faqItems.length <= 1
          ? f.faqItems
          : f.faqItems.filter((item) => item.id !== id),
    }));
  const updateCustomSection = (id: string, patch: Partial<CustomSection>) =>
    setForm((f) => ({
      ...f,
      customSections: f.customSections.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    }));
  const addCustomSection = () =>
    setForm((f) => ({
      ...f,
      customSections: [
        ...f.customSections,
        {
          id: `custom-${Date.now().toString(36)}`,
          title: "",
          body: "",
        },
      ],
    }));
  const removeCustomSection = (id: string) =>
    setForm((f) => ({
      ...f,
      customSections: f.customSections.filter((section) => section.id !== id),
    }));
  const updatePolicyMeta = (
    key: keyof typeof form.policyMeta,
    value: string,
  ) =>
    setForm((f) => ({
      ...f,
      policyMeta: { ...f.policyMeta, [key]: value },
    }));
  const updateTopicResource = (id: string, patch: Partial<TopicResource>) =>
    setForm((f) => ({
      ...f,
      topicResources: f.topicResources.map((resource) =>
        resource.id === id ? { ...resource, ...patch } : resource,
      ),
    }));
  const addTopicResource = () =>
    setForm((f) => ({
      ...f,
      topicResources: [
        ...f.topicResources,
        { id: `resource-${Date.now().toString(36)}`, label: "", url: "", description: "" },
      ],
    }));
  const removeTopicResource = (id: string) =>
    setForm((f) => ({
      ...f,
      topicResources:
        f.topicResources.length <= 1
          ? f.topicResources
          : f.topicResources.filter((resource) => resource.id !== id),
    }));
  const updateMigration = <K extends keyof typeof migrationForm>(
    k: K,
    v: (typeof migrationForm)[K],
  ) => setMigrationForm((f) => ({ ...f, [k]: v }));

  // ───────────── Country filtering ─────────────
  // Default the country picker to the countries that map to the selected
  // market (e.g. US → US, CA). With Global or multi-market we show everything
  // — there's no single "default" to filter to.
  const visibleCountries = useMemo(() => {
    if (showAllCountries || !singleMarket) return countryCatalog;
    return countryCatalog.filter((c) => c.defaultMarketId === singleMarket);
  }, [countryCatalog, singleMarket, showAllCountries]);

  const selectedMigrationMarket = marketProfiles.find(
    (m) => m.id === migrationForm.marketId,
  );
  const selectedApprover =
    approverOptions.find((person) => person.email === form.approverEmail) ??
    manager;
  const templateFields = CONTENT_TEMPLATES[form.contentType];
  const isFaq = form.contentType === "FAQ";
  const requiredArticleSections: ArticleSectionField[] = isFaq
    ? form.faqItems.map((item, index) => ({
        key: item.id,
        faqItemId: item.id,
        label: item.question.trim() || `Question ${index + 1}`,
        placeholder: "Write the answer. Start direct, then add context or exceptions.",
        minRows: 5,
        required: true,
      }))
    : templateFields.map((field) => ({
        ...field,
        label: form.sectionHeadings[field.key]?.trim() || field.label,
        required: true,
      }));
  const customArticleSections: ArticleSectionField[] = form.customSections.map((section, index) => ({
    key: section.id,
    customId: section.id,
    label: section.title.trim() || `Additional section ${index + 1}`,
    placeholder: "Add employee-facing details that do not fit the required template sections.",
    minRows: 4,
    required: false,
  }));
  const articleSections: ArticleSectionField[] = [
    ...requiredArticleSections,
    ...customArticleSections,
  ];
  const articleAnswers = Object.fromEntries(
    articleSections.map((field) => {
      const value = field.faqItemId
        ? form.faqItems.find((item) => item.id === field.faqItemId)?.answer ?? ""
        : field.customId
          ? form.customSections.find((section) => section.id === field.customId)?.body ?? ""
        : form.templateAnswers[field.key] ?? "";
      return [field.key, value];
    }),
  );
  const titleRecommendations = [
    !form.title.trim()
      ? "Add a clear title using the words employees would search for."
      : form.title.trim().length < 12
        ? "Make the title more specific so it can stand alone in search results."
        : "",
  ].filter(Boolean);
  const leadRecommendations = [
    !form.summary.trim()
      ? "Add a short summary that explains what this article covers, who it helps, and when to use it."
      : form.summary.trim().length < 80
        ? "Add one more sentence so the summary gives enough context before employees read the full article."
        : form.summary.trim().length > 280
          ? "Shorten this to one or two quick sentences so employees can scan it quickly."
          : "",
  ].filter(Boolean);
  const sectionRecommendations = (field: ArticleSectionField, value: string) => {
    const trimmed = value.trim();
    const recommendations: string[] = [];
    const heading = field.label.trim();
    const isPlaceholderQuestion = field.faqItemId && /^Question \d+$/.test(heading);

    if (isPlaceholderQuestion) {
      recommendations.push("Replace the placeholder heading with the employee's actual question.");
    }

    if (!trimmed) {
      recommendations.push(
        field.faqItemId
          ? "Add a direct answer, then include any timing, eligibility, exceptions, or next steps."
          : "Add the article text for this section so employees do not have to rely on attachments.",
      );
      return recommendations;
    }

    if (trimmed.length < 160) {
      recommendations.push(
        field.faqItemId
          ? "Make the answer more complete. Start with the answer, then add the details an employee needs to act."
          : "Add more useful detail here, such as steps, scope, timing, owner, exceptions, or where to go next.",
      );
    }

    if (trimmed.length > 1400) {
      recommendations.push("This section is long. Consider breaking it into bullets, smaller headings, or related articles.");
    }

    if (form.contentType === "FAQ" && field.faqItemId) {
      if (!heading.trim().endsWith("?")) {
        recommendations.push("Write the heading as the question employees would type into search.");
      }
      if (!/^(yes|no|use|select|open|contact|submit|employees|you|the)\b/i.test(trimmed)) {
        recommendations.push("Start with the direct answer before adding background.");
      }
    }

    if (form.contentType === "Knowledge Article" && field.key === "steps") {
      if (!/^\s*(1\.|-)\s+/m.test(trimmed)) {
        recommendations.push("Format this as numbered steps or short bullets so employees can follow it while working.");
      }
      if (!/\b(confirm|save|submit|open|select|review|contact)\b/i.test(trimmed)) {
        recommendations.push("Use action verbs so each step tells the employee exactly what to do.");
      }
    }

    if (form.contentType === "Policy") {
      if (field.key === "whoApplies" && !/\b(applies|covered|eligible|not covered|excludes|role|country)\b/i.test(trimmed)) {
        recommendations.push("Make the scope explicit: who is covered, who is excluded, and any country or role limits.");
      }
      if (field.key === "policyDetails" && !/\b(must|required|may|should|approved|not permitted)\b/i.test(trimmed)) {
        recommendations.push("Use policy language that clearly states what is required, allowed, or not permitted.");
      }
      if (field.key === "effectiveDate" && (!form.policyMeta.effectiveDate.trim() || !form.policyMeta.nextReviewDate.trim())) {
        recommendations.push("Complete the structured effective date and next review fields above the article.");
      }
    }

    if (form.contentType === "Topic Page") {
      if (field.key === "overview" && trimmed.length > 900) {
        recommendations.push("Keep the overview short. Move detailed instructions into related articles or resource links.");
      }
      if (
        field.key === "keyResources" &&
        !form.topicResources.some(
          (resource) =>
            resource.label.trim() || resource.url.trim() || resource.description.trim(),
        ) &&
        !/https?:\/\/|www\.|myPepsiCo|MyPepsiCo/i.test(trimmed)
      ) {
        recommendations.push("Add at least one curated resource link so this works as a hub.");
      }
    }

    return recommendations;
  };
  const reviewEditableSections = articleSections.map((field) => ({
    key: field.key,
    title: field.label,
    body: articleAnswers[field.key] ?? "",
    recommendations: sectionRecommendations(field, articleAnswers[field.key] ?? ""),
    onTitleChange: (value: string) =>
      field.faqItemId
        ? updateFaqItem(field.faqItemId, { question: value })
        : field.customId
          ? updateCustomSection(field.customId, { title: value })
          : updateSectionHeading(field.key, value),
    onBodyChange: (value: string) =>
      field.faqItemId
        ? updateFaqItem(field.faqItemId, { answer: value })
        : field.customId
          ? updateCustomSection(field.customId, { body: value })
          : updateTemplateAnswer(field.key, value),
  }));
  const customSectionsHaveContent = form.customSections.some(
    (section) => section.title.trim() || section.body.trim(),
  );
  const templateHasContent = (isFaq
    ? form.faqItems.some((item) => item.question.trim() || item.answer.trim())
    : templateFields.some((field) => (form.templateAnswers[field.key] ?? "").trim())) ||
    customSectionsHaveContent;
  const templateSourceText = () =>
    articleSections
      .map((field) => {
        const value = (articleAnswers[field.key] ?? "").trim();
        if (!value) return "";
        return `## ${field.label}\n\n${value}`;
      })
      .filter(Boolean)
      .join("\n\n");

  const countriesForProfiles = (profileIds: string[]) => {
    if (profileIds.includes("global")) return countryCatalog.map((c) => c.code);
    const codes = profileIds.flatMap((id) => {
      const fromProfile = marketProfiles.find((p) => p.id === id)?.defaultCountries;
      if (fromProfile?.length) return fromProfile;
      return countryCatalog
        .filter((country) => country.defaultMarketId === id)
        .map((country) => country.code);
    });
    return Array.from(new Set(codes));
  };

  const derivedCountries = useMemo(
    () => countriesForProfiles(form.markets),
    [countryCatalog, form.markets, marketProfiles],
  );
  const derivedMigrationCountries = useMemo(
    () => countriesForProfiles([migrationForm.marketId]),
    [countryCatalog, migrationForm.marketId, marketProfiles],
  );

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
          countries: derivedCountries,
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
  }, [form.title, form.summary, derivedCountries, similarDismissed]);

  // Any change to the title or summary re-opens the panel — the user's
  // earlier dismissal applied to a different query.
  useEffect(() => {
    setSimilarDismissed(false);
    setSimilarExpanded(false);
  }, [form.title, form.summary]);

  useEffect(() => {
    if (currentStep !== 1) return;
    const closeInactiveEditor = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.("[data-inline-editor-field='true']") ||
        target?.closest?.("[data-inline-editor-tools='true']") ||
        (improveMenuAnchor && target?.closest?.(".MuiMenu-paper"))
      ) {
        return;
      }
      setActiveInlineEditorTarget(null);
      setImproveMenuAnchor(null);
      setImproveMenuTarget(null);
    };
    document.addEventListener("mousedown", closeInactiveEditor);
    return () => document.removeEventListener("mousedown", closeInactiveEditor);
  }, [currentStep, improveMenuAnchor]);

  // Build the suggestion input from the current basics + content state.
  // Recomputes on every render — cheap, all-local string ops.
  const seoSuggestionInput: SeoSuggestionInput = {
    title: form.title,
    summary: [form.summary, templateSourceText()].filter(Boolean).join("\n\n"),
    contentType: form.contentType,
    audienceLabels: form.audience,
  };
  const generatedSearch = {
    title: suggestSeoTitle(seoSuggestionInput),
    description: suggestMetaDescription(seoSuggestionInput),
    keywords: suggestKeywords(seoSuggestionInput),
    questions: suggestKeyQuestions(seoSuggestionInput),
  };

  // ───────────── Per-step validation ─────────────
  // Each step has its own gate so the Next button is only enabled when the
  // current step's required fields are valid. The Submit button on the last
  // step requires ALL steps to be valid (defense against a previously-valid
  // step being mutated via the back nav and breaking).
  const step0Valid =
    !!form.title.trim() &&
    !!form.knowledgeBase.trim() &&
    form.markets.length > 0 &&
    (!isGlobal || form.globalJustification.trim().length >= 10) &&
    form.audience.length > 0 &&
    derivedCountries.length > 0;

  const step1Valid =
    !!(form.summary.trim() || form.sourceText.trim() || templateHasContent);

  const step2Valid = true;

  const stepValid = [step0Valid, step1Valid, step2Valid];
  const canAdvance = stepValid[currentStep];
  const canSubmit = step0Valid && step1Valid;
  const canVisitStep = (target: number) =>
    target <= currentStep || stepValid.slice(0, target).every(Boolean);

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

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });

  const handleMigrationFile = async (file: File | undefined) => {
    if (!file) return;
    setMigrationUploading(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const title = migrationForm.sourceTitle.trim() || file.name.replace(/\.[^.]+$/, "");
      const uploaded = await api.uploadSourceFile({
        title,
        fileName: file.name,
        mimeType: file.type || "text/plain",
        dataUrl,
      });
      setMigrationUpload(uploaded);
      setMigrationForm((f) => ({
        ...f,
        sourceTitle: f.sourceTitle.trim() ? f.sourceTitle : title,
        sourceContent: [
          f.sourceContent.trim(),
          `Uploaded source document: ${uploaded.fileName}`,
          `Source type: ${uploaded.kind.toUpperCase()}`,
          `Stored source reference: ${uploaded.filePath}`,
          "Use this uploaded document as the migrated source to standardize into the selected DEEx template. Preserve the source reference in the draft audit trail.",
        ]
          .filter(Boolean)
          .join("\n"),
      }));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setMigrationUploading(false);
    }
  };

  const canStandardize =
    migrationForm.sourceContent.trim().length >= 40 &&
    derivedMigrationCountries.length > 0;

  const selectedMarketLabels = form.markets.map(
    (marketId) =>
      marketProfiles.find((p) => p.id === marketId)?.name ??
      MARKET_LABELS[marketId]?.label ??
      marketId,
  );
  const selectedMarketLanguageCodes = Array.from(
    new Set(
      form.markets
        .map(
          (marketId) =>
            marketProfiles.find((p) => p.id === marketId)?.languageCode ??
            MARKET_LABELS[marketId]?.code,
        )
        .filter((code): code is string => !!code && code !== "all"),
    ),
  );
  const selectedMarketLabelsWithLanguages = form.markets.map((marketId) => {
    const profile = marketProfiles.find((p) => p.id === marketId);
    const label = profile?.name ?? MARKET_LABELS[marketId]?.label ?? marketId;
    const languageCode = profile?.languageCode ?? MARKET_LABELS[marketId]?.code;
    return languageCode && languageCode !== "all"
      ? `${label} · ${displayLanguage(languageCode)}`
      : label;
  });
  const selectedSectorLabel =
    sectorProfiles.find((sector) => sector.id === form.sector)?.name ??
    form.sector;
  const selectedKnowledgeBase =
    knowledgeBases.find((kb) => kb.id === form.knowledgeBase) ??
    knowledgeBases[0];
  const selectedContentTypeLabel =
    contentTypes.find((contentType) => contentType.value === form.contentType)?.label ??
    form.contentType;
  const articleEvidenceAdded =
    !!form.sourceText.trim() || form.files.length > 0;
  const previewMarket = marketForPreview(form.markets[0]);
  const hasAiSeed = !!form.title.trim();
  const hasDraftContent = !!form.summary.trim() || templateHasContent;
  const faqQuestionSuggestions = [
    form.title.trim().endsWith("?")
      ? form.title.trim()
      : form.title.trim()
        ? `What should I know about ${form.title.trim()}?`
        : "What should employees know first?",
    "Who can use this guidance?",
    "When does this change take effect?",
    "What should employees have ready before they start?",
  ].filter(
    (question, index, list) =>
      question.trim() &&
      list.indexOf(question) === index &&
      !form.faqItems.some(
        (item) => item.question.trim().toLowerCase() === question.trim().toLowerCase(),
      ),
  );
  const baseArticleBody = buildArticleMarkdown({
    title: form.title,
    lead: form.summary,
    fields: articleSections,
    answers: articleAnswers,
  });
  const policyAtAGlanceRows = [
    ["Effective date", form.policyMeta.effectiveDate],
    ["Next review", form.policyMeta.nextReviewDate],
    ["Policy owner", form.policyMeta.policyOwner],
    ["Exception approver", form.policyMeta.exceptionApprover],
  ].filter(([, value]) => value.trim());
  const topicResourceRows = form.topicResources.filter(
    (resource) =>
      resource.label.trim() || resource.url.trim() || resource.description.trim(),
  );
  const policyAtAGlanceMarkdown =
    form.contentType === "Policy" && policyAtAGlanceRows.length > 0
      ? [
          "## At a glance",
          "",
          "| Detail | Value |",
          "| --- | --- |",
          ...policyAtAGlanceRows.map(
            ([label, value]) => `| ${label} | ${value.trim()} |`,
          ),
        ].join("\n")
      : "";
  const topicResourceMarkdown =
    form.contentType === "Topic Page" && topicResourceRows.length > 0
      ? [
          "## Resource links",
          "",
          ...topicResourceRows.map((resource) => {
            const label = resource.label.trim() || resource.url.trim() || "Resource";
            const url = resource.url.trim();
            const description = resource.description.trim();
            const link = url ? `[${label}](${url})` : label;
            return `- ${link}${description ? ` — ${description}` : ""}`;
          }),
        ].join("\n")
      : "";
  const finalArticleBody = [
    baseArticleBody,
    policyAtAGlanceMarkdown,
    topicResourceMarkdown,
  ].filter(Boolean).join("\n\n");
  const detectedDraftLanguage = detectDraftLanguage(finalArticleBody);
  const articleBodyCharacterCount = finalArticleBody.replace(/^#\s+.+\n+/, "").length;
  const lengthStatus = articleLengthStatus(articleBodyCharacterCount);
  const lengthToneColor =
    lengthStatus.tone === "success"
      ? t.successInk
      : lengthStatus.tone === "warning"
        ? t.ember
        : t.errorInk;
  const reviewAccordionSx = {
    bgcolor: "#FFFFFF",
    border: 0,
    borderRadius: "0 !important",
    borderBottom: `1px solid ${t.border}`,
    boxShadow: "none",
    "&:before": { display: "none" },
    "&.Mui-expanded": { m: 0 },
    "& .MuiAccordionSummary-root": {
      minHeight: 58,
      px: { xs: 1.5, md: 2 },
      py: 0.25,
    },
    "& .MuiAccordionSummary-root.Mui-expanded": {
      minHeight: 58,
    },
    "& .MuiAccordionSummary-content": {
      my: 1,
    },
    "& .MuiAccordionSummary-content.Mui-expanded": {
      my: 1,
    },
    "& .MuiAccordionDetails-root": {
      px: { xs: 1.5, md: 2 },
      pt: 0,
      pb: 2,
    },
    "& .MuiAccordionSummary-expandIconWrapper": {
      color: t.granite,
    },
  };
  const publishingFields = [
    { label: "Knowledge base", value: selectedKnowledgeBase.name },
    { label: "Detected draft language", value: displayLanguage(detectedDraftLanguage) },
    { label: "Country", value: selectedMarketLabelsWithLanguages.join(", ") },
    { label: "Sector", value: selectedSectorLabel },
    { label: "Who can read it", value: form.audience.join(", ") },
  ];
  const templateSpecificChecks =
    form.contentType === "FAQ"
      ? [
          {
            label: "FAQ has at least one complete question and answer",
            done: form.faqItems.some((item) => item.question.trim() && item.answer.trim()),
          },
        ]
      : form.contentType === "Policy"
        ? [
            {
              label: "Policy has effective date, next review, owner, and exception approver",
              done:
                !!form.policyMeta.effectiveDate.trim() &&
                !!form.policyMeta.nextReviewDate.trim() &&
                !!form.policyMeta.policyOwner.trim() &&
                !!form.policyMeta.exceptionApprover.trim(),
            },
          ]
        : form.contentType === "Knowledge Article"
          ? [
              {
                label: "How-to article uses step formatting",
                done: /^\s*(1\.|-)\s+/m.test(form.templateAnswers.steps ?? ""),
              },
            ]
          : [
              {
                label: "Topic page includes curated resource links",
                done: topicResourceRows.length > 0,
              },
            ];
  const askpepChecks = [
    {
      label: "Article body has enough text for employees and askpep",
      done: articleBodyCharacterCount >= 500,
    },
    {
      label: "Scope and reader access are complete",
      done: selectedMarketLabels.length > 0 && !!selectedSectorLabel && form.audience.length > 0,
    },
    {
      label: "Important guidance is typed in the article, not only in an attachment",
      done: templateHasContent,
    },
    {
      label: "Source file or source note is attached for reviewer evidence",
      done: articleEvidenceAdded,
    },
    {
      label: "Duplicate risk is reviewed",
      done: similarMatches.length === 0 || !!replacesArticle || similarDismissed,
    },
    {
      label: "Search words and employee question are generated",
      done: generatedSearch.keywords.length > 0 && generatedSearch.questions.length > 0,
    },
    ...templateSpecificChecks,
  ];
  const recommendedReviewUpdates = askpepChecks
    .filter((item) => !item.done)
    .map((item) => item.label);
  const targetSection = articleSections.find((field) => field.key === enhancerTarget);
  const enhancerTargetHasContent =
    enhancerTarget === "article"
      ? hasDraftContent
      : enhancerTarget === "lead"
        ? !!form.summary.trim()
        : targetSection
          ? !!(articleAnswers[targetSection.key] ?? "").trim()
          : false;
  const setSectionValue = (section: ArticleSectionField, value: string) => {
    if (section.faqItemId) {
      updateFaqItem(section.faqItemId, { answer: value });
      return;
    }
    if (section.customId) {
      updateCustomSection(section.customId, { body: value });
      return;
    }
      updateTemplateAnswer(section.key, value);
  };
  const parseKnowledgeSteps = (value: string) =>
    value
      .split("\n")
      .map((line) => line.replace(/^\s*(?:\d+\.|-)\s*/, "").trim())
      .filter(Boolean);
  const formatKnowledgeSteps = (steps: string[]) =>
    steps
      .map((step, index) => {
        const text = step.trim();
        return text ? `${index + 1}. ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  const knowledgeStepsForEditor = (value: string) => {
    const steps = parseKnowledgeSteps(value);
    const targetLength = Math.max(knowledgeStepCount, steps.length, 1);
    return Array.from({ length: targetLength }, (_, index) => steps[index] ?? "");
  };
  const updateKnowledgeStep = (index: number, value: string) => {
    const steps = knowledgeStepsForEditor(form.templateAnswers.steps ?? "");
    steps[index] = value;
    setKnowledgeStepCount(Math.max(steps.length, 1));
    updateTemplateAnswer("steps", formatKnowledgeSteps(steps));
  };
  const addKnowledgeStep = () => {
    const steps = knowledgeStepsForEditor(form.templateAnswers.steps ?? "");
    setKnowledgeStepCount(steps.length + 1);
  };
  const removeKnowledgeStep = (index: number) => {
    const steps = knowledgeStepsForEditor(form.templateAnswers.steps ?? "");
    if (steps.length <= 1) {
      setKnowledgeStepCount(1);
      updateTemplateAnswer("steps", "");
      return;
    }
    setKnowledgeStepCount(steps.length - 1);
    updateTemplateAnswer(
      "steps",
      formatKnowledgeSteps(steps.filter((_, stepIndex) => stepIndex !== index)),
    );
  };
  const getSelectionTargetValue = (target: SelectionTarget) => {
    if (target.type === "summary") return form.summary;
    if (target.type === "faqQuestion") {
      return form.faqItems.find((item) => item.id === target.faqItemId)?.question ?? "";
    }
    if (target.faqItemId) {
      return form.faqItems.find((item) => item.id === target.faqItemId)?.answer ?? "";
    }
    const customSection = form.customSections.find((section) => section.id === target.key);
    if (customSection) return customSection.body;
    return form.templateAnswers[target.key] ?? "";
  };
  const setSelectionTargetValue = (target: SelectionTarget, value: string) => {
    if (target.type === "summary") {
      update("summary", value);
      return;
    }
    if (target.type === "faqQuestion" && target.faqItemId) {
      updateFaqItem(target.faqItemId, { question: value });
      return;
    }
    if (target.faqItemId) {
      updateFaqItem(target.faqItemId, { answer: value });
      return;
    }
    if (form.customSections.some((section) => section.id === target.key)) {
      updateCustomSection(target.key, { body: value });
      return;
    }
    updateTemplateAnswer(target.key, value);
  };
  const sameSelectionTarget = (a: SelectionTarget, b: SelectionTarget) =>
    a.type === b.type && a.key === b.key && a.faqItemId === b.faqItemId;
  const selectionTargetId = (target: SelectionTarget) =>
    `${target.type}:${target.key}:${target.faqItemId ?? ""}`;
  const activateEditor = (target: SelectionTarget) => {
    setActiveEditorTarget(target);
    setActiveInlineEditorTarget(target);
  };
  const rememberEditorSelection = (
    event: any,
    target: SelectionTarget,
  ) => {
    activateEditor(target);
    const element = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? start;
    setEditorSelections((current) => ({
      ...current,
      [selectionTargetId(target)]: { start, end },
    }));
  };
  const editorSelectionProps = (target: SelectionTarget) => ({
    "data-inline-editor-field": "true",
    "data-inline-editor-id": selectionTargetId(target),
    onFocus: (event: any) => rememberEditorSelection(event, target),
    onClick: (event: any) => rememberEditorSelection(event, target),
    onMouseUp: (event: any) => rememberEditorSelection(event, target),
    onKeyUp: (event: any) => rememberEditorSelection(event, target),
    onSelect: (event: any) => rememberEditorSelection(event, target),
  });
  const getActiveEditContext = (targetOverride?: SelectionTarget) => {
    const target = targetOverride ?? activeInlineEditorTarget ?? activeEditorTarget;
    const current = getSelectionTargetValue(target);
    const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const targetId = selectionTargetId(target);
    const hasTextSelection =
      (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
      active.dataset.inlineEditorId === targetId;
    const remembered = editorSelections[targetId];
    const selectionStart = hasTextSelection
      ? (active.selectionStart ?? 0)
      : (remembered?.start ?? current.length);
    const selectionEnd = hasTextSelection
      ? (active.selectionEnd ?? selectionStart)
      : (remembered?.end ?? selectionStart);
    const selectionIsActive = selectionEnd > selectionStart;
    const start = selectionIsActive ? selectionStart : selectionStart;
    const end = selectionIsActive ? selectionEnd : selectionStart;
    return {
      target,
      start,
      end,
      text: current.slice(start, end),
      isSelection: !!selectionIsActive,
      current,
    };
  };
  const getToolbarEditContext = (targetOverride?: SelectionTarget) =>
    getActiveEditContext(targetOverride);
  const buildDraftForActiveTarget = (target: SelectionTarget, prompt?: string) => {
    const direction = (prompt ?? "").toLowerCase();
    const lead =
      form.summary ||
      buildLeadFallback({
        title: form.title,
        contentType: form.contentType,
        audience: form.audience,
        countryLabels: selectedMarketLabels,
      });
    const fallback = buildAiTemplateAnswers({
      title: form.title,
      contentType: form.contentType,
      lead,
      audience: form.audience,
      countryLabels: selectedMarketLabels,
      sourceText: form.sourceText,
    });

    if (target.type === "summary") {
      return direction.includes("short")
        ? trimToSentence(lead, 180)
        : lead;
    }
    if (target.type === "faqQuestion") {
      return fallback.question ?? (form.title.trim().endsWith("?") ? form.title.trim() : `What should I know about ${form.title.trim() || "this topic"}?`);
    }
    if (target.faqItemId) {
      return fallback.answer ?? "Write the direct answer first, then add timing, scope, exceptions, and where employees can go next.";
    }
    return (
      fallback[target.key] ??
      "Draft this section with clear employee-facing guidance, using approved source material and noting any missing facts for the approver."
    );
  };
  const replaceSelectedText = (
    replacement: string,
    contextOverride?: ReturnType<typeof getActiveEditContext>,
  ) => {
    const { target, start, end, current } =
      contextOverride ?? getToolbarEditContext();
    const nextValue = `${current.slice(0, start)}${replacement}${current.slice(end)}`;
    setSelectionTargetValue(target, nextValue);
    const nextCursor = start + replacement.length;
    setEditorSelections((selections) => ({
      ...selections,
      [selectionTargetId(target)]: { start: nextCursor, end: nextCursor },
    }));
    window.setTimeout(() => setAiWriting(null), 180);
  };
  const formatSelectedText = (
    kind:
      | "bold"
      | "italic"
      | "underline"
      | "strike"
      | "code"
      | "link"
      | "bullet"
      | "numbered"
      | "quote"
      | "clear",
    targetOverride?: SelectionTarget,
  ) => {
    const context = getToolbarEditContext(targetOverride);
    const inlineOnlyKinds = ["bold", "italic", "underline", "strike", "code", "link"];
    const actionText =
      context.isSelection || !inlineOnlyKinds.includes(kind)
        ? context.isSelection
          ? context.text
          : context.current
        : "";
    if (!actionText.trim() && !["bold", "italic", "link"].includes(kind)) return;
    if (
      !context.isSelection &&
      ["underline", "strike", "code"].includes(kind)
    ) {
      return;
    }
    const text =
      actionText.trim() ||
      (kind === "bold"
        ? "bold text"
        : kind === "italic"
          ? "italic text"
          : "link text");
    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const next =
      kind === "bold"
        ? `**${text}**`
        : kind === "italic"
          ? `_${text}_`
          : kind === "underline"
            ? `<u>${text}</u>`
            : kind === "strike"
              ? `~~${text}~~`
              : kind === "code"
                ? `\`${text}\``
                : kind === "link"
                  ? `[${text}](https://)`
                  : kind === "bullet"
                    ? lines.map((line) => `- ${line}`).join("\n")
                    : kind === "numbered"
                      ? lines.map((line, index) => `${index + 1}. ${line}`).join("\n")
                      : kind === "quote"
                        ? lines.map((line) => `> ${line}`).join("\n")
                        : text
                            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                            .replace(/(\*\*|__|~~|`|<\/?u>)/g, "")
                            .replace(/^(\s*)([-*>]|\d+\.)\s+/gm, "$1");
    replaceSelectedText(
      next,
      context.isSelection
        ? context
        : {
            ...context,
            start: ["bold", "italic", "link"].includes(kind)
              ? context.start
              : 0,
            end: ["bold", "italic", "link"].includes(kind)
              ? context.end
              : context.current.length,
            text,
          },
    );
  };
  const runSelectionAiAction = (
    action: "improve" | "proofread" | "explain" | "longer" | "shorten" | "bullets" | "prompt",
    promptOverride?: string,
    targetOverride?: SelectionTarget,
  ) => {
    const context = getToolbarEditContext(targetOverride);
    setAiWriting("polish");
    const originalText = context.isSelection ? context.text : context.current;
    const leadingSpace = originalText.match(/^\s*/)?.[0] ?? "";
    const trailingSpace = originalText.match(/\s*$/)?.[0] ?? "";
    const selectedText = originalText.trim();
    const promptText = promptOverride ?? "";
    const direction = promptText.trim().toLowerCase();
    let next = selectedText;

    if (!selectedText) {
      next = buildDraftForActiveTarget(context.target, promptText);
      replaceSelectedText(next, context);
      return;
    }

    if (action === "improve") {
      next = applyEnhancerDirection(
        lightlyPolish(selectedText)
          .replace(/\binfo\b/gi, "information")
          .replace(/\basap\b/gi, "as soon as possible")
          .replace(/\bthing\b/gi, "item")
          .replace(/\bstuff\b/gi, "information"),
        "employee-facing",
      );
    } else if (action === "proofread") {
      next = lightlyPolish(selectedText)
        .replace(/\bi\b/g, "I")
        .replace(/\s+,/g, ",")
        .replace(/\s+\./g, ".");
    } else if (action === "explain") {
      next = `${selectedText}\n\nIn plain language, this means employees should follow the guidance when it matches their role, location, and timing.`;
    } else if (action === "longer") {
      const addedDetail =
        context.target.type === "summary"
          ? "This summary should also clarify who the article is for and when employees should use it."
          : context.target.type === "faqQuestion"
            ? "Make the question specific enough that employees can recognize their situation before opening the answer."
            : "Include the timing, ownership, exceptions, and next step employees should know before they act.";
      next = `${lightlyPolish(selectedText)}\n\n${addedDetail}`;
    } else if (action === "shorten") {
      next = trimToSentence(selectedText, 140);
    } else if (action === "bullets") {
      next = selectedText
        .split(/(?<=\.)\s+|\n+/)
        .filter(Boolean)
        .map((sentence) => `- ${sentence.trim()}`)
        .join("\n");
    } else if (direction.includes("short") || direction.includes("concise")) {
      next = trimToSentence(selectedText, 180);
    } else if (direction.includes("bullet")) {
      next = selectedText
        .split(/(?<=\.)\s+/)
        .filter(Boolean)
        .map((sentence) => `- ${sentence.trim()}`)
        .join("\n");
    } else if (direction.includes("formal")) {
      next = applyEnhancerDirection(lightlyPolish(selectedText), "formal");
    } else if (direction.includes("employee") || direction.includes("clear")) {
      next = applyEnhancerDirection(lightlyPolish(selectedText), "employee-facing");
    } else if (direction.includes("explain")) {
      next = `${selectedText}\n\nThis means the employee should confirm the required details before taking action.`;
    } else {
      next = applyEnhancerDirection(lightlyPolish(selectedText), "employee-facing");
    }

    replaceSelectedText(
      `${leadingSpace}${next}${trailingSpace}`,
      context.isSelection
        ? context
        : {
            ...context,
            start: 0,
            end: context.current.length,
            text: context.current,
          },
    );
  };
  const applyEnhancerDirection = (text: string, promptOverride?: string) => {
    const direction = (promptOverride ?? enhancerPrompt).trim().toLowerCase();
    if (!direction || !text.trim()) return text;
    if (direction.includes("employee")) {
      return lightlyPolish(
        text
          .replace(/\buser\b/gi, "employee")
          .replace(/\busers\b/gi, "employees")
          .replace(/\byour\b/gi, "your")
          .replace(/\bthe requester\b/gi, "the employee"),
      );
    }
    if (direction.includes("short") || direction.includes("concise")) {
      return trimToSentence(text, 260);
    }
    if (direction.includes("bullet")) {
      return text
        .split(/(?<=\.)\s+/)
        .filter(Boolean)
        .map((sentence) => `- ${sentence.trim()}`)
        .join("\n");
    }
    if (direction.includes("detail") || direction.includes("longer")) {
      return `${text}\n\nAdd any approved team-specific dates, examples, or exceptions before submitting for approval.`;
    }
    if (direction.includes("formal")) {
      return lightlyPolish(text.replace(/\byou\b/gi, "employees").replace(/\byour\b/gi, "the employee's"));
    }
    return text;
  };
  const getAssistantTargetLabel = () => {
    if (enhancerTarget === "article") return "Whole article";
    if (enhancerTarget === "lead") return "Summary";
    return targetSection?.label ?? "Selected block";
  };
  const buildAssistantFallback = () =>
    buildAiTemplateAnswers({
      title: form.title,
      contentType: form.contentType,
      lead:
        form.summary ||
        buildLeadFallback({
          title: form.title,
          contentType: form.contentType,
          audience: form.audience,
          countryLabels: selectedMarketLabels,
        }),
      audience: form.audience,
      countryLabels: selectedMarketLabels,
      sourceText: form.sourceText,
    });
  const generateAssistantSuggestion = (
    action: AssistantAction,
    promptOverride?: string,
    targetOverride?: string,
  ) => {
    const target = targetOverride ?? enhancerTarget;
    const targetField = articleSections.find((field) => field.key === target);
    const targetHasContent =
      target === "article"
        ? hasDraftContent
        : target === "lead"
          ? !!form.summary.trim()
          : targetField
            ? !!(articleAnswers[targetField.key] ?? "").trim()
            : false;
    if (action === "fill" && !hasAiSeed) return;
    if (action !== "fill" && !targetHasContent) return;

    setAiWriting(action === "fill" ? "draft" : "polish");
    const fallback = buildAssistantFallback();
    const targetLabel =
      target === "article"
        ? "Whole article"
        : target === "lead"
          ? "Summary"
          : targetField?.label ?? "Selected block";
    const effectivePrompt =
      promptOverride ?? (action === "employee" ? "employee-facing" : undefined);
    let suggestionText = "";

    if (target === "article") {
      if (action === "fill") {
        const lead =
          form.summary.trim() ||
          buildLeadFallback({
            title: form.title,
            contentType: form.contentType,
            audience: form.audience,
            countryLabels: selectedMarketLabels,
          });
        const answers =
          form.contentType === "FAQ"
            ? {
                [form.faqItems[0]?.id ?? "faq-1"]: fallback.answer ?? "",
              }
            : { ...fallback, ...articleAnswers };
        const fields =
          form.contentType === "FAQ" && form.faqItems[0]
            ? [
                {
                  ...articleSections[0],
                  label: form.faqItems[0].question.trim() || fallback.question,
                },
              ]
            : articleSections;
        suggestionText = buildArticleMarkdown({
          title: form.title,
          lead,
          fields,
          answers,
        });
      } else {
        suggestionText = applyEnhancerDirection(
          lightlyPolish(finalArticleBody),
          effectivePrompt,
        );
      }
    } else if (target === "lead") {
      const current =
        form.summary ||
        buildLeadFallback({
          title: form.title,
          contentType: form.contentType,
          audience: form.audience,
          countryLabels: selectedMarketLabels,
        });
      suggestionText =
        action === "fill"
          ? current
          : applyEnhancerDirection(lightlyPolish(current), effectivePrompt);
    } else if (targetField) {
      const current = articleAnswers[targetField.key] ?? "";
      const fallbackValue =
        fallback[targetField.faqItemId ? "answer" : targetField.key] ?? "";
      suggestionText =
        action === "fill"
          ? fallbackValue
          : applyEnhancerDirection(lightlyPolish(current), effectivePrompt);
    }

    if (suggestionText.trim()) {
      setAssistantSuggestion({
        action,
        target,
        targetLabel,
        text: suggestionText,
      });
      setEnhancerOpen(true);
    }
    window.setTimeout(() => setAiWriting(null), 250);
  };
  const applyAssistantSuggestion = () => {
    if (!assistantSuggestion) return;
    const suggestion = assistantSuggestion;
    if (suggestion.target === "article") {
      applyEnhancer(suggestion.action);
      setAssistantSuggestion(null);
      return;
    }
    if (suggestion.target === "lead") {
      update("summary", suggestion.text);
      setAssistantSuggestion(null);
      return;
    }
    const section = articleSections.find((field) => field.key === suggestion.target);
    if (section) setSectionValue(section, suggestion.text);
    setAssistantSuggestion(null);
  };
  const makeEditorTextBetter = (target: string) => {
    setAiWriting("polish");
    if (target === "lead") {
      const current = form.summary.trim();
      if (current) update("summary", applyEnhancerDirection(lightlyPolish(current), "employee-facing"));
      window.setTimeout(() => setAiWriting(null), 220);
      return;
    }
    const section = articleSections.find((field) => field.key === target);
    if (!section) {
      window.setTimeout(() => setAiWriting(null), 220);
      return;
    }
    const current = (articleAnswers[section.key] ?? "").trim();
    if (current) {
      setSectionValue(section, applyEnhancerDirection(lightlyPolish(current), "employee-facing"));
    }
    window.setTimeout(() => setAiWriting(null), 220);
  };
  const fillDraftWithAi = () => {
    if (!hasAiSeed) return;
    setAiWriting("draft");
    const generatedLead =
      form.summary.trim() ||
      buildLeadFallback({
        title: form.title,
        contentType: form.contentType,
        audience: form.audience,
        countryLabels: selectedMarketLabels,
      });
    const generated = buildAiTemplateAnswers({
      title: form.title,
      contentType: form.contentType,
      lead: generatedLead,
      audience: form.audience,
      countryLabels: selectedMarketLabels,
      sourceText: form.sourceText,
    });
    setForm((f) => {
      if (f.contentType === "FAQ") {
        const [first, ...rest] = f.faqItems;
        return {
          ...f,
          summary: f.summary.trim() ? f.summary : generatedLead,
          faqItems: [
            {
              ...first,
              question: first.question.trim() ? first.question : generated.question,
              answer: first.answer.trim() ? first.answer : generated.answer,
            },
            ...rest,
          ],
        };
      }
      return {
        ...f,
        summary: f.summary.trim() ? f.summary : generatedLead,
        templateAnswers: {
          ...generated,
          ...Object.fromEntries(
            Object.entries(f.templateAnswers).filter(([, value]) => value.trim()),
          ),
        },
      };
    });
    window.setTimeout(() => setAiWriting(null), 350);
  };
  const polishDraftWithAi = (promptOverride?: string) => {
    if (!hasDraftContent) return;
    setAiWriting("polish");
    const fallback = buildAiTemplateAnswers({
      title: form.title,
      contentType: form.contentType,
      lead:
        form.summary ||
        buildLeadFallback({
          title: form.title,
          contentType: form.contentType,
          audience: form.audience,
          countryLabels: selectedMarketLabels,
        }),
      audience: form.audience,
      countryLabels: selectedMarketLabels,
      sourceText: form.sourceText,
    });
    setForm((f) => {
      const summary = applyEnhancerDirection(lightlyPolish(
        f.summary ||
          buildLeadFallback({
            title: f.title,
            contentType: f.contentType,
            audience: f.audience,
            countryLabels: selectedMarketLabels,
          }),
      ), promptOverride);
      if (f.contentType === "FAQ") {
        return {
          ...f,
          summary,
          faqItems: f.faqItems.map((item, index) => ({
            ...item,
            question:
              item.question.trim() ||
              (index === 0 ? fallback.question : `Question ${index + 1}`),
            answer: applyEnhancerDirection(lightlyPolish(item.answer || fallback.answer || ""), promptOverride),
          })),
        };
      }
      return {
        ...f,
        summary,
        templateAnswers: Object.fromEntries(
          requiredArticleSections.map((field) => [
            field.key,
            applyEnhancerDirection(lightlyPolish(f.templateAnswers[field.key] || fallback[field.key] || ""), promptOverride),
          ]),
        ),
      };
    });
    window.setTimeout(() => setAiWriting(null), 350);
  };
  const applyEnhancer = (action: "fill" | "polish" | "employee") => {
    if (enhancerTarget === "article") {
      if (action === "fill") fillDraftWithAi();
      else polishDraftWithAi(action === "employee" ? "employee-facing" : undefined);
      return;
    }
    if (enhancerTarget === "lead") {
      if (action !== "fill" && !form.summary.trim()) return;
      setAiWriting(action === "fill" ? "draft" : "polish");
      const nextLead =
        action === "fill"
          ? buildLeadFallback({
              title: form.title,
              contentType: form.contentType,
              audience: form.audience,
              countryLabels: selectedMarketLabels,
            })
          : lightlyPolish(form.summary);
      update("summary", applyEnhancerDirection(nextLead, action === "employee" ? "employee-facing" : undefined));
      window.setTimeout(() => setAiWriting(null), 300);
      return;
    }
    if (!targetSection) return;
    const current = articleAnswers[targetSection.key] ?? "";
    if (action !== "fill" && !current.trim()) return;
    if (action === "fill" && !hasAiSeed) return;

    setAiWriting(action === "fill" ? "draft" : "polish");
    const fallback = buildAiTemplateAnswers({
      title: form.title,
      contentType: form.contentType,
      lead:
        form.summary ||
        buildLeadFallback({
          title: form.title,
          contentType: form.contentType,
          audience: form.audience,
          countryLabels: selectedMarketLabels,
        }),
      audience: form.audience,
      countryLabels: selectedMarketLabels,
      sourceText: form.sourceText,
    });
    const nextValue =
      action === "fill"
        ? fallback[targetSection.faqItemId ? "answer" : targetSection.key] ?? current
        : lightlyPolish(current);
    setSectionValue(targetSection, applyEnhancerDirection(nextValue, action === "employee" ? "employee-facing" : undefined));
    window.setTimeout(() => setAiWriting(null), 300);
  };

  const renderInlineEditorTools = (
    target: SelectionTarget,
    options?: { inline?: boolean },
  ) => {
    const isActive =
      !!activeInlineEditorTarget &&
      sameSelectionTarget(activeInlineEditorTarget, target);
    if (!isActive) return null;
    const hasText = !!getSelectionTargetValue(target).trim();
    return (
      <Box
        data-inline-editor-tools="true"
        onMouseDown={(event) => event.preventDefault()}
        sx={{
          width: options?.inline ? "auto" : "100%",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          mb: options?.inline ? 0 : 0.75,
          flexShrink: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={0.25}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{
            display: "inline-flex",
            px: 0.5,
            py: 0.35,
            borderRadius: "8px",
            bgcolor: t.surfaceContainerLow,
            border: `1px solid ${t.articleDivider}`,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Button
            size="small"
            title="Bold selected text"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              formatSelectedText("bold", target);
            }}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              p: 0,
              color: t.ink,
              borderRadius: 1,
              "&:hover": { bgcolor: "#FFFFFF" },
            }}
          >
            <FormatBoldIcon sx={{ fontSize: 16 }} />
          </Button>
          <Button
            size="small"
            title="Italic selected text"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              formatSelectedText("italic", target);
            }}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              p: 0,
              color: t.ink,
              borderRadius: 1,
              "&:hover": { bgcolor: "#FFFFFF" },
            }}
          >
            <FormatItalicIcon sx={{ fontSize: 16 }} />
          </Button>
          <Button
            size="small"
            title="Bulleted list"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              formatSelectedText("bullet", target);
            }}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              p: 0,
              color: t.ink,
              borderRadius: 1,
              "&:hover": { bgcolor: "#FFFFFF" },
            }}
          >
            <FormatListBulletedIcon sx={{ fontSize: 16 }} />
          </Button>
          <Button
            size="small"
            title="Numbered list"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              formatSelectedText("numbered", target);
            }}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              p: 0,
              color: t.ink,
              borderRadius: 1,
              "&:hover": { bgcolor: "#FFFFFF" },
            }}
          >
            <FormatListNumberedIcon sx={{ fontSize: 16 }} />
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!!aiWriting || !hasText}
            onClick={(event) => {
              setImproveMenuAnchor(event.currentTarget);
              setImproveMenuTarget(target);
            }}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 15 }} />}
            sx={{
              ml: 0.25,
              minHeight: 28,
              px: 1.1,
              borderRadius: "8px",
              borderColor: t.articleDivider,
              color: t.pepsiBlueStrong,
              fontSize: "0.6875rem",
              fontWeight: 750,
              textTransform: "none",
              bgcolor: "#FFFFFF",
              "&:hover": {
                borderColor: t.pepsiBlue,
                bgcolor: t.pepsiBlueSubtle,
              },
              "&.Mui-disabled": { color: t.granite },
            }}
          >
            Improve
          </Button>
        </Stack>
      </Box>
    );
  };
  const improveActions = [
    { label: "Improve writing", action: "improve" },
    { label: "Proofread", action: "proofread" },
    { label: "Make longer", action: "longer" },
    { label: "Make shorter", action: "shorten" },
    { label: "Turn into bullets", action: "bullets" },
  ] as const;
  const applyImproveMenuAction = (action: (typeof improveActions)[number]["action"]) => {
    const target = improveMenuTarget;
    setImproveMenuAnchor(null);
    setImproveMenuTarget(null);
    setActiveInlineEditorTarget(null);
    if (!target) return;
    window.setTimeout(() => {
      runSelectionAiAction(action, undefined, target);
    }, 0);
  };
  const articleCreatorInputSx = {
    "& .MuiInputLabel-root": {
      color: t.granite,
      fontSize: "0.75rem",
      fontFamily: theme.palette.fonts.articleBody,
      fontWeight: 600,
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: t.pepsiBlue,
    },
    "& .MuiInputBase-root": {
      bgcolor: "#FFFFFF",
      borderRadius: "8px",
      border: `1px solid ${t.articleDivider}`,
      fontFamily: theme.palette.fonts.articleBody,
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.55,
      transition: "border-color 140ms, background-color 140ms, box-shadow 140ms",
      "&:before, &:after": { display: "none" },
    },
    "& .MuiInputBase-root:hover": {
      bgcolor: "#FFFFFF",
      borderColor: t.borderStrong,
    },
    "& .MuiInputBase-root.Mui-focused": {
      bgcolor: "#FFFFFF",
      borderColor: t.pepsiBlue,
      boxShadow: "0 1px 0 rgba(0, 75, 147, 0.16)",
    },
    "& .MuiFilledInput-input": {
      px: 1.5,
      pt: 1.35,
      pb: 0.75,
    },
    "& .MuiFilledInput-inputMultiline": {
      pt: 1.35,
      pb: 0.75,
    },
    "& .MuiFormHelperText-root": {
      mx: 0,
      mt: 0.5,
      fontSize: "0.6875rem",
      color: t.granite,
      fontFamily: theme.palette.fonts.articleBody,
    },
  } as const;
  const topicResourceInputSx = {
    ...articleCreatorInputSx,
    "& .MuiInputBase-root": {
      ...articleCreatorInputSx["& .MuiInputBase-root"],
      minHeight: 64,
      alignItems: "flex-start",
    },
    "& .MuiFilledInput-input": {
      px: 1.5,
      pt: 2.6,
      pb: 1,
      fontSize: "0.875rem",
      lineHeight: 1.35,
    },
    "& .MuiFilledInput-inputMultiline": {
      pt: 2.6,
      pb: 1,
    },
    "& .MuiInputBase-input::placeholder": {
      color: t.granite,
      opacity: 0.72,
      fontSize: "0.875rem",
    },
  } as const;

  const submitStandardization = async () => {
    setMigrationSubmitting(true);
    setError(null);
    try {
      const result = await api.standardizeMigration({
        ...migrationForm,
        countries: derivedMigrationCountries,
        sourceTitle:
          migrationForm.sourceTitle.trim() || "Migrated source content",
        sourceContent: migrationForm.sourceContent.trim(),
        submittedBy: currentUser(),
      });
      navigate(`/articles/${result.article.id}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setMigrationSubmitting(false);
    }
  };

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
        knowledgeBase: form.knowledgeBase,
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
        sourceText: [
          "## mypepsico publishing controls",
          publishingFields.map((field) => `- ${field.label}: ${field.value || "Not selected"}`).join("\n"),
          `- Knowledge base id: ${form.knowledgeBase}`,
          `- Owner: ${me.name} (${me.email})`,
          `- Approver: ${selectedApprover.name} (${selectedApprover.email})`,
          `- askpep ready after approval: ${form.vaReady ? "Yes" : "No"}`,
          `- Article body length: ${articleBodyCharacterCount} characters (${lengthStatus.label})`,
          "## Reviewed article body",
          finalArticleBody,
          form.sourceText.trim()
            ? `## Source notes\n\n${form.sourceText.trim()}`
            : "",
        ].filter(Boolean).join("\n\n"),
        finalArticleBody,
        submittedBy: me,
        approver: selectedApprover,
        countries: derivedCountries,
        seo: {
          title: generatedSearch.title,
          metaDescription: generatedSearch.description,
          keywords: generatedSearch.keywords,
          summary: generatedSearch.description,
          keyQuestions: generatedSearch.questions,
          entities: generatedSearch.keywords,
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
  if (personaMode !== "non-admin") {
    return (
      <Alert severity="info">
        Article creation is available to Content Owners. Team Admins and Super Admins manage review, governance, and published content.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: currentStep === 2 ? 1600 : 1280, mx: "auto" }}>
      <Box
        sx={{
          mb: currentStep === 1 ? 8 : 4,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h4" component="h1">
              {currentStep === 0 ? "New Article" : `New ${selectedContentTypeLabel}`}
            </Typography>
            {currentStep === 1 && (
              <Typography sx={{ mt: 0.75, fontSize: "0.8125rem", color: t.granite, lineHeight: 1.5, maxWidth: 620 }}>
                Draft the employee-facing content. Put the answer near the top, write in plain language, and keep important facts in text.
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {STEP_LABELS.map((label, i) => {
              const active = i === currentStep;
              const enabled = i < currentStep;
              return (
                <Stack key={label} direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="text"
                    disabled={!enabled || active}
                    onClick={() => goToStep(i)}
                    sx={{
                      minWidth: 0,
                      px: 0,
                      py: 0,
                      borderRadius: 0,
                      color: active ? t.pepsiBlueStrong : enabled ? t.pepsiBlue : t.granite,
                      fontWeight: active ? 800 : 500,
                      fontSize: "0.875rem",
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: "transparent",
                        color: t.pepsiBlueStrong,
                        textDecoration: enabled ? "underline" : "none",
                        textUnderlineOffset: "3px",
                      },
                      "&.Mui-disabled": {
                        color: active ? t.pepsiBlueStrong : t.granite,
                        WebkitTextFillColor: active ? t.pepsiBlueStrong : t.granite,
                        opacity: 1,
                      },
                    }}
                  >
                    {label}
                  </Button>
                  {i < STEP_LABELS.length - 1 && (
                    <Typography sx={{ color: t.granite, fontSize: "1.25rem", lineHeight: 1 }}>
                      ›
                    </Typography>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Menu
        anchorEl={improveMenuAnchor}
        open={!!improveMenuAnchor && !!improveMenuTarget}
        onClose={() => {
          setImproveMenuAnchor(null);
          setImproveMenuTarget(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 184,
              borderRadius: "8px",
              border: `1px solid ${t.articleDivider}`,
              boxShadow: "0 10px 28px rgba(17, 24, 39, 0.12)",
              "& .MuiMenu-list": { py: 0.5 },
            },
          },
        }}
      >
        {improveActions.map((item) => (
          <MenuItem
            key={item.action}
            onClick={() => applyImproveMenuAction(item.action)}
            sx={{
              mx: 0.5,
              my: 0.125,
              borderRadius: 1,
              fontFamily: theme.palette.fonts.articleBody,
              fontSize: "0.8125rem",
              color: t.ink,
              "&:hover": { bgcolor: t.pepsiBlueSubtle },
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>

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

        <Box sx={{ pt: 3, mt: 0.5 }}>
          <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: t.ink, lineHeight: 1.2 }}>
            Publishing setup
          </Typography>
          <Typography sx={{ mt: 0.65, fontSize: "0.875rem", color: t.granite, lineHeight: 1.55, maxWidth: 620 }}>
            Choose where this article applies and who can read it.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5}>
          <Field
            label="Knowledge base"
            required
            sx={{ flex: 1 }}
            hint="Choose the destination collection where this article should live."
          >
            <TextField
              select
              fullWidth
              value={form.knowledgeBase}
              onChange={(e) => update("knowledgeBase", e.target.value)}
              SelectProps={{
                MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
              }}
            >
              {knowledgeBases.map((kb) => (
                <MenuItem key={kb.id} value={kb.id} sx={{ py: 0.75 }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
                      {kb.name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.6875rem", color: t.granite, lineHeight: 1.35 }}>
                      {kb.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Field>

          {/* ─── Sector (cascade parent) ─── */}
          <Field
            label="Sector"
            required
            sx={{ flex: 1 }}
            hint={
              isGlobal
                ? "Corporate content — one version, no country-specific drafting."
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

          {/* ─── Countries (cascade from Sector) ─── */}
          {!isGlobal && (
            <Field
              label="Country"
              required
              sx={{ flex: 1 }}
              hint={
                marketsInSector.length === 0
                  ? "No countries assigned to this sector yet."
                  : "Choose the country context. These tags boost relevance but do not secure content."
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
                          Select countries...
                        </Typography>
                      );
                    }
                    const selectedMarkets = vals.map((v) => {
                      const profile = marketProfiles.find((p) => p.id === v);
                      return {
                        id: v,
                        name: profile?.name ?? MARKET_LABELS[v]?.label ?? v,
                        languageCode: profile?.languageCode ?? MARKET_LABELS[v]?.code,
                      };
                    });
                    const primary = selectedMarkets[0];
                    const countryText =
                      selectedMarkets.length === 1
                        ? primary.name
                        : `${primary.name} + ${selectedMarkets.length - 1} more`;
                    const languageText = Array.from(
                      new Set(
                        selectedMarkets
                          .map((m) => m.languageCode)
                          .filter((code): code is string => !!code && code !== "all"),
                      ),
                    )
                      .map(displayLanguage)
                      .join(", ");
                    return (
                      <Box sx={{ minWidth: 0 }}>
                        <Typography component="span" sx={{ display: "block", fontSize: "0.875rem", color: t.ink }}>
                          {countryText}
                        </Typography>
                        {languageText && (
                          <Typography component="span" sx={{ display: "block", fontSize: "0.6875rem", color: t.granite, lineHeight: 1.25 }}>
                            {languageText}
                          </Typography>
                        )}
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
                            }}
                          >
                            {displayLanguage(m.languageCode)}
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

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}>
          {/* ─────────── Audience ─────────── */}
          <Field
            label="Who can read it"
            required
            sx={{ flex: 1 }}
            hint="Only selected groups can access this article. People outside the selected groups are excluded."
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
                        Select who can read...
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

          <Field
            label="Approver"
            required
            sx={{ flex: 1 }}
            hint={`Prefilled from ${me.name}'s manager. Change it only if another owner must approve this article.`}
          >
            <TextField
              select
              fullWidth
              value={form.approverEmail}
              onChange={(e) => update("approverEmail", e.target.value)}
            >
              {approverOptions.map((person) => (
                <MenuItem key={person.email} value={person.email}>
                  <Box>
                    <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
                      {person.name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.6875rem", color: t.granite }}>
                      {person.role} · {person.email}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Field>
        </Stack>

      </Stack>
      )}

      {/* ─── Step 2: Content ─── */}
      {currentStep === 1 && (
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "flex-start" }}
        >
          <Box sx={{ width: "100%", minWidth: 0, maxWidth: 760 }}>
            <TextField
              fullWidth
              variant="standard"
              multiline
              minRows={1}
              value={form.title}
              placeholder="Untitled article"
              onChange={(e) => update("title", e.target.value)}
              InputProps={{ disableUnderline: true }}
              sx={{
                "& .MuiInputBase-input": {
                  fontFamily: theme.palette.fonts.articleTitle,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  letterSpacing: 0,
                  lineHeight: 1,
                  color: t.pepsiNavy,
                  px: 0,
                  py: 0,
                  whiteSpace: "normal",
                  overflow: "visible",
                  textOverflow: "clip",
                  wordBreak: "break-word",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: t.granite,
                  opacity: 1,
                },
              }}
            />
          </Box>
        </Stack>

        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={3}
          alignItems="flex-start"
        >
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: 760 }}>
          <Box sx={{ mb: 3, position: "relative" }}>
            {renderInlineEditorTools({ type: "summary", key: "lead" })}
            <TextField
              fullWidth
              variant="filled"
              label="Summary"
              multiline
              minRows={2}
              InputLabelProps={{ shrink: true }}
              helperText={
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <span>Employees see this above the article. One or two sentences is enough.</span>
                  <span>{form.summary.length.toLocaleString()} characters</span>
                </Stack>
              }
              FormHelperTextProps={{
                sx: {
                  mx: 0,
                  fontSize: "0.6875rem",
                  color: t.granite,
                },
              }}
              placeholder="Example: Use this FAQ to learn how payroll direct deposit changes work."
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              InputProps={{ disableUnderline: true }}
              inputProps={editorSelectionProps({ type: "summary", key: "lead" })}
              sx={{
                ...articleCreatorInputSx,
                "& .MuiInputBase-root": {
                  ...articleCreatorInputSx["& .MuiInputBase-root"],
                  fontSize: "0.875rem",
                  color: t.inkSoft,
                },
              }}
            />
          </Box>

          {form.contentType === "Policy" && (
            <Box sx={{ mb: 3.25 }}>
              <Typography
                sx={{
                  fontFamily: theme.palette.fonts.articleBody,
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: t.granite,
                  mb: 1.25,
                }}
              >
                Policy at a glance
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 1.25,
                }}
              >
                {[
                  ["effectiveDate", "Effective date", "When this policy starts"],
                  ["nextReviewDate", "Next review", "When this article should be checked again"],
                  ["policyOwner", "Policy owner", "Team, role, or person accountable"],
                  ["exceptionApprover", "Exception approver", "Who can approve exceptions"],
                ].map(([key, label, placeholder]) => (
                  <TextField
                    key={key}
                    fullWidth
                    variant="filled"
                    label={label}
                    placeholder={placeholder}
                    value={form.policyMeta[key as keyof typeof form.policyMeta]}
                    onChange={(event) =>
                      updatePolicyMeta(
                        key as keyof typeof form.policyMeta,
                        event.target.value,
                      )
                    }
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ disableUnderline: true }}
                    sx={articleCreatorInputSx}
                  />
                ))}
              </Box>
            </Box>
          )}

          {form.contentType === "Topic Page" && (
            <Box sx={{ mb: 3.25 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
                <Typography
                  sx={{
                    fontFamily: theme.palette.fonts.articleBody,
                    fontSize: "0.6875rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: t.granite,
                  }}
                >
                  Resource links
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={addTopicResource}
                  startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    minHeight: 28,
                    borderRadius: "8px",
                    textTransform: "none",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  Add resource
                </Button>
              </Stack>
              <Stack spacing={1.25}>
                {form.topicResources.map((resource, resourceIndex) => (
                  <Box
                    key={resource.id}
                    sx={{
                      p: 1.25,
                      borderRadius: "8px",
                      bgcolor: "#FFFFFF",
                      border: `1px solid ${t.articleDivider}`,
                    }}
                  >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                      <TextField
                        fullWidth
                        variant="filled"
                        label="Resource title"
                        placeholder={`Resource ${resourceIndex + 1}`}
                        value={resource.label}
                        onChange={(event) =>
                          updateTopicResource(resource.id, { label: event.target.value })
                        }
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ disableUnderline: true }}
                        sx={topicResourceInputSx}
                      />
                      <TextField
                        fullWidth
                        variant="filled"
                        label="Link"
                        placeholder="https://"
                        value={resource.url}
                        onChange={(event) =>
                          updateTopicResource(resource.id, { url: event.target.value })
                        }
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ disableUnderline: true }}
                        sx={topicResourceInputSx}
                      />
                      {form.topicResources.length > 1 && (
                        <IconButton
                          size="small"
                          title="Remove resource"
                          onClick={() => removeTopicResource(resource.id)}
                          sx={{
                            alignSelf: { xs: "flex-start", sm: "center" },
                            color: t.granite,
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      )}
                    </Stack>
                    <TextField
                      fullWidth
                      variant="filled"
                      label="Description"
                      multiline
                      minRows={2}
                      placeholder="When should employees use this resource?"
                      value={resource.description}
                      onChange={(event) =>
                        updateTopicResource(resource.id, { description: event.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ disableUnderline: true }}
                      sx={{ mt: 1.25, ...topicResourceInputSx }}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <Stack spacing={0}>
            {articleSections.map((field, index) => {
              const faqItem = field.faqItemId
                ? form.faqItems.find((item) => item.id === field.faqItemId)
                : null;
              const customSection = field.customId
                ? form.customSections.find((section) => section.id === field.customId)
                : null;
              const sectionValue = articleAnswers[field.key] ?? "";
              const knowledgeStepValues =
                form.contentType === "Knowledge Article" && field.key === "steps"
                  ? knowledgeStepsForEditor(sectionValue)
                  : [];
              return (
                <Box
                  key={field.key}
                  sx={{
                    pt: index === 0 ? 0.5 : 3,
                    pb: 3,
                    position: "relative",
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {field.faqItemId ? (
                        <Box sx={{ mb: 1.25 }}>
                          {renderInlineEditorTools({
                            type: "faqQuestion",
                            key: field.key,
                            faqItemId: field.faqItemId,
                          })}
                          <TextField
                            fullWidth
                            variant="filled"
                            label="Question"
                            multiline
                            minRows={1}
                            placeholder={`Question ${index + 1}`}
                            InputLabelProps={{ shrink: true }}
                            helperText={`${(faqItem?.question ?? "").length.toLocaleString()} characters`}
                            FormHelperTextProps={{
                              sx: {
                                mx: 0,
                                textAlign: "right",
                                fontSize: "0.6875rem",
                                color: t.granite,
                              },
                            }}
                            value={faqItem?.question ?? ""}
                            onChange={(e) =>
                              updateFaqItem(field.faqItemId!, { question: e.target.value })
                            }
                            InputProps={{ disableUnderline: true }}
                            inputProps={editorSelectionProps({
                              type: "faqQuestion",
                              key: field.key,
                              faqItemId: field.faqItemId,
                            })}
                            sx={{
                              ...articleCreatorInputSx,
                              "& .MuiInputBase-root": {
                                ...articleCreatorInputSx["& .MuiInputBase-root"],
                                fontSize: "1.0625rem",
                                fontWeight: 650,
                                color: t.pepsiNavy,
                              },
                            }}
                          />
                        </Box>
                      ) : field.customId ? (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <TextField
                            fullWidth
                            variant="standard"
                            placeholder="Section title"
                            value={customSection?.title ?? ""}
                            onChange={(e) =>
                              updateCustomSection(field.customId!, { title: e.target.value })
                            }
                            InputProps={{ disableUnderline: true }}
                            sx={{
                              "& .MuiInputBase-input": {
                                fontFamily: theme.palette.fonts.articleBody,
                                fontSize: "1.25rem",
                                fontWeight: 600,
                                lineHeight: 1.05,
                                color: t.pepsiBlue,
                                px: 0,
                                py: 0.25,
                              },
                            }}
                          />
                          {!isFaq && (
                            <IconButton
                              size="small"
                              title="Edit section title"
                              tabIndex={-1}
                              sx={{
                                flexShrink: 0,
                                color: t.granite,
                                width: 24,
                                height: 24,
                                p: 0,
                                opacity: 0.55,
                                "&:hover": {
                                  opacity: 1,
                                  bgcolor: t.surfaceContainerLow,
                                  color: t.pepsiBlue,
                                },
                              }}
                            >
                              <EditOutlinedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() => removeCustomSection(field.customId!)}
                            startIcon={<DeleteOutlineIcon sx={{ fontSize: 15 }} />}
                            sx={{
                              flexShrink: 0,
                              mt: -0.25,
                              color: t.granite,
                              fontSize: "0.75rem",
                              textTransform: "none",
                            }}
                          >
                            Remove
                          </Button>
                          {!isFaq &&
                            renderInlineEditorTools(
                              {
                                type: "section",
                                key: field.key,
                                faqItemId: field.faqItemId,
                              },
                              { inline: true },
                            )}
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                          <TextField
                            fullWidth
                            variant="standard"
                            value={field.label}
                            onChange={(e) => updateSectionHeading(field.key, e.target.value)}
                            InputProps={{ disableUnderline: true }}
                            sx={{
                              flex: 1,
                              "& .MuiInputBase-input": {
                                fontFamily: theme.palette.fonts.articleBody,
                                fontSize: "1.25rem",
                                fontWeight: 600,
                                lineHeight: 1.05,
                                color: t.pepsiBlue,
                                px: 0,
                                py: 0.25,
                              },
                            }}
                          />
                          {!isFaq && (
                            <IconButton
                              size="small"
                              title="Edit section title"
                              tabIndex={-1}
                              sx={{
                                flexShrink: 0,
                                color: t.granite,
                                width: 24,
                                height: 24,
                                p: 0,
                                opacity: 0.55,
                                "&:hover": {
                                  opacity: 1,
                                  bgcolor: t.surfaceContainerLow,
                                  color: t.pepsiBlue,
                                },
                              }}
                            >
                              <EditOutlinedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                          {!isFaq &&
                            renderInlineEditorTools(
                              {
                                type: "section",
                                key: field.key,
                                faqItemId: field.faqItemId,
                              },
                              { inline: true },
                            )}
                        </Stack>
                      )}
                      {isFaq &&
                        renderInlineEditorTools({
                          type: "section",
                          key: field.key,
                          faqItemId: field.faqItemId,
                        })}
                      {form.contentType === "Knowledge Article" && field.key === "steps" ? (
                        <Stack
                          spacing={0.5}
                          sx={{
                            py: 0.5,
                          }}
                        >
                          {knowledgeStepValues.map((step, stepIndex) => (
                            <Box
                              key={`${field.key}-${stepIndex}`}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: knowledgeStepValues.length > 1 ? "28px 1fr 28px" : "28px 1fr",
                                columnGap: 1,
                                alignItems: "flex-start",
                                py: 0.35,
                                borderBottom:
                                  stepIndex === knowledgeStepValues.length - 1
                                    ? "none"
                                    : `1px solid ${t.articleDivider}`,
                              }}
                            >
                              <Box
                                sx={{
                                  minHeight: 32,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  textAlign: "right",
                                  color: t.pepsiBlueStrong,
                                  fontFamily: theme.palette.fonts.articleBody,
                                  fontSize: "0.875rem",
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                {stepIndex + 1}.
                              </Box>
                              <TextField
                                fullWidth
                                variant="standard"
                                multiline
                                minRows={1}
                                placeholder={
                                  stepIndex === 0
                                    ? "Start with the first action the employee should take."
                                    : "Add the next action."
                                }
                                value={step}
                                InputProps={{ disableUnderline: true }}
                                onChange={(event) =>
                                  updateKnowledgeStep(stepIndex, event.target.value)
                                }
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  "& .MuiInputBase-root": {
                                    alignItems: "flex-start",
                                  },
                                  "& .MuiInputBase-input": {
                                    fontFamily: theme.palette.fonts.articleBody,
                                    fontSize: "0.875rem",
                                    fontWeight: 500,
                                    lineHeight: 1.6,
                                    color: t.inkSoft,
                                    px: 0,
                                    py: 0.35,
                                  },
                                  "& .MuiInputBase-input::placeholder": {
                                    color: t.granite,
                                    opacity: 0.75,
                                  },
                                }}
                              />
                              {knowledgeStepValues.length > 1 && (
                                <IconButton
                                  size="small"
                                  title="Remove step"
                                  onClick={() => removeKnowledgeStep(stepIndex)}
                                  sx={{
                                    mt: 0,
                                    width: 24,
                                    height: 32,
                                    p: 0,
                                    color: t.granite,
                                    opacity: 0.6,
                                    "&:hover": {
                                      opacity: 1,
                                      bgcolor: t.surfaceContainerLow,
                                      color: t.ink,
                                    },
                                  }}
                                >
                                  <CloseIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              )}
                            </Box>
                          ))}
                          <Button
                            variant="text"
                            onClick={addKnowledgeStep}
                            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                            sx={{
                              alignSelf: "flex-start",
                              mt: 0.5,
                              px: 0,
                              color: t.pepsiBlueStrong,
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              textTransform: "none",
                            }}
                          >
                            Add step
                          </Button>
                        </Stack>
                      ) : (
                        <TextField
                          fullWidth
                          variant="filled"
                          label={field.faqItemId ? "Answer" : "Body"}
                          multiline
                          minRows={field.minRows ?? 3}
                          InputLabelProps={{ shrink: true }}
                          placeholder={field.placeholder}
                          helperText={`${sectionValue.length.toLocaleString()} characters`}
                          FormHelperTextProps={{
                            sx: {
                              mx: 0,
                              textAlign: "right",
                              fontSize: "0.6875rem",
                              color: t.granite,
                            },
                          }}
                          value={sectionValue}
                          InputProps={{ disableUnderline: true }}
                          inputProps={editorSelectionProps({
                            type: "section",
                            key: field.key,
                            faqItemId: field.faqItemId,
                          })}
                          onChange={(e) => setSectionValue(field, e.target.value)}
                          sx={{
                            ...articleCreatorInputSx,
                            "& .MuiInputBase-root": {
                              ...articleCreatorInputSx["& .MuiInputBase-root"],
                              fontSize: "0.875rem",
                            },
                          }}
                        />
                      )}
                      {field.faqItemId && form.faqItems.length > 1 && (
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          onClick={() => removeFaqItem(field.faqItemId!)}
                          sx={{ mt: 0.5, px: 0, fontSize: "0.75rem", color: t.granite }}
                        >
                          Remove question
                        </Button>
                      )}
                    </Box>
                  </Stack>
                </Box>
              );
            })}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ pt: 0.75 }}>
              {isFaq && (
                <Button
                  variant="outlined"
                  onClick={() => addFaqItem()}
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    borderRadius: 999,
                    color: t.pepsiBlueStrong,
                    borderColor: t.articleDivider,
                    bgcolor: "#FFFFFF",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: t.pepsiBlue,
                      bgcolor: t.pepsiBlueSubtle,
                    },
                  }}
                >
                  Add question
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={addCustomSection}
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                sx={{
                  borderRadius: 999,
                  color: t.pepsiBlueStrong,
                  borderColor: t.articleDivider,
                  bgcolor: "#FFFFFF",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": {
                    borderColor: t.pepsiBlue,
                    bgcolor: t.pepsiBlueSubtle,
                  },
                }}
              >
                Add section
              </Button>
            </Stack>

          </Stack>
        </Box>

        <Box
          sx={{
            width: { xs: "100%", lg: 320 },
            position: { lg: "sticky" },
            top: { lg: 24 },
            pl: { xs: 0, lg: 2 },
            py: 0.5,
            borderLeft: { xs: "none", lg: `1px solid ${t.border}` },
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: t.ink }}>
                Article support
              </Typography>
              <Typography sx={{ mt: 0.4, fontSize: "0.75rem", color: t.granite, lineHeight: 1.45 }}>
                Add source files and check nearby articles while you draft.
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: t.surfaceContainerLow,
                border: `1px solid ${t.border}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <AttachFileIcon sx={{ fontSize: 16, color: t.pepsiBlueStrong }} />
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: t.ink }}>
                  Source files
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: "0.75rem", color: t.slate, lineHeight: 1.45, mb: 1.25 }}>
                Upload approved PDFs or Word docs for reviewer evidence. Attachments support the article; they do not replace the text employees and askpep read.
              </Typography>
              <Button
                variant="outlined"
                component="label"
                size="small"
                startIcon={<AttachFileIcon sx={{ fontSize: 14 }} />}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Upload files
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
              {form.files.length > 0 ? (
                <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                  {form.files.map((f) => (
                    <Chip
                      key={f.name}
                      label={f.name}
                      size="small"
                      variant="outlined"
                      sx={{
                        justifyContent: "flex-start",
                        maxWidth: "100%",
                        "& .MuiChip-label": {
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        },
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ mt: 1.25, fontSize: "0.6875rem", color: t.granite }}>
                  No source files uploaded yet.
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: t.paper,
                border: `1px solid ${t.border}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LinkIcon sx={{ fontSize: 16, color: t.pepsiBlueStrong }} />
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: t.ink }}>
                    Related articles
                  </Typography>
                </Stack>
                {similarLoading && <CircularProgress size={13} sx={{ color: t.pepsiBlue }} />}
              </Stack>

              {replacesArticle ? (
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: t.pepsiBlueSubtle,
                    border: `1px solid ${t.pepsiBlue}`,
                  }}
                >
                  <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: t.pepsiBlueStrong, lineHeight: 1.35 }}>
                    Replacing
                  </Typography>
                  <Typography sx={{ mt: 0.4, fontSize: "0.8125rem", color: t.ink, lineHeight: 1.35 }}>
                    {replacesArticle.title}
                  </Typography>
                  <Typography sx={{ mt: 0.35, fontSize: "0.6875rem", color: t.granite, fontFamily: theme.palette.fonts.mono }}>
                    {replacesArticle.id} · {replacesArticle.market}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setReplacesArticle(null)}
                    startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                    sx={{ mt: 0.75, px: 0, fontSize: "0.75rem", textTransform: "none" }}
                  >
                    Clear replacement
                  </Button>
                </Box>
              ) : similarLoading ? (
                <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
                  Checking for similar articles...
                </Typography>
              ) : similarMatches.length > 0 ? (
                <Stack spacing={1}>
                  {similarMatches.slice(0, similarExpanded ? similarMatches.length : 3).map((m) => (
                    <Box
                      key={m.id}
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        bgcolor: t.surfaceContainerLow,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 650, color: t.ink, lineHeight: 1.35 }}>
                        {m.title}
                      </Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.6 }} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={`${Math.round(m.score * 100)}% match`} sx={{ height: 20, fontSize: "0.6875rem" }} />
                        <Typography sx={{ fontSize: "0.6875rem", color: t.granite }}>
                          {m.market} · {m.contentType}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                        <Button
                          size="small"
                          onClick={() => window.open(`/articles/${m.id}`, "_blank")}
                          startIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                          sx={{ px: 0, minHeight: 0, fontSize: "0.75rem", textTransform: "none" }}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setReplacesArticle(m)}
                          sx={{ px: 0, minHeight: 0, fontSize: "0.75rem", textTransform: "none" }}
                        >
                          Replace this
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                  {similarMatches.length > 3 && !similarExpanded && (
                    <Button
                      size="small"
                      onClick={() => setSimilarExpanded(true)}
                      sx={{ alignSelf: "flex-start", px: 0, fontSize: "0.75rem", textTransform: "none" }}
                    >
                      Show all {similarMatches.length}
                    </Button>
                  )}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: "0.75rem", color: t.slate, lineHeight: 1.45 }}>
                  Similar articles will appear here once the title and summary have enough detail.
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
        </Stack>

      </Stack>
      )}

      {/* ─── Step 3: Review ─── */}
      {currentStep === 2 && (
        <Stack spacing={3}>
          <Box>
            <Typography sx={{ fontSize: "1.35rem", fontWeight: 650, color: t.ink }}>
              Review what employees will see
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: "0.875rem", color: t.slate, maxWidth: "68ch" }}>
              Check the submission details first, then review the employee-facing article.
              Hover over a section in the article preview to edit it before submitting.
            </Typography>
          </Box>

          <Box sx={{ order: 2 }}>
            <ArticleReadingFrame
              body={finalArticleBody}
              tags={[
                form.contentType,
                selectedKnowledgeBase.name,
                ...selectedMarketLabelsWithLanguages,
              ]}
              selectedLocale={displayLanguage(detectedDraftLanguage)}
              availableLocales={[displayLanguage(detectedDraftLanguage)]}
              quickLinks={[
                {
                  label: `Approver: ${selectedApprover.name}`,
                  disabled: true,
                },
              ]}
              article={
                <ArticleDocument
                  body={finalArticleBody}
                  title={form.title}
                  lead={form.summary}
                  contentType={form.contentType}
                  market={previewMarket}
                  canonicalSlug="preview"
                  localeLabel={displayLanguage(detectedDraftLanguage)}
                  presentation="immersive"
                  showMasthead={false}
                  editableSections={reviewEditableSections}
                  editingKey={reviewEditKey}
                  onEdit={setReviewEditKey}
                  onDoneEditing={() => setReviewEditKey(null)}
                  onTitleChange={(value) => update("title", value)}
                  onLeadChange={(value) => update("summary", value)}
                  titleRecommendations={titleRecommendations}
                  leadRecommendations={leadRecommendations}
                />
              }
              details={[
                {
                  title: "Article details",
                  rows: [
                    { label: "Draft language", value: displayLanguage(detectedDraftLanguage) },
                    { label: "Type", value: form.contentType },
                    { label: "Knowledge base", value: selectedKnowledgeBase.name },
                    { label: "Who can read it", value: form.audience.join(", ") || "Not selected" },
                    { label: "Country", value: selectedMarketLabelsWithLanguages.join(", ") || "Not selected" },
                    { label: "Owner", value: me.name },
                    { label: "Approver", value: selectedApprover.name },
                    { label: "Status", value: "Draft for approval" },
                  ],
                },
                {
                  title: "Attachments",
                  children: form.files.length > 0 ? (
                    <Stack spacing={0.75}>
                      {form.files.map((file) => (
                        <Chip
                          key={file.name}
                          label={file.name}
                          size="small"
                          variant="outlined"
                          sx={{ justifyContent: "flex-start", maxWidth: "100%" }}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 650, color: t.ink }}>
                      No attachments found
                    </Typography>
                  ),
                },
                {
                  title: "Related path",
                  children: (
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.pepsiBlueStrong, lineHeight: 1.55 }}>
                      {selectedKnowledgeBase.name} › {selectedSectorLabel} › {form.contentType} › {form.title.trim() || "Untitled article"}
                    </Typography>
                  ),
                },
              ]}
            />
          </Box>

          <Stack
            spacing={0}
            sx={{
              order: 1,
              bgcolor: "#FFFFFF",
              border: `1px solid ${t.border}`,
              borderRadius: 2.5,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0, 46, 93, 0.06)",
            }}
          >
            <Accordion disableGutters elevation={0} sx={{ ...reviewAccordionSx, order: 0 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.ink }}>
                    Submission details
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
                    Scope, owner, files, and replacement links.
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.25}>
                  {[
                    ...publishingFields.map((field) => [field.label, field.value || "Not selected"] as [string, string]),
                    ["Title", form.title.trim() || "Untitled article"],
                    ["Type", form.contentType],
                    ["Owner", `${me.name} (${me.email})`],
                    ["Approver", `${selectedApprover.name} (${selectedApprover.role})`],
                    ["Source files", form.files.length ? `${form.files.length} uploaded` : "None uploaded"],
                    ["Replacement", replacesArticle?.title ?? "None selected"],
                  ].map(([label, value]) => (
                    <Box
                      key={label}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "132px 1fr" },
                        gap: { xs: 0.25, sm: 2 },
                      }}
                    >
                      <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontSize: "0.875rem", color: t.ink, lineHeight: 1.45 }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters elevation={0} sx={{ ...reviewAccordionSx, order: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.ink }}>
                    How employees will find it
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
                    Auto-generated search text. No expertise needed.
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.75}>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: t.granite, mb: 0.5 }}>
                      Search title
                    </Typography>
                    <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, color: t.ink }}>
                      {generatedSearch.title}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: t.granite, mb: 0.5 }}>
                      Search description
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: t.slate, lineHeight: 1.6 }}>
                      {generatedSearch.description}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: t.granite, mb: 0.75 }}>
                      Search terms
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {generatedSearch.keywords.length > 0 ? (
                        generatedSearch.keywords.map((keyword) => (
                          <Chip key={keyword} label={keyword} size="small" />
                        ))
                      ) : (
                        <Typography sx={{ fontSize: "0.8125rem", color: t.slate }}>
                          Search terms will be generated after the title and summary are filled.
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: t.granite, mb: 0.5 }}>
                      Likely employee question
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: t.ink, lineHeight: 1.5 }}>
                      {generatedSearch.questions.join(" ")}
                    </Typography>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion
              disableGutters
              elevation={0}
              sx={{ ...reviewAccordionSx, order: 2, borderBottom: 0 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.ink }}>
                    askpep and publish readiness
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
                    Plain-language checks based on the mypepsico guidelines.
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Checkbox
                      checked={form.vaReady}
                      onChange={(e) => update("vaReady", e.target.checked)}
                      size="small"
                      sx={{ p: 0.25 }}
                    />
                    <Box>
                      <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.ink }}>
                        Recommend as ready for askpep after approval
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: t.granite, lineHeight: 1.45 }}>
                        Only keep this on when the article is accurate, current, audience-scoped, and readable as plain text.
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: t.surfaceContainerLow }}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: t.ink }}>
                        Article length
                      </Typography>
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 800, color: lengthToneColor }}>
                        {articleBodyCharacterCount.toLocaleString()} characters · {lengthStatus.label}
                      </Typography>
                    </Stack>
                    <Typography sx={{ mt: 0.5, fontSize: "0.75rem", color: t.slate, lineHeight: 1.45 }}>
                      {lengthStatus.helper}
                    </Typography>
                  </Box>

                  {recommendedReviewUpdates.length > 0 && (
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        bgcolor: "#FFFFFF",
                        border: `1px solid ${t.articleDivider}`,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 750, color: t.ink }}>
                        Recommended updates before submitting
                      </Typography>
                      <Stack component="ul" spacing={0.6} sx={{ m: 0, mt: 0.8, pl: 2 }}>
                        {recommendedReviewUpdates.map((recommendation) => (
                          <Typography
                            key={recommendation}
                            component="li"
                            sx={{ fontSize: "0.75rem", color: t.slate, lineHeight: 1.45 }}
                          >
                            {recommendation}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {askpepChecks.map((item) => (
                    <Stack
                      key={item.label}
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      sx={{ fontSize: "0.8125rem", color: item.done ? t.ink : t.slate }}
                    >
                      <CheckCircleOutlineIcon
                        sx={{ fontSize: 15, color: item.done ? t.successInk : t.granite }}
                      />
                      <span>{item.label}</span>
                    </Stack>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
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
              {submitting ? "Submitting for approval…" : "Submit for approval"}
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
            country-specific agents draft locale-tuned versions. The Global sector is
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
