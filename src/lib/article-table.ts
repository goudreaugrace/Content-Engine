/**
 * Shared column widths for the three article tables (Needs review,
 * Pre-published, Published) that live inside the All Articles page.
 *
 * Applying the same widths to each TableHead cell keeps the tables
 * visually aligned as the user tabs between them — the Article column
 * never jumps between tabs, so the page feels like one surface.
 *
 * Widths are numbers (pixels) rather than percentages so the layout
 * stays crisp on narrow viewports and inside the app shell's max-width.
 */
export const ARTICLE_TABLE_COL_WIDTHS = {
  article: 380,
  market: 130,
  status: 140,
  submittedBy: 150,
  when: 130,
  trailing: 130, // Source (Needs review) / Views (Published)
};

/**
 * Applied to every article Table so column widths are honored exactly
 * — otherwise the browser's auto layout stretches Article to fill any
 * leftover space, which drifts between tabs that have different
 * trailing columns.
 */
export const ARTICLE_TABLE_SX = {
  tableLayout: "fixed" as const,
};

/**
 * Anchor width for the Article cell content wrapper. maxWidth on the
 * TableCell alone doesn't clip when tableLayout defaults to auto — we
 * also cap the inner Typography via this value so long titles wrap
 * instead of pushing every other column narrower.
 */
export const ARTICLE_CELL_MAX_WIDTH = 380;
