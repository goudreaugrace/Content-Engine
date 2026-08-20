import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api, currentUser, type ContentType, type Country, type MarketProfile, type SectorProfile } from "../lib/api";

const CONTENT_TYPES: ContentType[] = ["FAQ", "Policy", "Knowledge Article", "Topic Page"];

export default function MigrationStandardization() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [markets, setMarkets] = useState<MarketProfile[]>([]);
  const [sectors, setSectors] = useState<SectorProfile[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({
    sourceTitle: "",
    sourceContent: "",
    contentType: "Knowledge Article" as ContentType,
    marketId: "us",
    sectorId: "pfna",
    countries: ["US"],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listMarkets().then(setMarkets).catch(() => setMarkets([]));
    api.listSectors().then(setSectors).catch(() => setSectors([]));
    api.listCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  const selectedMarket = markets.find((m) => m.id === form.marketId);
  const visibleCountries = useMemo(() => {
    if (!selectedMarket) return countries;
    return countries.filter((c) => c.defaultMarketId === selectedMarket.id);
  }, [countries, selectedMarket]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.standardizeMigration({
        ...form,
        sourceTitle: form.sourceTitle.trim() || "Migrated source content",
        sourceContent: form.sourceContent.trim(),
        submittedBy: currentUser(),
      });
      navigate(`/articles/${result.article.id}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setSubmitting(false);
    }
  };

  const canSubmit = form.sourceContent.trim().length >= 40 && form.countries.length > 0;

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
        onClick={() => navigate("/")}
        sx={{ mb: 3, ml: -1 }}
      >
        All Articles
      </Button>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <AutoFixHighOutlinedIcon sx={{ color: t.pepsiBlue }} />
        <Typography variant="h4" component="h1">
          Migration standardization
        </Typography>
      </Stack>
      <Typography color="text.secondary" sx={{ maxWidth: "68ch", mb: 4 }}>
        Paste migrated SharePoint or source-repository content. The agent condenses it into a DEEx article template, adds governance metadata, and sends the draft into review.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5, mb: 3 }}>
        <TextField
          label="Source title"
          value={form.sourceTitle}
          onChange={(e) => update("sourceTitle", e.target.value)}
          placeholder="e.g. Well-being benefits overview"
          fullWidth
        />
        <TextField
          select
          label="Content type"
          value={form.contentType}
          onChange={(e) => update("contentType", e.target.value as ContentType)}
          fullWidth
        >
          {CONTENT_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Sector"
          value={form.sectorId}
          onChange={(e) => update("sectorId", e.target.value)}
          fullWidth
        >
          {sectors.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Country"
          value={form.marketId}
          onChange={(e) => {
            const marketId = e.target.value;
            update("marketId", marketId);
            const next = markets.find((m) => m.id === marketId);
            if (next?.defaultCountries?.length) update("countries", next.defaultCountries);
          }}
          fullWidth
        >
          {markets.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
        </TextField>
      </Box>

      <TextField
        label="Migrated source content"
        value={form.sourceContent}
        onChange={(e) => update("sourceContent", e.target.value)}
        multiline
        minRows={10}
        fullWidth
        placeholder="Paste the source article, policy page, SharePoint export, or migration summary here..."
        sx={{ mb: 2.5 }}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {(visibleCountries.length ? visibleCountries : countries).slice(0, 12).map((c) => {
          const selected = form.countries.includes(c.code);
          return (
            <Chip
              key={c.code}
              label={c.code}
              onClick={() => update("countries", selected ? form.countries.filter((x) => x !== c.code) : [...form.countries, c.code])}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              size="small"
            />
          );
        })}
      </Stack>

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button onClick={() => navigate("/")}>Cancel</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!canSubmit || submitting}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <AutoFixHighOutlinedIcon sx={{ fontSize: 16 }} />}
        >
          {submitting ? "Standardizing..." : "Standardize for DEEx"}
        </Button>
      </Stack>
    </Box>
  );
}
