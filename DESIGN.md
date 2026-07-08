---
name: MyPepsiCo Content Agent
description: Multi-agent governance tool for drafting Knowledge Articles across PepsiCo markets.
---

<!-- SEED: re-run /impeccable document once the full visual implementation has stabilized, to capture real tokens and per-component snippets. The MUI theme in src/theme.ts implements this DESIGN.md (white surfaces, Inter typography, Google-clean component styling, PepsiCo blue primary). -->

# Design System: MyPepsiCo Content Agent

## 1. Overview

**Creative North Star: "The Clean Workspace"**

A bright, white productivity surface in the spirit of Google's products (Workspace, Drive, Cloud Console): white backgrounds, generous whitespace, restrained type, a single confident accent color, and just enough structure to make dense information legible. Nothing decorative competes with the work.

The product personality is **sharp, honest, useful**. The brand attitude is **quietly ambitious**: the work being done here is governance, but the tool aspires to be the best version of that work, not the safest. Where Google's apps feel effortless and uncluttered, so should this.

The system explicitly rejects the **generic SaaS admin / Workday / Oracle HCM** zone: no dense sidebar plus breadcrumb plus tab bar plus dense form on every page, no identical card grids, no decorative gradients, no panel-of-panels density, no dated rounded-corner-and-drop-shadow Bootstrap aesthetic. When a screen feels generic, it has failed.

**Key Characteristics:**
- White page and white surfaces; separation comes from thin neutral borders and whitespace, not color blocks
- Single typeface across the whole system: Inter, at restrained weights (400 for display, 500 for section heads)
- Hierarchy through weight, size, and color, not font family or heavy bolding
- PepsiCo blue (`#004B93`) is the single interactive accent: primary buttons, links, active nav, focus states
- Ember amber is reserved strictly for "needs attention" signals (pending review, unsaved changes, in-flight job)
- Status communicated by chip plus icon plus text, never color alone
- Flat by default: borders and whitespace separate surfaces; shadows are reserved for floating elements (menus, dialogs, the article document)
- Generous, even spacing in the Google manner
- Responsive motion: short, eased transitions on state change; nothing performative

## 2. Colors

Clean and neutral. White surfaces, Google-style greys for text and borders, a single blue accent for everything interactive, ember reserved for attention.

### Primary (interactive)

- **PepsiCo Blue** (`#004B93`): the single interactive accent. Primary buttons, links, active nav pills, focus rings, stepper progress, selected toggles. This is both the brand color and the Google-style "one blue does the interactive work" approach.
- **PepsiCo Blue Strong** (`#003473`): hover/pressed state for blue elements.
- **PepsiCo Blue Subtle** (`#E8EFF8`): tinted background for selected states (active nav, selected toggle, primary chips) — the Gmail-selected-label pattern.

### Attention

- **Ember** (`#D56E0C`): amber-orange, reserved strictly for "needs attention" signals — pending-review count dot, unsaved-changes indicator, in-flight job, active trace step. Never used for primary actions (those are blue). Sparing by design.

### Neutral

- **Paper** (`#FFFFFF`): page background. White.
- **Surface** (`#FFFFFF`): cards, panels. White. Separated from the page by borders and whitespace, not by tone.
- **Mist** (`#F1F3F4`): hover surfaces, secondary surfaces, table-row hover (Google's hover grey).
- **Border** (`#DADCE0`): default border and divider. Google's standard line color.
- **Border-strong** (`#BDC1C6`): hover borders, emphasis dividers.
- **Granite** (`#80868B`): tertiary text, disabled, captions.
- **Slate** (`#5F6368`): secondary text, labels, table headers.
- **Ink** (`#202124`): primary text, headings.

### Semantic status

- **Success** (`#188038` on `#E6F4EA`) — approved.
- **Error** (`#C5221F` on `#FCE8E6`) — rejected.
- **Warning / attention** (`#D56E0C` on `#FEEFC3`) — needs review.

These mirror Google's semantic palette and are always paired with an icon and text label.

### Brand band (article documents)

Inside the `<ArticleDocument>` component, PepsiCo Blue also drives the document's branding: the top band, H2 headings, links, table-header underline, and list markers. See section 5.

### Neutral

A near-white scale, faintly tinted toward the ember hue so the palette retains thermal coherence without reading as cream. The page sits barely off-white; surfaces sit one micro-step above the page.

- **Paper** (`#FAFAF8`): Page background. Reads as white at a glance, with a barely-there warm tint that prevents the screen from feeling clinical.
- **Surface** (`#FDFDFC`): Cards, panels, table containers. One micro-step lighter than Paper — provides subtle elevation against the page without needing shadows.
- **Mist** (`#F1F0EC`): Hover surfaces, secondary surfaces, alt rows where used.
- **Border** (`#E6E3DC`): Dividers and borders.
- **Border-strong** (`#D2CEC3`): Input field outlines, separators that need to register.
- **Granite** (`#928C80`): Tertiary text, disabled states.
- **Slate** (`#5E574C`): Secondary text, labels.
- **Ink** (`#2A251D`): Primary text, headings, contained-button backgrounds.

### Named Rules

**The One Blue Rule.** PepsiCo Blue does all interactive work — buttons, links, active nav, focus, selected states. Don't introduce a second interactive color. One blue keeps the surface calm and the affordances obvious.

**The Ember-Means-Attention Rule.** Ember appears only where something needs the user's attention (pending-review dot, unsaved changes, in-flight job, active trace step). It is never a primary action and never decorative. If ember and blue both want the same element, blue wins unless the element is genuinely an alert.

**The White-Surface Rule.** Page and cards are both white. Separation comes from thin `#DADCE0` borders and whitespace, never from colored fills. No grey card backgrounds, no tinted panels (except the deliberate blue-subtle selected states).

**The Status-Color Rule.** Status (needs review, approved, rejected, in flight, awaiting clarification) is never communicated by color alone. Every status display is a chip plus icon plus label — the accessibility floor and a clarity choice.

## 3. Typography

**Primary face:** Inter across the entire system. Loaded from Google Fonts (weights 400, 500, 600, 700).

**Character:** Inter is a clean, neutral, screen-optimized sans — exactly the register Google's products live in. Weights stay restrained: display sizes use Regular (400), section heads use Medium (500), and bold (600/700) is reserved for genuine emphasis. The look is calm and legible, never shouty. There is no serif and no mono; hierarchy is a function of weight, size, and color.

### Hierarchy

- **Display** (Inter Regular/400, clamp(1.5rem, 3vw, 1.875rem), letter-spacing -0.01em, line-height 1.25): Page-level H1. One per screen. Examples: "Knowledge Articles", "Market Profiles". Light weight at large size, in the Google manner.
- **Headline** (Inter Medium/500, 1rem to 1.125rem, line-height 1.4): Section titles inside a page. Examples: "Agent trace", "Drafted articles".
- **Title** (Inter Medium/500, 0.9375rem to 1.0625rem, line-height 1.4): Card titles, dialog titles, the title of an article in a row.
- **Body** (Inter Regular/400, 0.9375rem, line-height 1.55, max measure 65 to 75ch): Reading prose, descriptions, helper text, dialog body.
- **Label** (Inter Medium/500, 0.8125rem): Form labels.
- **Overline** (Inter Semibold/600, 0.6875rem, letter-spacing 0.08em, UPPERCASE, color Slate): Column headers, section labels, small metadata tags above values.
- **Caption** (Inter Regular/400, 0.75rem, color Slate to Granite): IDs, timestamps, locale codes, durations, agent names. Quieter than body, separated by size and color alone.

### Named Rules

**The One Family Rule.** Inter is the only typeface. No serifs, no mono. To differentiate, change weight, size, or color — never the family.

**The Restrained Weight Rule.** Display headings are Regular (400), not bold. Section heads are Medium (500). Reserve 600/700 for genuine emphasis (the wordmark, a single key number). Heavy bolding everywhere reads as loud and un-Google.

**The Quiet ID Rule.** System-generated identifiers (job IDs, article IDs, locale codes, durations) render at Caption size in Granite color. Present, scannable, never shouting.

**The 65ch Rule.** Body prose maxes out at 65 to 75 character measure. The market editor's long-form fields, the article body view, the rejection-reason dialog: all constrained. No edge-to-edge paragraphs.

## 4. Elevation

Flat by default. Surfaces are separated by thin `#DADCE0` borders and whitespace, not by shadows. A hovered table row or nav item shifts to `#F1F3F4` (Mist). Cards sit on the white page with a border, no shadow at rest. This is the modern, clean Google posture — dividers and borders over heavy Material shadows.

Shadows are reserved for genuinely floating surfaces, using Google-style soft elevation:

- Menus, dropdowns, tooltips, snackbars.
- Dialogs / modals.
- The sticky save bar in the market editor when it surfaces.
- The article document (see exception below).

### Named Rules

**The Flat-By-Default Rule.** Cards, inputs, and buttons are flat at rest. If you're about to add a `box-shadow` to one, stop. Use a border or whitespace.

**The Floating Exception Rule.** Shadows are allowed only on elements temporarily on top of the user's work: menus, tooltips, dialogs, snackbars, the sticky save bar. Anything that lives on the page at rest is flat.

**The Article-Document Exception.** The published article view (`<ArticleDocument>`) carries a subtle ambient shadow because it represents a literal piece of paper laid on the desk. Applies only to that component.

**The Article-Document Exception.** The published article view (`<ArticleDocument>`) is rendered as a literal piece of paper: pure white background (`#FFFFFF`), one subtle border, and an ambient shadow that signals "this is a document laid on your desk." This exception exists because users are reading a finished artifact, not interacting with an interface element. The exception applies only to the article-document component, not to the meta row, header, or any other surface around it.

## 5. Components

A first implementation now lives in `src/theme.ts` and the page-level components. Concrete per-component snippets are out of scope for this seed; re-run `/impeccable document` once the system is stable to capture them in a sidecar.

High-level principles in effect today:

- **Cards** are flat, single-border (`#DADCE0`), no shadow, white surface on a white page, 12px radius. Hover (when interactive) shifts to Mist (`#F1F3F4`), not shadow.
- **Buttons** are flat, 8px radius, no resting shadow. Primary (contained) is PepsiCo Blue with white text and a faint elevation on hover. Outlined is blue text on a `#DADCE0` border. Text buttons are blue with a faint blue-tint hover.
- **Inputs** use Border at rest, Border-strong on hover, a 2px PepsiCo Blue ring on focus. No shadow.
- **Chips** are 24px tall, 8px radius. Outlined chips inherit Border. Status chips use the semantic palette: amber for needs-review, green for approved, red for rejected. Always with an icon and a label.
- **Nav items** are pill-shaped. The selected item uses a blue-subtle (`#E8EFF8`) background with PepsiCo Blue text and icon — the Gmail-selected-label pattern.
- **Tables** use uppercase Overline column headers in Slate, no top fill bar. Rows hover to Mist. Cells separated by Border, never stripes.
- **The sticky save bar** floats with a soft Google-style shadow; the unsaved indicator dot is ember.

## 6. Do's and Don'ts

### Do:

- **Do** keep page and card backgrounds white (`#FFFFFF`). Separate surfaces with thin `#DADCE0` borders and whitespace.
- **Do** lead every page with a single Inter Regular (400) H1 at a large size. Section heads are Inter Medium (500). Light, calm, Google-like.
- **Do** use PepsiCo Blue for everything interactive: primary buttons, links, active nav, focus rings, selected toggles.
- **Do** carry status using a chip plus icon plus label. Color is reinforcement, never the only signal.
- **Do** reserve ember strictly for "needs attention" signals (pending dot, unsaved changes, in-flight job, active trace step). Never for primary actions.
- **Do** separate surfaces with borders and whitespace, not drop shadows.
- **Do** keep spacing generous and even, in the Google manner.
- **Do** render IDs, timestamps, locale codes, and durations at Caption size in Granite. Quiet, scannable, present.
- **Do** keep prose at 65 to 75 character measure.
- **Do** treat the agent trace as a first-class surface, not a debug view.
- **Do** reserve soft shadows for floating elements only: menus, dialogs, tooltips, the sticky save bar, the article document.

### Don't:

- **Don't** use a generic SaaS admin pattern: dense sidebar + breadcrumb + tab bar + form on every page. The host (ServiceNow) already looks like that; the product should not.
- **Don't** echo Workday or Oracle HCM: panel-of-panels density, settings-tab labyrinths, dated buttons, drop shadows on every card.
- **Don't** use grey or tinted backgrounds for cards and pages. White surfaces, neutral borders. The one allowed tint is the blue-subtle selected state.
- **Don't** use `#000` for text. Headings and body are Ink (`#202124`).
- **Don't** mix typefaces. Inter carries every weight, size, and role. No serif, no mono, no system-font escape hatches.
- **Don't** bold everything. Display headings are Regular (400); reserve 600/700 for genuine emphasis.
- **Don't** put resting drop shadows on cards, inputs, or buttons. Shadows are for floating surfaces only.
- **Don't** use ember for primary actions or decoration. Blue is the action color; ember is the attention signal.
- **Don't** introduce a second interactive accent color. One blue.
- **Don't** use a side-stripe border (`border-left` greater than 1px in a color) on cards, list rows, alerts, or callouts.
- **Don't** apply gradient text via `background-clip: text`.
- **Don't** build identical card grids: same-sized cards with icon + heading + body, repeated.
- **Don't** introduce dark mode without an updated scene sentence forcing it.
- **Don't** add bouncy or elastic motion. Short eased transitions (100 to 200ms) on state change.
