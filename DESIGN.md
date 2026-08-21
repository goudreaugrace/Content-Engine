---
name: MyPepsiCo Content Engine
description: Design and interaction guidance for the PepsiCo-styled knowledge article product.
---

# Design System: MyPepsiCo Content Engine

This document describes the current product design direction. It should stay aligned with the implementation, not act as a parallel style system.

Source-of-truth rule:
- Design tokens live in `src/theme.ts`.
- Article reading surfaces use `ArticleReadingFrame` plus `ArticleDocument`.
- Editable article surfaces should mirror the same article structure and typography.
- `PublishedArticle` is the canonical employee-facing article record.
- Article creation captures structured sections, taxonomy, source language, access groups, source evidence, and graph-ready relationships before publish.

## 1. Product Direction

The product is a structured, self-service knowledge article tool for myPepsiCo content. It should feel like a clean productivity workspace with a PepsiCo article layer, not like a generic admin dashboard.

The product shell follows Material and Google-style interaction patterns: clear navigation, restrained controls, white surfaces, compact status indicators, and predictable form behavior.

The article itself follows the PepsiCo intranet article style: bold blue editorial headings, Poppins body text, compact tables, in-article table of contents, and a quiet right rail for supporting metadata.

## 2. Current Tokens

The actual token values live in `src/theme.ts`. Use those tokens rather than hardcoding new colors.

Core colors currently used:
- App background: `#FFFFFF`
- Surface: `#FFFFFF`
- Low container: `#F8FAFC`
- Container: `#F1F4F8`
- Hover grey: `#F1F3F4`
- Border: `#DDE5EC`
- Strong border: `#B9C6D2`
- Primary text: `#1F2933`
- Secondary text: `#5E6B76`
- Tertiary text: `#6B7785`
- PepsiCo blue: `#155798`
- PepsiCo strong blue/navy: `#003B5C` / `#02355A`
- PepsiCo subtle blue: `#EAF4FB`
- Attention amber: `#D56E0C`
- Success: `#188038` on `#E6F4EA`
- Error: `#C5221F` on `#FCE8E6`

Rules:
- Blue owns interactive affordances: links, primary actions, selected states, focus states, and article navigation.
- Amber is only for attention: pending review, unsaved changes, in-flight work, or warning states.
- Status is never color alone. Use an icon, chip, or text label with the color.
- Page and card surfaces stay light. Use borders and whitespace before shadows.

## 3. Typography

Product UI:
- Font: Inter.
- Used for navigation, forms, filters, admin screens, dashboards, chips, labels, and metadata.
- Page headings should be restrained, not overly heavy.

Article UI:
- Article titles and major article headings: Barlow Semi Condensed.
- Article body, tables, FAQ answers, accordions, and article rail utilities: Poppins.
- Article headings use PepsiCo navy/blue and should feel editorial, compact, and official.

Rules:
- Do not introduce more fonts.
- Do not use Inter for the finished article body.
- Keep article body text readable but dense enough for policy and HR content.
- Keep IDs, timestamps, locale codes, and system details small and quiet.

## 4. Shape, Spacing, And Elevation

Shape:
- Default radius is 8px.
- Use 8px for article panels, right-rail modules, controls, accordions, and section containers.
- Avoid oversized rounded cards unless the component is intentionally pill-shaped.

Spacing:
- Prefer whitespace over divider lines.
- Article sections need enough vertical space to scan, but should not feel like separate cards.
- Creation forms should keep controls attached to the field or section they modify.

Elevation:
- Flat by default.
- Cards, inputs, article rail modules, and page panels should not have resting shadows.
- Shadows are reserved for floating surfaces: menus, dialogs, dropdowns, tooltips, and temporary overlays.
- The article document may use subtle separation because it represents the finished readable artifact.

## 5. Article Reading Pattern

All article-reading surfaces should use the same renderer and visual system:
- Published library article pages.
- Source/admin article pages.
- My Articles article pages.
- Review article preview.
- New article review preview.

Use:
- `ArticleReadingFrame` for the article plus right rail layout.
- `ArticleDocument` for the employee-facing article body.

Article body structure:
- Top utility actions aligned left: Available Translations, Give Feedback, favorite heart.
- Title.
- Updated date and view count where relevant.
- Lead or summary.
- Table of Contents inside the article body.
- Structured sections.
- Related or additional resources where relevant.

Right rail rules:
- The right rail is for support metadata only.
- The right rail can include tags, quick links, language, publishing details, sources, related articles, and governance context.
- The right rail must not include a duplicate table of contents.
- Keep right-rail modules compact and quieter than the article opening.
- Avoid dense article details tables in the default reading view.

## 6. Article Section Blocks

Articles are structured documents, not Markdown-only blobs. The current section block types are:
- Text section.
- FAQ section.
- Table section.
- Resource links section.
- Accordion section.
- Callout section.

Rendering rules:
- Text sections render as normal article prose with headings.
- FAQ sections render as article-style questions and answers.
- Tables render as first-class article content with deep blue headers and compact rows.
- Resource links render as curated article links, not loose metadata.
- Accordion sections render as guided expandable content, never raw `<details>` markup.
- Callouts are reserved for important notes, warnings, or confirmations.

## 7. Creation And Review Pattern

The creation flow has three steps: Basics, Article, and Review.

Basics captures where the article belongs before anyone writes:
- Knowledge base.
- Sector.
- Country or countries.
- Employee audience.
- Access groups.
- Source language.
- Content type.
- Approver.

Audience and access are separate:
- Audience describes who the article is for and improves findability.
- Access groups describe who can open the article.
- People outside selected access groups are excluded.

Language and translations are separate:
- Source language is the original language of the draft, used for review and translation handoff.
- Translation needs are inferred from selected countries and can be adjusted later.

Article step rules:
- Start from the recommended template for the selected content type.
- Let authors add flexible section blocks when the template is not enough.
- Keep text editor controls attached to the active long-form field.
- Use dedicated editors for FAQ, table, resource, accordion, and callout sections.

Review step rules:
- The article preview is the dominant object.
- Submission details, findability, and Ask Pep readiness stay in compact disclosure panels.
- Recommendations use plain language, not SEO jargon.
- Review checks should validate typed content, source evidence, access, duplicate review, readable sentences, scannable paragraphs, descriptive links, media accessibility, and article length.
- Resource links render as clear linked resources, not plain pasted URLs.
- Accordions render as blue article elements for optional details, formulas, or supplemental explanations.
- Callouts should be used sparingly for important notes or warnings.

The article template controls the starting structure, but authors can add mixed section types. For example, a policy can include a table and FAQ, and a topic page can include resource links and accordions.

## 7. Creation And Review Editor

Creation flow:
- Basics.
- Article.
- Review.

Basics should capture where the article belongs:
- Knowledge base.
- Sector.
- Country or countries.
- Audience.
- Content type.
- Approver.
- Topic, process, system, and destination metadata where available.

Article step:
- Should feel like a structured document editor.
- Templates provide a helpful starting point, not a locked form.
- Section titles should feel editable through a small inline edit affordance.
- Add Section is a section-level action.
- FAQ Add Question belongs inside the FAQ section.
- Table Add Column belongs with the table header controls.

Text editor rules:
- Keep common controls only: bold, italic, bulleted list, numbered list, and Improve.
- Controls should appear only for the active long-form writing field.
- FAQ questions stay plain text and do not need rich-text controls.
- Toolbar placement must not obscure the typed content or character count.
- Toolbar actions must actually modify the active field.
- Improve actions should be plain-language options, such as Improve writing, Make shorter, Make longer, Make clearer, and Make more employee-facing.

Review step:
- The article preview is the main object.
- Submission details, findability, and Ask Pep readiness belong near the top but should stay compact.
- Users should be able to edit sections from review using the same editors as creation.
- Recommendations should be contextual and plain-language, not SEO jargon.

## 8. Tables, Accordions, And Resources

Tables:
- Support editable title, headers, rows, and columns.
- Add column is right-aligned to the table controls.
- Add row belongs below the rows.
- Remove row/column controls should be small icon affordances.
- Spacing must stay consistent across header cells and body cells.
- Placeholders must be short enough to avoid overlap.

Accordions:
- Use Material expand/collapse behavior.
- Use a clean chevron micro-interaction.
- Do not hide core policy requirements inside accordions.
- Use accordions for supplemental detail, formulas, and optional examples.

Resource links:
- Capture resource title, URL, and description.
- Avoid cramped two-column inputs when placeholders are long.
- Resource links should render as useful article links in preview and final article.

## 9. IA And Governance

The app has three main workspaces:
- Content Owner Workspace: create, submit, and maintain articles.
- Admin Governance Workspace: review, approve, monitor health, and manage permissions.
- Reference Workspace: How It Works and Design & IA.

Lifecycle:
- Create or edit source article.
- Submit for review.
- Under review.
- Publish to canonical `PublishedArticle`.
- Maintain health, translations, sources, relationships, and review cadence.

Source-of-truth rules:
- `Article` is the source/draft/review record.
- `PublishedArticle` is the live employee-facing article.
- Published links should use `/library/:publishedArticleId`.
- Draft, review, and admin source work can use `/articles/:articleId`.
- If a published page receives a source ID, it should resolve to the canonical published article.

## 10. Taxonomy And Knowledge Graph Direction

The product should capture enough structure to support search, governance, Ask Pep, and future graph queries.

Core taxonomy:
- Knowledge base.
- Sector.
- Countries.
- Required translations.
- Audiences.
- Content type.
- Topics.
- Business terms.
- Systems.
- Processes.

Relationship types:
- Canonical.
- Duplicate of.
- Replaces.
- Related to.
- Parent of.
- Child of.
- Requires.
- Source for.

Future graph queries should answer questions like:
- Which policies apply to employees in Canada?
- Which articles mention Workday and payroll?
- Which articles are duplicates or replacements?
- Which source documents support this policy?
- Which articles are missing owner, approver, or review date?
- Which Ask Pep answers should route to this article?
- Which topics have no canonical article?

## 11. Documentation Rules

Keep this file current with the app.

When the UI changes, update this document if the change affects:
- Article visual style.
- Article renderer rules.
- Right rail rules.
- Creation or review editor behavior.
- Taxonomy, routing, or source-of-truth rules.
- Shared tokens or typography.

Do not add aspirational design ideas here unless they are explicitly marked as future direction. This document should help a new stakeholder understand the product as it exists today.
