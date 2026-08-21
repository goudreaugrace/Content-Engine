import {
  Box,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import type { ReactNode } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

type AuditStatus = "strong" | "watch" | "fix";

type AuditItem = {
  title: string;
  body: string;
  status: AuditStatus;
};

const auditItems: AuditItem[] = [
  {
    title: "Product shell",
    body: "The left navigation, role switcher, page padding, and Material control behavior are consistent. The app reads as a work tool, not a marketing page.",
    status: "strong",
  },
  {
    title: "Article visual system",
    body: "The article reader has a strong PepsiCo pattern: Barlow Semi Condensed headings, Poppins body text, deep blue headings, compact controls, and a right support rail.",
    status: "strong",
  },
  {
    title: "Information architecture",
    body: "The IA is now mostly clear: Content Owners create and track articles; Admins manage governance, health, and permissions; Reference pages explain the system.",
    status: "strong",
  },
  {
    title: "Surface radius",
    body: "Most newer article containers use 8px, but some older cards and admin surfaces still use 12px or larger radii. This is the easiest place for visual drift to show.",
    status: "watch",
  },
  {
    title: "Shadow use",
    body: "The system intends to be flat, but a few older hover states and editor surfaces still use shadows. Shadows should stay reserved for floating menus, dialogs, and temporary overlays.",
    status: "watch",
  },
  {
    title: "Creation editor",
    body: "The creation flow is now a structured document editor: templates start the article, authors can add text, FAQ, table, resource, accordion, and callout sections, and format guidance helps them pick the right article type.",
    status: "strong",
  },
  {
    title: "Destination and access",
    body: "Basics now separates employee audience from access groups, captures knowledge base, sector, country, source language, approver, and inferred translation needs before drafting.",
    status: "strong",
  },
  {
    title: "Field behavior",
    body: "Date values use date selectors, FAQ questions stay plain text, and rich editing controls only appear inside the active long-form writing field.",
    status: "strong",
  },
  {
    title: "Review workspace",
    body: "Review now emphasizes the employee-facing article preview and keeps submission details, findability, and Ask Pep readiness in compact disclosure panels with plain-language readiness checks.",
    status: "strong",
  },
  {
    title: "Design documentation",
    body: "DESIGN.md now reflects the current build: theme.ts owns tokens, ArticleReadingFrame and ArticleDocument own reading surfaces, and structured editors define creation and review behavior.",
    status: "strong",
  },
  {
    title: "Article source of truth",
    body: "PublishedArticle is the canonical employee-facing record. Published and owner article pages now resolve source IDs back to the canonical published URL, while draft and review work stays on the source article route.",
    status: "strong",
  },
  {
    title: "Guideline coverage",
    body: "The build now covers the relevant article-writing guidance: format selection, audience/access, source language versus translations, typed source-backed content, readable length, and Ask Pep readiness. Microsite guidance remains intentionally out of scope.",
    status: "strong",
  },
];

const iaSections = [
  {
    title: "Content Owner Workspace",
    items: [
      "Create a new article from Basics, Article, and Review.",
      "Pick the destination, content type, employee audience, access groups, source language, and approver before writing.",
      "Use content-type templates plus flexible sections: text, FAQ, table, resource links, accordions, and callouts.",
      "Use date selectors for policy timing and structured editors for tables, FAQs, accordions, and resources.",
      "Submit for approval after reviewing the same article format employees will see.",
      "Track personal and team-owned articles from My Articles.",
    ],
  },
  {
    title: "Admin Governance Workspace",
    items: [
      "Review submitted articles and publish approved work.",
      "Monitor published article health, aging, ownership, and content maintenance.",
      "Manage sectors, audiences, email logs, and team permissions.",
      "Keep governance metadata outside the employee-facing article body.",
    ],
  },
  {
    title: "Reference Workspace",
    items: [
      "How It Works explains the end-to-end product flow.",
      "Design & IA documents the current visual system, navigation model, and remaining consistency risks.",
      "Reference pages should support demos and onboarding without adding admin complexity.",
    ],
  },
];

const lifecycle = [
  "Create / edit article",
  "Submit for review",
  "Under review",
  "Published article",
  "Maintain health",
];

const contentObjects = [
  {
    name: "Job",
    detail: "The submission run. It connects creation inputs to generated or reviewed article output.",
  },
  {
    name: "Source Article",
    detail: "The draft/submission record. It keeps audit history, review status, and the owner workflow.",
  },
  {
    name: "Published Article",
    detail: "The canonical live article employees read. Structured sections, translations, feedback, metrics, graph relationships, and version history attach here.",
  },
  {
    name: "Profiles",
    detail: "Sector, market, audience, and country guidance that shape article creation and governance.",
  },
  {
    name: "Knowledge Graph",
    detail: "A generated node-and-edge view of articles, topics, sources, audiences, countries, systems, processes, owners, and relationships.",
  },
];

const creationRules = [
  {
    title: "Basics",
    detail: "Capture destination metadata before writing: knowledge base, sector, country scope, employee audience, access groups, source language, content type, approver, and related taxonomy.",
  },
  {
    title: "Article",
    detail: "Authors write in structured blocks. Text fields support simple formatting; FAQ questions remain plain; date fields use selectors; tables, resources, and accordions get dedicated editors.",
  },
  {
    title: "Review",
    detail: "The article preview is the main object. Supporting details are compact, recommendations are plain-language, and readiness checks cover typed content, access, source evidence, duplicate review, link quality, readable sentences, and article length.",
  },
];

const editorRules = [
  "Toolbar appears only inside the active long-form writing field.",
  "Bold and italic require selected text; they should not insert placeholder copy.",
  "List controls apply only when the field already has content.",
  "Improve actions work on the selected text or the active field content.",
  "FAQ question fields, titles, dates, metadata, and URLs stay plain text.",
  "Accordion sections use item title + detail fields, never raw details/summary markup.",
];

const graphQueries = [
  "Which policies apply to employees in Canada?",
  "Which articles mention Workday, payroll, or Speak Up?",
  "Which articles are duplicates, replacements, or related canonical content?",
  "Which source documents support this policy?",
  "Which articles need translation or review before Ask Pep can cite them?",
];

function statusMeta(status: AuditStatus) {
  return {
    strong: {
      label: "Strong",
      icon: <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />,
      color: "#188038",
      bg: "#E6F4EA",
    },
    watch: {
      label: "Watch",
      icon: <InfoOutlinedIcon sx={{ fontSize: 16 }} />,
      color: "#D56E0C",
      bg: "#FEEFC3",
    },
    fix: {
      label: "Fix next",
      icon: <ErrorOutlineIcon sx={{ fontSize: 16 }} />,
      color: "#C5221F",
      bg: "#FCE8E6",
    },
  }[status];
}

export default function DesignIAReference() {
  const theme = useTheme();
  const t = theme.palette.tokens;

  return (
    <Box sx={{ maxWidth: 1320, mx: "auto" }}>
      <Box sx={{ maxWidth: 820, mb: 5 }}>
        <Typography
          variant="overline"
          sx={{ color: t.pepsiBlue, letterSpacing: "0.12em", mb: 1, display: "block" }}
        >
          Reference
        </Typography>
        <Typography variant="h4" component="h1" sx={{ mb: 1.5 }}>
          Design & IA
        </Typography>
        <Typography sx={{ color: t.slate, lineHeight: 1.65, fontSize: "1rem" }}>
          A working audit of the current build: what is consistent, what needs
          attention, and how the app is organized for Content Owners, Admins,
          and employees reading published articles.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
          gap: { xs: 4, lg: 5 },
          alignItems: "start",
        }}
      >
        <Stack spacing={5}>
          <Section
            eyebrow="Audit"
            title="Current design consistency"
            body="Overall, the product direction is coherent: Material interactions, PepsiCo article styling, and clear role-based navigation. The remaining issues are mostly consistency cleanup, not foundational IA problems."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              {auditItems.map((item) => {
                const meta = statusMeta(item.status);
                return (
                  <Box
                    key={item.title}
                    sx={{
                      p: 2,
                      border: `1px solid ${t.border}`,
                      borderRadius: "8px",
                      bgcolor: t.surface,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Chip
                        size="small"
                        icon={meta.icon}
                        label={meta.label}
                        sx={{
                          height: 24,
                          borderRadius: "8px",
                          bgcolor: meta.bg,
                          color: meta.color,
                          fontWeight: 700,
                          "& .MuiChip-icon": { color: meta.color },
                        }}
                      />
                    </Stack>
                    <Typography sx={{ fontWeight: 700, color: t.ink, mb: 0.75 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.55 }}>
                      {item.body}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Section>

          <Section
            eyebrow="IA"
            title="Product navigation model"
            body="The app is organized around who is doing the work, not around internal data types. That is the right model for this tool."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                gap: 2,
              }}
            >
              {iaSections.map((section) => (
                <Box
                  key={section.title}
                  sx={{
                    p: 2,
                    border: `1px solid ${t.border}`,
                    borderRadius: "8px",
                    bgcolor: t.surface,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: t.pepsiBlueStrong, mb: 1.25 }}>
                    {section.title}
                  </Typography>
                  <Stack component="ul" spacing={0.9} sx={{ pl: 2, m: 0 }}>
                    {section.items.map((item) => (
                      <Typography
                        key={item}
                        component="li"
                        sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.5 }}
                      >
                        {item}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Section>

          <Section
            eyebrow="Lifecycle"
            title="Article flow"
            body="The article lifecycle should stay visible enough for authors and reviewers, but the employee-facing article should remain a clean reading object."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: `repeat(${lifecycle.length}, minmax(0, 1fr))`,
                },
                gap: 1,
              }}
            >
              {lifecycle.map((step, index) => (
                <Box
                  key={step}
                  sx={{
                    p: 1.5,
                    borderRadius: "8px",
                    border: `1px solid ${index === lifecycle.length - 1 ? t.pepsiBlue : t.border}`,
                    bgcolor: index === lifecycle.length - 1 ? t.pepsiBlueSubtle : t.surface,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      color: t.granite,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      mb: 0.5,
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: t.ink, fontSize: "0.875rem" }}>
                    {step}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Section>

          <Section
            eyebrow="Creation"
            title="Structured self-service editor"
            body="The creator should feel like a guided document editor, not a rigid form or a raw Markdown box. The system gives authors recommended structure, but each section type owns its own editing behavior."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              {creationRules.map((rule) => (
                <Box
                  key={rule.title}
                  sx={{
                    p: 2,
                    borderRadius: "8px",
                    border: `1px solid ${t.border}`,
                    bgcolor: t.surface,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: t.pepsiBlueStrong, mb: 0.75 }}>
                    {rule.title}
                  </Typography>
                  <Typography sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.55 }}>
                    {rule.detail}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Section>

          <Section
            eyebrow="Editor rules"
            title="Text editing behavior"
            body="The text editor is intentionally lightweight. It should help authors polish long-form content without becoming a full document canvas or creating layout surprises."
          >
            <Box
              sx={{
                p: 2,
                borderRadius: "8px",
                border: `1px solid ${t.border}`,
                bgcolor: t.surface,
              }}
            >
              <Stack component="ul" spacing={0.85} sx={{ pl: 2, m: 0 }}>
                {editorRules.map((rule) => (
                  <Typography
                    key={rule}
                    component="li"
                    sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.5 }}
                  >
                    {rule}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Section>

          <Section
            eyebrow="Objects"
            title="Source of truth"
            body="These are the objects the interface should keep distinct. Most routing bugs and repeat-information issues happen when source articles and published articles blur together."
          >
            <Stack spacing={1.25}>
              {contentObjects.map((object) => (
                <Box
                  key={object.name}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "180px minmax(0, 1fr)" },
                    gap: 1.5,
                    p: 1.75,
                    borderRadius: "8px",
                    border: `1px solid ${t.border}`,
                    bgcolor: t.surface,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: t.pepsiBlueStrong }}>
                    {object.name}
                  </Typography>
                  <Typography sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.55 }}>
                    {object.detail}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Section>

          <Section
            eyebrow="Knowledge architecture"
            title="Taxonomy, relationships, and graph readiness"
            body="Articles now need enough structure to support search, duplication checks, Ask Pep retrieval, and a future knowledge graph. The app should capture this as normal creation metadata, not as hidden admin work."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              {[
                {
                  title: "Destination taxonomy",
                  items: ["Knowledge base", "Sector", "Countries", "Audience", "Access groups", "Source language", "Content type", "Topics"],
                },
                {
                  title: "Article sections",
                  items: ["Text", "FAQ", "Table", "Resource links", "Accordion", "Callout"],
                },
                {
                  title: "Field standards",
                  items: ["Date selector", "Plain question", "Long-form editor", "Table editor", "Resource editor", "Review editor"],
                },
                {
                  title: "Relationships",
                  items: ["Canonical", "Duplicate of", "Replaces", "Related to", "Requires", "Source for"],
                },
              ].map((group) => (
                <Box
                  key={group.title}
                  sx={{
                    p: 2,
                    border: `1px solid ${t.border}`,
                    borderRadius: "8px",
                    bgcolor: t.surface,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: t.pepsiBlueStrong, mb: 1 }}>
                    {group.title}
                  </Typography>
                  <Stack component="ul" spacing={0.65} sx={{ pl: 2, m: 0 }}>
                    {group.items.map((item) => (
                      <Typography
                        key={item}
                        component="li"
                        sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.45 }}
                      >
                        {item}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: "8px",
                bgcolor: t.pepsiBlueSubtle,
                border: `1px solid ${t.articleDivider}`,
              }}
            >
              <Typography sx={{ fontWeight: 800, color: t.pepsiBlueStrong, mb: 1 }}>
                Future queries this structure enables
              </Typography>
              <Stack component="ul" spacing={0.7} sx={{ pl: 2, m: 0 }}>
                {graphQueries.map((query) => (
                  <Typography key={query} component="li" sx={{ color: t.slate, fontSize: "0.875rem" }}>
                    {query}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Section>
        </Stack>

        <Box
          component="aside"
          sx={{
            position: { lg: "sticky" },
            top: { lg: 24 },
          }}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: `1px solid ${t.border}`,
              bgcolor: t.surface,
            }}
          >
            <Typography sx={{ fontWeight: 800, color: t.ink, mb: 1 }}>
              Design principles
            </Typography>
            <Stack spacing={1.25}>
              {[
                "Material for interaction patterns.",
                "PepsiCo article styling for reading surfaces.",
                "Inter for product UI; Barlow + Poppins for articles.",
                "Date fields use date selectors; rich text stays scoped to long-form fields.",
                "Audience improves findability; access controls who can open the article.",
                "Source language is separate from country-driven translation needs.",
                "8px containers, flat surfaces, shadows only for floating UI.",
                "PublishedArticle is the live article source of truth.",
              ].map((item) => (
                <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                  <CheckCircleOutlineIcon sx={{ fontSize: 16, color: t.successInk, mt: 0.2 }} />
                  <Typography sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.45 }}>
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function Section({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box component="section">
      <Typography
        sx={{
          fontFamily: theme.palette.fonts.mono,
          fontSize: "0.6875rem",
          letterSpacing: "0.08em",
          color: t.granite,
          textTransform: "uppercase",
          fontWeight: 700,
          mb: 0.75,
        }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h5" component="h2" sx={{ color: t.pepsiBlueStrong, mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ color: t.slate, lineHeight: 1.6, maxWidth: 840, mb: 2.25 }}>
        {body}
      </Typography>
      {children}
    </Box>
  );
}
