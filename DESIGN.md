---
name: MyPepsiCo Content Agent
description: Product design system and implementation rules for the PepsiCo-styled knowledge article application.
last_reviewed: 2026-09-04
---

# MyPepsiCo Content Agent Design System

This document is the design contract for the product. It translates patterns from PepsiCo's public corporate identity into a restrained enterprise application system.

It is not an official PepsiCo brand standards document. It is a product-specific interpretation of public references, documented so that design and code stay aligned.

## 1. Reference And Authority

Public references reviewed:

- [PepsiCo.com](https://www.pepsico.com/)
- [PepsiCo introduces a bold new corporate brand identity](https://www.pepsico.com/newsroom/stories/2025/pepsico-introduces-a-bold-new-corporate-brand-identity)
- [An inside look at PepsiCo's new visual identity](https://www.pepsico.com/en/newsroom/stories/2026/an-inside-look-at-pepsico-new-visual-identity-with-its-lead-designer)

The public identity uses a dark navy anchor with a broader real-world palette, including refreshing blue, leaf green, and warm harvest tones. Its layouts combine generous white space, approachable type, bold moments, and rounded interactive controls.

Source-of-truth order for this application:

1. This file defines design intent and usage rules.
2. `src/theme.ts` owns implemented values and shared component behavior.
3. Shared components own repeatable interaction patterns.
4. Page-level styles may compose tokens but must not invent a competing palette.

When implementation and this document disagree, correct both in the same change.

## 2. Product Design Intent

The application is an operational content workspace. It should feel:

- Clear enough for frequent, repeated work.
- Approachable enough for occasional content creators.
- Trustworthy enough for governance and publishing decisions.
- Recognizably PepsiCo without looking like a marketing website.
- AI-assisted without relying on novelty styling or decorative effects.

The interface should remain mostly white and neutral. Brand color creates hierarchy, meaning, and orientation. It should never become background decoration.

## 3. Protected Article Boundary

The product shell and the employee-facing article are separate visual systems.

This broader product palette applies to:

- Navigation and role switching.
- Dashboards and article inventories.
- Creation mode controls.
- Governance and administration pages.
- Reference pages.
- Status summaries and workflow indicators.

It does not change:

- `ArticleReadingFrame`.
- `ArticleDocument`.
- Article title and body typography.
- Article FAQ, table, accordion, callout, or resource styling.
- The article preview or published article's established blue editorial system.

Article surfaces remain visually consistent so employees see one trusted publishing voice regardless of who created the content.

## 4. Color System

All product colors must come from `theme.palette.tokens`.

### Structural Colors

| Token | Value | Purpose |
| --- | --- | --- |
| `paper` | `#FFFFFF` | Page background |
| `surface` | `#FFFFFF` | Cards and panels |
| `surfaceContainerLow` | `#F7FAFC` | Quiet grouped controls |
| `surfaceContainer` | `#EEF4F8` | Secondary containers |
| `border` | `#D7E2EA` | Default boundary |
| `ink` | `#172A3A` | Primary product text |
| `slate` | `#4F6170` | Secondary text |
| `granite` | `#6C7B88` | Tertiary and disabled text |
| `pepsiNavy` | `#00205B` | Brand anchor and page headings |
| `pepsiBlue` | `#0065A8` | Primary actions, links, and focus |

### Product Accent Roles

The `productAccent` object in `src/theme.ts` is semantic. Choose the role that matches the meaning of an element.

| Role | Main | Ink | Soft | Use |
| --- | --- | --- | --- | --- |
| `creation` | `#0065A8` | `#003B5C` | `#EAF5FC` | Creating, drafting, author review, core product navigation |
| `governance` | `#6F9238` | `#3E651F` | `#EDF5DC` | Administration, source-file workflows, completion, published work |
| `guidance` | `#E2A633` | `#7A5200` | `#FFF3D8` | Alternate paths, examples, guidance, processing, decisions needing attention |

### Semantic Status Colors

- Success uses `successInk` and `successBg`.
- Warnings and pending work use `ember`, `emberStrong`, and `emberBg`.
- Errors use `errorInk` and `errorBg`.
- Informational notices use `infoInk` and `infoBg`.
- Red is reserved for destructive actions, errors, or critical conditions. It is not a decorative brand accent.

### Color Rules

- Navy and blue anchor the product. Secondary colors support meaning; they do not compete with the primary action.
- Use one accent role as the dominant accent within a component or local region.
- Use soft colors for selected backgrounds and ink colors for text or icons.
- Never place main gold or green behind body text.
- Never use color as the only indicator of status. Pair it with a label, icon, count, or position.
- Do not introduce gradients, decorative color blobs, or rainbow treatments.
- Do not recolor article content with product accent roles.

## 5. Intentional Application Map

### Navigation

- New Article and core creation destinations use `creation`.
- Admin destinations use `governance` when selected.
- Reference destinations use `guidance` when selected.
- All Articles remains a core blue destination because it spans authoring, review, and governance.
- Unselected navigation remains neutral.

### POC Role Switcher

- Content Owner uses `creation`.
- Team Admin uses `guidance` because the role coordinates review and decisions.
- Super Admin uses `governance` because the role owns standards and system-wide oversight.

The role color is an orientation cue, not a permission indicator.

### Creation Modes

- The conversational path and final submit action remain primary blue.
- Create from files uses `governance` because it is source-led and hands-off.
- Switch to form and demo-example actions use `guidance` because they are alternate paths.
- Input focus, send controls, and keyboard focus remain blue for consistency.

### Article Workspaces

- Agent writing uses `guidance`.
- Needs author review uses `creation`.
- Published and completed work use `governance`.
- Awaiting approval uses attention amber.
- Stale or critical work uses warning or error tokens according to severity.

## 6. Typography

Product UI:

- Poppins is the primary application typeface.
- Use it for navigation, page headings, controls, forms, dashboards, and conversational UI.
- Inter is reserved for dense utility content such as IDs, timestamps, locale codes, and technical metadata.

Article UI:

- Barlow Semi Condensed is used for article titles and major editorial headings.
- Poppins is used for article body text, questions, answers, tables, and article utilities.

Rules:

- Do not introduce additional fonts.
- Use sentence case for controls and labels.
- Use uppercase only for short overlines or compact category labels.
- Keep page headings restrained. Bold display typography belongs to the article or a true first-use moment, not routine admin panels.
- Letter spacing is `0` except for established overline labels.

## 7. Shape, Spacing, And Elevation

- The default component radius is 8px.
- Buttons, segmented controls, chips, and conversational input bars may use a pill radius.
- Cards are reserved for repeated items, modals, and genuinely framed tools.
- Do not place cards inside cards.
- Prefer whitespace and surface contrast before adding borders.
- Resting page sections and cards remain flat.
- Shadows are reserved for menus, dialogs, dropdowns, sticky input bars, and other floating surfaces.
- Fixed-format controls must have stable dimensions so loading or dynamic labels do not shift the layout.

## 8. Component Rules

### Buttons

- Contained blue: one primary command in a local region.
- Outlined: secondary command with similar importance.
- Text or tonal accent: alternate path, mode switch, or contextual action.
- Use familiar Material icons where available.
- Icon-only buttons require an accessible name and tooltip when the symbol is not obvious.

### Forms

- Labels remain visible and do not rely on placeholder text.
- Helper text explains consequences or scope, not basic mechanics.
- Multi-select controls clearly communicate that more than one value is allowed.
- Validation appears next to the field that needs action.
- Long-form editor toolbars must not overlap entered text or character counts.

### Conversation

- The opening view follows familiar ChatGPT, Claude, and Gemini conventions: centered prompt, attachment on the left, voice and send on the right.
- After the first message, content scrolls while the composer remains available at the bottom.
- The agent asks focused follow-up questions instead of returning an entire form at once.
- Publishing information is gathered before article drafting is finalized.
- The agent applies content and accessibility standards behind the scenes.
- Before review, the agent presents a readable draft and asks the user to confirm or add details.

### Status And Metrics

- Metrics remain compact and scannable.
- Color dots supplement the label and value; they never replace them.
- Processing states use progress indicators and plain-language labels.
- A draft created by an agent is not presented as already in editorial review.

### Accordions

- Use Material expand and collapse behavior with a Material chevron.
- Remove decorative hover fills when they reduce contrast or imply selection.
- Keep core requirements visible; accordions are for supporting detail.

## 9. Interaction States

Every interactive element must define:

- Default: neutral or semantic soft surface.
- Hover: a subtle increase in the same semantic color family.
- Focus visible: a clear blue focus ring with sufficient offset.
- Selected: soft role background plus matching ink and icon color.
- Disabled: neutral surface and legible disabled text.
- Loading: stable dimensions with a progress indicator and unchanged command context.

Hover must not introduce a new semantic color. Selected and focus states must remain distinguishable from each other.

## 10. Accessibility

- Target WCAG AA contrast for text and interactive controls.
- Do not communicate status, selection, or error through color alone.
- Maintain visible keyboard focus.
- Keep touch targets at least 40px when space allows.
- Respect reduced-motion preferences.
- Use semantic controls; never nest buttons or links inside other interactive elements.
- Keep error language specific and actionable.
- Article media requires meaningful alternative text or captions when it carries information.

## 11. Responsive Behavior

- Navigation becomes a compact rail or temporary drawer without removing destinations.
- Toolbars wrap before labels collide.
- Tables may scroll horizontally; page-level content should not.
- Sticky conversation and review controls must not cover content.
- Text must wrap within controls and cards without clipping.
- Validate common desktop and mobile widths before delivery.

## 12. Implementation Checklist

Before introducing or changing a component:

1. Identify its product purpose: creation, governance, guidance, status, or neutral structure.
2. Use the corresponding semantic token from `src/theme.ts`.
3. Confirm there is only one dominant accent in the local region.
4. Define hover, focus, selected, disabled, and loading states where relevant.
5. Confirm color is not the only carrier of meaning.
6. Confirm the change does not leak into `ArticleReadingFrame` or `ArticleDocument`.
7. Check desktop and mobile layouts.
8. Run type, build, and browser-error checks.
9. Update this document when a shared rule changes.

## 13. Current Implementation

The semantic accent system is currently applied to:

- Role-aware navigation selection.
- The POC role switcher.
- Conversational creation mode controls.
- Hands-off source-file creation.
- Article workspace status metrics.
- Sector administration actions.

Future pages should adopt these roles incrementally when they are touched. Do not recolor every existing component solely to increase color usage.
