# SmartPad Web Launch Brief

## Goal

Create a standalone promotional product website that explains SmartPad quickly, shows the real product, sends users to the app/docs/downloads, and captures update subscribers without weakening the local-first trust promise.

The current `website/` app is a Docusaurus docs site. It remains documentation infrastructure only. The promotional website must be a separate product-led experience, built from scratch, and it is intentionally the final launch step after product UI, stability, docs/support, release operations, and desktop beta status are settled.

## Launch Website Jobs

The promotional website must:

1. Explain what SmartPad is in one first viewport.
2. Show real app screenshots or short clips, not abstract illustrations.
3. Give a clear path to try the web app.
4. Give a clear path to docs.
5. Explain local-first privacy and portability.
6. Capture update subscribers.
7. Prepare a future desktop beta/download section without promising unavailable installers.
8. Link support and release notes.

## Required Product Website Direction

- Build a separate promotional product site from scratch.
- Do not implement it as a Docusaurus page or docs homepage.
- It must look aesthetically modern and product-grade, not like documentation or an internal project page.
- Use real videos of the app in use and interactive examples as first-class content.
- Treat this as the last launch step so visuals reflect the final Settings redesign, release candidate, and desktop beta status.
- Ask for user approval before major visual direction, positioning, signup provider, or hero composition decisions.

## Recommended Site Structure

### Homepage

Route:

- Prefer the public app route for product use and a dedicated marketing route/site for acquisition.
- Avoid burying the product behind docs-first navigation.

First viewport:

- H1: `SmartPad`
- Supporting copy: `A local-first text workspace for live calculations, units, dates, variables, and quick models.`
- Primary CTA: `Open SmartPad`
- Secondary CTA: `Read the docs`
- Tertiary CTA after desktop beta exists: `Download desktop beta`
- Visual: real app screenshot/video showing a useful sheet with live results and one plot or result chip.

Sections:

1. Core loop: write notes, get live answers, keep context.
2. Practical examples: finance, units/conversions, schedules/dates, engineering/data, scenario notes.
3. Reuse results: result chips/references, copy/insert, keep calculations traceable.
4. Visualize and inspect: plotting/dependency views, framed as advanced if release-candidate visuals are not yet clean.
5. Local-first: browser storage, import/export, no account required, explain FX external dependency.
6. Docs and examples: link beginner guide, syntax playbook, privacy/portability, troubleshooting.
7. Desktop beta: explain planned Electron beta status only after artifact exists; before then use waitlist/update signup.
8. Updates/signup: concise form with privacy copy.
9. Support: GitHub bug report, feature request, changelog/release notes.

Footer:

- App
- Docs
- GitHub
- Changelog
- Bug report
- Feature request
- Privacy/portability

## Copy Rules

Say:

- `local-first`
- `no account required`
- `import and export your work`
- `web app now`
- `desktop beta planned` until artifacts exist
- `FX rates may use cached data when offline`

Do not say until implemented:

- `sync`
- `collaboration`
- `AI`
- `tables`
- `desktop apps for every platform available now`
- `signed installers`
- `automatic updates`
- `private cloud`

Avoid:

- Promising spreadsheet replacement.
- Leading with symbolic solve or advanced plotting.
- Showing proposed features as screenshots.
- Using stock imagery instead of product captures.

## Asset Inventory

Required before implementation:

| Asset | Purpose | Source | Status |
| --- | --- | --- | --- |
| Hero screenshot | First viewport proof of product | Real app launch demo sheet | missing |
| Short demo clip | Show typing-to-result loop | Real app launch demo sheet | missing |
| Result chip screenshot | Explain reuse/traceability | Real app launch demo sheet | missing |
| Plot screenshot | Show visual mode if stable | `@view` demo sheet | missing |
| Settings screenshot | Only after the from-scratch professional Settings redesign | Settings redesign work | blocked by `T-2026-06-06-03` |
| Docs embed screenshot | Show docs/app integration | Current docs site | missing |
| Mobile/narrow screenshot | Responsive proof | Launch candidate | missing |
| Open Graph image | Link preview | Product screenshot composition | missing |
| App icon/favicon | Brand and desktop package | Existing `smartpad.png`/`website/static/img/logo.svg` or refreshed asset | audit |

Asset capture rules:

- Capture from a verified build, not a mockup.
- Do not capture internal debug controls.
- Do not capture proposed/unconfirmed autocomplete behavior as a headline feature.
- Use stable demo content that is covered by launch tests.
- Re-capture after Settings redesign if first viewport changes.

## Signup Decision

Decision:

- Use Brevo for the first promotional-site update signup, provided it supports an embedded form where people enter their email on the SmartPad website and complete signup without being redirected to a third-party page.
- Prefer the simplest static-compatible Brevo embed or API flow over a custom backend for launch.
- If Brevo forces a redirect-first experience or visually breaks the product-site quality bar, pause and re-check provider options before implementation.
- Do not add app telemetry for signup.
- Website signup analytics may track form submissions only if documented.

Signup copy:

- `Get SmartPad updates and desktop beta notes.`
- `No account required to use SmartPad. Unsubscribe anytime.`

Needs implementation check:

- Use Brevo's own embedded form path first. Brevo documents full-page/embedded signup forms and provides iframe, HTML with Ajax, and simple HTML embed code.
- Do not call Brevo's Contacts API directly from browser code. Brevo's contact endpoints require an `api-key` request header, so a direct client-side API call would expose credentials.
- Prefer the HTML-with-Ajax embed if it can be restyled enough for the product website and keeps success/error messages in-page. Use iframe only if speed beats styling control. Use a serverless proxy only if the embedded form cannot meet the UX bar.
- Confirm whether double opt-in is required and what confirmation copy users see. Brevo supports double confirmation, simple confirmation, and no confirmation; double opt-in is the safer default for GDPR-style consent and list quality.
- Confirm success, invalid input, generic processing error, required-field, duplicate-email, and network-error states can stay inside the SmartPad website UI or the embedded form area.
- Where private replies/support go.

Spike result:

- Brevo is viable for the first launch signup if we accept an embedded Brevo form rather than a fully custom client-side form.
- Do not implement Brevo before the promotional page exists. Build and review the page structure and visual direction first, then fit the Brevo embed into the approved signup section.
- A fully custom SmartPad form should use a small serverless endpoint that owns the Brevo API key; this is more work and should wait unless the embed is visually unacceptable.
- The promotional website should include concise privacy copy near the form: the signup is optional, handled by Brevo, and separate from local SmartPad sheets.

## Privacy And Tracking

Public website may use privacy-respecting analytics only if:

- It is documented on the homepage or privacy page.
- It tracks website visits/signup events, not app document content.
- It does not add hidden telemetry to the app.
- Users can still use SmartPad without signup.

Minimum privacy copy:

- SmartPad stores sheets locally in the browser unless the user imports/exports files.
- No account is required.
- Website signup is separate from app usage.
- FX behavior may use an external rate source and cached/offline data.
- Desktop beta may have unsigned-build warnings until signing is configured.

## Implementation Direction

Build a standalone product marketing site outside Docusaurus. Docusaurus stays dedicated to docs under `/docs/`.

Open implementation decisions for a later, user-reviewed block:

- Whether the promotional site lives inside the main Vite app, a separate Vite package, or a separate deployable workspace.
- Exact route/domain strategy.
- Brevo integration method and form styling.
- Video capture format and hosting.
- Hero layout and art direction.

## Verification

Before marking the promotional website ready:

```bash
npm run build
npm run docs:map
npm run docs:drift
npm run spec:test
npm run spec:trust
npm run verify:changed
```

Browser checks:

- Promotional site at production base path.
- App CTA opens SmartPad.
- Docs CTA opens generated docs under `/SmartPad/docs/`.
- Signup CTA/form works or clearly links out.
- Support links open bug/feature templates.
- Changelog link opens `CHANGELOG.md` location or rendered release notes.
- Screenshots load on desktop and mobile widths.
- Text does not overlap at 390px, 900px, or 1440px widths.
- Open Graph metadata resolves.

## Dependencies

Must happen before final screenshots:

- `T-2026-06-06-03` professional Settings redesign.
- Stability checks for result chips, plotting, quick tour, docs embeds, and deployment path.

Can happen in parallel:

- Signup provider decision.
- Promotional-site IA/copy.
- Changelog/release note route.
- Support link review.

Must wait:

- Desktop download CTA until an actual beta artifact exists.
- Analytics until privacy copy is finalized.
- Final promotional website implementation until product UI, launch candidate, docs/support, release operations, and desktop beta status are reviewed.

## Done Criteria

`T-2026-06-06-04` is done when:

- Homepage exists and builds.
- Real product assets are present.
- App/docs/support/release/signup CTAs are verified.
- Privacy/local-first copy is visible.
- Desktop beta section is accurate for current artifact status.
- Responsive screenshots are reviewed.
- Release checklist web candidate checks pass.

`T-2026-06-06-08` is done when:

- Launch screenshots/video/OG assets are captured from verified builds.
- Analytics/signup tracking boundaries are documented.
- App remains free of hidden telemetry.
