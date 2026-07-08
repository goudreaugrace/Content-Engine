# Product

## Register

product

## Users

Three internal PepsiCo personas, all equally important:

1. **Content owners**: people in HR, IT, Comms, Benefits, and functional teams who write Knowledge Articles and Topic Pages for the MyPepsiCo employee portal. They're not professional editors. They want to go from "I need a policy explainer for my team" to "submitted for review" without learning a CMS. Their moment with this product is sporadic, often interrupted, and motivated by something else they're trying to ship.

2. **Portal governance reviewers**: a small team running the monthly review cycle. They scan many articles, approve fast, reject with a reason, and need to spot pattern issues (e.g. "this market keeps missing regulatory references"). Their moment is batch-mode, focused, requires speed and signal.

3. **Market admins**: people who maintain the per-market tone, terminology, content strategy, and regulatory rules that the agents follow. Their work shapes everything else. Their moment is rare but consequential. Editing here changes the behavior of dozens of future articles.

The product sits inside ServiceNow's MyPepsiCo portal and inherits its RBAC.

## Product Purpose

This is the Content Creation Agent for MyPepsiCo: a multi-agent system that helps content owners draft, validate, and ship Knowledge Articles and Topic Pages, while enforcing PepsiCo's DEEx guidelines, brand voice, and market-specific rules.

Success looks like:

- A content owner submits a request and gets back a publish-ready draft that already respects the audience, market, tone, and regulatory context. Less editing, fewer rejections.
- Governance reviewers can clear the monthly queue in one sitting because the work arriving at them is already structurally correct.
- Market admins can tune the guidelines once and trust that future drafts honor them, without engineering involvement.
- Content gets shipped in the right language for the right market, even when the source request is in English.

The product is the difference between "AI helps you write" and "AI ships content that complies with the rules of every market it lives in."

## Brand Personality

**Sharp, honest, useful.**

Voice and tone:

- **Sharp**: precise word choices, no padding, no marketing voice. Labels, errors, and helper text say exactly what's happening.
- **Honest**: the agent shows its work. The trace view is core, not a debug feature. When something is uncertain (compliance flagged, awaiting clarification, mock mode), the UI says so plainly.
- **Useful**: every screen earns its place by answering a specific question the user came with. No vanity metrics, no decorative loaders, no SaaS theater.

Emotional goal: when someone uses this, they should feel they're working with a senior teammate, not babysitting a tool.

## Anti-references

**Generic SaaS admin**: Workday, Salesforce, Oracle HCM, generic Bootstrap-era dashboards. Specifically avoid:

- Identical card grids with icon + heading + body, repeated for every surface.
- Tab + breadcrumb + sidebar + dense form as the answer to every page.
- Decorative gradients, hero-metric templates, fake density (large empty cards padding out small data).
- Filler typography (all the same weight, the same size, the same line-height).
- Settings panels that look the same as dashboards that look the same as detail views.

The UI lives inside ServiceNow, but should feel like a clear step up in craft, not blend in.

## Design Principles

1. **Respect the reader's time.** Every screen answers a question. Surface what matters first. Defaults beat decisions. If a control isn't earning its place, remove it.

2. **The agent earns trust by showing its work.** The trace view, compliance feedback, market profiles, stubbed emails: all visible, all inspectable, no black boxes. Confidence comes from transparency, not polish.

3. **Govern through clarity, not friction.** This is a governance tool, but its job is to help content owners succeed, not block them. When the system says no, it explains why and tells the user the next move.

4. **Localize, don't translate.** Markets aren't mirror images of each other. The Mexico market has its own strategy, tone, and guidelines authored in English so admins can collaborate, then the agent outputs in the target language. Design choices should support that asymmetry, not flatten it.

5. **Vary on purpose.** Different surfaces solve different problems. The dashboard is scan-mode. The job detail is watch-and-wait. The editor is edit-mode. Layout, density, and rhythm should reflect those differences, not converge on one safe template.

## Accessibility & Inclusion

- **WCAG 2.1 AA** as the floor.
- Full keyboard navigation across all primary flows (submit a request, review queue, edit market profile).
- Color is never the only signal. Status uses chip + icon + text.
- Sufficient contrast on every text/background pair (4.5:1 body, 3:1 large).
- Respect `prefers-reduced-motion` for any non-essential animation we introduce.
- Spanish content rendering must be tested with screen readers (lang attributes set correctly).
- Audience: global PepsiCo workforce, broad range of devices and assistive tech. Don't assume desktop-only.
