import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AccessibilityNewOutlinedIcon from "@mui/icons-material/AccessibilityNewOutlined";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import RecordVoiceOverOutlinedIcon from "@mui/icons-material/RecordVoiceOverOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import {
  api,
  type AudienceProfile,
  type DEExRules,
  type MarketProfile,
  type SectorProfile,
} from "../lib/api";

type StandardsTab = "global" | "sectors" | "countries" | "audiences";
type RuleGroupKey = "toneRules" | "inclusivityRules" | "accessibilityRules" | "formattingRules";

const ruleGroups: Array<{
  key: RuleGroupKey;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    key: "toneRules",
    title: "Tone and clarity",
    description: "Keeps every article direct, understandable, and useful to employees.",
    icon: <RecordVoiceOverOutlinedIcon />,
  },
  {
    key: "inclusivityRules",
    title: "Inclusive language",
    description: "Helps content work for employees across roles, backgrounds, and locations.",
    icon: <GroupsOutlinedIcon />,
  },
  {
    key: "accessibilityRules",
    title: "Accessibility",
    description: "Makes information easier to scan, navigate, understand, and translate.",
    icon: <AccessibilityNewOutlinedIcon />,
  },
  {
    key: "formattingRules",
    title: "Article structure",
    description: "Defines the common building blocks used across knowledge articles.",
    icon: <FormatListBulletedOutlinedIcon />,
  },
];

const publishingChecks = [
  "At least 500 characters of employee-facing content",
  "A descriptive title and unique article address",
  "A summary between 60 and 500 characters",
  "Required sections for the selected article type",
  "An owner, audience, country, and access settings",
  "A source for Policy articles",
  "Search title between 30 and 60 characters",
  "Search description between 50 and 160 characters",
  "No unresolved compliance errors",
  "A business reason when content is marked Global",
];

export default function AdminAIStandards() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [activeTab, setActiveTab] = useState<StandardsTab>("global");
  const [rules, setRules] = useState<DEExRules | null>(null);
  const [draft, setDraft] = useState<DEExRules | null>(null);
  const [sectors, setSectors] = useState<SectorProfile[]>([]);
  const [countries, setCountries] = useState<MarketProfile[]>([]);
  const [audiences, setAudiences] = useState<AudienceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getStandards(),
      api.listSectors(),
      api.listMarkets(),
      api.listAudiences(),
    ])
      .then(([nextRules, nextSectors, nextCountries, nextAudiences]) => {
        setError(null);
        setRules(nextRules);
        setDraft(nextRules);
        setSectors(nextSectors);
        setCountries(nextCountries);
        setAudiences(nextAudiences);
      })
      .catch((e) => setError(readableStandardsError(e)))
      .finally(() => setLoading(false));
  }, []);

  const sectorNames = useMemo(
    () => new Map(sectors.map((sector) => [sector.id, sector.name])),
    [sectors],
  );

  const globalRuleCount = useMemo(
    () =>
      rules
        ? rules.toneRules.length +
          rules.inclusivityRules.length +
          rules.accessibilityRules.length +
          rules.formattingRules.length
        : 0,
    [rules],
  );

  const cancelEditing = () => {
    setDraft(rules);
    setEditing(false);
    setError(null);
  };

  const saveRules = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const next = await api.saveStandards(draft);
      setRules(next);
      setDraft(next);
      setEditing(false);
      setSaved(true);
    } catch (e: any) {
      setError(readableStandardsError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1240, mx: "auto", pb: 10 }}>
      <Typography variant="overline" sx={{ color: t.productAccent.governance.ink }}>
        Super Admin · Content governance
      </Typography>
      <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>
        AI Standards
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, maxWidth: "76ch" }}>
        Manage the standards the AI uses to write, critique, and prepare knowledge articles.
        More specific guidance builds on the global rules instead of replacing it.
      </Typography>

      <Box
        component="section"
        aria-labelledby="standards-order-heading"
        sx={{
          mt: 4,
          px: { xs: 2, md: 3 },
          py: 2.5,
          bgcolor: t.productAccent.governance.soft,
          borderLeft: `4px solid ${t.productAccent.governance.main}`,
          borderRadius: 1,
        }}
      >
        <Typography id="standards-order-heading" variant="subtitle1">
          How standards are applied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          The AI combines these layers in order, then grounds the article in uploaded sources and the author&apos;s answers.
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
            gap: 1.5,
            mt: 2.5,
          }}
        >
          <LayerStep number="1" title="Global readiness" detail="Voice, inclusion, accessibility, and structure" />
          <LayerStep number="2" title="Sector strategy" detail="Business context, terminology, and priorities" />
          <LayerStep number="3" title="Country guidance" detail="Language, regulation, search, and local conventions" />
          <LayerStep number="4" title="Audience guidance" detail="Reading context, needs, and search intent" />
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          mt: 4,
          borderBlock: `1px solid ${t.border}`,
        }}
      >
        <Count label="Global rules" value={globalRuleCount} />
        <Count label="Sector profiles" value={sectors.length} />
        <Count label="Country profiles" value={countries.length} />
        <Count label="Audience profiles" value={audiences.length} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_event, value: StandardsTab) => setActiveTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="AI standards layers"
        sx={{ mt: 4, borderBottom: `1px solid ${t.border}` }}
      >
        <Tab value="global" label="Global rules" />
        <Tab value="sectors" label="Sectors" />
        <Tab value="countries" label="Countries" />
        <Tab value="audiences" label="Audiences" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          {activeTab === "global" && draft && (
            <GlobalRules
              draft={draft}
              editing={editing}
              saving={saving}
              onChange={setDraft}
              onEdit={() => setEditing(true)}
              onCancel={cancelEditing}
              onSave={saveRules}
            />
          )}
          {activeTab === "sectors" && (
            <ProfileList
              title="Sector strategy"
              description="Sector profiles set business context, terminology, priorities, and restrictions for every country within the sector."
              items={sectors.map((sector) => ({
                id: sector.id,
                title: sector.name,
                subtitle: sector.summary || "Corporate-level content direction",
                editPath: `/admin/sectors/${sector.id}`,
                chips: [
                  `${Object.keys(sector.terminology).length} terminology rules`,
                  `${sector.bannedTerms.length} restricted terms`,
                  `${sector.sources?.length ?? 0} sources`,
                ],
                fields: [
                  ["Tone of voice", sector.toneOfVoice],
                  ["Content strategy", sector.contentStrategy],
                  ["Content guidelines", sector.contentGuidelines],
                  ["Regulatory notes", sector.regulatoryNotes],
                  ["Search guidance", sector.seoNotes || "Not defined"],
                ],
              }))}
              onEdit={(path) => navigate(path)}
            />
          )}
          {activeTab === "countries" && (
            <ProfileList
              title="Country guidance"
              description="Country profiles localize the sector strategy with language, regulation, search behavior, and publishing conventions."
              items={countries.map((country) => ({
                id: country.id,
                title: country.name,
                subtitle: `${country.language} · ${sectorNames.get(country.sectorId ?? "") ?? "Unassigned sector"}`,
                editPath: `/admin/markets/${country.id}`,
                chips: [
                  `${Object.keys(country.terminology).length} terminology rules`,
                  `${country.bannedTerms.length} restricted terms`,
                  `${country.sources?.length ?? 0} sources`,
                ],
                fields: [
                  ["Tone of voice", country.toneOfVoice],
                  ["Content strategy", country.contentStrategy],
                  ["Content guidelines", country.contentGuidelines],
                  ["Regulatory notes", country.regulatoryNotes],
                  ["Search guidance", country.seoNotes || "Not defined"],
                  ["Publishing conventions", `${country.dateFormat} dates · ${country.currency} currency`],
                ],
              }))}
              onEdit={(path) => navigate(path)}
            />
          )}
          {activeTab === "audiences" && (
            <ProfileList
              title="Audience guidance"
              description="Audience profiles help the AI choose the right context, level of detail, terminology, and search language for the people reading."
              items={audiences.map((audience) => ({
                id: audience.id,
                title: audience.label,
                subtitle: audience.summary,
                editPath: `/admin/audiences/${audience.id}`,
                chips: [`${audience.sources?.length ?? 0} sources`, audience.searchIntent ? "Search intent defined" : "Search intent not defined"],
                fields: [
                  ["Tone of voice", audience.toneOfVoice],
                  ["Reading context", audience.readingContext],
                  ["Content guidelines", audience.contentGuidelines],
                  ["Search intent", audience.searchIntent || "Not defined"],
                ],
              }))}
              onEdit={(path) => navigate(path)}
            />
          )}
        </Box>
      )}

      <Snackbar open={saved} autoHideDuration={3200} onClose={() => setSaved(false)}>
        <Alert severity="success" variant="filled" onClose={() => setSaved(false)}>
          Global AI standards saved
        </Alert>
      </Snackbar>
    </Box>
  );
}

function readableStandardsError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/^(500|502|503|504)\s/.test(message) || /failed to fetch/i.test(message)) {
    return "AI standards are temporarily unavailable. Please try again.";
  }
  if (message.startsWith("400 ")) {
    return "Each category needs at least one complete rule, and character limits must be positive whole numbers.";
  }
  return message;
}

function GlobalRules({
  draft,
  editing,
  saving,
  onChange,
  onEdit,
  onCancel,
  onSave,
}: {
  draft: DEExRules;
  editing: boolean;
  saving: boolean;
  onChange: (rules: DEExRules) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const updateRule = (group: RuleGroupKey, index: number, value: string) => {
    const next = [...draft[group]];
    next[index] = value;
    onChange({ ...draft, [group]: next });
  };

  const removeRule = (group: RuleGroupKey, index: number) => {
    onChange({ ...draft, [group]: draft[group].filter((_rule, ruleIndex) => ruleIndex !== index) });
  };

  const addRule = (group: RuleGroupKey) => {
    onChange({ ...draft, [group]: [...draft[group], ""] });
  };

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
        <Box>
          <Typography variant="h5" component="h2">Global Pep readiness rules</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: "76ch" }}>
            These rules apply to every article. The writing agent follows them while drafting, and the critique agent uses them when recommending improvements.
          </Typography>
        </Box>
        {editing ? (
          <Stack direction="row" spacing={1}>
            <Button startIcon={<CloseIcon />} onClick={onCancel}>Cancel</Button>
            <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={onSave} disabled={saving}>
              {saving ? "Saving" : "Save rules"}
            </Button>
          </Stack>
        ) : (
          <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={onEdit}>Edit rules</Button>
        )}
      </Stack>

      <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 1, overflow: "hidden" }}>
        {ruleGroups.map((group, groupIndex) => (
          <Box key={group.key} sx={{ p: { xs: 2, md: 3 }, borderTop: groupIndex ? `1px solid ${t.border}` : 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ color: t.productAccent.creation.main, display: "flex", mt: 0.25 }}>{group.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1">{group.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{group.description}</Typography>
                <Stack spacing={editing ? 1.25 : 1} sx={{ mt: 2 }}>
                  {draft[group.key].map((rule, index) =>
                    editing ? (
                      <Stack key={`${group.key}-${index}`} direction="row" spacing={1} alignItems="flex-start">
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label={`${group.title} rule ${index + 1}`}
                          value={rule}
                          onChange={(event) => updateRule(group.key, index, event.target.value)}
                        />
                        <Tooltip title="Remove rule">
                          <IconButton aria-label={`Remove ${group.title} rule ${index + 1}`} onClick={() => removeRule(group.key, index)} sx={{ mt: 1 }}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Stack key={`${group.key}-${index}`} direction="row" spacing={1.25} alignItems="flex-start">
                        <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: t.productAccent.governance.main, mt: "9px", flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ lineHeight: 1.65 }}>{rule}</Typography>
                      </Stack>
                    ),
                  )}
                  {editing && (
                    <Button startIcon={<AddIcon />} onClick={() => addRule(group.key)} sx={{ alignSelf: "flex-start" }}>
                      Add rule
                    </Button>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Box>
        ))}
      </Box>

      <Box>
        <Typography variant="h6" component="h3">Character limits</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          These limits keep article titles and search summaries concise across channels.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mt: 2 }}>
          {([
            ["title", "Article title"],
            ["summary", "Article summary"],
            ["metaDescription", "Search description"],
          ] as const).map(([key, label]) =>
            editing ? (
              <TextField
                key={key}
                label={`${label} maximum`}
                type="number"
                value={draft.characterLimits[key]}
                onChange={(event) => onChange({
                  ...draft,
                  characterLimits: { ...draft.characterLimits, [key]: Number(event.target.value) },
                })}
                inputProps={{ min: 1, max: 10000 }}
              />
            ) : (
              <Box key={key} sx={{ borderTop: `2px solid ${t.productAccent.creation.main}`, pt: 1.5 }}>
                <Typography variant="h5">{draft.characterLimits[key]}</Typography>
                <Typography variant="body2" color="text.secondary">{label} characters</Typography>
              </Box>
            ),
          )}
        </Box>
      </Box>

      <Box sx={{ bgcolor: t.surfaceContainerLow, p: { xs: 2, md: 3 }, borderRadius: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <VerifiedOutlinedIcon sx={{ color: t.productAccent.guidance.ink }} />
          <Typography variant="h6" component="h3">Publishing checks</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: "82ch" }}>
          These are deterministic workflow gates, not writing instructions. They are shown here for transparency because changing them affects whether an article can move forward and requires a product-policy decision.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, columnGap: 4, rowGap: 1.25, mt: 2.5 }}>
          {publishingChecks.map((check) => (
            <Stack key={check} direction="row" spacing={1.25} alignItems="flex-start">
              <VerifiedOutlinedIcon sx={{ fontSize: 18, color: t.productAccent.governance.main, mt: 0.25 }} />
              <Typography variant="body2">{check}</Typography>
            </Stack>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}

type ProfileItem = {
  id: string;
  title: string;
  subtitle: string;
  editPath: string;
  chips: string[];
  fields: Array<[string, string]>;
};

function ProfileList({
  title,
  description,
  items,
  onEdit,
}: {
  title: string;
  description: string;
  items: ProfileItem[];
  onEdit: (path: string) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h2">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: "78ch" }}>{description}</Typography>
      </Box>
      <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 1, overflow: "hidden" }}>
        {items.map((item, index) => {
          const open = expanded.has(item.id);
          return (
            <Box key={item.id} sx={{ borderTop: index ? `1px solid ${t.border}` : 0 }}>
              <Stack direction="row" alignItems="stretch">
                <ButtonBase
                  onClick={() => toggle(item.id)}
                  aria-expanded={open}
                  aria-controls={`standard-profile-${item.id}`}
                  sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 2.5 }, py: 2, justifyContent: "flex-start", textAlign: "left" }}
                >
                  <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" gap={1.5} sx={{ width: "100%" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1">{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{item.subtitle}</Typography>
                    </Box>
                    <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
                      {item.chips.map((chip) => <Chip key={chip} size="small" variant="outlined" label={chip} />)}
                    </Stack>
                  </Stack>
                </ButtonBase>
                <Divider orientation="vertical" flexItem />
                <Stack direction="row" alignItems="center" sx={{ px: 1 }}>
                  <Tooltip title={`Edit ${item.title}`}>
                    <IconButton aria-label={`Edit ${item.title}`} onClick={() => onEdit(item.editPath)}>
                      <EditOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton aria-label={`${open ? "Collapse" : "Expand"} ${item.title}`} onClick={() => toggle(item.id)}>
                    <KeyboardArrowDownIcon sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }} />
                  </IconButton>
                </Stack>
              </Stack>
              <Collapse id={`standard-profile-${item.id}`} in={open} timeout={180}>
                <Divider />
                <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: t.surfaceContainerLow }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 3 }}>
                    {item.fields.map(([label, value]) => (
                      <Box key={label}>
                        <Typography variant="overline">{label}</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.65 }}>{value || "Not defined"}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button endIcon={<ChevronRightIcon />} onClick={() => onEdit(item.editPath)} sx={{ mt: 2.5 }}>
                    Edit full profile
                  </Button>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}

function LayerStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const icon = number === "1" ? <AutoAwesomeOutlinedIcon /> : number === "2" ? <PublicOutlinedIcon /> : number === "3" ? <LanguageOutlinedIcon /> : <GroupsOutlinedIcon />;
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: t.surface, color: t.productAccent.governance.ink, display: "grid", placeItems: "center", flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{number}. {title}</Typography>
        <Typography sx={{ fontSize: "0.75rem", color: t.slate, mt: 0.25 }}>{detail}</Typography>
      </Box>
    </Stack>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 2, borderLeft: { xs: 0, md: `1px solid ${t.border}` }, "&:first-of-type": { borderLeft: 0 } }}>
      <Typography variant="h5">{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  );
}
