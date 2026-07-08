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
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { api, type MarketProfile, type SectorProfile } from "../lib/api";
import TagInput from "../components/market-editor/tag-input";
import TerminologyEditor from "../components/market-editor/terminology-editor";
import SourceManager from "../components/source-manager";

/**
 * Admin › Sector editor.
 *
 * Sector-level fields only. Language / currency / date format stay on
 * the market profile. The markets belonging to this sector are listed
 * at the bottom with a link to each market's own editor.
 */
export default function AdminSectorEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [original, setOriginal] = useState<SectorProfile | null>(null);
  const [form, setForm] = useState<SectorProfile | null>(null);
  const [markets, setMarkets] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getSector(id), api.getMarketsInSector(id)])
      .then(([p, ms]) => {
        setOriginal(p);
        setForm(p);
        setMarkets(ms);
      })
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const changedFields = useMemo<string[]>(() => {
    if (!original || !form) return [];
    const keys: (keyof SectorProfile)[] = [
      "name",
      "summary",
      "toneOfVoice",
      "contentStrategy",
      "contentGuidelines",
      "terminology",
      "bannedTerms",
      "regulatoryNotes",
      "seoNotes",
      "commonSearchTerms",
      "sources",
    ];
    return keys.filter(
      (k) => JSON.stringify(original[k]) !== JSON.stringify(form[k]),
    );
  }, [original, form]);

  const isDirty = changedFields.length > 0;

  const update = <K extends keyof SectorProfile>(
    key: K,
    value: SectorProfile[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const reset = () => original && setForm(original);

  const save = async () => {
    if (!form || !id) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveSector(id, form);
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
          {form.id.toUpperCase()}
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
        Sector-level content strategy. These guidelines apply on top of every
        market in this sector — the market agent reads the sector first
        (corporate framing) then layers on market-specific rules.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={6}>
        <Section
          title="Basics"
          subtitle="Sector identity and one-line summary."
          number="01"
        >
          <Stack spacing={2.5}>
            <TextField
              label="Sector name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              fullWidth
              helperText="Displayed in the UI and used by the market agent in its system prompt."
            />
            <TextField
              label="Summary"
              value={form.summary ?? ""}
              onChange={(e) => update("summary", e.target.value)}
              fullWidth
              multiline
              minRows={2}
              helperText="One or two sentences describing this sector — what it covers, who it serves."
            />
          </Stack>
        </Section>

        <Section
          title="Content strategy and guidelines"
          subtitle="Sector-wide direction. Applies to every market in this sector before market rules kick in."
          number="02"
        >
          <Stack spacing={2.5}>
            <TextField
              label="Tone of voice"
              value={form.toneOfVoice}
              onChange={(e) => update("toneOfVoice", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="Corporate tone conventions. Markets can layer locale-specific tone on top."
            />
            <TextField
              label="Content strategy"
              value={form.contentStrategy}
              onChange={(e) => update("contentStrategy", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="What matters at the sector level — priority topics, business context, audiences."
            />
            <TextField
              label="Content guidelines"
              value={form.contentGuidelines}
              onChange={(e) => update("contentGuidelines", e.target.value)}
              fullWidth
              multiline
              minRows={4}
              helperText="Sector-wide do's and don'ts. Markets override on collision."
            />
            <TextField
              label="Regulatory notes"
              value={form.regulatoryNotes}
              onChange={(e) => update("regulatoryNotes", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="Sector-wide legal, safety, or compliance context the agent must reference."
            />
          </Stack>
        </Section>

        <Section
          title="Terminology"
          subtitle="Sector-wide word swaps. Market terminology unions on top; if the market defines the same source term, market wins."
          number="03"
        >
          <TerminologyEditor
            value={form.terminology}
            onChange={(v) => update("terminology", v)}
          />
        </Section>

        <Section
          title="Banned terms"
          subtitle="Words the agent must never use in any market inside this sector. Combined with each market's own banned list."
          number="04"
        >
          <TagInput
            value={form.bannedTerms}
            onChange={(v) => update("bannedTerms", v)}
            placeholder="Add a banned term and press Enter."
            chipColor="error"
          />
        </Section>

        <Section
          title="SEO & search"
          subtitle="Sector-level search guidance. Markets layer locale-specific SEO on top."
          number="05"
        >
          <Stack spacing={2.5}>
            <TextField
              label="SEO notes"
              value={form.seoNotes ?? ""}
              onChange={(e) => update("seoNotes", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="e.g. Sector-wide brand terms, canonical spellings, or portfolio names to reference exactly."
              helperText="Guidance the agent uses when drafting for any market inside this sector."
            />
            <Box>
              <Box sx={{ fontSize: "0.875rem", fontWeight: 500, color: t.ink, mb: 0.5 }}>
                Common search terms
              </Box>
              <Box sx={{ fontSize: "0.75rem", color: t.slate, mb: 1 }}>
                Sector-wide search intents. The agent weaves these in
                naturally alongside market-specific terms.
              </Box>
              <TagInput
                value={form.commonSearchTerms ?? []}
                onChange={(v) => update("commonSearchTerms", v)}
                placeholder="Add a search term and press Enter."
                chipColor="primary"
              />
            </Box>
          </Stack>
        </Section>

        <Section
          title="Reference sources"
          subtitle="Authoritative documents the agent grounds sector-wide drafts in. URLs, PDFs, or hand-authored notes. Combined with each market's own sources at draft time."
          number="06"
        >
          <SourceManager
            value={form.sources}
            onChange={(next) => update("sources", next)}
          />
        </Section>

        <Section
          title="Markets in this sector"
          subtitle="Every market inherits this sector's guidelines. Open a market to edit its locale-specific fields (language, currency, date format, reviewers)."
          number="07"
        >
          {markets.length === 0 ? (
            <Typography sx={{ fontSize: "0.9375rem", color: t.slate, fontStyle: "italic" }}>
              No markets assigned to this sector yet.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {markets.map((m) => (
                <Box
                  key={m.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 0.75,
                    border: `1px solid ${t.border}`,
                    bgcolor: t.surface,
                    "&:hover": { bgcolor: t.mist },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    spacing={1.5}
                    minWidth={0}
                  >
                    <ChevronRightIcon sx={{ fontSize: 16, color: t.slate }} />
                    <Typography
                      sx={{ fontSize: "0.9375rem", fontWeight: 500, color: t.ink }}
                      noWrap
                    >
                      {m.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: t.slate,
                        fontFamily: theme.palette.fonts.mono,
                      }}
                    >
                      {m.languageCode} · {m.currency}
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    onClick={() => navigate(`/admin/markets/${m.id}`)}
                  >
                    Edit market
                  </Button>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
                To add a market to this sector, open the market and set its
                sector on the market profile. (New-market onboarding UI is not
                built into this POC.)
              </Typography>
            </Stack>
          )}
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
        message={`${form.name} sector saved`}
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
