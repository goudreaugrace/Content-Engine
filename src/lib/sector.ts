/**
 * Client-side sector labels — kept in step with the seeded ids under
 * server/data/sector-profiles/. Small enough to hardcode; loading the
 * full sector-profile list just to render a chip would be wasteful on
 * every row of every list surface.
 */

export const SECTOR_LABELS: Record<string, { name: string; short: string }> = {
  global: { name: "Global (corporate)", short: "Global" },
  pfna: { name: "PepsiCo Foods North America", short: "PFNA" },
  pbna: { name: "PepsiCo Beverages North America", short: "PBNA" },
  latam: { name: "Latin America", short: "LatAm" },
  europe: { name: "Europe", short: "Europe" },
  amesa: { name: "Africa, Middle East & South Asia", short: "AMESA" },
  apac: { name: "Asia Pacific", short: "APAC" },
};

export function sectorShortLabel(id?: string): string {
  if (!id) return "";
  return SECTOR_LABELS[id]?.short ?? id.toUpperCase();
}

export function sectorFullLabel(id?: string): string {
  if (!id) return "";
  return SECTOR_LABELS[id]?.name ?? id;
}
