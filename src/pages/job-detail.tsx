import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Link,
  useTheme,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api, type Job, type Article, type TraceEntry } from "../lib/api";
import { localeFor, localeForJobMarket } from "../lib/market";
import MarkdownContent from "../components/markdown-content";

const statusMeta: Record<
  Job["status"],
  { label: string; color: "warning" | "success" | "error" | "default" }
> = {
  intake: { label: "Intake", color: "default" },
  awaiting_clarification: { label: "Awaiting clarification", color: "warning" },
  routing: { label: "Routing", color: "default" },
  drafting: { label: "Drafting", color: "default" },
  compliance_review: { label: "Compliance review", color: "default" },
  revising: { label: "Revising", color: "default" },
  complete: { label: "Complete", color: "success" },
  failed: { label: "Failed", color: "error" },
};

const agentLabel: Record<TraceEntry["agent"], string> = {
  intake: "intake",
  clarifier: "clarifier",
  router: "router",
  market: "country",
  compliance: "compliance",
  revision: "revision",
  consolidation: "consolidation",
  migration: "migration",
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [job, setJob] = useState<Job | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Phase P1.3 — when arriving fresh from the new-article form (?from=new),
  // auto-redirect to the first article the agents produce so the writer is
  // dropped right into the review of their just-submitted piece.
  const cameFromNew = searchParams.get("from") === "new";

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const j = await api.getJob(id);
      setJob(j);
      if (j.articleIds.length > 0) {
        const fetched = await Promise.all(
          j.articleIds.map((aid) => api.getArticle(aid).catch(() => null)),
        );
        setArticles(fetched.filter(Boolean) as Article[]);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [id]);

  useEffect(() => {
    load();
    const i = setInterval(() => {
      if (
        !job ||
        (job.status !== "complete" &&
          job.status !== "failed" &&
          job.status !== "awaiting_clarification")
      ) {
        load();
      }
    }, 1500);
    return () => clearInterval(i);
  }, [load, job]);

  // Phase P1.3 — auto-redirect to the produced article once it exists.
  // Only triggers when we arrived via ?from=new — protects users who landed
  // here by clicking a job-id link from elsewhere (they want to stay).
  useEffect(() => {
    if (!cameFromNew) return;
    if (!job || job.articleIds.length === 0) return;
    // Replace history so back doesn't bounce them to a loading screen.
    navigate(`/articles/${job.articleIds[0]}`, { replace: true });
  }, [cameFromNew, job, navigate]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!job)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress size={24} sx={{ color: t.slate }} />
      </Box>
    );

  const meta = statusMeta[job.status];
  const isInFlight = !["complete", "failed", "awaiting_clarification"].includes(job.status);

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
        onClick={() => navigate("/")}
        sx={{ mb: 3, ml: -1 }}
      >
        Articles
      </Button>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Chip
          label={meta.label}
          color={meta.color === "default" ? undefined : meta.color}
          size="small"
        />
        {isInFlight && <CircularProgress size={14} sx={{ color: t.ember }} />}
        <Box
          component="span"
          sx={{ fontFamily: theme.palette.fonts.mono, fontSize: "0.6875rem", color: t.granite }}
        >
          {job.id}
        </Box>
      </Stack>

      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {job.input.title || "Untitled request"}
      </Typography>

      <Stack direction="row" spacing={4} flexWrap="wrap" rowGap={2} sx={{ mb: 4 }}>
        <Meta label="Submitted by" value={job.input.submittedBy.name} />
        <Meta
          label="Country"
          value={
            <Box
              component="span"
              sx={{ fontFamily: theme.palette.fonts.mono, fontSize: "0.8125rem" }}
            >
              {/* Pick the primary country label for the job header. With
                  multi-select, this collapses to "Global" or the first
                  selected country — good enough for the meta strip. */}
              {localeForJobMarket(
                job.input.markets && job.input.markets.length > 0
                  ? (job.input.markets.includes("global") ||
                      job.input.markets.length > 1
                      ? "both"
                      : job.input.markets[0])
                  : (job.input.market ?? "us"),
              )}
            </Box>
          }
        />
        <Meta label="Type" value={job.input.contentType} />
        <Meta
          label="Created"
          value={new Date(job.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        />
      </Stack>

      {job.status === "awaiting_clarification" && (
        <Alert severity="warning" icon={<EmailOutlinedIcon />} sx={{ mb: 4 }}>
          A clarification email was sent. See{" "}
          <Link component={RouterLink} to="/admin/emails" color="inherit" sx={{ fontWeight: 500 }}>
            Email log
          </Link>
          .
        </Alert>
      )}

      {job.status === "failed" && job.error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {job.error}
        </Alert>
      )}

      {/* ──────────── Agent trace ──────────── */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ mb: 2.5 }}>
          Agent trace
        </Typography>

        {job.trace.length === 0 ? (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: t.slate }}>
            <CircularProgress size={14} sx={{ color: t.ember }} />
            <Typography variant="body2">Waiting for first agent to start…</Typography>
          </Stack>
        ) : (
          <Box sx={{ position: "relative", pl: 3 }}>
            {/* Vertical timeline rail */}
            <Box
              sx={{
                position: "absolute",
                left: 8,
                top: 6,
                bottom: isInFlight ? 24 : 6,
                width: 1,
                bgcolor: t.border,
              }}
            />
            {job.trace.map((entry, i) => (
              <TraceItem key={i} entry={entry} last={i === job.trace.length - 1 && !isInFlight} />
            ))}
            {isInFlight && (
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ position: "relative", py: 1 }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    left: -19,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: t.ember,
                    boxShadow: `0 0 0 4px ${theme.palette.background.default}`,
                  }}
                />
                <Typography variant="body2" sx={{ color: t.slate }}>
                  Next agent running…
                </Typography>
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* ──────────── Drafted articles ──────────── */}
      {articles.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Drafted article{articles.length > 1 ? "s" : ""}
          </Typography>
          <Stack spacing={2.5}>
            {articles.map((a) => (
              <ArticleBlock key={a.id} article={a} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", lineHeight: 1, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.9375rem", lineHeight: 1.3 }}>{value}</Typography>
    </Box>
  );
}

function TraceItem({ entry, last }: { entry: TraceEntry; last: boolean }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const isError = entry.status === "error";
  return (
    <Box sx={{ position: "relative", pb: last ? 0 : 3 }}>
      {/* dot */}
      <Box
        sx={{
          position: "absolute",
          left: -19,
          top: 4,
          width: 12,
          height: 12,
          borderRadius: "50%",
          bgcolor: isError ? t.errorInk : t.ink,
          color: t.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 0 4px ${theme.palette.background.default}`,
        }}
      >
        {isError ? <CloseIcon sx={{ fontSize: 10 }} /> : <CheckIcon sx={{ fontSize: 10 }} />}
      </Box>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: "0.9375rem", fontWeight: 500, color: t.ink }}>
          {entry.label}
        </Typography>
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.slate,
            letterSpacing: "0.02em",
          }}
        >
          {agentLabel[entry.agent]} · {entry.durationMs}ms
        </Box>
      </Stack>
      <TraceOutput entry={entry} />
    </Box>
  );
}

function TraceOutput({ entry }: { entry: TraceEntry }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  if (entry.status === "error") {
    return (
      <Alert severity="error" sx={{ mt: 0.5 }}>
        {entry.error}
      </Alert>
    );
  }
  const out = entry.output as any;
  const textSx = { fontSize: "0.875rem", color: t.slate, lineHeight: 1.5 };

  if (entry.agent === "intake" && out) {
    return (
      <Box sx={{ mt: 0.5 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 0.5 }}>
          <Chip
            label={out.complete ? "Complete" : "Incomplete"}
            color={out.complete ? "success" : "warning"}
            size="small"
          />
          {!out.complete && out.missingFields?.length > 0 && (
            <Typography variant="body2" sx={{ color: t.slate, alignSelf: "center" }}>
              Missing: {out.missingFields.join(", ")}
            </Typography>
          )}
        </Stack>
        {out.notes && <Typography sx={textSx}>{out.notes}</Typography>}
      </Box>
    );
  }
  if (entry.agent === "router" && out) {
    return (
      <Box sx={{ mt: 0.5 }}>
        <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
          {out.markets?.map((m: string) => (
            <Box
              key={m}
              component="span"
              sx={{
                fontFamily: theme.palette.fonts.mono,
                fontSize: "0.6875rem",
                color: t.ink,
                bgcolor: t.mist,
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
              }}
            >
              {localeForJobMarket(m)}
            </Box>
          ))}
        </Stack>
        {out.rationale && <Typography sx={textSx}>{out.rationale}</Typography>}
      </Box>
    );
  }
  if (entry.agent === "compliance" && out) {
    return (
      <Box sx={{ mt: 0.5 }}>
        <Typography sx={textSx}>{out.summary}</Typography>
        {out.issues?.length > 0 && (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {out.issues.map((iss: any, i: number) => (
              <Box
                key={i}
                sx={{
                  fontSize: "0.8125rem",
                  color: t.slate,
                  pl: 1.5,
                  borderLeft: `2px solid ${
                    iss.severity === "error"
                      ? t.errorInk
                      : iss.severity === "warning"
                        ? t.ember
                        : t.border
                  }`,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontFamily: theme.palette.fonts.mono,
                    fontSize: "0.6875rem",
                    color:
                      iss.severity === "error"
                        ? t.errorInk
                        : iss.severity === "warning"
                          ? t.emberStrong
                          : t.slate,
                    mr: 1,
                  }}
                >
                  {iss.severity}/{iss.category}
                </Box>
                {iss.message}
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    );
  }
  if ((entry.agent === "market" || entry.agent === "revision" || entry.agent === "consolidation" || entry.agent === "migration") && out?.title) {
    return (
      <Typography sx={{ ...textSx, mt: 0.5 }}>
        Drafted{" "}
        <Box component="span" sx={{ color: t.ink, fontWeight: 500 }}>
          {out.title}
        </Box>{" "}
        ({(out.body ?? "").length.toLocaleString()} chars)
      </Typography>
    );
  }
  if (entry.agent === "clarifier" && out?.subject) {
    return (
      <Box sx={{ mt: 0.5 }}>
        <Typography sx={{ ...textSx, color: t.ink, fontWeight: 500 }}>{out.subject}</Typography>
        <Typography sx={{ ...textSx, whiteSpace: "pre-wrap", mt: 0.5 }}>{out.body}</Typography>
      </Box>
    );
  }
  return (
    <Box
      component="pre"
      sx={{
        ...textSx,
        whiteSpace: "pre-wrap",
        fontFamily: theme.palette.fonts.mono,
        mt: 0.5,
        bgcolor: t.mist,
        p: 1,
        borderRadius: 0.5,
        fontSize: "0.75rem",
      }}
    >
      {JSON.stringify(out, null, 2)}
    </Box>
  );
}

function ArticleBlock({ article }: { article: Article }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box
      sx={{
        border: `1px solid ${t.border}`,
        borderRadius: 1,
        p: 3,
        bgcolor: t.surface,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography sx={{ fontSize: "1.0625rem", fontWeight: 600, color: t.ink, mb: 0.75 }}>
            {article.title}
          </Typography>
          <Stack direction="row" spacing={0.75}>
            <Chip label={article.contentType} size="small" variant="outlined" />
            <Box
              component="span"
              sx={{
                fontFamily: theme.palette.fonts.mono,
                fontSize: "0.6875rem",
                color: t.slate,
                alignSelf: "center",
              }}
            >
              {localeFor(article.market)}
            </Box>
            <Chip label="Needs review" color="warning" size="small" />
          </Stack>
        </Box>
        <Button component={RouterLink} to={`/articles/${article.id}`} size="small">
          Open
        </Button>
      </Stack>
      <Box
        sx={{
          maxHeight: 360,
          overflowY: "auto",
          borderTop: `1px solid ${t.border}`,
          pt: 2.5,
        }}
      >
        <MarkdownContent maxWidth="100%">{article.body}</MarkdownContent>
      </Box>
    </Box>
  );
}
