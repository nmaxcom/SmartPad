# SmartPad Docs And Support Launch Audit

## Goal

Make SmartPad understandable and supportable for public users who arrive from the launch homepage with no project context.

The current docs are a strong feature reference and beginner guide, but launch requires explicit support paths, known limitations, privacy/tracking notes, and a verified journey from homepage to working example.

## Current State

Existing public docs:

- `website/docs/intro.md`
- `website/docs/guides/getting-started.md`
- `website/docs/guides/syntax-playbook.md`
- `website/docs/guides/everyday-calculations.md`
- `website/docs/guides/privacy-and-portability.md`
- `website/docs/guides/troubleshooting.md`
- `website/docs/specs/*`

Existing support entry points:

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `RELEASE_CHECKLIST.md`

Existing validation:

- `tests/e2e/docs-ia.spec.ts`
- `npm run docs:docusaurus:publish-local`
- `npm run docs:docusaurus:publish-prod`
- `npm run docs:map`
- `npm run docs:drift`

## Launch Gaps

| Area | Current state | Launch gap | Required action |
| --- | --- | --- | --- |
| Beginner journey | Start Here and Getting Started exist | Journey is docs-first and not yet tied to launch homepage CTAs | Add scripted homepage -> docs -> app example journey after homepage exists. |
| Known limitations | Mentioned in launch planning only | No public known-limitations page | Add `website/docs/guides/known-limitations.md` before public launch. |
| Support path | GitHub templates exist | Docs do not clearly tell users where to report bugs or request features | Add support section/page and link it from troubleshooting/footer/homepage. |
| Privacy/tracking | Privacy and portability covers local storage/import/export | Missing website analytics, signup, FX external dependency, and desktop beta warning copy | Expand privacy docs after signup/analytics decisions. |
| Desktop beta | Planned in launch docs | Public docs do not explain desktop status or unsigned beta warnings | Add only after a desktop artifact exists; until then say planned/waitlist only. |
| Proposed-vs-shipped | Specs split exists | Launch funnel could expose proposed features as if shipped | Ensure homepage/docs link primarily to implemented guides/specs. |
| Troubleshooting | Syntax/conversion/range troubleshooting exists | Missing issue escalation and “what to include in a bug report” | Add escalation steps and link bug template. |
| Accessibility | Docs are structured | No launch-specific accessibility pass recorded | Verify docs/homepage keyboard, mobile, contrast, link text, and embedded previews. |

## Required Public Docs Changes

### 1. Known Limitations Page

Proposed file:

- `website/docs/guides/known-limitations.md`

Must include:

- Desktop app is planned/beta depending on artifact status.
- No accounts/cloud sync/collaboration.
- No hidden app telemetry.
- FX conversions may depend on external rates/cached data.
- Proposed features are roadmap/spec ideas, not shipped behavior.
- Browser local storage durability depends on browser/profile/device.
- Export important work before browser/profile migrations.
- Unsupported features: tables, AI formulas, auto-suggested plots, timezone/business-day date keywords, full plugin system.

### 2. Support Page Or Troubleshooting Expansion

Preferred file:

- `website/docs/guides/support.md`

Minimum content:

- Bug report link.
- Feature request link.
- What to include: app URL/version, browser/OS, exact sheet text, expected/actual result, screenshot/video, export if safe.
- Triage priorities: data loss, wrong calculations, app load/storage/import/export, docs routing, settings/onboarding, polish.
- Privacy note: remove sensitive data before attaching examples.

### 3. Privacy And Portability Expansion

Update:

- `website/docs/guides/privacy-and-portability.md`

Add:

- Website signup is separate from app usage.
- Website analytics, if enabled, track website events only and not sheet content.
- App stores sheets locally unless user imports/exports.
- FX rate behavior and offline/cache explanation.
- Desktop beta unsigned warning policy once artifacts exist.

### 4. Sidebar And Homepage Links

Update:

- `website/sidebars.ts`
- Future homepage from `aidocs/WEB_LAUNCH_BRIEF.md`

Add links to:

- Known Limitations
- Support
- Privacy and Portability
- Changelog/Release notes

## User Journey To Verify

After homepage exists:

1. User lands on homepage.
2. User sees SmartPad product promise and real screenshot.
3. User opens docs.
4. User opens Getting Started or Start Here.
5. User runs or opens a provided example.
6. User opens SmartPad from docs/homepage.
7. User understands local-first storage and export guidance.
8. User can find support/bug report.
9. User can find known limitations.

This should be verified by Playwright once the homepage and docs pages exist.

## Documentation Quality Rules

Public docs should:

- Use exact feature names visible in the app.
- Include runnable examples for shipped behavior.
- Avoid proposed feature examples unless clearly labeled.
- Prefer positive examples plus guardrails.
- Link to implemented specs for deep details.
- Keep limitations honest and concise.
- Avoid internal implementation terms unless they help users make decisions.

## Verification

When docs/support changes are implemented:

```bash
npm run docs:docusaurus:publish-local
npm run docs:docusaurus:publish-prod
npm run docs:map
npm run docs:drift
npm run spec:test
npm run spec:trust
npm run verify:changed
```

Browser checks:

- Docs sidebar includes Support and Known Limitations.
- Links to bug report and feature request resolve.
- Privacy page mentions signup/analytics only if those features exist or are planned with clear status.
- Proposed specs are not on the main launch path unless marked as roadmap.
- Mobile docs navigation works at 390px width.
- Embedded examples do not create persistent sheets.

## Done Criteria

`T-2026-06-06-07` is done when:

- Known limitations page exists.
- Support path is visible from docs and launch homepage.
- Privacy/portability page covers local storage, FX, signup/analytics, and desktop beta status accurately.
- Sidebar and homepage link the right user-support pages.
- A scripted beginner journey from homepage to working SmartPad example passes.
- Docs build, docs drift/spec gates, and release-candidate docs checks pass.
