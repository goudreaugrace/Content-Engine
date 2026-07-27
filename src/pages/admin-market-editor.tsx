import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Checkbox,
  ListItemText,
  MenuItem,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api, type MarketProfile, type SectorProfile } from "../lib/api";
import { LOCALE_CATALOG, localeLabel } from "../lib/market";
import TagInput from "../components/market-editor/tag-input";
import TerminologyEditor from "../components/market-editor/terminology-editor";
import SourceManager from "../components/source-manager";

export default function AdminCountryEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [original, setOriginal] = useState<MarketProfile | null>(null);
  const [form, setForm] = useState<MarketProfile | null>(null);
  const [sectors, setSectors] = useState<SectorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getMarket(id), api.listSectors()])
      .then(([p, s]) => {
        setOriginal(p);
        setForm(p);
        setSectors(s);
      })
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const changedFields = useMemo<string[]>(() => {
    if (!original || !form) return [];
    const keys: (keyof MarketProfile)[] = [
      "name", "language", "languageCode", "availableLanguages", "toneOfVoice",
      "contentStrategy", "contentGuidelines", "regulatoryNotes", "dateFormat",
      "currency", "terminology", "bannedTerms", "reviewers",
      // Phase D
      "seoNotes", "commonSearchTerms", "defaultCountries",
      // Sector tier
      "sectorId",
      // Reference sources
      "sources",
    ];
    return keys.filter((k) => JSON.stringify(original[k]) !== JSON.stringify(form[k]));
  }, [original, form]);

  const isDirty = changedFields.length > 0;

  const update = <K extends keyof MarketProfile>(key: K, value: MarketProfile[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const reset = () => original && setForm(original);

  const save = async () => {
    if (!form || !id) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveMarket(id, form);
      setOriginal(saved);
      setForm(saved);
      setSavedToast(true);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress size={24} sx={{ color: t.slate }} />
      </Box>
    );
  if (error && !form) return <Alert severity="error">{error}</Alert>;
  if (!form) return null;

  return (
    <Box sx={{ maxWidth: 880, mx: "auto", pb: 16 }}>
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
        onClick={() => navigate("/admin/sectors")}
        sx={{ mb: 3, ml: -1 }}
      >
        Sectors
      </Button>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.75rem",
            color: t.slate,
          }}
        >
          {form.languageCode}
        </Box>
        {isDirty && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: t.ember }} />
            <Typography sx={{ fontSize: "0.75rem", color: t.emberStrong, fontWeight: 500 }}>
              Unsaved changes
            </Typography>
          </Stack>
        )}
      </Stack>

      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        {form.name}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "62ch", mb: 5 }}>
        Editing the {form.name} country profile. Guidelines below are authored in English. The
        agent translates output into {form.language} based on the language code.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={6}>
        <Section
          title="Sector"
          subtitle="Which sector owns this country. Sector guidelines apply first (corporate framing), then country rules layer on top."
          number="00"
        >
          <TextField
            select
            label="Sector"
            value={form.sectorId ?? ""}
            onChange={(e) =>
              update("sectorId", (e.target.value || undefined) as string | undefined)
            }
            fullWidth
            helperText="If a country has no sector, it uses only its own guidelines (legacy behavior)."
            SelectProps={{ native: false }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {sectors.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </Section>

        <Section
          title="Basics"
          subtitle="Country identity and locale parameters."
          number="01"
        >
          <Stack spacing={2.5}>
            <TextField
              label="Country name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              fullWidth
              helperText="Displayed in the UI and used by the country agent in its system prompt."
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Output language (display name)"
                value={form.language}
                onChange={(e) => update("language", e.target.value)}
                sx={{ flex: 1 }}
                helperText="e.g. English, Spanish, Portuguese."
              />
              <TextField
                label="Language code"
                value={form.languageCode}
                onChange={(e) => update("languageCode", e.target.value)}
                sx={{ flex: 1 }}
                helperText="BCP-47 locale. This is the parameter the agent uses."
                inputProps={{ style: { fontFamily: theme.palette.fonts.mono } }}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Date format"
                value={form.dateFormat}
                onChange={(e) => update("dateFormat", e.target.value)}
                sx={{ flex: 1 }}
                helperText="e.g. MM/DD/YYYY or DD/MM/YYYY."
                inputProps={{ style: { fontFamily: theme.palette.fonts.mono } }}
              />
              <TextField
                label="Currency"
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
                sx={{ flex: 1 }}
                helperText="ISO 4217 code (USD, MXN, BRL)."
                inputProps={{ style: { fontFamily: theme.palette.fonts.mono } }}
              />
            </Stack>
          </Stack>
        </Section>

        <Section
          title="Available languages"
          subtitle="All languages this country makes content available in. The article view shows one toggle per language; the primary is always included."
          number="02"
        >
          <AvailableLanguagesPicker
            primary={form.languageCode}
            value={form.availableLanguages ?? [form.languageCode]}
            onChange={(v) => update("availableLanguages", v)}
          />
        </Section>

        <Section
          title="Content strategy and guidelines"
          subtitle="Author in English. The country agent reads as instructions and translates output."
          number="03"
        >
          <Stack spacing={2.5}>
            <TextField
              label="Tone of voice"
              value={form.toneOfVoice}
              onChange={(e) => update("toneOfVoice", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="How content should sound: formal vs casual, pronoun choices, sentence length."
            />
            <TextField
              label="Content strategy"
              value={form.contentStrategy}
              onChange={(e) => update("contentStrategy", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="What topics matter, audience considerations, what to prioritize."
            />
            <TextField
              label="Content guidelines"
              value={form.contentGuidelines}
              onChange={(e) => update("contentGuidelines", e.target.value)}
              fullWidth
              multiline
              minRows={4}
              helperText="Specific do's and don'ts: spelling, number formatting, punctuation."
            />
            <TextField
              label="Regulatory notes"
              value={form.regulatoryNotes}
              onChange={(e) => update("regulatoryNotes", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="Laws, regulations, approval requirements the agent should reference."
            />
          </Stack>
        </Section>

        <Section
          title="Terminology"
          subtitle="Source word → replacement. The agent substitutes the left-hand term with the right."
          number="04"
        >
          <TerminologyEditor
            value={form.terminology}
            onChange={(v) => update("terminology", v)}
          />
        </Section>

        <Section
          title="Banned terms"
          subtitle={`Words the agent must never use in the final article (in ${form.language}).`}
          number="05"
        >
          <TagInput
            value={form.bannedTerms}
            onChange={(v) => update("bannedTerms", v)}
            placeholder="Add a banned term and press Enter."
            chipColor="error"
          />
        </Section>

        {/* Phase D — SEO. Optional but high-leverage: feeds the country agent
            with search-intent context AND seeds the new-article country picker. */}
        <Section
          title="SEO & search"
          subtitle="How content in this country should be findable. The country agent threads these into draft prompts; the new-article form seeds the country picker from default countries."
          number="06"
        >
          <Stack spacing={2.5}>
            <TextField
              label="SEO notes"
              value={form.seoNotes ?? ""}
              onChange={(e) => update("seoNotes", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="e.g. UK + EMEA employees expect concise headlines. Use British spelling. Mention statutory entitlements by their exact term."
              helperText="Plain-English guidance the agent uses when drafting. Tone, phrasing, locale conventions."
            />
            <Box>
              <Box sx={{ fontSize: "0.875rem", fontWeight: 500, color: t.ink, mb: 0.5 }}>
                Common search terms
              </Box>
              <Box sx={{ fontSize: "0.75rem", color: t.slate, mb: 1 }}>
                Terms employees in this country actually search for. Used as
                writing hints — the agent weaves them in naturally, not
                stuffs them.
              </Box>
              <TagInput
                value={form.commonSearchTerms ?? []}
                onChange={(v) => update("commonSearchTerms", v)}
                placeholder="Add a search term and press Enter."
                chipColor="primary"
              />
            </Box>
            <Box>
              <Box sx={{ fontSize: "0.875rem", fontWeight: 500, color: t.ink, mb: 0.5 }}>
                Default countries
              </Box>
              <Box sx={{ fontSize: "0.75rem", color: t.slate, mb: 1 }}>
                ISO country codes (e.g. <code>US</code>, <code>CA</code>) that
                pre-populate the country picker when an author selects this
                country on the new-article form.
              </Box>
              <TagInput
                value={form.defaultCountries ?? []}
                onChange={(v) =>
                  update(
                    "defaultCountries",
                    v.map((c) => c.toUpperCase()),
                  )
                }
                placeholder="Add an ISO code and press Enter."
                chipColor="primary"
              />
            </Box>
          </Stack>
        </Section>

        <Section
          title="Reviewers"
          subtitle="People notified when an article in this country needs review."
          number="07"
        >
          <TagInput
            value={form.reviewers}
            onChange={(v) => update("reviewers", v)}
            placeholder="Add a reviewer email and press Enter."
            chipColor="primary"
          />
        </Section>

        <Section
          title="Reference sources"
          subtitle="Country-specific documents the agent grounds locale drafts in. Combined with the parent sector's sources at draft time."
          number="08"
        >
          <SourceManager
            value={form.sources}
            onChange={(next) => update("sources", next)}
          />
        </Section>
      </Stack>

      {/* ──────────── Sticky save bar ──────────── */}
      <Box
        sx={{
          position: "fixed",
          bottom: 24,
          left: { xs: 24, sm: "calc(50% + 124px - 420px)" },
          right: 24,
          maxWidth: 840,
          mx: "auto",
          py: 1.5,
          px: 2,
          bgcolor: t.surface,
          border: `1px solid ${alpha(t.ember, 0.3)}`,
          borderRadius: 1,
          boxShadow:
            "0 4px 16px rgba(196, 90, 30, 0.08), 0 1px 3px rgba(42, 37, 29, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          opacity: isDirty || saving ? 1 : 0,
          transform: isDirty || saving ? "translateY(0)" : "translateY(140%)",
          transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: isDirty || saving ? "auto" : "none",
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: t.ember,
            }}
          />
          <Box>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.2 }}>
              {changedFields.length} unsaved{" "}
              {changedFields.length === 1 ? "change" : "changes"}
            </Typography>
            {changedFields.length > 0 && (
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: t.slate,
                  fontFamily: theme.palette.fonts.mono,
                  mt: 0.25,
                }}
              >
                {changedFields.slice(0, 4).join(" · ")}
                {changedFields.length > 4 ? ` +${changedFields.length - 4}` : ""}
              </Typography>
            )}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button onClick={reset} disabled={saving} size="small">
            Discard
          </Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={saving || !isDirty}
            size="small"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={savedToast}
        autoHideDuration={2400}
        onClose={() => setSavedToast(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        message={`${form.name} profile saved`}
      />
    </Box>
  );
}

function Section({
  title,
  subtitle,
  number,
  children,
}: {
  title: string;
  subtitle: string;
  number: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 0.5 }}>
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.granite,
            letterSpacing: "0.05em",
          }}
        >
          {number}
        </Box>
        <Typography variant="h6">{title}</Typography>
      </Stack>
      <Typography
        color="text.secondary"
        sx={{ mb: 3, fontSize: "0.875rem", maxWidth: "60ch" }}
      >
        {subtitle}
      </Typography>
      <Box sx={{ pl: { sm: 4 } }}>{children}</Box>
    </Box>
  );
}

function AvailableLanguagesPicker({
  primary,
  value,
  onChange,
}: {
  primary: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // Always keep the primary in the array, even if the catalog doesn't list it.
  const ensured = value.includes(primary) ? value : [primary, ...value];

  // Catalog options plus any custom codes the user has saved (e.g. an
  // experimental locale).
  const optionCodes = Array.from(
    new Set([...LOCALE_CATALOG.map((l) => l.code), primary, ...ensured]),
  );

  const handleChange = (next: string[]) => {
    // Primary can't be removed; re-add if missing.
    if (!next.includes(primary)) next = [primary, ...next];
    onChange(next);
  };

  return (
    <Box>
      <TextField
        select
        fullWidth
        value={ensured}
        onChange={(e) =>
          handleChange(
            typeof e.target.value === "string"
              ? e.target.value.split(",")
              : (e.target.value as unknown as string[]),
          )
        }
        SelectProps={{
          multiple: true,
          renderValue: (selected) => {
            const vals = selected as string[];
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {vals.map((v) => (
                  <Chip
                    key={v}
                    size="small"
                    label={v}
                    color={v === primary ? "primary" : undefined}
                    variant={v === primary ? "filled" : "outlined"}
                  />
                ))}
              </Box>
            );
          },
          MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
        }}
        helperText={`The primary language (${primary}) is always included.`}
      >
        {optionCodes.map((code) => {
          const isPrimary = code === primary;
          const checked = ensured.includes(code);
          return (
            <MenuItem
              key={code}
              value={code}
              disabled={isPrimary}
              sx={{ py: 0.5 }}
            >
              <Checkbox
                size="small"
                checked={checked}
                sx={{ mr: 1, p: 0.5 }}
              />
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
                      {localeLabel(code)}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.6875rem",
                        color: t.slate,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {code}
                    </Typography>
                    {isPrimary && (
                      <Typography
                        sx={{
                          fontSize: "0.6875rem",
                          color: t.pepsiBlueStrong,
                          fontWeight: 600,
                        }}
                      >
                        primary
                      </Typography>
                    )}
                  </Stack>
                }
              />
            </MenuItem>
          );
        })}
      </TextField>
    </Box>
  );
}
