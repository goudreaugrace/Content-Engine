import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardActionArea,
  Collapse,
  Divider,
  useTheme,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { api, type MarketProfile, type SectorProfile } from "../lib/api";

/**
 * Admin › Sectors.
 *
 * Sector is the corporate tier above Country. This page shows every sector
 * as an expandable row. Inside each sector: sector-level fields at a
 * glance, plus the countrys belonging to that sector as nested rows with
 * an "Edit country" affordance. Edit for the sector itself opens the
 * sector editor.
 *
 * Countries deliberately live INSIDE the sector view (per user direction —
 * no separate countrys list page).
 */
export default function AdminSectors() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [sectors, setSectors] = useState<SectorProfile[]>([]);
  const [countrys, setCountrys] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([api.listSectors(), api.listMarkets()])
      .then(([s, m]) => {
        setSectors(s);
        setCountrys(m);
      })
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, []);

  const countrysBySector = useMemo(() => {
    const map = new Map<string, MarketProfile[]>();
    for (const m of countrys) {
      const key = m.sectorId ?? "__orphan";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [countrys]);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        Sector Profiles
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75, mb: 4, maxWidth: "60ch" }}>
        Sectors are the corporate tier above countrys. Sector guidelines set
        the overall framing; each country inside a sector layers on locale-
        specific rules. Click a sector to see its details and the countrys it
        owns.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
          <CircularProgress size={24} sx={{ color: t.slate }} />
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {sectors.map((s) => {
            const open = expanded.has(s.id);
            const kids = countrysBySector.get(s.id) ?? [];
            return (
              <Card key={s.id} variant="outlined">
                <CardActionArea
                  onClick={() => toggle(s.id)}
                  sx={{ "&:hover": { bgcolor: t.mist } }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                    sx={{ px: 2.5, py: 1.75 }}
                  >
                    <Stack direction="row" alignItems="baseline" spacing={1.5} minWidth={0}>
                      <Typography
                        sx={{ fontSize: "1rem", fontWeight: 500, color: t.ink }}
                        noWrap
                      >
                        {s.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: t.slate,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {kids.length} {kids.length === 1 ? "country" : "countrys"}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/sectors/${s.id}`);
                        }}
                      >
                        Edit sector
                      </Button>
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
                    <Stack spacing={2.5}>
                      {s.summary && (
                        <Field label="Summary" value={s.summary} />
                      )}
                      <Field label="Tone of voice" value={s.toneOfVoice} />
                      <Field label="Content strategy" value={s.contentStrategy} />
                      <Field label="Regulatory notes" value={s.regulatoryNotes} />

                      <Stack direction="row" spacing={5} flexWrap="wrap" rowGap={2}>
                        <Stat
                          label="Terminology"
                          value={Object.keys(s.terminology).length}
                        />
                        <Stat
                          label="Banned terms"
                          value={s.bannedTerms.length}
                          accentIfPositive
                        />
                        <Stat label="Countries" value={kids.length} />
                      </Stack>

                      <Divider sx={{ my: 0.5 }} />

                      {/* ─── Countries inside this sector ─── */}
                      <Box>
                        <Typography
                          variant="overline"
                          sx={{ display: "block", mb: 1.25 }}
                        >
                          Countries in this sector
                        </Typography>
                        {kids.length === 0 ? (
                          <Typography
                            sx={{ fontSize: "0.875rem", color: t.slate, fontStyle: "italic" }}
                          >
                            No countries assigned to this sector yet.
                          </Typography>
                        ) : (
                          <Stack spacing={0.75}>
                            {kids.map((m) => (
                              <CountryRow
                                key={m.id}
                                market={m}
                                onEdit={() =>
                                  navigate(`/admin/countrys/${m.id}`)
                                }
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>

                      {Object.keys(s.terminology).length > 0 && (
                        <Box>
                          <Typography variant="overline" sx={{ display: "block", mb: 1 }}>
                            Sector terminology
                          </Typography>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                            {Object.entries(s.terminology).map(([from, to]) => (
                              <Box
                                key={from}
                                sx={{
                                  fontSize: "0.75rem",
                                  color: t.slate,
                                  bgcolor: t.mist,
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 0.5,
                                }}
                              >
                                {from} → {to}
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {s.bannedTerms.length > 0 && (
                        <Box>
                          <Typography variant="overline" sx={{ display: "block", mb: 1 }}>
                            Sector-level banned terms
                          </Typography>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                            {s.bannedTerms.map((term) => (
                              <Chip
                                key={term}
                                label={term}
                                size="small"
                                variant="outlined"
                                color="error"
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Collapse>
              </Card>
            );
          })}

          {/* Any country not assigned to a sector — surface it so it's easy to fix. */}
          {(countrysBySector.get("__orphan") ?? []).length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Countries without a sector
              </Typography>
              <Typography sx={{ fontSize: "0.8125rem", mt: 0.5 }}>
                {(countrysBySector.get("__orphan") ?? [])
                  .map((m) => m.name)
                  .join(", ")}{" "}
                — assign a sector on each country profile.
              </Typography>
            </Alert>
          )}
        </Stack>
      )}
    </Box>
  );
}

/**
 * A country row nested inside its parent sector. Compact single-line
 * layout — click "Edit" to open the full country editor at
 * /admin/countrys/:id.
 */
function CountryRow({
  market,
  onEdit,
}: {
  market: MarketProfile;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        px: 1.5,
        py: 1,
        borderRadius: 0.75,
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
        "&:hover": { bgcolor: t.mist },
      }}
    >
      <Stack direction="row" alignItems="baseline" spacing={1.5} minWidth={0}>
        <ChevronRightIcon sx={{ fontSize: 16, color: t.slate }} />
        <Typography sx={{ fontSize: "0.9375rem", fontWeight: 500, color: t.ink }} noWrap>
          {market.name}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: t.slate,
            letterSpacing: "0.02em",
            fontFamily: theme.palette.fonts.mono,
          }}
        >
          {market.languageCode} · {market.currency}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
          {market.bannedTerms.length} banned ·{" "}
          {Object.keys(market.terminology).length} terms
        </Typography>
        <Button size="small" onClick={onEdit}>
          Edit
        </Button>
      </Stack>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "72ch" }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

function Stat({
  label,
  value,
  accentIfPositive,
}: {
  label: string;
  value: string | number;
  accentIfPositive?: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const numeric = typeof value === "number";
  const accent = accentIfPositive && numeric && value > 0;
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", mb: 0.25, lineHeight: 1 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "1.0625rem",
          fontWeight: 500,
          color: accent ? t.ember : t.ink,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
