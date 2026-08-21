import {
  Box,
  Chip,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import type { ReactNode } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

type PocPersona = {
  name: string;
  archetype: string;
  role: string;
  primaryViews: string[];
  job: string;
  needs: string[];
  risks: string[];
  productImplications: string[];
  success: string;
};

const personas: PocPersona[] = [
  {
    name: "Content Owner",
    archetype: "Self-service author",
    role: "Creates or updates employee-facing knowledge without being a content strategist.",
    primaryViews: ["New Article", "My Articles", "Review"],
    job: "Turn a policy, process, FAQ, or resource hub into a clear article that can be approved and read in myPepsiCo.",
    needs: [
      "Guided setup for destination, audience, access, country, approver, and source language.",
      "Templates that start the article without trapping the author in one rigid format.",
      "Simple section editors for text, FAQ, tables, resources, accordions, and callouts.",
      "Plain-language readiness feedback instead of SEO or technical terminology.",
    ],
    risks: [
      "May not know what counts as a good article title, source, or summary.",
      "May duplicate an article that already exists.",
      "May write from their own process knowledge without attaching source evidence.",
    ],
    productImplications: [
      "Creation must feel like a structured document editor, not a long form.",
      "The review step must show the final employee-facing article and allow direct edits.",
      "Duplicate suggestions and source prompts should appear before the author spends too much time writing.",
    ],
    success: "Can create a usable article with minimal training and confidently submit it for approval.",
  },
  {
    name: "Employee Reader",
    archetype: "Task-focused finder",
    role: "Reads published articles to answer a question or complete a task.",
    primaryViews: ["Published Article", "Library", "Ask Pep result"],
    job: "Find the right article quickly, understand whether it applies to them, and act with confidence.",
    needs: [
      "Globally unique, searchable titles written in employee language.",
      "A lead that explains what the article covers and when to use it.",
      "A table of contents inside the article body for scanning.",
      "Relevant tags, language, quick links, and publishing details outside the main article.",
    ],
    risks: [
      "May land on a similar article that applies to another country, audience, or policy version.",
      "May miss an exception, effective date, or required source document if the article buries it.",
      "May distrust content if ownership, review status, or update timing is unclear.",
    ],
    productImplications: [
      "PublishedArticle must remain the source of truth for readable content.",
      "Article body and side rail must avoid duplicate or conflicting information.",
      "Audience, country, language, source, and related-article metadata must support search and Ask Pep routing.",
    ],
    success: "Can answer the question without opening multiple duplicate articles or asking another team.",
  },
  {
    name: "Reviewer or Approver",
    archetype: "Source-backed gatekeeper",
    role: "Reviews submitted content for accuracy, scope, readability, and policy risk.",
    primaryViews: ["Review Queue", "Article Detail", "Messages"],
    job: "Confirm the article is accurate, source-backed, audience-scoped, and ready to publish.",
    needs: [
      "Clear submission details: owner, approver, audience, access, country, knowledge base, and source files.",
      "The same article preview employees will read after publishing.",
      "Section-level edit controls that match creation editors.",
      "Readable readiness signals for Ask Pep and publish quality.",
    ],
    risks: [
      "May approve content that lacks a source or has unsupported policy claims.",
      "May miss duplication or replacement relationships.",
      "May have to bounce articles back because the editing experience is inconsistent.",
    ],
    productImplications: [
      "Review should be a publish-readiness workspace, not a data dump.",
      "Editing in review must use the same structured editors as creation.",
      "Recommendations should attach to the relevant article section.",
    ],
    success: "Can approve, request changes, or publish without leaving the workflow.",
  },
  {
    name: "Team Admin",
    archetype: "Operational steward",
    role: "Manages team content health and permissions but does not create new articles.",
    primaryViews: ["All Articles", "Team Permissions", "Article Detail"],
    job: "Keep the team's knowledge accurate, reviewed, assigned, and governed.",
    needs: [
      "Visibility into article status, aging, review cadence, ownership, and engagement.",
      "Permission and team-management controls separated from article authoring.",
      "A reliable route to view every published or in-review article.",
      "Clear distinction between source articles and published articles.",
    ],
    risks: [
      "May confuse admin metadata with the employee-facing article.",
      "May accidentally manage the wrong canonical article if duplicates exist.",
      "May need to explain article health to stakeholders without digging through raw data.",
    ],
    productImplications: [
      "Team Admins and Super Admins should not see New Article as a primary action.",
      "Article health and lifecycle status should sit above the article, not inside the employee-facing content.",
      "Routing must never produce 404/405 for published articles.",
    ],
    success: "Can understand article health and governance actions at a glance.",
  },
  {
    name: "Super Admin",
    archetype: "Platform operator",
    role: "Owns system configuration, governance rules, and reference data.",
    primaryViews: ["Sectors", "Audiences", "Email Log", "All Articles"],
    job: "Configure the taxonomy and operating model that makes self-service creation reliable.",
    needs: [
      "Control over sectors, markets, audiences, and publishing communications.",
      "Confidence that authors select the right article destination.",
      "Consistency across templates, article renderer, and review workflow.",
      "A future-ready model for taxonomy, relationships, and knowledge graph export.",
    ],
    risks: [
      "If taxonomy is too technical, authors will pick the wrong destination.",
      "If roles are unclear, admins may become accidental content authors.",
      "If published articles are not canonical, search and Ask Pep will degrade.",
    ],
    productImplications: [
      "Admin configuration should shape the authoring experience without adding complexity to the author.",
      "Reference pages should explain the IA and design rules for demos and onboarding.",
      "Graph-ready relationships should be stored in JSON before any graph database is introduced.",
    ],
    success: "Can scale the content model without relying on manual cleanup after every article submission.",
  },
  {
    name: "Knowledge Architect",
    archetype: "Ontology builder",
    role: "Designs how articles connect to topics, sources, policies, systems, countries, and audiences.",
    primaryViews: ["Design & IA", "Personas", "All Articles", "Future graph export"],
    job: "Make knowledge findable, deduplicated, source-backed, and queryable for future Ask Pep and graph use cases.",
    needs: [
      "Structured article sections instead of Markdown-only bodies.",
      "Relationship types such as duplicate, replaces, related, requires, canonical, and source for.",
      "Taxonomy fields that map to real business language.",
      "Signals for missing owners, approvers, sources, translations, and review dates.",
    ],
    risks: [
      "May over-model too early and slow the authoring experience.",
      "May create taxonomy labels that employees and content owners do not understand.",
      "May lose graph value if relationships are not captured at creation time.",
    ],
    productImplications: [
      "Capture graph-ready metadata during normal authoring, not as a separate admin chore.",
      "Keep duplicate detection advisory unless there is a very strong canonical match.",
      "Use relationships to improve search, Ask Pep routing, and governance reporting over time.",
    ],
    success: "Can answer future governance and search questions from structured article data.",
  },
];

const pocViews = [
  {
    title: "New Article",
    icon: <ArticleOutlinedIcon sx={{ fontSize: 18 }} />,
    owner: "Content Owner",
    purpose: "Guided creation across Basics, Article, and Review.",
    mustSupport: [
      "Self-service setup before writing.",
      "Flexible section blocks.",
      "Source files and related article hints.",
      "Review as the final employee-facing preview.",
    ],
  },
  {
    title: "Published Article",
    icon: <SearchOutlinedIcon sx={{ fontSize: 18 }} />,
    owner: "Employee Reader",
    purpose: "Canonical article employees and Ask Pep can rely on.",
    mustSupport: [
      "PepsiCo article styling.",
      "In-article table of contents only.",
      "Right rail metadata without duplicate content.",
      "Language, tags, quick links, sources, and related content.",
    ],
  },
  {
    title: "Review Queue",
    icon: <FactCheckOutlinedIcon sx={{ fontSize: 18 }} />,
    owner: "Reviewer or Approver",
    purpose: "Approve, request changes, or publish source-backed articles.",
    mustSupport: [
      "Submission details near the top.",
      "Article preview as the main object.",
      "Consistent edit controls for every section type.",
      "Plain-language publish and Ask Pep readiness.",
    ],
  },
  {
    title: "Admin Workspaces",
    icon: <ManageAccountsOutlinedIcon sx={{ fontSize: 18 }} />,
    owner: "Team Admin and Super Admin",
    purpose: "Govern article health, teams, sectors, audiences, and communication.",
    mustSupport: [
      "No direct article creation for admin personas.",
      "Reliable article routing.",
      "Clear lifecycle and ownership signals.",
      "Configuration that feeds the authoring workflow.",
    ],
  },
  {
    title: "Reference Pages",
    icon: <AccountTreeOutlinedIcon sx={{ fontSize: 18 }} />,
    owner: "Demo stakeholder",
    purpose: "Explain product direction, IA, design rules, personas, and operating model.",
    mustSupport: [
      "Non-technical explanations.",
      "Current-state documentation.",
      "Clear connection to myPepsiCo content guidelines.",
      "Roadmap language without becoming a backlog tool.",
    ],
  },
];

const archetypes = [
  {
    title: "Authoring",
    description: "People creating or changing article content need guidance, not a blank canvas.",
    signals: ["Templates", "Section blocks", "Source upload", "Review preview"],
  },
  {
    title: "Reading",
    description: "People consuming articles need clarity, scope, and confidence that the answer applies to them.",
    signals: ["Lead", "Title", "In-article contents", "Metadata rail"],
  },
  {
    title: "Governance",
    description: "People approving and maintaining articles need source-backed status, ownership, and lifecycle signals.",
    signals: ["Approver", "Review date", "Aging", "Recommendation", "History"],
  },
  {
    title: "Knowledge Architecture",
    description: "People improving search and Ask Pep need taxonomy, relationships, and graph-ready data.",
    signals: ["Topics", "Sources", "Relationships", "Canonical article"],
  },
];

export default function PersonasReference() {
  const theme = useTheme();
  const t = theme.palette.tokens;

  return (
    <Box sx={{ maxWidth: 1320, mx: "auto" }}>
      <Box sx={{ maxWidth: 840, mb: 5 }}>
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
          A working map of who the POC serves and how each view should support
          them. These personas come from the article creation work, Wikipedia-
          inspired article principles, myPepsiCo content guidance, and the
          feedback that the product must stay self-service while still capturing
          enough structure for governance, Ask Pep, and future knowledge graph
          work.
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
            eyebrow="POC views"
            title="Which views serve which people"
            body="The IA should stay role-based: authors create, reviewers approve, admins govern, employees read, and knowledge architects improve the model behind the scenes."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              {pocViews.map((view) => (
                <Box
                  key={view.title}
                  sx={{
                    p: 2,
                    borderRadius: "8px",
                    border: `1px solid ${t.border}`,
                    bgcolor: t.surface,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ color: t.pepsiBlueStrong, display: "flex" }}>
                      {view.icon}
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: t.pepsiBlueStrong }}>
                      {view.title}
                    </Typography>
                  </Stack>
                  <Typography sx={{ color: t.ink, fontSize: "0.8125rem", fontWeight: 700 }}>
                    Primary persona: {view.owner}
                  </Typography>
                  <Typography sx={{ mt: 0.75, color: t.slate, fontSize: "0.875rem", lineHeight: 1.55 }}>
                    {view.purpose}
                  </Typography>
                  <Stack component="ul" spacing={0.65} sx={{ mt: 1.25, pl: 2, m: 0 }}>
                    {view.mustSupport.map((item) => (
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
              ))}
            </Box>
          </Section>

          <Section
            eyebrow="Archetypes"
            title="Behavior patterns to design around"
            body="The personas cluster into four product behaviors. These archetypes are useful because they map directly to interface requirements."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              {archetypes.map((archetype) => (
                <Box
                  key={archetype.title}
                  sx={{
                    p: 2,
                    borderRadius: "8px",
                    bgcolor: t.pepsiBlueSubtle,
                    border: `1px solid ${t.articleDivider}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, color: t.pepsiBlueStrong, mb: 0.75 }}>
                    {archetype.title}
                  </Typography>
                  <Typography sx={{ color: t.slate, fontSize: "0.8125rem", lineHeight: 1.5, mb: 1.25 }}>
                    {archetype.description}
                  </Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {archetype.signals.map((signal) => (
                      <Chip
                        key={signal}
                        label={signal}
                        size="small"
                        sx={{
                          height: 24,
                          borderRadius: "8px",
                          bgcolor: "#FFFFFF",
                          border: `1px solid ${t.border}`,
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Section>

          <Section
            eyebrow="Personas"
            title="POC personas"
            body="Each persona below connects a real workflow to a product responsibility. The key design rule is to keep each view focused on the person's job, while shared article data keeps everything connected."
          >
            <Stack spacing={1.5}>
              {personas.map((persona) => (
                <PersonaCard key={persona.name} persona={persona} />
              ))}
            </Stack>
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
              Design takeaways
            </Typography>
            <Stack spacing={1.25}>
              {[
                "Authors need structure with freedom.",
                "Reviewers need source-backed confidence.",
                "Employees need one canonical answer.",
                "Admins need governance without becoming authors.",
                "Knowledge architects need graph-ready metadata captured naturally.",
                "Reference pages should explain the system without adding workflow steps.",
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

function PersonaCard({ persona }: { persona: PocPersona }) {
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
        <Box>
          <Typography sx={{ fontWeight: 850, color: t.pepsiBlueStrong, fontSize: "1.0625rem" }}>
            {persona.name}
          </Typography>
          <Typography sx={{ mt: 0.3, color: t.slate, fontSize: "0.875rem", lineHeight: 1.5 }}>
            {persona.role}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          <Chip
            label={persona.archetype}
            size="small"
            sx={{
              height: 26,
              borderRadius: "8px",
              bgcolor: t.pepsiBlueSubtle,
              color: t.pepsiBlueStrong,
              fontWeight: 800,
            }}
          />
          {persona.primaryViews.map((view) => (
            <Chip
              key={view}
              label={view}
              size="small"
              variant="outlined"
              sx={{
                height: 26,
                borderRadius: "8px",
                borderColor: t.articleDivider,
                fontWeight: 700,
              }}
            />
          ))}
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
          {persona.job}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        <ListBlock title="Needs" items={persona.needs} />
        <ListBlock title="Risks" items={persona.risks} />
        <ListBlock title="Product implications" items={persona.productImplications} />
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
        Success: {persona.success}
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
