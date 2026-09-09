import {
  Box,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import type { ReactNode } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";

type PocView = {
  view: string;
  routeLabel: string;
  icon: ReactNode;
  persona: string;
  archetype: string;
  roleDefinition: string;
  job: string;
  primaryQuestions: string[];
  needs: string[];
  risks: string[];
  pocImplications: string[];
  success: string;
};

const pocViews: PocView[] = [
  {
    view: "Content Owner View",
    routeLabel: "New Article / My Articles",
    icon: <AddCircleOutlineIcon sx={{ fontSize: 20 }} />,
    persona: "Content Owner",
    archetype: "Self-service author",
    roleDefinition:
      "A business or functional owner who knows the subject matter but may not know content strategy, taxonomy, article structure, or Ask Pep readiness standards.",
    job:
      "Create or update a myPepsiCo-ready article that is clear, source-backed, audience-scoped, and ready to submit for approval.",
    primaryQuestions: [
      "Where should this article live?",
      "What type of article am I creating?",
      "What do employees need to know first?",
      "Is this good enough to submit?",
    ],
    needs: [
      "A guided Basics step that captures knowledge base, sector, country, audience, access, approver, and source language before writing.",
      "A structured document editor that starts with a recommended template but lets the owner add FAQ, table, resource, accordion, callout, or text sections.",
      "Plain-language writing and readiness feedback based on the myPepsiCo article guidance, not SEO jargon.",
      "A Review step that shows the article exactly as employees will read it and lets the owner edit sections in place.",
    ],
    risks: [
      "May create duplicate content because they do not know the existing knowledge base.",
      "May write process or policy claims from memory without adding source evidence.",
      "May choose the wrong article type if the product makes templates feel too rigid.",
      "May abandon the flow if editing feels like a technical form instead of a document editor.",
    ],
    pocImplications: [
      "Creation should prioritize self-service confidence over admin detail.",
      "Add section must be flexible because real articles can mix tables, FAQs, resources, and plain text.",
      "Duplicate and related-article hints belong in the support rail while the owner drafts.",
      "Owner should not manually set themselves as owner; that is automatic.",
    ],
    success:
      "A non-expert can create a complete article, understand why it is ready, and submit it without needing a content strategist beside them.",
  },
  {
    view: "Team Admin View",
    routeLabel: "New Article / All Articles / Team Permissions",
    icon: <LibraryBooksOutlinedIcon sx={{ fontSize: 20 }} />,
    persona: "Team Admin",
    archetype: "Operational steward",
    roleDefinition:
      "A team-level governance user who manages article health, review cycles, ownership, and permissions and can create content when needed.",
    job:
      "Keep the team's content accurate, reviewed, assigned, findable, and appropriately governed, while creating standards-ready content when needed.",
    primaryQuestions: [
      "Which articles need attention?",
      "Who owns this content?",
      "Is this article aging or underperforming?",
      "Can the right people access it?",
    ],
    needs: [
      "A clear article inventory with status, ownership, aging, review cadence, engagement, and recommendations.",
      "Reliable published and pre-published article routes with no 404 or 405 errors.",
      "Article detail pages that separate governance metadata from the employee-facing article preview.",
      "Direct access to article creation without losing the team-level governance context.",
    ],
    risks: [
      "May confuse source articles, review articles, and published articles if routing or labels are unclear.",
      "May over-focus on metrics if the article health view is too noisy.",
      "May need to explain governance status to business stakeholders quickly.",
      "May move between authoring and governance and need a clear handoff between creation, review, and approval.",
    ],
    pocImplications: [
      "New Article remains available, while All Articles stays the primary governance workspace.",
      "Article health and lifecycle data should sit above or around the article, not inside the article body.",
      "The right rail should support metadata, quick links, language, publishing details, sources, and related content only.",
      "The table of contents belongs inside the article body, not in the right rail.",
    ],
    success:
      "A Team Admin can create content when needed, understand team content health, and take governance action from one workspace.",
  },
  {
    view: "Super Admin View",
    routeLabel: "New Article / Sectors / Audiences / Email Log",
    icon: <ManageAccountsOutlinedIcon sx={{ fontSize: 20 }} />,
    persona: "Super Admin",
    archetype: "Platform operator",
    roleDefinition:
      "A platform-level administrator who configures the taxonomy, audience model, communication settings, and governance scaffolding that make content creation reliable.",
    job:
      "Maintain the operating model that determines where articles go, who can read them, how they are governed, and how the system can support future Ask Pep and knowledge graph use cases.",
    primaryQuestions: [
      "Are sectors, countries, audiences, and knowledge bases configured correctly?",
      "Are content owners being guided to the right destination?",
      "Do governance and email workflows support the article lifecycle?",
      "Is the data model ready for duplicate detection and graph relationships?",
    ],
    needs: [
      "Configuration surfaces for sectors, markets, audiences, team permissions, and email logs.",
      "Access to the shared article creation experience when platform-level content needs to be authored.",
      "A consistent taxonomy model that uses employee and business language rather than technical labels.",
      "Confidence that content owners cannot bypass required destination and access metadata.",
      "Structured article data that can later produce graph nodes and relationships without a major rebuild.",
    ],
    risks: [
      "May overcomplicate the authoring flow if admin metadata leaks into the owner experience.",
      "May create taxonomy that is technically correct but unclear to content owners.",
      "May lose future graph value if relationships and destinations are not captured during creation.",
      "May weaken trust if published articles are not treated as the canonical source of truth.",
    ],
    pocImplications: [
      "Super Admin configuration should shape creation defaults invisibly where possible.",
      "New Article remains available without displacing standards, governance, and visibility as the primary responsibilities.",
      "PublishedArticle remains the source of truth for employee-facing content.",
      "Relationship fields should support canonical, duplicate, replaces, related, requires, and source-for connections.",
      "Reference pages should explain design, IA, personas, and workflow without becoming admin configuration.",
    ],
    success:
      "A Super Admin can scale the content model and governance rules while keeping the authoring experience simple.",
  },
];

export default function PersonasReference() {
  const theme = useTheme();
  const t = theme.palette.tokens;

  return (
    <Box sx={{ maxWidth: 1320, mx: "auto" }}>
      <Box sx={{ maxWidth: 860, mb: 5 }}>
        <Typography
          variant="overline"
          sx={{ color: t.pepsiBlue, letterSpacing: "0.12em", mb: 1, display: "block" }}
        >
          Reference
        </Typography>
        <Typography variant="h4" component="h1" sx={{ mb: 1.5 }}>
          Personas & Archetypes
        </Typography>
        <Typography sx={{ color: t.slate, lineHeight: 1.65, fontSize: "1rem" }}>
          This POC uses personas as role-based views and archetypes as the
          behavior patterns behind those views. The page is organized by the
          three demo modes that matter most: Content Owner, Team Admin, and
          Super Admin.
        </Typography>
      </Box>

      <Stack spacing={5}>
          <Section
            eyebrow="Model"
            title="How to read this page"
            body="NN/g frames personas and archetypes as two ways of communicating the same research insights. Personas add a humanized role or character; archetypes stay abstract and behavior-led. For this enterprise POC, the practical move is to use role personas for navigation and behavioral archetypes for design decisions."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              <DefinitionCard
                label="Persona"
                title="The POC role view"
                body="The persona tells us which mode of the product someone is using: Content Owner, Team Admin, or Super Admin."
                examples={["Content Owner", "Team Admin", "Super Admin"]}
              />
              <DefinitionCard
                label="Archetype"
                title="The behavior pattern"
                body="The archetype tells us what that person is trying to accomplish and how the UI should support their behavior."
                examples={["Self-service author", "Operational steward", "Platform operator"]}
              />
            </Box>
          </Section>

          <Section
            eyebrow="POC views"
            title="Role-based personas"
            body="Each card maps one POC view to its behavioral archetype, user questions, needs, risks, and product implications."
          >
            <Stack spacing={1.5}>
              {pocViews.map((view) => (
                <PocViewCard key={view.view} view={view} />
              ))}
            </Stack>
          </Section>
        </Stack>
    </Box>
  );
}

function DefinitionCard({
  label,
  title,
  body,
  examples,
}: {
  label: string;
  title: string;
  body: string;
  examples: string[];
}) {
  const t = useTheme().palette.tokens;
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "8px",
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.6875rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: t.granite,
          mb: 0.75,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 850, color: t.pepsiBlueStrong, mb: 0.75 }}>
        {title}
      </Typography>
      <Typography sx={{ color: t.slate, fontSize: "0.875rem", lineHeight: 1.55, mb: 1.25 }}>
        {body}
      </Typography>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
        {examples.map((example) => (
          <Chip
            key={example}
            label={example}
            size="small"
            sx={{
              height: 24,
              borderRadius: "8px",
              bgcolor: t.pepsiBlueSubtle,
              color: t.pepsiBlueStrong,
              fontSize: "0.6875rem",
              fontWeight: 800,
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

function PocViewCard({ view }: { view: PocView }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box
      sx={{
        p: 2.25,
        borderRadius: "8px",
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-start" }}
        sx={{ mb: 1.75 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Box sx={{ color: t.pepsiBlueStrong, display: "flex", mt: 0.25 }}>
            {view.icon}
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 850, color: t.pepsiBlueStrong, fontSize: "1.0625rem" }}>
              {view.view}
            </Typography>
            <Typography sx={{ mt: 0.3, color: t.slate, fontSize: "0.875rem", lineHeight: 1.5 }}>
              {view.roleDefinition}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          <Chip
            label={view.persona}
            size="small"
            sx={{
              height: 26,
              borderRadius: "8px",
              bgcolor: t.pepsiBlueSubtle,
              color: t.pepsiBlueStrong,
              fontWeight: 800,
            }}
          />
          <Chip
            label={view.archetype}
            size="small"
            variant="outlined"
            sx={{
              height: 26,
              borderRadius: "8px",
              borderColor: t.articleDivider,
              fontWeight: 700,
            }}
          />
        </Stack>
      </Stack>

      <Box
        sx={{
          p: 1.5,
          borderRadius: "8px",
          bgcolor: t.surfaceContainerLow,
          border: `1px solid ${t.border}`,
          mb: 1.75,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 1, md: 3 }}
          justifyContent="space-between"
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontFamily: theme.palette.fonts.mono,
                fontSize: "0.6875rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: t.granite,
                textTransform: "uppercase",
                mb: 0.5,
              }}
            >
              Job to be done
            </Typography>
            <Typography sx={{ color: t.ink, fontSize: "0.875rem", lineHeight: 1.55 }}>
              {view.job}
            </Typography>
          </Box>
          <Box sx={{ minWidth: { md: 190 } }}>
            <Typography
              sx={{
                fontFamily: theme.palette.fonts.mono,
                fontSize: "0.6875rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: t.granite,
                textTransform: "uppercase",
                mb: 0.5,
              }}
            >
              POC route
            </Typography>
            <Typography sx={{ color: t.pepsiBlueStrong, fontSize: "0.875rem", fontWeight: 800 }}>
              {view.routeLabel}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        <ListBlock title="Key questions" items={view.primaryQuestions} />
        <ListBlock title="Needs" items={view.needs} />
        <ListBlock title="Risks" items={view.risks} />
        <ListBlock title="POC implications" items={view.pocImplications} />
      </Box>

      <Typography
        sx={{
          mt: 1.75,
          color: t.pepsiBlueStrong,
          fontSize: "0.875rem",
          fontWeight: 750,
          lineHeight: 1.55,
        }}
      >
        Success: {view.success}
      </Typography>
    </Box>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  const t = useTheme().palette.tokens;
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, color: t.ink, fontSize: "0.8125rem", mb: 0.75 }}>
        {title}
      </Typography>
      <Stack component="ul" spacing={0.65} sx={{ pl: 2, m: 0 }}>
        {items.map((item) => (
          <Typography
            key={item}
            component="li"
            sx={{ color: t.slate, fontSize: "0.8125rem", lineHeight: 1.45 }}
          >
            {item}
          </Typography>
        ))}
      </Stack>
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
