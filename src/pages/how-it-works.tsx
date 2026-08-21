import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  useTheme,
  keyframes,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import { api } from "../lib/api";
import { usePersonaMode } from "../lib/persona";

const STEPS = [
  { key: "welcome", title: "Welcome", label: "Welcome" },
  { key: "flow", title: "Create to publish", label: "Flow" },
  { key: "agents", title: "Article building blocks", label: "Article parts" },
  { key: "sequence", title: "Review and publish", label: "Review" },
  { key: "state", title: "Library state", label: "Library" },
  { key: "ready", title: "You're set up", label: "Ready" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

// ────────────────────────────────────────────────────────────
// Live stats — used in steps 4 (sequence small print) and 5 (state)
// ────────────────────────────────────────────────────────────
type LiveStats = {
  articles?: number;
  published?: number;
  jobs?: number;
  markets?: number;
  audiences?: number;
  emails?: number;
  needsReview?: number;
};
function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [arts, jobs, markets, audiences, emails, published] = await Promise.all([
          api.listArticles(),
          api.listJobs(),
          api.listMarkets(),
          api.listAudiences(),
          api.listEmails(),
          api.listPublishedArticles(),
        ]);
        if (cancelled) return;
        setStats({
          articles: arts.length,
          published: published.length,
          jobs: jobs.length,
          markets: markets.length,
          audiences: audiences.length,
          emails: emails.length,
          needsReview: arts.filter((a) => a.status === "needs-review").length,
        });
      } catch {
        /* leave undefined; UI handles it */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return stats;
}

// Counter that eases up to a target value
function useCountUp(target: number | undefined, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === undefined) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out-quart
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

// ────────────────────────────────────────────────────────────
const dash = keyframes`
  to { stroke-dashoffset: -100; }
`;
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;
// ════════════════════════════════════════════════════════════
// MAIN COMPONENT — scrollable guide with sticky jump navigation
// ════════════════════════════════════════════════════════════
const COMPLETED_KEY = "how-it-works-completed-v1";

export default function HowItWorks() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const stats = useLiveStats();
  const [activeSection, setActiveSection] = useState<StepKey>("welcome");

  // Remembers across reloads that someone has been through the tour.
  const [hasCompletedBefore] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(COMPLETED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_KEY, "true");
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, []);

  useEffect(() => {
    const elements = STEPS.map((step) => document.getElementById(`section-${step.key}`)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const key = visible?.target.getAttribute("data-section-key") as StepKey | null;
        if (key) setActiveSection(key);
      },
      { rootMargin: "-24% 0px -58% 0px", threshold: [0.08, 0.25, 0.6] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const jumpToSection = (key: StepKey) => {
    document.getElementById(`section-${key}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <Box
      sx={{
        maxWidth: 1320,
        mx: "auto",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 190px" },
        gap: { xs: 4, lg: 5 },
        alignItems: "start",
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          pb: { xs: 6, md: 10 },
        }}
      >
        <GuideSection stepKey="welcome" compact={false}>
          <StepWelcome hasCompletedBefore={hasCompletedBefore} />
        </GuideSection>
        <GuideSection stepKey="flow">
          <StepFlow />
        </GuideSection>
        <GuideSection stepKey="agents">
          <StepAgents />
        </GuideSection>
        <GuideSection stepKey="sequence">
          <StepSequence />
        </GuideSection>
        <GuideSection stepKey="state">
          <StepState stats={stats} />
        </GuideSection>
        <GuideSection stepKey="ready">
          <StepReady />
        </GuideSection>
      </Box>

      <Box
        component="aside"
        sx={{
          display: { xs: "none", lg: "block" },
          position: "sticky",
          top: 24,
          pt: 1,
        }}
      >
        <Box
          sx={{
            borderLeft: `1px solid ${t.border}`,
            pl: 2,
            py: 0.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.mono,
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              color: t.granite,
              mb: 1.25,
              textTransform: "uppercase",
            }}
          >
            On this page
          </Typography>
          <Stack component="nav" spacing={0.25} aria-label="How it works sections">
            {STEPS.map((step) => {
              const active = activeSection === step.key;
              return (
                <Button
                  key={step.key}
                  onClick={() => jumpToSection(step.key)}
                  disableRipple
                  fullWidth
                  sx={{
                    justifyContent: "flex-start",
                    textTransform: "none",
                    minHeight: 30,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    color: active ? t.pepsiBlueStrong : t.slate,
                    bgcolor: active ? t.pepsiBlueSubtle : "transparent",
                    fontSize: "0.8125rem",
                    fontWeight: active ? 700 : 500,
                    "&:hover": {
                      bgcolor: active ? t.pepsiBlueSubtle : t.mist,
                      color: t.pepsiBlueStrong,
                    },
                  }}
                >
                  {step.label}
                </Button>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

function GuideSection({
  stepKey,
  children,
  compact = true,
}: {
  stepKey: StepKey;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Box
      id={`section-${stepKey}`}
      data-section-key={stepKey}
      component="section"
      sx={{
        scrollMarginTop: 28,
        pt: compact ? { xs: 5, md: 7 } : { xs: 2, md: 4 },
        pb: { xs: 5, md: 7 },
        borderBottom: compact ? "1px solid" : "none",
        borderColor: "divider",
      }}
    >
      {children}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 1 — WELCOME
// ────────────────────────────────────────────────────────────
// First-run framing. Lands the value in one sentence, sets honest
// expectations (5 steps, ~2 min), and gives the visitor an obvious
// way in (Start) and out (Skip). On return visits, the kicker
// acknowledges they've been here so the screen doesn't feel like
// it's re-introducing itself.
// ════════════════════════════════════════════════════════════
function StepWelcome({ hasCompletedBefore }: { hasCompletedBefore: boolean }) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  // Three concrete promises. Each one maps directly to a step the visitor
  // is about to see — so by step 4 they recognize "ah, this is what the
  // welcome was pointing at." Icons reuse the system's visual language.
  const promises = [
    {
      icon: <RouteOutlinedIcon sx={{ fontSize: 20 }} />,
      label: "Set destination, access, language, and format before writing",
    },
    {
      icon: <HubOutlinedIcon sx={{ fontSize: 20 }} />,
      label: "Use structured sections, source files, FAQs, tables, and resources",
    },
    {
      icon: <InsightsOutlinedIcon sx={{ fontSize: 20 }} />,
      label: "Review the same article view employees will read before approval",
    },
  ];

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: 0,
        textAlign: "left",
        px: 0,
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: t.pepsiBlue,
          letterSpacing: "0.14em",
          mb: 2.5,
          display: "block",
          fontWeight: 600,
        }}
      >
        {hasCompletedBefore ? "Welcome back" : "How it works"}
      </Typography>

      <Typography
        variant="h4"
        component="h1"
        sx={{
          mb: 2.5,
          fontSize: { xs: "2rem", md: "2.75rem" },
          lineHeight: 1.15,
          fontWeight: 500,
          letterSpacing: "-0.015em",
          maxWidth: "20ch",
          mx: 0,
        }}
      >
        {hasCompletedBefore
          ? "Content Engine, as a scrollable guide."
          : "Here's how Content Engine ships an article."}
      </Typography>

      <Typography
        sx={{
          fontSize: "1.0625rem",
          color: t.slate,
          lineHeight: 1.6,
          mb: 5,
          maxWidth: "52ch",
          mx: 0,
        }}
      >
        Scroll through the self-service authoring flow, structured article
        templates, and review-to-publish experience. Use the links on the right
        to jump between sections.
      </Typography>

      {/* What you'll see — three promises with icons. Inline, no card
          background, so the page stays flat and Google-clean. */}
      <Box
        sx={{
          maxWidth: 480,
          mx: 0,
          mb: 5,
          textAlign: "left",
        }}
      >
        <Typography
          variant="overline"
          sx={{
            color: t.granite,
            letterSpacing: "0.1em",
            mb: 1.5,
            display: "block",
            fontWeight: 600,
          }}
        >
          What you'll see
        </Typography>
        <Stack spacing={1.25}>
          {promises.map((p, i) => (
            <Stack
              key={p.label}
              direction="row"
              spacing={1.5}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: t.pepsiBlueSubtle,
                  color: t.pepsiBlueStrong,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {p.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.9375rem",
                    color: t.ink,
                    lineHeight: 1.4,
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontFamily: theme.palette.fonts.mono,
                      fontSize: "0.6875rem",
                      color: t.granite,
                      letterSpacing: "0.08em",
                      mr: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </Box>
                  {p.label}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}


// ════════════════════════════════════════════════════════════
// STEP 2 — THE FLOW
// ════════════════════════════════════════════════════════════
function StepFlow() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <StepHeader
        kicker="02"
        title="Create to publish"
        sub="A Content Owner chooses the basics, writes with the right template blocks, reviews the employee-facing article, then sends it for approval and publishing."
      />
      <Box sx={{ position: "relative", py: { xs: 2, md: 4 } }}>
        <FlowDiagram />
      </Box>
    </Box>
  );
}

function FlowDiagram() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      <Box
        component="svg"
        viewBox="0 0 900 320"
        preserveAspectRatio="xMidYMid meet"
        sx={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          <linearGradient id="processGrad" x1="0%" x2="100%">
            <stop offset="0%" stopColor={t.pepsiBlueSubtle} />
            <stop offset="100%" stopColor={t.pepsiBlueSubtle} />
          </linearGradient>
        </defs>

        {/* Connecting path — stops exactly at the box edges so it never
            runs through the mini illustrations inside Submit / Review. */}
        <path
          d="M 190 160 L 360 160 M 540 160 L 710 160"
          stroke={t.borderStrong}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Animated dashed overlay traveling */}
        <path
          d="M 190 160 L 360 160 M 540 160 L 710 160"
          stroke={t.ember}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="10 30"
          style={{ animation: `${dash} 1.8s linear infinite` }}
        />

        {/* PHASE 1 — Set up */}
        <PhaseNode
          x={50}
          y={70}
          width={140}
          height={180}
          number="01"
          title="Set up"
          bg={t.surface}
          stroke={t.border}
        />
        {/* Mini form illustration inside Submit — shifted down so it sits
            cleanly below the title, no overlap. */}
        <rect x={70} y={155} width={100} height={6} rx={2} fill={t.borderStrong} />
        <rect x={70} y={169} width={80} height={6} rx={2} fill={t.borderStrong} />
        <rect x={70} y={185} width={100} height={20} rx={3} fill={t.mist} stroke={t.border} />
        <rect x={70} y={213} width={56} height={20} rx={3} fill={t.ink} />
        <rect x={130} y={213} width={40} height={20} rx={3} fill={t.surface} stroke={t.border} />

        {/* PHASE 2 — Write article (big, accented) */}
        <rect
          x={360}
          y={50}
          width={180}
          height={220}
          rx={12}
          fill="url(#processGrad)"
          stroke={alphaHex(t.pepsiBlue, 0.25)}
          strokeWidth="1.5"
        />
        <text
          x={380}
          y={80}
          fill={t.pepsiBlueStrong}
          fontSize="11"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="2"
          fontWeight="600"
        >
          02
        </text>
        <text
          x={380}
          y={108}
          fill={t.pepsiBlueStrong}
          fontSize="17"
          fontWeight="600"
        >
          Write article
        </text>
        {/* Mini building-block nodes inside Process — row 2 shifted down for clearance
            between the row-1 label and the row-2 circle. */}
        {[
          { x: 390, y: 140, label: "template" },
          { x: 450, y: 140, label: "FAQ" },
          { x: 510, y: 140, label: "table" },
          { x: 390, y: 195, label: "source" },
          { x: 450, y: 195, label: "related" },
          { x: 510, y: 195, label: "preview" },
        ].map((n) => (
          <g key={n.label}>
            <circle cx={n.x} cy={n.y} r={6} fill={t.pepsiBlue} />
            <text
              x={n.x}
              y={n.y + 20}
              textAnchor="middle"
              fontSize="9"
              fill={t.pepsiBlueStrong}
              fontFamily="JetBrains Mono, monospace"
            >
              {n.label}
            </text>
          </g>
        ))}
        {/* Horizontal connectors only — verticals previously ran straight
            through each label's text, which read as text-on-line. */}
        <path
          d="M 396 140 L 444 140 M 456 140 L 504 140 M 396 195 L 444 195 M 456 195 L 504 195"
          stroke={alphaHex(t.pepsiBlue, 0.35)}
          strokeWidth="1"
          fill="none"
        />
        <text
          x={380}
          y={250}
          fill={t.pepsiBlue}
          fontSize="10"
        >
          templates · sources · preview
        </text>

        {/* PHASE 3 — Review */}
        <PhaseNode
          x={710}
          y={70}
          width={140}
          height={180}
          number="03"
          title="Review"
          bg={t.surface}
          stroke={t.border}
        />
        {/* Mini review queue illustration — shifted down so queue rows
            start below the title and the incoming arrow lands between
            the title and the first row, not on top of a row. */}
        <rect x={730} y={155} width={100} height={14} rx={2} fill={t.surface} stroke={t.border} />
        <rect x={734} y={159} width={6} height={6} rx={1} fill={t.successInk} opacity="0.7" />
        <rect x={730} y={175} width={100} height={14} rx={2} fill={t.surface} stroke={t.border} />
        <rect x={734} y={179} width={6} height={6} rx={1} fill={t.emberStrong} opacity="0.7" />
        <rect x={730} y={195} width={100} height={14} rx={2} fill={t.surface} stroke={t.border} />
        <rect x={734} y={199} width={6} height={6} rx={1} fill={t.errorInk} opacity="0.7" />
        <rect x={730} y={215} width={100} height={14} rx={2} fill={t.pepsiBlueSubtle} stroke={alphaHex(t.pepsiBlue, 0.3)} />
        <rect x={734} y={219} width={6} height={6} rx={1} fill={t.pepsiBlue} />
        <text
          x={745}
          y={224}
          fontSize="8"
          fill={t.pepsiBlueStrong}
          fontWeight="600"
        >
          publish ready
        </text>
      </Box>
    </Box>
  );
}

function PhaseNode({
  x,
  y,
  width,
  height,
  number,
  title,
  bg,
  stroke,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  number: string;
  title: string;
  bg: string;
  stroke: string;
}) {
  return (
    <>
      <rect x={x} y={y} width={width} height={height} rx={12} fill={bg} stroke={stroke} strokeWidth="1.5" />
      <text
        x={x + 20}
        y={y + 30}
        fontSize="11"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="2"
        fontWeight="600"
        fill="#928C80"
      >
        {number}
      </text>
      <text x={x + 20} y={y + 58} fontSize="17" fontWeight="600" fill="#202124">
        {title}
      </text>
    </>
  );
}

function alphaHex(hex: string, a: number): string {
  if (hex.startsWith("#") && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return hex;
}

// ════════════════════════════════════════════════════════════
// STEP 3 — AGENTS (radial constellation)
// ════════════════════════════════════════════════════════════
const AGENTS = [
  { id: "basics", name: "Basics", role: "Title, content type, knowledge base, sector, country scope, employee audience, access groups, source language, and approver are captured before writing starts.", color: "blue" },
  { id: "templates", name: "Templates", role: "Each content type starts with the right structure, but authors can rename sections and add new blocks.", color: "blue" },
  { id: "sources", name: "Sources", role: "The support rail keeps source uploads, attachment reminders, and related article signals visible while the author writes.", color: "neutral" },
  { id: "sections", name: "Sections", role: "Authors can add text, FAQ, table, resource-link, accordion, and callout sections so articles can use the blocks they actually need.", color: "ember" },
  { id: "editor", name: "Text editor", role: "Inline editing keeps writing close to the article while basic formatting and improve actions stay contextual.", color: "neutral" },
  { id: "review", name: "Review", role: "The final step shows the employee-facing article preview plus compact readiness, source, access, and findability guidance.", color: "blue" },
  { id: "published", name: "Published", role: "Approved content opens as a PepsiCo-styled article with side metadata, translations, quick links, feedback, and performance data.", color: "ember" },
] as const;

function StepAgents() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [active, setActive] = useState<string>("sections");
  // Auto-cycle through article building blocks.
  useEffect(() => {
    const id = setInterval(() => {
      setActive((cur) => {
        const i = AGENTS.findIndex((a) => a.id === cur);
        return AGENTS[(i + 1) % AGENTS.length].id;
      });
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const activeAgent = AGENTS.find((a) => a.id === active)!;
  return (
    <Box>
      <StepHeader
        kicker="03"
        title="Article building blocks"
        sub="The creator is structured, but not locked down. Authors start from a content-type template, then add the section types the article actually needs."
      />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 4, md: 6 }}
        alignItems="center"
        sx={{ mt: 2 }}
      >
        {/* Radial constellation */}
        <Box sx={{ flex: "1 1 55%", display: "flex", justifyContent: "center" }}>
          <AgentConstellation active={active} onSelect={setActive} />
        </Box>

        {/* Active building-block detail */}
        <Box
          key={activeAgent.id}
          sx={{
            flex: "1 1 45%",
            animation: `${fadeUp} 280ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        >
          <Box
            sx={{
              fontFamily: theme.palette.fonts.mono,
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              color: t.granite,
              mb: 1.25,
            }}
          >
            PART · {String(AGENTS.findIndex((a) => a.id === active) + 1).padStart(2, "0")} OF {AGENTS.length}
          </Box>
          <Typography sx={{ fontSize: "2rem", fontWeight: 600, color: t.ink, mb: 1 }}>
            {activeAgent.name}
          </Typography>
          <Typography sx={{ fontSize: "1rem", color: t.slate, lineHeight: 1.6, mb: 3, maxWidth: "44ch" }}>
            {activeAgent.role}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {AGENTS.map((a) => (
              <Box
                key={a.id}
                onClick={() => setActive(a.id)}
                sx={{
                  fontSize: "0.75rem",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  color: a.id === active ? t.ink : t.slate,
                  bgcolor: a.id === active ? t.mist : "transparent",
                  border: `1px solid ${a.id === active ? t.borderStrong : t.border}`,
                  "&:hover": { borderColor: t.borderStrong },
                }}
              >
                {a.name}
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function AgentConstellation({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 165;
  const n = AGENTS.length;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${size} ${size}`}
      sx={{ width: { xs: 320, md: 440 }, height: "auto", display: "block" }}
    >
      {/* Outer ring guide */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={t.border}
        strokeDasharray="2 5"
      />

      {/* Connection lines from center to each article part */}
      {AGENTS.map((a, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const isActive = a.id === active;
        return (
          <line
            key={`line-${a.id}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={isActive ? t.pepsiBlue : t.border}
            strokeWidth={isActive ? 1.5 : 1}
            opacity={isActive ? 1 : 0.6}
            style={{ transition: "all 280ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        );
      })}

      {/* Center: article standard */}
      <circle
        cx={cx}
        cy={cy}
        r={42}
        fill={t.ink}
      />
      <circle
        cx={cx}
        cy={cy}
        r={48}
        fill="none"
        stroke={alphaHex(t.ink, 0.15)}
        strokeWidth="1"
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="1.5"
        fill={alphaHex("#FFFFFF", 0.6)}
      >
        CORE
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#FFFFFF"
      >
        Standard
      </text>

      {/* Article-part nodes */}
      {AGENTS.map((a, i) => {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const isActive = a.id === active;
        const fill =
          a.color === "ember"
            ? t.ember
            : a.color === "blue"
              ? t.pepsiBlue
              : t.slate;
        return (
          <g
            key={a.id}
            onClick={() => onSelect(a.id)}
            style={{ cursor: "pointer" }}
          >
            {/* Active ring halo */}
            {isActive && (
              <circle
                cx={x}
                cy={y}
                r={24}
                fill="none"
                stroke={fill}
                strokeWidth="1.5"
                opacity="0.35"
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={isActive ? 18 : 14}
              fill={isActive ? fill : t.surface}
              stroke={fill}
              strokeWidth={isActive ? 0 : 2}
              style={{ transition: "all 280ms cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
            {/* Label */}
            <text
              x={x}
              y={y - 32}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isActive ? 600 : 500}
              fill={isActive ? t.ink : t.slate}
              style={{ transition: "all 280ms" }}
            >
              {a.name}
            </text>
          </g>
        );
      })}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 4 — SEQUENCE (swim-lane)
// ════════════════════════════════════════════════════════════
function StepSequence() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <StepHeader
        kicker="04"
        title="Review and publish"
        sub="The article moves from guided setup to editable article preview, then into the published reader without changing format."
      />
      {/* Visual — full width so the diagram has room to breathe. */}
      <Box
        sx={{
          mt: 3,
          mx: "auto",
          maxWidth: 1120,
          // Allow horizontal scroll on narrow viewports without squishing the SVG.
          overflowX: "auto",
        }}
      >
        <SequenceLaneDiagram />
      </Box>

      {/* Supporting notes — secondary, sitting under the diagram. */}
      <Box sx={{ maxWidth: 1120, mx: "auto", mt: { xs: 4, md: 6 } }}>
        <Typography
          variant="overline"
          sx={{ display: "block", mb: 2, color: t.slate, letterSpacing: "0.1em" }}
        >
          Why this shape
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: { xs: 2.5, md: 4 },
          }}
        >
          <Insight
            title="Same article, two moments"
            body="Authors review the article in the same visual system employees will see after publish."
          />
          <Insight
            title="Structured, not rigid"
            body="FAQ blocks, tables, resources, and text sections can be mixed as the content requires."
          />
          <Insight
            title="Governance stays outside the prose"
            body="Owner, approver, knowledge base, country scope, access groups, source language, translations, and publish status live as metadata."
          />
        </Box>
      </Box>
    </Box>
  );
}

function Insight({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: t.pepsiBlue }} />
        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: t.ink }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: "0.8125rem", color: t.slate, lineHeight: 1.55, pl: 1.5 }}>
        {body}
      </Typography>
    </Box>
  );
}

function SequenceLaneDiagram() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const W = 720;
  const H = 540;
  const lanes = [
    { id: "owner", name: "Owner", x: 80 },
    { id: "basics", name: "Basics", x: 215 },
    { id: "article", name: "Article", x: 335 },
    { id: "support", name: "Support", x: 445 },
    { id: "reviewer", name: "Reviewer", x: 555 },
    { id: "published", name: "Published", x: 660 },
  ];
  // Vertical positions for messages — generous spacing so labels never collide
  // with the dashed lane rails or with adjacent message labels.
  const t0 = 90;
  const t1 = 150;
  const t2 = 215;
  const t3 = 310; // parallel block starts here, with the ParallelBar sitting above
  const t4 = 385;
  const t5 = 450;
  const t6 = 500;
  const laneTop = 70;
  const laneBottom = 520;

  const xOf = (id: string) => lanes.find((l) => l.id === id)!.x;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${W} ${H}`}
      sx={{
        width: "100%",
        minWidth: 720,
        maxWidth: 1120,
        height: "auto",
        display: "block",
        mx: "auto",
      }}
    >
      {/* Lane headers + rails */}
      {lanes.map((l) => (
        <g key={l.id}>
          <rect
            x={l.x - 50}
            y={26}
            width={100}
            height={28}
            rx={4}
            fill={t.mist}
          />
          <text
            x={l.x}
            y={45}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            fill={t.ink}
          >
            {l.name}
          </text>
          <line
            x1={l.x}
            y1={laneTop}
            x2={l.x}
            y2={laneBottom}
            stroke={t.border}
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        </g>
      ))}

      {/* Messages */}
      {/* T0: Owner -> Basics */}
      <Message x1={xOf("owner")} x2={xOf("basics")} y={t0} label="choose content type" />
      {/* T1: Basics -> Article */}
      <Message x1={xOf("basics")} x2={xOf("article")} y={t1} label="set KB · scope · approver" color={t.pepsiBlue} />
      {/* T1 return */}
      <Message x1={xOf("article")} x2={xOf("basics")} y={t1 + 24} label="ready to write" returnArrow />
      {/* T2: Article -> Support */}
      <Message x1={xOf("article")} x2={xOf("support")} y={t2} label="load template" color={t.pepsiBlue} />
      <Message x1={xOf("support")} x2={xOf("article")} y={t2 + 24} label="sources attached" returnArrow />

      {/* T3: Parallel — writing happens while source support stays visible.
          The bar sits well above the first message so its label has its own row. */}
      <ParallelBar
        y={t3 - 28}
        x1={xOf("article") - 12}
        x2={xOf("reviewer") + 12}
        label="while writing"
      />
      <Message x1={xOf("article")} x2={xOf("support")} y={t3} label="add FAQ · table · resources" color={t.ember} />
      <Message x1={xOf("article")} x2={xOf("reviewer")} y={t3 + 24} label="preview readiness" color={t.ember} />

      {/* T4: Returns from support + reviewer */}
      <Message x1={xOf("support")} x2={xOf("article")} y={t4} label="related articles" returnArrow />
      <Message x1={xOf("reviewer")} x2={xOf("article")} y={t4 + 24} label="recommendations" returnArrow />

      {/* T5: Article self-action */}
      <SelfNote x={xOf("article")} y={t5} text="submit article for review" />
      {/* T6: notify */}
      <Message x1={xOf("reviewer")} x2={xOf("published")} y={t6} label="publish employee view" />

      {/* Time labels on the left — single label per timeline row */}
      {[
        { y: t0, label: "T+0" },
        { y: t1 + 12, label: "T+0" },
        { y: t2 + 12, label: "T+0" },
        { y: t3 + 12, label: "T+1" },
        { y: t4 + 12, label: "T+2" },
        { y: t5, label: "T+2" },
        { y: t6, label: "T+3" },
      ].map((m, i) => (
        <text
          key={i}
          x={10}
          y={m.y + 4}
          fontSize="9"
          fontFamily="JetBrains Mono, monospace"
          fill={t.granite}
          letterSpacing="0.5"
        >
          {m.label}
        </text>
      ))}
    </Box>
  );
}

function Message({
  x1,
  x2,
  y,
  label,
  color,
  returnArrow,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  color?: string;
  returnArrow?: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const c = color ?? t.slate;
  const arrowSize = 5;
  const isLeft = x2 < x1;
  // Estimate label width so we can paint a paper-colored backing behind the
  // text. Without this, labels render on top of the dashed lane rails and
  // overlap adjacent message lines, which reads as text "under" elements.
  const charW = 5.6;
  const labelW = label.length * charW + 12;
  const midX = (x1 + x2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2 + (isLeft ? arrowSize : -arrowSize)}
        y2={y}
        stroke={c}
        strokeWidth="1.5"
        strokeDasharray={returnArrow ? "3 3" : "none"}
      />
      <polygon
        points={
          isLeft
            ? `${x2 + arrowSize},${y - 3} ${x2},${y} ${x2 + arrowSize},${y + 3}`
            : `${x2 - arrowSize},${y - 3} ${x2},${y} ${x2 - arrowSize},${y + 3}`
        }
        fill={c}
      />
      <rect
        x={midX - labelW / 2}
        y={y - 14}
        width={labelW}
        height={12}
        rx={2}
        fill={t.paper}
      />
      <text
        x={midX}
        y={y - 5}
        textAnchor="middle"
        fontSize="9.5"
        fontFamily={returnArrow ? "JetBrains Mono, monospace" : "Inter, sans-serif"}
        fill={returnArrow ? t.granite : t.ink}
        fontStyle={returnArrow ? "italic" : "normal"}
      >
        {label}
      </text>
    </g>
  );
}

function ParallelBar({
  y,
  x1,
  x2,
  label,
}: {
  y: number;
  x1: number;
  x2: number;
  label: string;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // Label sits as a pill flush with the LEFT edge of the bar, just above it —
  // its own row, so it never overlaps the messages that follow underneath.
  const labelW = label.length * 5.6 + 14;
  return (
    <g>
      <rect
        x={x1}
        y={y - 4}
        width={x2 - x1}
        height={8}
        rx={4}
        fill={alphaHex(t.ember, 0.12)}
        stroke={alphaHex(t.ember, 0.4)}
      />
      <rect
        x={x1}
        y={y - 18}
        width={labelW}
        height={12}
        rx={3}
        fill={alphaHex(t.ember, 0.18)}
      />
      <text
        x={x1 + labelW / 2}
        y={y - 9}
        textAnchor="middle"
        fontSize="9"
        fontFamily="JetBrains Mono, monospace"
        fill={t.emberStrong}
        letterSpacing="0.5"
        fontWeight="600"
      >
        {label}
      </text>
    </g>
  );
}

function SelfNote({ x, y, text }: { x: number; y: number; text: string }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // The note's text would otherwise cross intake / router / country dashed rails.
  // Paint a paper-colored backing behind the text so the rails read as broken
  // and the text stays legible.
  const textW = text.length * 5.6 + 16;
  return (
    <g>
      <rect
        x={x - 6}
        y={y - 8}
        width={12}
        height={16}
        rx={2}
        fill={t.pepsiBlueSubtle}
        stroke={alphaHex(t.pepsiBlue, 0.3)}
      />
      <rect
        x={x + 12}
        y={y - 7}
        width={textW}
        height={14}
        rx={3}
        fill={t.paper}
      />
      <text x={x + 20} y={y + 4} fontSize="10" fill={t.pepsiBlueStrong} fontWeight="500">
        {text}
      </text>
    </g>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 5 — STATE (live counts as layered stack)
// ════════════════════════════════════════════════════════════
function StepState({ stats }: { stats: LiveStats }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const profileCount =
    stats.markets !== undefined && stats.audiences !== undefined
      ? stats.markets + stats.audiences
      : undefined;
  return (
    <Box>
      <StepHeader
        kicker="05"
        title="Library state"
        sub="Live counts from the current workspace: drafts, published articles, profiles, and messages."
      />
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 4, md: 6 }}
        alignItems="center"
        sx={{ mt: 4 }}
      >
        <Box sx={{ flex: "1 1 50%", display: "flex", justifyContent: "center" }}>
          <DataStack stats={stats} />
        </Box>
        <Box sx={{ flex: "1 1 50%" }}>
          <Typography sx={{ fontSize: "1.0625rem", color: t.ink, lineHeight: 1.65, mb: 2 }}>
            The app keeps source articles, published articles, jobs, messages,
            and profile rules as separate records. That is why a draft can be
            reviewed, published, edited, and measured without duplicating the article.
          </Typography>
          <Typography sx={{ fontSize: "0.9375rem", color: t.slate, lineHeight: 1.65, mb: 3 }}>
            Content Owners create and maintain article content. Team Admins and
            Super Admins manage review, governance, profile data, and published health.
          </Typography>
          <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap>
            <BigStat label="Need review" value={stats.needsReview} accent />
            <BigStat label="Published" value={stats.published} />
            <BigStat label="Profiles" value={profileCount} />
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function DataStack({ stats }: { stats: LiveStats }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const layers = [
    { name: "source articles", value: stats.articles, color: t.pepsiBlue },
    { name: "published articles", value: stats.published, color: t.pepsiBlue },
    {
      name: "jobs + messages",
      value:
        stats.jobs !== undefined && stats.emails !== undefined
          ? stats.jobs + stats.emails
          : undefined,
      color: t.slate,
    },
    { name: "audience profiles", value: stats.audiences, color: t.pepsiBlue },
    { name: "market profiles", value: stats.markets, color: t.pepsiBlue },
    { name: "review rules", value: 1, color: t.granite, label: "static" },
  ];

  return (
    <Box
      sx={{
        width: { xs: 320, md: 380 },
        position: "relative",
      }}
    >
      <Stack spacing={1}>
        {layers.map((layer, i) => (
          <Box
            key={layer.name}
            sx={{
              position: "relative",
              transform: `translateX(${i * 6}px)`,
              opacity: 1,
            }}
          >
            <Box
              sx={{
                bgcolor: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 1,
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(60,64,67,0.05)",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: theme.palette.fonts.mono,
                    fontSize: "0.75rem",
                    color: t.slate,
                  }}
                >
                  {layer.name}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} alignItems="baseline">
                {layer.value === undefined ? (
                  <CircularProgress size={14} sx={{ color: t.slate }} />
                ) : (
                  <CountUpDisplay value={layer.value} color={layer.color} />
                )}
                {layer.label && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: theme.palette.fonts.mono,
                      fontSize: "0.625rem",
                      color: t.granite,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {layer.label}
                  </Box>
                )}
              </Stack>
            </Box>
          </Box>
        ))}
      </Stack>
      <Box
        sx={{
          mt: 1.5,
          ml: { xs: 4, md: 4.5 },
          fontFamily: theme.palette.fonts.mono,
          fontSize: "0.6875rem",
          color: t.granite,
          letterSpacing: "0.08em",
        }}
      >
        WORKSPACE DATA
      </Box>
    </Box>
  );
}

function CountUpDisplay({ value, color }: { value: number; color: string }) {
  const v = useCountUp(value, 1100);
  return (
    <Box
      sx={{
        fontSize: "1.375rem",
        fontWeight: 600,
        color,
        fontFamily: "inherit",
        lineHeight: 1,
        minWidth: 30,
        textAlign: "right",
      }}
    >
      {v}
    </Box>
  );
}

function BigStat({
  label,
  value,
  accent,
}: {
  label: string;
  value?: number;
  accent?: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const v = useCountUp(value ?? 0, 1100);
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ display: "block", color: t.slate, mb: 0.25 }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "2rem",
          fontWeight: 600,
          color: accent ? t.ember : t.ink,
          lineHeight: 1,
        }}
      >
        {value === undefined ? "—" : v}
      </Typography>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 6 — READY (the graduation moment)
// ────────────────────────────────────────────────────────────
// The visitor just spent ~2 minutes here. Don't waste the close
// on "thanks for reading." Reframe it as "pick your next move":
// each CTA is keyed to one of the three personas in PRODUCT.md
// (Author / Reviewer / Admin), so anyone leaving the tour can
// identify themselves and land somewhere useful.
// ════════════════════════════════════════════════════════════
function StepReady() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const navigate = useNavigate();
  const [personaMode] = usePersonaMode();
  const canCreateArticle = personaMode === "non-admin";

  // Author first — that's the most common path into this product, and
  // ordering matters: it sets the "primary" suggestion in the eye scan.
  const ctas = [
    canCreateArticle
      ? {
          icon: <ArticleOutlinedIcon />,
          role: "If you're a content owner",
          label: "Start a new article",
          sub: "Start with basics, write from a template, review the employee-facing preview, and submit for approval.",
          to: "/new",
          cta: "New article",
          primary: true,
        }
      : {
          icon: <ArticleOutlinedIcon />,
          role: personaMode === "super-admin" ? "If you're a super admin" : "If you're a team admin",
          label: personaMode === "super-admin" ? "Open all articles" : "Open your review workspace",
          sub: "Manage review, governance, and published content without creating articles directly.",
          to: "/",
          cta: "Open articles",
          primary: true,
        },
    {
      icon: <RateReviewOutlinedIcon />,
      role: "If you're a reviewer",
      label: "Open the review queue",
      sub: "Review drafts and published health signals that need attention.",
      to: "/review",
      cta: "Go to queue",
    },
    {
      icon: <PublicOutlinedIcon />,
      role: "If you're an admin",
      label: "Edit a sector or country",
      sub: "Tune sector, market, audience, and governance settings that flow into new articles.",
      to: "/admin/sectors",
      cta: "Open sectors",
    },
  ];

  return (
    <Box sx={{ textAlign: "center", maxWidth: 1120, mx: "auto" }}>
      {/* Subtle confirmation — small check on a quiet success wash. The
          design system reserves big emphasis for primary actions, so the
          graduation tick stays small on purpose. */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          bgcolor: t.successBg,
          color: t.successInk,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <CheckIcon sx={{ fontSize: 24 }} />
      </Box>

      <Typography
        variant="overline"
        sx={{
          color: t.pepsiBlue,
          letterSpacing: "0.14em",
          mb: 1.5,
          display: "block",
          fontWeight: 600,
        }}
      >
        Tour complete
      </Typography>

      <Typography
        variant="h4"
        component="h2"
        sx={{
          mb: 2,
          fontSize: { xs: "1.875rem", md: "2.25rem" },
          fontWeight: 500,
          letterSpacing: "-0.015em",
        }}
      >
        That's the whole system.
      </Typography>
      <Typography
        sx={{
          fontSize: "1.0625rem",
          color: t.slate,
          maxWidth: "56ch",
          mx: "auto",
          mb: 5,
          lineHeight: 1.6,
        }}
      >
        Pick your first move. Each option opens a real surface, with real data,
        that you can use right now.
      </Typography>

      {/* Three persona-keyed entry cards. Primary card carries a contained
          button, secondaries carry text buttons, so the eye lands on the
          most-common path first. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
          maxWidth: 1040,
          mx: "auto",
          mb: 5,
          textAlign: "left",
        }}
      >
        {ctas.map((c) => (
          <Box
            key={c.to}
            onClick={() => navigate(c.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(c.to);
              }
            }}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: t.surface,
              border: `1px solid ${c.primary ? t.pepsiBlue : t.border}`,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              transition: "all 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              "&:hover": {
                borderColor: t.pepsiBlue,
                bgcolor: c.primary ? t.pepsiBlueSubtle : t.mist,
              },
              "&:focus-visible": {
                outline: `2px solid ${t.pepsiBlue}`,
                outlineOffset: 2,
              },
            }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: c.primary ? t.pepsiBlue : t.pepsiBlueSubtle,
                  color: c.primary ? "#FFFFFF" : t.pepsiBlueStrong,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {c.icon}
              </Box>
              <Typography
                variant="overline"
                sx={{
                  color: t.granite,
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                {c.role}
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontSize: "1.0625rem",
                fontWeight: 600,
                color: t.ink,
                mb: 0.75,
                lineHeight: 1.3,
              }}
            >
              {c.label}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: t.slate,
                lineHeight: 1.5,
                mb: 2,
                flex: 1,
              }}
            >
              {c.sub}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{
                color: c.primary ? t.pepsiBlue : t.slate,
                fontSize: "0.8125rem",
                fontWeight: 500,
              }}
            >
              <Typography
                component="span"
                sx={{ fontSize: "0.8125rem", fontWeight: 500 }}
              >
                {c.cta}
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: 14 }} />
            </Stack>
          </Box>
        ))}
      </Box>

      {/* Quiet footer hint — the guide remains available from the sidebar. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="center"
        sx={{ color: t.granite, fontSize: "0.8125rem" }}
      >
        <Typography sx={{ fontSize: "0.8125rem", color: t.granite }}>
          You can revisit this guide any time from the sidebar.
        </Typography>
      </Stack>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// SHARED — step header
// ════════════════════════════════════════════════════════════
function StepHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub: string;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        sx={{
          fontFamily: theme.palette.fonts.mono,
          fontSize: "0.6875rem",
          letterSpacing: "0.08em",
          color: t.granite,
          mb: 1,
        }}
      >
        SECTION · {kicker}
      </Typography>
      <Typography variant="h4" component="h2" sx={{ mb: 1.5, fontSize: { xs: "1.625rem", md: "1.875rem" } }}>
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: "1rem",
          color: t.slate,
          lineHeight: 1.6,
          maxWidth: "60ch",
        }}
      >
        {sub}
      </Typography>
    </Box>
  );
}
