import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
  useTheme,
  keyframes,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SendIcon from "@mui/icons-material/Send";
import CheckIcon from "@mui/icons-material/Check";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Market, type ComplianceIssue, type ContentType } from "../lib/api";
import { localeFor } from "../lib/market";

// ────────────────────────────────────────────────────────────
// Section splitting — split body on `## ` H2 boundaries.
// First chunk before any ## is the "preamble" (typically the H1).
// ────────────────────────────────────────────────────────────
type Split = { preamble: string; sections: string[] };

function splitIntoSections(body: string): Split {
  const lines = body.split("\n");
  const sections: string[] = [];
  let current: string[] = [];
  let preambleLines: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (/^##\s/.test(line) && !/^###/.test(line)) {
      if (inSection) {
        sections.push(trimBlankEnds(current.join("\n")));
      } else {
        preambleLines = current;
      }
      current = [line];
      inSection = true;
    } else {
      current.push(line);
    }
  }
  if (inSection) sections.push(trimBlankEnds(current.join("\n")));
  else preambleLines = current;

  return {
    preamble: trimBlankEnds(preambleLines.join("\n")),
    sections,
  };
}

function trimBlankEnds(s: string): string {
  return s.replace(/^\n+|\n+$/g, "");
}

function rebuildBody(split: Split): string {
  const parts: string[] = [];
  if (split.preamble.trim()) parts.push(split.preamble);
  parts.push(...split.sections);
  return parts.join("\n\n");
}

// ────────────────────────────────────────────────────────────
// Highlight animation: a faint pepsi-blue glow that fades over ~1.5s
// after a section is saved, so the reviewer sees what just changed.
// ────────────────────────────────────────────────────────────
const flashHighlight = keyframes`
  0%   { background-color: rgba(0, 75, 147, 0.10); }
  100% { background-color: transparent; }
`;

// ────────────────────────────────────────────────────────────
type Props = {
  articleId: string;
  body: string;
  market: Market;
  title?: string;
  lead?: string;
  contentType?: ContentType;
  canonicalSlug?: string;
  /** Called after the body is updated and persisted. Parent should refresh. */
  onUpdated?: (newBody: string) => void;
  /** Phase C — compliance issues with optional `section` anchors. Used to
   * render inline flag badges next to the matching H2 sections. */
  complianceIssues?: ComplianceIssue[];
  /**
   * Phase 4 (Option A): controls whether per-section Edit affordances are
   * exposed. Off (default): document reads cleanly — no hover-Edit, no
   * section editor entry point. On: every section gets a persistent Edit
   * button + the SectionEditor can open inline.
   *
   * Compliance badges and AI fix cards still render regardless — those are
   * "guided actions" the reviewer should take, not arbitrary edits.
   */
  editMode?: boolean;
};

/**
 * Read the heading of a section. Returns the text after `## ` on the first
 * non-blank line, or null if the section has no heading (unusual but possible).
 */
function sectionHeading(markdown: string): string | null {
  const m = markdown.match(/^##\s+(.+?)\s*$/m);
  return m?.[1]?.trim() ?? null;
}

/**
 * Find compliance issues whose `section` field matches a given section heading
 * (case-insensitive substring). Issues without a section are article-wide —
 * those are returned by `globalExcerptIssues` below and applied to every
 * section's highlight pass so the offending phrase always gets called out
 * in the body even when the agent couldn't attribute it to one heading.
 *
 * Returns tuples with the ORIGINAL index in the full complianceIssues array
 * so dismiss actions can target the right backend record.
 */
function issuesForSection(
  heading: string | null,
  all: ComplianceIssue[] | undefined,
): Array<{ issue: ComplianceIssue; index: number }> {
  if (!heading || !all) return [];
  const h = heading.toLowerCase();
  return all
    .map((issue, index) => ({ issue, index }))
    .filter(
      ({ issue: i }) =>
        i.section &&
        (h.includes(i.section.toLowerCase()) ||
          i.section.toLowerCase().includes(h)),
    );
}

/**
 * Article-wide compliance issues that carry a verbatim excerpt. These don't
 * get a per-section badge (they're already represented in the page-level
 * compliance feedback block) but their excerpts still highlight inline.
 */
function globalExcerptIssues(
  all: ComplianceIssue[] | undefined,
): ComplianceIssue[] {
  if (!all) return [];
  return all.filter((i) => !i.section && i.excerpt && i.excerpt.trim().length > 0);
}

export default function EditableArticle({
  articleId,
  body,
  market,
  title,
  lead,
  contentType,
  canonicalSlug,
  onUpdated,
  complianceIssues,
  editMode = false,
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const split = useMemo(() => splitIntoSections(body), [body]);

  // Article-wide compliance issues with excerpts. Computed once and threaded
  // into every section so phrases like "guys" (flagged by the inclusivity
  // rule, which doesn't pin to an H2) still get highlighted in the body
  // wherever they appear.
  const globalIssues = useMemo(
    () => globalExcerptIssues(complianceIssues),
    [complianceIssues],
  );
  const globalExcerpts = useMemo(
    () =>
      globalIssues
        .map((i) => i.excerpt!)
        .filter((e) => e && e.trim().length > 0),
    [globalIssues],
  );
  // Worst severity across the global set — drives the highlight color when
  // a section has no section-scoped issue of its own.
  const globalSeverity: "error" | "warning" | "info" =
    globalIssues.some((i) => i.severity === "error")
      ? "error"
      : globalIssues.some((i) => i.severity === "warning")
        ? "warning"
        : "info";

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [recentlyChangedIdx, setRecentlyChangedIdx] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const closeEditor = () => setEditingIdx(null);

  const applySection = async (idx: number, newSection: string) => {
    const nextSections = [...split.sections];
    nextSections[idx] = newSection;
    const newBody = rebuildBody({ preamble: split.preamble, sections: nextSections });
    await api.updateArticle(articleId, { body: newBody });
    onUpdated?.(newBody);
    setEditingIdx(null);
    setRecentlyChangedIdx(idx);
    setTimeout(() => setRecentlyChangedIdx((cur) => (cur === idx ? null : cur)), 1800);
    setSnackbar("Section saved");
  };

  const locale = localeFor(market);
  const parsedTitle = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
  const displayTitle = title?.trim() || parsedTitle || "Knowledge article";
  const cleanPreamble = split.preamble.replace(/^#\s+.+\n*/, "").trim();
  const sections = split.sections.map((s) => sectionHeading(s)).filter((s): s is string => !!s);

  return (
    <Box
      sx={{
        bgcolor: "#FFFFFF",
        border: `1px solid ${t.border}`,
        borderRadius: 0,
        overflow: "hidden",
        maxWidth: "none",
      }}
    >
      {/* Reader masthead — matches ArticleDocument */}
      <Box
        sx={{
          px: { xs: 2.5, md: 4 },
          py: 1.25,
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          bgcolor: t.paper,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PepsiMark />
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.sans,
              fontWeight: 700,
              fontSize: "0.8125rem",
              letterSpacing: 0,
              color: t.pepsiBlueStrong,
            }}
          >
            PEPSICO
          </Typography>
          <Box sx={{ width: 1, height: 14, bgcolor: t.border }} />
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.sans,
              fontWeight: 500,
              fontSize: "0.8125rem",
              color: t.slate,
            }}
            noWrap
          >
            myPortal Knowledge
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {contentType && <Chip size="small" label={contentType} sx={{ height: 22 }} />}
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.mono,
              fontWeight: 500,
              fontSize: "0.6875rem",
              letterSpacing: 0,
              color: t.granite,
            }}
          >
            {locale.toUpperCase()}
          </Typography>
          <Tooltip title="Point and edit: hover any section to revise it.">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.875,
                py: 0.375,
                border: `1px solid ${t.border}`,
                color: t.slate,
                fontSize: "0.6875rem",
                fontWeight: 500,
                letterSpacing: 0,
              }}
            >
              <EditOutlinedIcon sx={{ fontSize: 12 }} />
              Editable
            </Box>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2.5, md: 4 }, pt: { xs: 3, md: 4 }, pb: 2 }}>
        <Typography
          component="h1"
          sx={{
            fontFamily: theme.palette.fonts.sans,
            fontSize: { xs: "2rem", md: "2.35rem" },
            fontWeight: 500,
            letterSpacing: 0,
            lineHeight: 1.12,
            color: t.ink,
            mb: 1.25,
          }}
        >
          {displayTitle}
        </Typography>
        {lead && (
          <Typography sx={{ maxWidth: 1040, color: t.ink, fontSize: "1.0625rem", lineHeight: 1.65, mb: 1.75 }}>
            {lead}
          </Typography>
        )}
        {canonicalSlug && (
          <Typography sx={{ fontFamily: theme.palette.fonts.mono, fontSize: "0.75rem", color: t.granite }}>
            Article ID: {canonicalSlug}
          </Typography>
        )}
      </Box>

      {sections.length > 1 && (
        <Box
          sx={{
            mx: { xs: 2.5, md: 4 },
            mb: 2,
            p: 2,
            border: `1px solid ${t.border}`,
            bgcolor: t.surfaceContainerLow,
          }}
        >
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: t.pepsiBlueStrong, textTransform: "uppercase", letterSpacing: 0, mb: 1 }}>
            Contents
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 2.25, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 3, rowGap: 0.5, color: t.pepsiBlueStrong, fontSize: "0.875rem", "& li::marker": { color: t.granite } }}>
            {sections.map((section) => <li key={section}>{section}</li>)}
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: t.border }} />

      {/* Article body */}
      <Box
        sx={{
          px: { xs: 2.5, md: 4 },
          py: { xs: 3, md: 4 },
          fontFamily: theme.palette.fonts.sans,
          color: t.ink,
        }}
      >
        {/* Preamble after the H1. Not section-editable. */}
        {cleanPreamble && (
          <SectionRender markdown={cleanPreamble} editable={false} />
        )}

        {/* Sections — each one editable */}
        {split.sections.map((s, idx) =>
          editingIdx === idx ? (
            <SectionEditor
              key={idx}
              articleId={articleId}
              initial={s}
              onCancel={closeEditor}
              onApply={(newSection) => applySection(idx, newSection)}
            />
          ) : (
            <HoverableSection
              key={idx}
              articleId={articleId}
              markdown={s}
              recentlyChanged={recentlyChangedIdx === idx}
              issues={issuesForSection(sectionHeading(s), complianceIssues)}
              globalIssues={globalIssues}
              extraHighlightExcerpts={globalExcerpts}
              extraHighlightSeverity={globalSeverity}
              editMode={editMode}
              onEdit={() => setEditingIdx(idx)}
              onApplyAiFix={(newSection) => applySection(idx, newSection)}
            />
          ),
        )}
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={2200}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          icon={<CheckIcon sx={{ fontSize: 18 }} />}
        >
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// HoverableSection — a section in read mode with hover Edit button
// ════════════════════════════════════════════════════════════
function HoverableSection({
  articleId,
  markdown,
  recentlyChanged,
  onEdit,
  onApplyAiFix,
  onDismissIssue,
  issues,
  globalIssues = [],
  extraHighlightExcerpts = [],
  extraHighlightSeverity = "info",
  editMode = false,
}: {
  articleId: string;
  markdown: string;
  recentlyChanged: boolean;
  onEdit: () => void;
  /** Applies an AI-suggested rewrite to this section. Resolves when the
   *  parent has persisted the change. */
  onApplyAiFix: (newSection: string) => Promise<void>;
  /** Phase P3.3 — reviewer dismisses a compliance flag as false positive.
   *  Called with the issue's index in the full complianceIssues array. */
  onDismissIssue?: (index: number) => Promise<void>;
  /** Tuples of issue + original index so the dismiss callback can target the right backend record. */
  issues?: Array<{ issue: ComplianceIssue; index: number }>;
  /** Article-wide issues without a section anchor. Used to build the AI fix
   *  instruction so the suggestion addresses every flagged item, not just
   *  the ones routed to this section. */
  globalIssues?: ComplianceIssue[];
  /** Article-wide excerpts to highlight in this section (no badge rendered). */
  extraHighlightExcerpts?: string[];
  /** Severity color for the extra excerpts when no section issue overrides it. */
  extraHighlightSeverity?: "info" | "warning" | "error";
  /** Page-level edit mode toggle. Controls whether the per-section Edit
   *  button and the AI-fix card are exposed. Compliance badges always render. */
  editMode?: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const hasIssues = issues && issues.length > 0;
  // Dismissed issues don't count for severity coloring — once a reviewer
  // dismisses an "error", the section shouldn't keep glowing red.
  const liveIssues = (issues ?? []).filter(({ issue }) => !issue.dismissed);
  const highest =
    liveIssues.some(({ issue: i }) => i.severity === "error")
      ? "error"
      : liveIssues.some(({ issue: i }) => i.severity === "warning")
        ? "warning"
        : "info";
  const issueColor =
    highest === "error"
      ? t.errorInk
      : highest === "warning"
        ? t.ember
        : t.slate;

  return (
    <Box
      sx={{
        position: "relative",
        mx: -2,
        px: 2,
        py: 0.5,
        borderRadius: 1,
        // Subtle inset border on the left when the section has issues —
        // gives the reviewer a peripheral "this section needs attention" cue
        // without obscuring the content.
        borderLeft: hasIssues ? `3px solid ${issueColor}` : "3px solid transparent",
        transition: "background-color 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": {
          backgroundColor: "rgba(0, 75, 147, 0.03)",
          "& .section-edit-button": {
            opacity: 1,
            transform: "translateY(0)",
          },
        },
        animation: recentlyChanged
          ? `${flashHighlight} 1.8s ease-out`
          : "none",
      }}
    >
      {hasIssues && (
        <Box
          sx={{
            mb: 1,
            mt: 0.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {issues!.map(({ issue: iss }, i) => (
            <Box
              key={i}
              sx={{
                display: "inline-flex",
                alignItems: "flex-start",
                gap: 0.75,
                fontSize: "0.75rem",
                color: issueColor,
                fontWeight: 500,
                px: 1,
                py: 0.5,
                borderRadius: 0.75,
                bgcolor:
                  iss.severity === "error"
                    ? "rgba(217, 48, 37, 0.06)"
                    : iss.severity === "warning"
                      ? "rgba(213, 110, 12, 0.08)"
                      : "rgba(60, 64, 67, 0.04)",
                alignSelf: "flex-start",
                maxWidth: "100%",
              }}
            >
              <Box component="span" sx={{ flexShrink: 0, fontSize: "0.6875rem", letterSpacing: "0.02em", textTransform: "uppercase", opacity: 0.85 }}>
                {iss.severity}
              </Box>
              <Box component="span" sx={{ lineHeight: 1.45 }}>
                {iss.message}
                {iss.excerpt && (
                  <Box component="span" sx={{ display: "block", mt: 0.25, fontStyle: "italic", opacity: 0.85 }}>
                    "{iss.excerpt}"
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {/* AI fix card — only renders when this section has compliance issues
          OR the article-wide flagged terms appear inside its body, AND the
          page is in edit mode. Lazy: generates the rewrite on user click,
          not on mount, so we don't burn API calls on every section render. */}
      {editMode &&
        (hasIssues ||
          (extraHighlightExcerpts.length > 0 &&
            new RegExp(
              extraHighlightExcerpts.map(escapeRegExp).join("|"),
              "i",
            ).test(markdown))) && (
        <AiFixCard
          articleId={articleId}
          sectionMarkdown={markdown}
          sectionIssues={issues?.map(({ issue }) => issue) ?? []}
          globalIssues={globalIssues}
          severity={hasIssues ? highest : extraHighlightSeverity}
          onApply={onApplyAiFix}
        />
      )}
      {/* Highlight excerpts the compliance agent identified, so the badge
          above the section connects to the specific phrase in the body.
          Combines two sets:
            - section-scoped excerpts (have a badge above the section)
            - article-wide excerpts threaded down from the parent
          Worst severity across either set picks the highlight color. */}
      <SectionRender
        markdown={markdown}
        highlightExcerpts={[
          ...(issues
            ?.map(({ issue }) => issue.excerpt)
            .filter((e): e is string => !!e && e.trim().length > 0) ?? []),
          ...extraHighlightExcerpts,
        ]}
        highlightSeverity={
          // section issues win if they exist; otherwise fall back to the
          // article-wide severity for the global excerpts.
          hasIssues ? highest : extraHighlightSeverity
        }
      />
      {/* Edit affordance: only renders in edit mode (Option A consolidation).
          In edit mode it's PERSISTENT — no more hover-to-reveal — so the
          edit affordance is discoverable. The .section-edit-button class
          stays for backward-compat with the wrapper's hover sx rule but
          the opacity is now driven by editMode. */}
      {editMode && (
        <Box
          className="section-edit-button"
          sx={{
            position: "absolute",
            top: 6,
            right: -8,
            // In edit mode, the button is always visible. The wrapper's
            // hover rule still bumps the translateY for a subtle lift.
            opacity: 1,
            transform: "translateY(0)",
            transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <Button
            size="small"
            variant="contained"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={onEdit}
            sx={{
              bgcolor: "#FFFFFF",
              color: t.pepsiBlueStrong,
              border: `1px solid ${t.border}`,
              fontSize: "0.75rem",
              py: 0.5,
              px: 1.25,
              minHeight: 0,
              boxShadow: "0 2px 6px rgba(60,64,67,0.08)",
              "&:hover": {
                bgcolor: t.pepsiBlueSubtle,
                boxShadow: "0 2px 8px rgba(60,64,67,0.12)",
              },
            }}
          >
            Edit
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// SectionEditor — inline editor for a single section
// ════════════════════════════════════════════════════════════
// Phase P1.5 — expanded to 8 chips covering the moves writers actually make.
// Each instruction is verbose enough that the mock pattern-matcher in
// section-revision-agent.ts can route correctly without ambiguity.
const QUICK_ACTIONS = [
  { label: "Make shorter", instruction: "Make this section shorter and more concise." },
  { label: "Add detail", instruction: "Expand this section with more concrete detail and examples." },
  { label: "Simpler language", instruction: "Rewrite in simpler, plainer language." },
  { label: "Fix tone", instruction: "Adjust the tone to match the country's voice." },
  { label: "Active voice", instruction: "Rewrite this section in active voice. Avoid passive constructions." },
  { label: "Add bullets", instruction: "Convert dense paragraphs in this section into bullet lists where it improves scannability." },
  { label: "Add example", instruction: "Add one concrete example that illustrates the main point of this section." },
  { label: "Remove jargon", instruction: "Replace specialized jargon and acronyms with plain-language equivalents in this section." },
];

function SectionEditor({
  articleId,
  initial,
  onCancel,
  onApply,
}: {
  articleId: string;
  initial: string;
  onCancel: () => void;
  onApply: (revised: string) => Promise<void>;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [draft, setDraft] = useState(initial);
  const [askInput, setAskInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const callAI = async (instruction: string, busyKey: string) => {
    setError(null);
    setBusy(busyKey);
    setAiNote(null);
    try {
      const result = await api.reviseSection(articleId, {
        section: draft,
        instruction,
      });
      setDraft(result.revisedSection);
      setAiNote(result.explanation);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  };

  const submitAsk = () => {
    const instr = askInput.trim();
    if (!instr) return;
    setAskInput("");
    callAI(instr, "ask");
  };

  const apply = async () => {
    setSaving(true);
    try {
      await onApply(draft);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const isDirty = draft !== initial;

  return (
    <Box
      sx={{
        mx: -2,
        my: 2,
        borderRadius: 1.5,
        border: `1px solid ${t.pepsiBlue}`,
        bgcolor: t.surface,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,75,147,0.08)",
      }}
    >
      {/* Editor header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: t.pepsiBlueSubtle,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <EditOutlinedIcon sx={{ fontSize: 16, color: t.pepsiBlueStrong }} />
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: t.pepsiBlueStrong,
            }}
          >
            Editing section
          </Typography>
          {isDirty && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 1 }}>
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: t.ember }} />
              <Typography sx={{ fontSize: "0.6875rem", color: t.emberStrong, fontWeight: 500 }}>
                modified
              </Typography>
            </Stack>
          )}
        </Stack>
        <IconButton size="small" onClick={onCancel} sx={{ p: 0.25 }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      {/* Editor body */}
      <Box sx={{ p: 2 }}>
        <TextField
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          multiline
          fullWidth
          minRows={6}
          maxRows={20}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              fontFamily: theme.palette.fonts.sans,
              fontSize: "0.875rem",
              lineHeight: 1.6,
              alignItems: "flex-start",
              bgcolor: "#FFFFFF",
            },
          }}
        />

        {aiNote && (
          <Alert
            severity="info"
            icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
            sx={{ mt: 1.5, fontSize: "0.8125rem" }}
            onClose={() => setAiNote(null)}
          >
            {aiNote}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}

        {/* Quick AI actions */}
        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              fontSize: "0.6875rem",
              color: t.slate,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              mb: 1,
            }}
          >
            Quick edits with AI
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {QUICK_ACTIONS.map((a) => (
              <Box
                key={a.label}
                role="button"
                tabIndex={0}
                onClick={() => !busy && callAI(a.instruction, a.label)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  !busy &&
                  callAI(a.instruction, a.label)
                }
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.625,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 4,
                  border: `1px solid ${t.border}`,
                  bgcolor: "#FFFFFF",
                  fontSize: "0.75rem",
                  color: t.ink,
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy && busy !== a.label ? 0.5 : 1,
                  transition: "all 120ms",
                  ...(busy
                    ? {}
                    : {
                        "&:hover": {
                          bgcolor: t.pepsiBlueSubtle,
                          borderColor: t.pepsiBlue,
                          color: t.pepsiBlueStrong,
                        },
                      }),
                }}
              >
                {busy === a.label ? (
                  <>
                    <CircularProgress size={11} thickness={6} sx={{ color: t.pepsiBlue }} />
                    <span>{a.label}</span>
                  </>
                ) : (
                  <>
                    <AutoAwesomeIcon sx={{ fontSize: 12, color: t.pepsiBlue }} />
                    {a.label}
                  </>
                )}
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Ask AI custom input */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="flex-end">
          <TextField
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            placeholder="Ask AI to revise this section… (e.g. add a step about approvals)"
            fullWidth
            size="small"
            multiline
            maxRows={3}
            disabled={!!busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && askInput.trim() && !busy) {
                e.preventDefault();
                submitAsk();
              }
            }}
            InputProps={{
              startAdornment: (
                <AutoAwesomeIcon sx={{ fontSize: 14, color: t.pepsiBlue, mr: 0.75 }} />
              ),
              sx: { fontSize: "0.8125rem", bgcolor: "#FFFFFF" },
            }}
          />
          <IconButton
            onClick={submitAsk}
            disabled={!askInput.trim() || !!busy}
            size="small"
            sx={{
              bgcolor: askInput.trim() && !busy ? t.pepsiBlue : "transparent",
              color: askInput.trim() && !busy ? "#FFFFFF" : t.granite,
              "&:hover": {
                bgcolor: askInput.trim() && !busy ? t.pepsiBlueStrong : t.mist,
              },
            }}
          >
            {busy === "ask" ? (
              <CircularProgress size={14} thickness={6} color="inherit" />
            ) : (
              <SendIcon sx={{ fontSize: 14 }} />
            )}
          </IconButton>
        </Stack>

        {/* Apply / Cancel */}
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1}
          sx={{ mt: 2, pt: 2, borderTop: `1px solid ${t.border}` }}
        >
          <Button size="small" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={apply}
            disabled={!isDirty || saving || !!busy}
            startIcon={
              saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CheckIcon sx={{ fontSize: 14 }} />
              )
            }
          >
            {saving ? "Saving…" : "Apply changes"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// SectionRender — Markdown rendered with the article-document styling
// ════════════════════════════════════════════════════════════
function SectionRender({
  markdown,
  editable = true,
  highlightExcerpts = [],
  highlightSeverity = "error",
}: {
  markdown: string;
  editable?: boolean;
  /** Verbatim phrases the compliance agent flagged. Wrapped in a styled
   *  highlight inside the rendered prose so the reader sees the exact spot. */
  highlightExcerpts?: string[];
  /** Drives the highlight color — error (red), warning (ember), info (slate). */
  highlightSeverity?: "info" | "warning" | "error";
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  // ── Highlight wiring ──
  // Build the highlight color set once per render. We use a wavy underline +
  // background tint for clear "this is the flagged passage" affordance,
  // distinct from author-applied bold/italic.
  const highlightStyle = useMemo(() => {
    const map = {
      error: {
        bg: "rgba(217, 48, 37, 0.18)",
        color: t.errorInk,
        decoration: t.errorInk,
      },
      warning: {
        bg: "rgba(213, 110, 12, 0.20)",
        color: t.emberStrong,
        decoration: t.ember,
      },
      info: {
        bg: alphaInline(t.slate, 0.15),
        color: t.ink,
        decoration: t.slate,
      },
    } as const;
    return map[highlightSeverity];
  }, [highlightSeverity, t]);

  // Build a single regex that matches any of the excerpts. Sorted longest-first
  // so overlapping matches favor the most-specific phrase.
  const excerptRegex = useMemo(() => {
    const cleaned = highlightExcerpts
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp);
    if (cleaned.length === 0) return null;
    return new RegExp(`(${cleaned.join("|")})`, "gi");
  }, [highlightExcerpts]);

  // Wraps any matching substrings inside the rendered prose with a styled
  // highlight span. Recurses through nested React children so excerpts inside
  // bold/italic/link text are still caught.
  const highlight = useMemo(() => {
    if (!excerptRegex) {
      return (children: React.ReactNode) => children;
    }
    const walk = (children: React.ReactNode): React.ReactNode =>
      React.Children.map(children, (child) => {
        if (typeof child === "string") {
          const parts = child.split(excerptRegex);
          if (parts.length === 1) return child;
          return parts.map((part, i) =>
            i % 2 === 1 ? (
              <Box
                component="mark"
                key={i}
                sx={{
                  bgcolor: highlightStyle.bg,
                  color: highlightStyle.color,
                  px: 0.5,
                  py: 0.125,
                  borderRadius: 0.5,
                  fontWeight: 500,
                  // Subtle red underline reinforces "this is the issue".
                  textDecorationLine: "underline",
                  textDecorationColor: highlightStyle.decoration,
                  textDecorationStyle: "wavy",
                  textDecorationThickness: "1px",
                  textUnderlineOffset: "3px",
                }}
              >
                {part}
              </Box>
            ) : (
              part
            ),
          );
        }
        if (React.isValidElement(child)) {
          const childProps = child.props as { children?: React.ReactNode };
          return React.cloneElement(
            child,
            child.props as any,
            walk(childProps.children),
          );
        }
        return child;
      });
    return walk;
  }, [excerptRegex, highlightStyle]);

  // Markdown components override: every block element that carries prose gets
  // its children walked for excerpts. Headings stay untouched (excerpts are
  // body text). Lean override set — anything not listed renders as default.
  const components = useMemo(
    () =>
      excerptRegex
        ? {
            // Prose elements — every block that commonly carries body text.
            p: ({ children }: any) => <p>{highlight(children)}</p>,
            li: ({ children }: any) => <li>{highlight(children)}</li>,
            td: ({ children }: any) => <td>{highlight(children)}</td>,
            blockquote: ({ children }: any) => (
              <blockquote>{highlight(children)}</blockquote>
            ),
            // Headings — included because compliance issues (e.g. non-inclusive
            // language) can absolutely land in a title and the badge above the
            // section won't help if the offending word IS the H1/H2.
            h1: ({ children }: any) => <h1>{highlight(children)}</h1>,
            h2: ({ children }: any) => <h2>{highlight(children)}</h2>,
            h3: ({ children }: any) => <h3>{highlight(children)}</h3>,
          }
        : undefined,
    [excerptRegex, highlight],
  );

  return (
    <Box
      sx={{
        color: t.ink,
        fontSize: "0.9375rem",
        lineHeight: 1.7,
        // Mirror the ArticleDocument typography rules so the output reads
        // identically to a non-editable article.
        "& h1": {
          fontSize: "1.875rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          color: t.ink,
          mt: editable ? 5 : 0,
          mb: 2,
        },
        "& h2": {
          fontSize: "1.375rem",
          fontWeight: 700,
          letterSpacing: "-0.015em",
          lineHeight: 1.3,
          color: t.pepsiBlue,
          mt: 4.5,
          mb: 1.5,
        },
        "& h3": {
          fontSize: "1.0625rem",
          fontWeight: 600,
          color: t.ink,
          mt: 3.5,
          mb: 1,
        },
        "& p": { my: 1.5, color: t.ink },
        "& ul, & ol": { my: 1.5, pl: 3 },
        "& li": { mb: 0.5, "&::marker": { color: t.pepsiBlue, fontWeight: 600 } },
        "& strong": { fontWeight: 600 },
        "& a": {
          color: t.pepsiBlue,
          textDecoration: "underline",
          textDecorationColor: "rgba(0, 75, 147, 0.35)",
          textUnderlineOffset: "3px",
          fontWeight: 500,
        },
        "& code": {
          fontFamily: theme.palette.fonts.sans,
          fontSize: "0.85em",
          fontWeight: 500,
          bgcolor: t.pepsiBlueSubtle,
          px: 0.625,
          py: 0.125,
          borderRadius: 0.5,
          color: t.pepsiBlueStrong,
        },
        "& blockquote": {
          borderLeft: `3px solid ${t.pepsiBlue}`,
          pl: 2,
          py: 0.5,
          my: 2,
          color: t.slate,
        },
        "& table": {
          borderCollapse: "collapse",
          width: "100%",
          my: 2,
          fontSize: "0.875rem",
        },
        "& th": {
          textAlign: "left",
          fontWeight: 600,
          color: t.pepsiBlue,
          fontSize: "0.6875rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          py: 1,
          px: 1.5,
          borderBottom: `2px solid ${t.pepsiBlue}`,
          bgcolor: t.pepsiBlueSubtle,
        },
        "& td": {
          py: 1.25,
          px: 1.5,
          borderBottom: `1px solid ${t.border}`,
          verticalAlign: "top",
        },
        "& tr:last-of-type td": { borderBottom: 0 },
        "& hr": { border: 0, borderTop: `1px solid ${t.border}`, my: 4 },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// AiFixCard — generates and previews an AI rewrite of a flagged section
// ════════════════════════════════════════════════════════════
/**
 * Renders an "AI suggestion" affordance inside a flagged section. Three states:
 *   - idle    → small ghost button "Suggest AI fix"
 *   - loading → spinner + generating label
 *   - ready   → tinted card showing the rewritten markdown + Apply / Discard
 *   - error   → inline error with retry button
 *
 * Calls the same `/api/articles/:id/revise-section` endpoint the section editor
 * uses, but synthesizes an instruction tailored to the compliance issues so
 * the agent knows exactly what to address.
 */
function AiFixCard({
  articleId,
  sectionMarkdown,
  sectionIssues,
  globalIssues,
  severity,
  onApply,
}: {
  articleId: string;
  sectionMarkdown: string;
  sectionIssues: ComplianceIssue[];
  globalIssues: ComplianceIssue[];
  severity: "info" | "warning" | "error";
  onApply: (newSection: string) => Promise<void>;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [rewritten, setRewritten] = useState("");
  const [explanation, setExplanation] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [applying, setApplying] = useState(false);
  /** Phase P2.5 — diff view toggle. Default to diff so the change is the
   *  thing the user sees first; toggle to "preview" to see the rewritten
   *  section as it'll render. */
  const [viewMode, setViewMode] = useState<"diff" | "preview">("diff");

  // Pre-compute the instruction so the user can hover the button and (later)
  // see what we're asking the agent for if we add a tooltip. Cheap.
  const instruction = useMemo(
    () => buildFixInstruction(sectionIssues, globalIssues, sectionMarkdown),
    [sectionIssues, globalIssues, sectionMarkdown],
  );

  const generate = async () => {
    setState("loading");
    setErrMsg("");
    try {
      const result = await api.reviseSection(articleId, {
        section: sectionMarkdown,
        instruction,
      });
      setRewritten(result.revisedSection);
      setExplanation(result.explanation);
      setState("ready");
    } catch (e: any) {
      setErrMsg(e?.message ?? String(e));
      setState("error");
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      await onApply(rewritten);
      // Reset so the badge can re-suggest if new issues appear after the change.
      setState("idle");
      setRewritten("");
    } finally {
      setApplying(false);
    }
  };

  const accentBg = {
    error: "rgba(217, 48, 37, 0.04)",
    warning: "rgba(213, 110, 12, 0.06)",
    info: t.surfaceContainerLow,
  }[severity];

  // Idle state — a small ghost button, doesn't pull weight from the section.
  if (state === "idle") {
    return (
      <Box sx={{ mt: 1, mb: 1.5 }}>
        <Button
          size="small"
          variant="tonal"
          onClick={generate}
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
          sx={{ fontSize: "0.75rem" }}
        >
          Suggest AI fix
        </Button>
      </Box>
    );
  }

  if (state === "loading") {
    return (
      <Box
        sx={{
          mt: 1,
          mb: 1.5,
          p: 1.5,
          borderRadius: 2,
          bgcolor: t.surfaceContainerLow,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
        }}
      >
        <CircularProgress size={14} sx={{ color: t.pepsiBlue }} />
        <Typography sx={{ fontSize: "0.8125rem", color: t.slate }}>
          Generating suggested fix…
        </Typography>
      </Box>
    );
  }

  if (state === "error") {
    return (
      <Alert
        severity="error"
        sx={{ mt: 1, mb: 1.5 }}
        action={
          <Button size="small" onClick={generate}>
            Retry
          </Button>
        }
      >
        Couldn't generate suggestion — {errMsg || "unknown error"}
      </Alert>
    );
  }

  // Ready — show the rewritten section, rendered as markdown, in a tinted card.
  return (
    <Box
      sx={{
        mt: 1.25,
        mb: 2,
        borderRadius: 2,
        border: `1px solid ${t.pepsiBlue}`,
        bgcolor: accentBg,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.75,
          py: 1,
          bgcolor: t.pepsiBlueSubtle,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 14, color: t.pepsiBlueStrong }} />
        <Typography
          variant="overline"
          sx={{ color: t.pepsiBlueStrong, letterSpacing: "0.08em", flex: 1 }}
        >
          AI suggestion
        </Typography>
        <Button
          size="small"
          onClick={() => setState("idle")}
          disabled={applying}
          sx={{ fontSize: "0.75rem", color: t.slate }}
        >
          Discard
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={apply}
          disabled={applying}
          startIcon={
            applying ? (
              <CircularProgress size={12} color="inherit" />
            ) : (
              <CheckIcon sx={{ fontSize: 14 }} />
            )
          }
          sx={{ fontSize: "0.75rem" }}
        >
          Apply
        </Button>
      </Stack>
      {explanation && (
        <Box sx={{ px: 1.75, pt: 1.25, pb: 0.5 }}>
          <Typography sx={{ fontSize: "0.75rem", color: t.slate, fontStyle: "italic" }}>
            {explanation}
          </Typography>
        </Box>
      )}
      {/* View toggle — diff (default) shows insertions/deletions, preview
          shows the rewritten section as it'll render once applied. */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ px: 1.75, pt: 0.5 }}
      >
        <Button
          size="small"
          variant={viewMode === "diff" ? "tonal" : "text"}
          onClick={() => setViewMode("diff")}
          sx={{ fontSize: "0.6875rem", minHeight: 0, py: 0.25 }}
        >
          Diff
        </Button>
        <Button
          size="small"
          variant={viewMode === "preview" ? "tonal" : "text"}
          onClick={() => setViewMode("preview")}
          sx={{ fontSize: "0.6875rem", minHeight: 0, py: 0.25 }}
        >
          Preview
        </Button>
      </Stack>
      <Box sx={{ px: 1.75, pb: 1.5, pt: 1 }}>
        {viewMode === "diff" ? (
          <DiffView before={sectionMarkdown} after={rewritten} />
        ) : (
          <SectionRender markdown={rewritten} editable={false} />
        )}
      </Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// DiffView — token-level diff between two markdown strings
// ════════════════════════════════════════════════════════════
/**
 * Lightweight word-level diff. Uses LCS to find common tokens, marks
 * everything else as add/remove with M3-style coloring (red strikethrough
 * for deletions, green underline for insertions). Not a full Myers diff —
 * good enough for the typical AI-fix output where changes are localized.
 */
function DiffView({ before, after }: { before: string; after: string }) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  // Tokenize on whitespace + keep the whitespace so we can re-render with
  // original spacing. Split groups: word | whitespace.
  const tokenize = (s: string) => s.split(/(\s+)/).filter(Boolean);
  const beforeTokens = useMemo(() => tokenize(before), [before]);
  const afterTokens = useMemo(() => tokenize(after), [after]);

  // Longest common subsequence walk producing aligned op list.
  type Op = { kind: "same" | "add" | "remove"; text: string };
  const ops = useMemo<Op[]>(() => {
    const m = beforeTokens.length;
    const n = afterTokens.length;
    // Build LCS DP table.
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0),
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          beforeTokens[i - 1] === afterTokens[j - 1]
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    // Walk backwards to produce ops in reverse, then reverse at the end.
    const out: Op[] = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (beforeTokens[i - 1] === afterTokens[j - 1]) {
        out.push({ kind: "same", text: beforeTokens[i - 1] });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        out.push({ kind: "remove", text: beforeTokens[i - 1] });
        i--;
      } else {
        out.push({ kind: "add", text: afterTokens[j - 1] });
        j--;
      }
    }
    while (i > 0) {
      out.push({ kind: "remove", text: beforeTokens[i - 1] });
      i--;
    }
    while (j > 0) {
      out.push({ kind: "add", text: afterTokens[j - 1] });
      j--;
    }
    return out.reverse();
  }, [beforeTokens, afterTokens]);

  return (
    <Box
      sx={{
        fontFamily: theme.palette.fonts.sans,
        fontSize: "0.875rem",
        lineHeight: 1.6,
        color: t.ink,
        whiteSpace: "pre-wrap",
      }}
    >
      {ops.map((op, idx) => {
        if (op.kind === "same") {
          return <span key={idx}>{op.text}</span>;
        }
        if (op.kind === "add") {
          // Skip rendering whitespace-only additions as highlights — they're
          // noise. Just keep the whitespace.
          if (/^\s+$/.test(op.text)) return <span key={idx}>{op.text}</span>;
          return (
            <Box
              key={idx}
              component="span"
              sx={{
                bgcolor: "rgba(24, 128, 56, 0.15)",
                color: t.successInk,
                px: 0.25,
                borderRadius: 0.5,
                textDecoration: "underline",
                textDecorationStyle: "solid",
                textDecorationColor: t.successInk,
                textUnderlineOffset: "2px",
              }}
            >
              {op.text}
            </Box>
          );
        }
        // remove
        if (/^\s+$/.test(op.text)) return null;
        return (
          <Box
            key={idx}
            component="span"
            sx={{
              bgcolor: "rgba(217, 48, 37, 0.10)",
              color: t.errorInk,
              px: 0.25,
              borderRadius: 0.5,
              textDecoration: "line-through",
              textDecorationColor: t.errorInk,
            }}
          >
            {op.text}
          </Box>
        );
      })}
    </Box>
  );
}

/** Builds the agent instruction from the compliance issues that apply to a section. */
function buildFixInstruction(
  sectionIssues: ComplianceIssue[],
  globalIssues: ComplianceIssue[],
  sectionMarkdown: string,
): string {
  // Include any global issue whose excerpt actually appears in this section's
  // body — otherwise the agent gets noisy instructions about phrases that
  // aren't even there.
  const relevantGlobal = globalIssues.filter(
    (i) =>
      i.excerpt &&
      new RegExp(escapeRegExp(i.excerpt), "i").test(sectionMarkdown),
  );
  const all = [...sectionIssues, ...relevantGlobal];
  if (all.length === 0) {
    return "Improve the writing quality of this section while preserving its structure and meaning.";
  }
  const bullets = all
    .map((i) => {
      const tag = i.severity === "error" ? "❌" : i.severity === "warning" ? "⚠️" : "ℹ️";
      const excerptPart = i.excerpt ? ` Flagged term: "${i.excerpt}".` : "";
      return `${tag} ${i.message}${excerptPart}`;
    })
    .join("\n");
  return [
    "Rewrite this section to address the following compliance issues:",
    bullets,
    "",
    "Replace flagged terms with inclusive, professional alternatives.",
    "Keep the H2 heading, overall structure, length, and tone the same.",
    "Do not add new sections or headings.",
  ].join("\n");
}

/** Escapes a string for use in a literal-text RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Quick hex+alpha → rgba for SectionRender's local highlight palette. */
function alphaInline(hex: string, opacity: number): string {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function PepsiMark() {
  return (
    <Box
      component="svg"
      viewBox="0 0 28 28"
      sx={{ width: 22, height: 22, color: "#FFFFFF", flexShrink: 0 }}
      aria-hidden
    >
      <circle cx="14" cy="14" r="13" fill="currentColor" opacity="0.18" />
      <path d="M 4 11 A 12 12 0 0 1 24 11 L 4 11 Z" fill="currentColor" opacity="0.95" />
      <path d="M 4 17 A 12 12 0 0 0 24 17 L 4 17 Z" fill="currentColor" opacity="0.55" />
    </Box>
  );
}
