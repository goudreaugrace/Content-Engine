import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
  api,
  type Article,
  type ArticleReference,
  type AudienceProfile,
  type Country,
  type MarketProfile,
  type SectorProfile,
} from "../lib/api";
import { KNOWLEDGE_BASE_OPTIONS as DEFINED_KNOWLEDGE_BASES } from "../lib/team-permissions";

type MetadataDraft = {
  knowledgeBase: string;
  sector: string;
  countries: string;
  contentType: string;
  globalJustification: string;
  audiences: string;
  canRead: string;
  cannotRead: string;
  security: "all-employees" | "restricted";
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  summary: string;
  keyQuestions: string;
  entities: string;
  canonicalSlug: string;
  aliases: string;
  topics: string;
  writtenLanguage: string;
  languagesRequired: string;
  businessTerms: string;
  systems: string;
  processes: string;
};

const csv = (values?: string[]) => values?.join(", ") ?? "";
const list = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const KNOWLEDGE_BASE_OPTIONS = DEFINED_KNOWLEDGE_BASES.map(({ id, label }) => ({ value: id, label }));

const normalizeKnowledgeBase = (value?: string) => {
  if (value === "mypepsico-general") return "mypepsico";
  if (value === "pep-km") return "pepkm";
  return value ?? "";
};

const CONTENT_TYPE_OPTIONS = ["FAQ", "Policy", "Knowledge Article", "Topic Page"].map((value) => ({ value, label: value }));

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto-detect from article text" },
  { value: "en-US", label: "English (US)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "fr-CA", label: "French (Canada)" },
];

function draftFromArticle(article: Article): MetadataDraft {
  return {
    knowledgeBase: normalizeKnowledgeBase(article.knowledgeBase),
    sector: article.sector ?? "",
    countries: csv(article.countries),
    contentType: article.contentType,
    globalJustification: article.globalJustification ?? "",
    audiences: csv(article.visibility?.audiences ?? article.taxonomy?.audiences),
    canRead: csv(article.visibility?.canRead),
    cannotRead: csv(article.visibility?.cannotRead),
    security: article.visibility?.security ?? "restricted",
    seoTitle: article.seo?.title ?? "",
    metaDescription: article.seo?.metaDescription ?? "",
    keywords: csv(article.seo?.keywords),
    summary: article.seo?.summary ?? "",
    keyQuestions: csv(article.seo?.keyQuestions),
    entities: csv(article.seo?.entities),
    canonicalSlug: article.canonicalSlug ?? "",
    aliases: csv(article.aliases),
    topics: csv(article.topics ?? article.taxonomy?.topics),
    writtenLanguage: article.taxonomy?.writtenLanguage ?? "",
    languagesRequired: csv(article.taxonomy?.languagesRequired),
    businessTerms: csv(article.taxonomy?.businessTerms),
    systems: csv(article.taxonomy?.systems),
    processes: csv(article.taxonomy?.processes),
  };
}

function MetadataValue({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Typography variant="overline">{label}</Typography>
      <Typography variant="body2" sx={{ mt: 0.2, whiteSpace: "pre-wrap" }}>
        {value?.trim() || "Not provided"}
      </Typography>
    </Box>
  );
}

function MetadataGroup({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
        {action}
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
          "& > *": { minWidth: 0 },
          color: t.ink,
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

export default function ArticleMetadataReview({
  article,
  onSaved,
  reviewComplete = false,
  onReviewComplete,
}: {
  article: Article;
  onSaved: () => Promise<void> | void;
  reviewComplete?: boolean;
  onReviewComplete?: (complete: boolean) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const firstReview =
    (article.version ?? 1) === 1 &&
    !(article.rejections?.length) &&
    !article.reviewedAt;
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingAdvanced, setEditingAdvanced] = useState(false);
  const [draft, setDraft] = useState(() => draftFromArticle(article));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [audiences, setAudiences] = useState<AudienceProfile[]>([]);
  const [sectors, setSectors] = useState<SectorProfile[]>([]);
  const [markets, setMarkets] = useState<MarketProfile[]>([]);
  const [referenceDrafts, setReferenceDrafts] = useState<ArticleReference[]>(() => article.references ?? []);
  const countrySelectionsBySector = useRef<Record<string, string[]>>({
    [article.sector ?? ""]: article.countries,
  });

  useEffect(() => {
    Promise.all([api.listCountries(), api.listAudiences(), api.listSectors(), api.listMarkets()])
      .then(([countryOptions, audienceOptions, sectorOptions, marketOptions]) => {
        setCountries(countryOptions);
        setAudiences(audienceOptions);
        setSectors(sectorOptions);
        setMarkets(marketOptions);
      })
      .catch(() => {
        setCountries([]);
        setAudiences([]);
        setSectors([]);
        setMarkets([]);
      });
  }, []);

  useEffect(() => {
    setExpanded(false);
    setEditing(false);
    setEditingAdvanced(false);
    setDraft(draftFromArticle(article));
    setReferenceDrafts(article.references ?? []);
    countrySelectionsBySector.current = { [article.sector ?? ""]: [...article.countries] };
    setError(null);
    setSaved(false);
    setShowAdvanced(false);
  }, [article.id, firstReview]);

  const set = (key: keyof MetadataDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async (advancedOnly = false) => {
    if (!advancedOnly && !list(draft.countries).length) {
      setError("Select at least one country before saving metadata.");
      return;
    }
    if (!advancedOnly && !KNOWLEDGE_BASE_OPTIONS.some((option) => option.value === draft.knowledgeBase)) {
      setError("Select one of the knowledge bases defined in the tool.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const visibility = {
        audiences: list(draft.audiences),
        markets: article.visibility?.markets ?? [article.market],
        countries: list(draft.countries),
        canRead: list(draft.canRead),
        cannotRead: list(draft.cannotRead),
        security: draft.security,
        notes: article.visibility?.notes,
      };
      const taxonomy = {
        knowledgeBaseId: draft.knowledgeBase,
        sector: draft.sector,
        countries: list(draft.countries),
        writtenLanguage: draft.writtenLanguage || undefined,
        languagesRequired: list(draft.languagesRequired),
        audiences: list(draft.audiences),
        contentType: draft.contentType as Article["contentType"],
        topics: list(draft.topics),
        businessTerms: list(draft.businessTerms),
        systems: list(draft.systems),
        processes: list(draft.processes),
      };
      await api.updateArticle(article.id, {
        knowledgeBase: draft.knowledgeBase,
        sector: draft.sector,
        countries: list(draft.countries),
        contentType: draft.contentType as Article["contentType"],
        canonicalSlug: draft.canonicalSlug,
        aliases: list(draft.aliases),
        topics: list(draft.topics),
        visibility,
        references: referenceDrafts,
        globalJustification: draft.globalJustification,
        seo: {
          ...article.seo,
          title: draft.seoTitle,
          metaDescription: draft.metaDescription,
          keywords: list(draft.keywords),
          summary: draft.summary,
          keyQuestions: list(draft.keyQuestions),
          entities: list(draft.entities),
        },
        taxonomy,
      });
      await onSaved();
      setEditing(false);
      setEditingAdvanced(false);
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof MetadataDraft,
    label: string,
    options?: Array<{ value: string; label: string }>,
    multiline = false,
    required = false,
    onValueChange?: (value: string) => void,
  ) => (
    <TextField
      select={Boolean(options)}
      label={label}
      value={draft[key]}
      onChange={(event) => onValueChange ? onValueChange(event.target.value) : set(key, event.target.value)}
      required={required}
      multiline={multiline && !options}
      minRows={multiline ? 3 : undefined}
      fullWidth
      size="small"
    >
      {options?.map((option) => (
        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
      ))}
    </TextField>
  );

  const optionWithCurrent = (
    options: Array<{ value: string; label: string }>,
    current: string,
  ) => options.some((option) => option.value === current) || !current
    ? options
    : [...options, { value: current, label: current }];

  const multiSelectField = (
    key: keyof MetadataDraft,
    label: string,
    options: Array<{ value: string; label: string }>,
    required = false,
  ) => {
    const selected = list(draft[key]);
    const completeOptions = [...options];
    selected.forEach((value) => {
      if (!completeOptions.some((option) => option.value === value)) completeOptions.push({ value, label: value });
    });
    const labels = new Map(completeOptions.map((option) => [option.value, option.label]));
    return (
      <TextField
        select
        label={label}
        value={selected}
        onChange={(event) => {
          const next = event.target.value as unknown as string | string[];
          set(key, csv(typeof next === "string" ? list(next) : next));
        }}
        required={required}
        error={required && selected.length === 0}
        helperText={required && selected.length === 0 ? "Select at least one country." : undefined}
        SelectProps={{
          multiple: true,
          renderValue: (values) => (values as string[]).map((value) => labels.get(value) ?? value).join(", "),
        }}
        fullWidth
        size="small"
      >
        {completeOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Checkbox checked={selected.includes(option.value)} size="small" />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </TextField>
    );
  };

  const tagField = (key: keyof MetadataDraft, label: string) => {
    const values = list(draft[key]);
    return (
      <Autocomplete
        multiple
        freeSolo
        options={values}
        value={values}
        onChange={(_, next) => set(key, csv(next))}
        renderInput={(params) => <TextField {...params} label={label} size="small" />}
      />
    );
  };

  const countriesForSelectedSector = useMemo(() => {
    if (draft.sector === "global") return countries;
    const marketIds = new Set(markets.filter((market) => market.sectorId === draft.sector).map((market) => market.id));
    if (marketIds.size > 0) return countries.filter((country) => marketIds.has(country.defaultMarketId));
    const regionBySector: Partial<Record<string, Country["region"]>> = {
      pfna: "NAM",
      pbna: "NAM",
      latam: "LATAM",
      europe: "EMEA",
      amesa: "APAC",
      apac: "APAC",
    };
    const region = regionBySector[draft.sector];
    return region ? countries.filter((country) => country.region === region) : [];
  }, [countries, draft.sector, markets]);
  const countryOptions = useMemo(
    () => countriesForSelectedSector.map((country) => ({ value: country.code, label: country.name + " (" + country.code + ")" })),
    [countriesForSelectedSector],
  );

  const handleSectorChange = (nextSector: string) => {
    setDraft((current) => {
      countrySelectionsBySector.current[current.sector] = list(current.countries);
      const restoredCountries = countrySelectionsBySector.current[nextSector]
        ?? (nextSector === (article.sector ?? "") ? article.countries : []);
      return { ...current, sector: nextSector, countries: csv(restoredCountries) };
    });
    setError(null);
  };
  const audienceOptions = useMemo(
    () => audiences.map((audience) => ({ value: audience.id, label: audience.label })),
    [audiences],
  );
  const sectorOptions = useMemo(
    () => sectors.map((sector) => ({ value: sector.id, label: sector.name })),
    [sectors],
  );

  const editActions = editing ? (
    <Stack direction="row" spacing={1}>
      <Button size="small" variant="outlined" disabled={saving} onClick={() => { setDraft(draftFromArticle(article)); setReferenceDrafts(article.references ?? []); setEditing(false); }}>Cancel</Button>
      <Button size="small" variant="contained" disabled={saving || !list(draft.countries).length || !KNOWLEDGE_BASE_OPTIONS.some((option) => option.value === draft.knowledgeBase)} startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />} onClick={() => save(false)}>
        {saving ? "Saving..." : "Save metadata"}
      </Button>
    </Stack>
  ) : (
    <Button size="small" variant="outlined" disabled={editingAdvanced} startIcon={<EditOutlinedIcon />} onClick={() => { setEditing(true); setSaved(false); }}>
      Edit metadata
    </Button>
  );

  const advancedEditActions = editingAdvanced ? (
    <Stack direction="row" spacing={1}>
      <Button size="small" variant="outlined" disabled={saving} onClick={() => { setDraft(draftFromArticle(article)); setReferenceDrafts(article.references ?? []); setEditingAdvanced(false); }}>Cancel</Button>
      <Button size="small" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />} onClick={() => save(true)}>
        {saving ? "Saving..." : "Save metadata"}
      </Button>
    </Stack>
  ) : (
    <Button size="small" variant="outlined" disabled={editing} startIcon={<EditOutlinedIcon />} onClick={() => { setEditingAdvanced(true); setSaved(false); }}>
      Edit metadata
    </Button>
  );

  const updateReference = (index: number, patch: Partial<ArticleReference>) =>
    setReferenceDrafts((current) => current.map((reference, referenceIndex) => referenceIndex === index ? { ...reference, ...patch } : reference));

  const addReference = () => setReferenceDrafts((current) => [
    ...current,
    { id: "reviewer-source-" + Date.now(), title: "", kind: "url", url: "", excerpt: "", source: "reviewer", addedAt: new Date().toISOString(), addedBy: "Approver" },
  ]);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => setExpanded(next)}
      disableGutters
      elevation={0}
      sx={{
        mb: 2.5,
        border: `1px solid ${firstReview ? t.pepsiBlue : t.border}`,
        borderRadius: "8px !important",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        sx={{ bgcolor: firstReview ? t.pepsiBlueSubtle : t.surfaceContainerLow, px: 2 }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ width: "100%", pr: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>Metadata, targeting, and discovery</Typography>
            <Typography variant="caption">
              {firstReview
                ? "First review: verify the complete publishing record before approval."
                : "Previously reviewed: expand when metadata needs verification or editing."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label={article.knowledgeBase ?? "No KB"} />
            <Chip size="small" variant="outlined" label={`${article.countries.length} ${article.countries.length === 1 ? "country" : "countries"}`} />
            <Chip
              size="small"
              color={firstReview && !reviewComplete ? "warning" : firstReview ? "success" : "default"}
              label={firstReview ? (reviewComplete ? "Reviewed" : "Review required") : "Previously reviewed"}
            />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: { xs: 2, md: 2.5 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {saved && <Alert severity="success" sx={{ mb: 2 }}>Metadata saved.</Alert>}
        <Stack spacing={2}>
          <MetadataGroup title="Approval essentials" action={editActions}>
            {editing ? (
              <>
                {field("knowledgeBase", "Knowledge base", KNOWLEDGE_BASE_OPTIONS, false, true)}
                {field("contentType", "Content type", optionWithCurrent(CONTENT_TYPE_OPTIONS, draft.contentType))}
                {field("sector", "Sector", optionWithCurrent(sectorOptions, draft.sector), false, true, handleSectorChange)}
                {multiSelectField("countries", "Countries", countryOptions, true)}
                {multiSelectField("audiences", "Audiences", audienceOptions)}
                {field("security", "Security", [{ value: "all-employees", label: "All employees" }, { value: "restricted", label: "Restricted" }])}
                {multiSelectField("canRead", "Can read", audienceOptions)}
                {multiSelectField("cannotRead", "Cannot read", audienceOptions)}
                {field("globalJustification", "Global justification", undefined, true)}
              </>
            ) : (
              <>
                <MetadataValue label="Knowledge base" value={article.knowledgeBase} />
                <MetadataValue label="Content type" value={article.contentType} />
                <MetadataValue label="Sector and market" value={[article.sector, article.market].filter(Boolean).join(" · ")} />
                <MetadataValue label="Countries" value={csv(article.countries)} />
                <MetadataValue label="Audience" value={csv(article.visibility?.audiences)} />
                <MetadataValue label="Security" value={article.visibility?.security} />
                <MetadataValue label="Can read" value={csv(article.visibility?.canRead)} />
                <MetadataValue label="Cannot read" value={csv(article.visibility?.cannotRead)} />
                <MetadataValue label="Next review" value={article.nextReviewAt ? new Date(article.nextReviewAt).toLocaleDateString() : ""} />
                <MetadataValue label="Version" value={String(article.version ?? 1)} />
                <MetadataValue label="Global justification" value={article.globalJustification} />
              </>
            )}
          </MetadataGroup>

          <Button
            size="small"
            variant="text"
            endIcon={<ExpandMoreRoundedIcon sx={{ transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />}
            onClick={() => setShowAdvanced((current) => !current)}
            sx={{ alignSelf: "flex-start" }}
          >
            {showAdvanced ? "Hide advanced metadata" : "Show search, AI, taxonomy, and sources"}
          </Button>
          <Collapse in={showAdvanced}>
            <MetadataGroup title="Search, AI, taxonomy, and sources" action={advancedEditActions}>
              {editingAdvanced ? (
                <>
                  {field("seoTitle", "SEO title")}
                  {field("canonicalSlug", "Canonical slug")}
                  {field("metaDescription", "Meta description", undefined, true)}
                  {field("summary", "AI-ready summary", undefined, true)}
                  {tagField("keywords", "Search keywords")}
                  {tagField("keyQuestions", "Questions answered")}
                  {tagField("entities", "Named entities")}
                  {tagField("aliases", "Aliases and synonyms")}
                  {tagField("topics", "Topics")}
                  {tagField("businessTerms", "Business terms")}
                  {tagField("systems", "Systems")}
                  {tagField("processes", "Processes")}
                  {field("writtenLanguage", "Written language", optionWithCurrent(LANGUAGE_OPTIONS, draft.writtenLanguage))}
                  {multiSelectField("languagesRequired", "Required languages", LANGUAGE_OPTIONS.filter((option) => option.value !== "auto"))}
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>Source references</Typography>
                      <Button size="small" variant="outlined" onClick={addReference}>Add source</Button>
                    </Stack>
                    <Stack spacing={1}>
                      {referenceDrafts.length === 0 && (
                        <Typography variant="body2" color="text.secondary">No sources have been added.</Typography>
                      )}
                      {referenceDrafts.map((reference, index) => (
                        <Paper key={reference.id} variant="outlined" sx={{ p: 1.5 }}>
                          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 2fr auto" }, gap: 1, alignItems: "start" }}>
                            <TextField size="small" label="Source title" value={reference.title} onChange={(event) => updateReference(index, { title: event.target.value })} />
                            <TextField select size="small" label="Source type" value={reference.kind} onChange={(event) => updateReference(index, { kind: event.target.value as ArticleReference["kind"] })}>
                              {["url", "doc", "policy", "profile", "note"].map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
                            </TextField>
                            <TextField size="small" label="URL" value={reference.url ?? ""} onChange={(event) => updateReference(index, { url: event.target.value })} />
                            <Button color="error" size="small" onClick={() => setReferenceDrafts((current) => current.filter((_, referenceIndex) => referenceIndex !== index))}>Remove</Button>
                            <TextField sx={{ gridColumn: { md: "1 / -1" } }} size="small" label="Source excerpt or note" multiline minRows={2} value={reference.excerpt ?? ""} onChange={(event) => updateReference(index, { excerpt: event.target.value })} />
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                </>
              ) : (
                <>
                  <MetadataValue label="SEO title" value={article.seo?.title} />
                  <MetadataValue label="Canonical slug" value={article.canonicalSlug} />
                  <MetadataValue label="Meta description" value={article.seo?.metaDescription} />
                  <MetadataValue label="AI-ready summary" value={article.seo?.summary} />
                  <MetadataValue label="Search keywords" value={csv(article.seo?.keywords)} />
                  <MetadataValue label="Questions answered" value={csv(article.seo?.keyQuestions)} />
                  <MetadataValue label="Named entities" value={csv(article.seo?.entities)} />
                  <MetadataValue label="Aliases and synonyms" value={csv(article.aliases)} />
                  <MetadataValue label="Topics" value={csv(article.topics ?? article.taxonomy?.topics)} />
                  <MetadataValue label="Business terms" value={csv(article.taxonomy?.businessTerms)} />
                  <MetadataValue label="Systems" value={csv(article.taxonomy?.systems)} />
                  <MetadataValue label="Processes" value={csv(article.taxonomy?.processes)} />
                  <MetadataValue label="Languages" value={[article.taxonomy?.writtenLanguage, csv(article.taxonomy?.languagesRequired)].filter(Boolean).join(" · ")} />
                  <MetadataValue label="Source references" value={article.references?.map((reference) => reference.title + " (" + reference.kind + ")").join("\n")} />
                </>
              )}
            </MetadataGroup>
          </Collapse>
          {firstReview && (
            <Box
              component="label"
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                p: 1.5,
                border: "1px solid " + (reviewComplete ? t.successInk : t.ember),
                borderRadius: 2,
                bgcolor: reviewComplete ? "rgba(25, 118, 70, 0.06)" : "rgba(213, 110, 12, 0.06)",
                cursor: "pointer",
              }}
            >
              <Checkbox checked={reviewComplete} onChange={(event) => onReviewComplete?.(event.target.checked)} sx={{ mt: -0.75, ml: -0.75 }} />
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Confirm metadata review</Typography>
                <Typography variant="body2" color="text.secondary">
                  I reviewed the targeting, access, discovery metadata, and sources for this new article.
                </Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
