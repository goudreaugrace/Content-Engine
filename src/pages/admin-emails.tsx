import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardActionArea,
  Collapse,
  Divider,
  TextField,
  MenuItem,
  Button,
  useTheme,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { api, type ArticleStatus, type Market, type StubbedEmail } from "../lib/api";

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TypeFilter = "all" | "clarification" | "stakeholder-notification" | "owner-alert";
type MarketFilter = "all" | Market;
type StatusFilter = "all" | ArticleStatus | "no-article";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "clarification", label: "Clarification" },
  { value: "stakeholder-notification", label: "Stakeholder" },
  { value: "owner-alert", label: "Owner alert" },
];

const MARKET_OPTIONS: { value: MarketFilter; label: string }[] = [
  { value: "all", label: "All countries" },
  { value: "US", label: "United States" },
  { value: "MX", label: "Mexico" },
  { value: "BR", label: "Brazil" },
  { value: "UK", label: "United Kingdom" },
  { value: "IN", label: "India" },
  { value: "Global", label: "Global" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "needs-review", label: "Needs review" },
  { value: "needs-info", label: "Changes Requested" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Published" },
];

export default function AdminEmails() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [emails, setEmails] = useState<StubbedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [countryFilter, setMarketFilter] = useState<MarketFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listEmails();
        if (!cancelled) setEmails(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      if (typeFilter !== "all" && e.kind !== typeFilter) return false;
      if (countryFilter !== "all" && e.market !== countryFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "no-article") {
          if (e.articleStatus) return false;
        } else if (e.articleStatus !== statusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [emails, typeFilter, countryFilter, statusFilter]);

  const hasFilters = typeFilter !== "all" || countryFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => {
    setTypeFilter("all");
    setMarketFilter("all");
    setStatusFilter("all");
  };

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        Email Log
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75, mb: 3, maxWidth: "62ch" }}>
        Stubbed outbound emails. Click any row to read the full message.
      </Typography>

      {/* ───── Filters ───── */}
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ mb: 2.5 }}
        flexWrap="wrap"
        useFlexGap
        rowGap={1.25}
      >
        <FilterSelect
          label="Type"
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as TypeFilter)}
          options={TYPE_OPTIONS}
        />
        <FilterSelect
          label="Country"
          value={countryFilter}
          onChange={(v) => setMarketFilter(v as MarketFilter)}
          options={MARKET_OPTIONS}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={STATUS_OPTIONS}
        />
        {hasFilters && (
          <Button size="small" onClick={clearFilters} sx={{ ml: "auto" }}>
            Clear Filters
          </Button>
        )}
        <Typography
          variant="caption"
          sx={{ color: t.slate, ml: hasFilters ? 0 : "auto" }}
        >
          {filtered.length} of {emails.length}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && emails.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
          <CircularProgress size={24} sx={{ color: t.slate }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box
          sx={{
            border: `1px dashed ${t.borderStrong}`,
            borderRadius: 1,
            p: 6,
            textAlign: "center",
          }}
        >
          <EmailOutlinedIcon sx={{ fontSize: 32, color: t.granite, mb: 1 }} />
          <Typography color="text.secondary" variant="body2">
            {emails.length === 0
              ? "No emails sent yet. Submit a new article to trigger one."
              : "No emails match these filters."}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {filtered.map((e) => (
            <EmailCard
              key={e.id}
              email={e}
              open={expanded.has(e.id)}
              onToggle={() => toggle(e.id)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 160 }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function EmailCard({
  email,
  open,
  onToggle,
}: {
  email: StubbedEmail;
  open: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const isClar = email.kind === "clarification";

  return (
    <Card variant="outlined">
      <CardActionArea onClick={onToggle} sx={{ "&:hover": { bgcolor: t.mist } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ px: 2.5, py: 1.75 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            minWidth={0}
            sx={{ flex: 1 }}
          >
            <Chip
              label={isClar ? "Clarification" : "Stakeholder"}
              size="small"
              color={isClar ? "warning" : undefined}
              variant={isClar ? "filled" : "outlined"}
            />
            <Typography
              sx={{ fontSize: "0.9375rem", fontWeight: 500, color: t.ink, minWidth: 0 }}
              noWrap
            >
              {email.subject}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.25} flexShrink={0}>
            {email.market && (
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  color: t.slate,
                  letterSpacing: "0.04em",
                }}
              >
                {email.market.toUpperCase()}
              </Typography>
            )}
            <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
              {email.to.length} {email.to.length === 1 ? "recipient" : "recipients"}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
              {formatStamp(email.sentAt)}
            </Typography>
            <KeyboardArrowDownIcon
              sx={{
                fontSize: 20,
                color: t.slate,
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </Stack>
        </Stack>
      </CardActionArea>

      <Collapse in={open} timeout={200}>
        <Divider />
        <Box sx={{ px: 2.5, py: 2.5 }}>
          <Stack direction="row" spacing={4} sx={{ mb: 3 }} flexWrap="wrap" rowGap={1.5}>
            <Meta label="Country" value={email.market ?? "—"} />
            <Meta
              label="Article status"
              value={statusLabel(email.articleStatus)}
            />
            {email.articleTitle && (
              <Meta label="Article" value={email.articleTitle} />
            )}
          </Stack>

          <Typography
            variant="overline"
            sx={{ display: "block", mb: 0.75, color: t.slate }}
          >
            To
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
            {email.to.map((addr) => (
              <Box
                key={addr}
                sx={{
                  fontSize: "0.75rem",
                  color: t.slate,
                  bgcolor: t.mist,
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                }}
              >
                {addr}
              </Box>
            ))}
          </Stack>

          <Typography
            variant="overline"
            sx={{ display: "block", mb: 0.75, color: t.slate }}
          >
            Body
          </Typography>
          <Typography
            sx={{
              fontSize: "0.875rem",
              color: t.ink,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              maxWidth: "68ch",
            }}
          >
            {email.body}
          </Typography>
        </Box>
      </Collapse>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", lineHeight: 1, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.875rem" }}>{value}</Typography>
    </Box>
  );
}

function statusLabel(s?: ArticleStatus): string {
  if (!s) return "—";
  return {
    "needs-review": "Needs review",
    "needs-info": "Changes Requested",
    rejected: "Rejected",
    published: "Published",
  }[s];
}
