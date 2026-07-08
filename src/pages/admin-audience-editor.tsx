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
  useTheme,
  alpha,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api, type AudienceProfile } from "../lib/api";
import SourceManager from "../components/source-manager";

export default function AdminAudienceEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [original, setOriginal] = useState<AudienceProfile | null>(null);
  const [form, setForm] = useState<AudienceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getAudience(id)
      .then((p) => {
        setOriginal(p);
        setForm(p);
      })
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const changedFields = useMemo<string[]>(() => {
    if (!original || !form) return [];
    const keys: (keyof AudienceProfile)[] = [
      "label",
      "summary",
      "toneOfVoice",
      "readingContext",
      "contentGuidelines",
      // Phase D
      "searchIntent",
      // Reference sources
      "sources",
    ];
    return keys.filter(
      (k) => JSON.stringify(original[k]) !== JSON.stringify(form[k]),
    );
  }, [original, form]);

  const isDirty = changedFields.length > 0;

  const update = <K extends keyof AudienceProfile>(key: K, value: AudienceProfile[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const reset = () => original && setForm(original);

  const save = async () => {
    if (!form || !id) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveAudience(id, form);
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
        onClick={() => navigate("/admin/audiences")}
        sx={{ mb: 3, ml: -1 }}
      >
        Audiences
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
          {form.id}
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
        {form.label}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: "62ch", mb: 5 }}>
        Editing the {form.label} audience profile. The market agent reads this when drafting
        for this persona.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={6}>
        <Section
          title="Basics"
          subtitle="The label shown in dropdowns and chips."
          number="01"
        >
          <Stack spacing={2.5}>
            <TextField
              label="Label"
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              fullWidth
              helperText="Shown in the new-article audience dropdown."
            />
            <TextField
              label="Summary"
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              fullWidth
              multiline
              minRows={2}
              helperText="One or two sentences: who they are and what they do."
            />
          </Stack>
        </Section>

        <Section
          title="Tone of voice"
          subtitle="How the agent should write for this persona."
          number="02"
        >
          <TextField
            value={form.toneOfVoice}
            onChange={(e) => update("toneOfVoice", e.target.value)}
            fullWidth
            multiline
            minRows={4}
            helperText="Voice, formality, sentence rhythm, jargon tolerance."
          />
        </Section>

        <Section
          title="Reading context"
          subtitle="Where and how this persona consumes content."
          number="03"
        >
          <TextField
            value={form.readingContext}
            onChange={(e) => update("readingContext", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            helperText="Device, environment, time available, posture."
          />
        </Section>

        <Section
          title="Content guidelines"
          subtitle="Specific do's and don'ts for this audience."
          number="04"
        >
          <TextField
            value={form.contentGuidelines}
            onChange={(e) => update("contentGuidelines", e.target.value)}
            fullWidth
            multiline
            minRows={5}
            helperText="Acronym handling, structure preferences, regulatory references, terminology."
          />
        </Section>

        {/* Phase D — search intent. Plain-English description of how this
            persona searches; the market agent uses it to pick SEO-friendly
            phrasing matched to the audience's actual query patterns. */}
        <Section
          title="Search intent"
          subtitle="How this persona searches — what they type, on what device, with what context. Used by the market agent to align titles + headings with real query patterns."
          number="05"
        >
          <TextField
            value={form.searchIntent ?? ""}
            onChange={(e) => update("searchIntent", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            placeholder='e.g. Drivers search on the route app between stops, typically with the app name and a specific symptom ("route app token expired"). Titles that match the error message rank highest.'
            helperText="One short paragraph. Plain English."
          />
        </Section>

        <Section
          title="Reference sources"
          subtitle="Persona-specific documents the agent should ground drafts in when writing for this audience. Combined with sector + market sources at draft time."
          number="06"
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
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.ember }} />
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
                {changedFields.join(" · ")}
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
            startIcon={
              saving ? <CircularProgress size={14} color="inherit" /> : undefined
            }
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
        message={`${form.label} audience saved`}
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
