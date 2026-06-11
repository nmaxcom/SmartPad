# SmartPad Launch Scope Matrix

This matrix turns `aidocs/LAUNCH_PLAN.md` into a verifiable launch checklist.

Release-candidate stability checks for the `audit` rows live in `aidocs/LAUNCH_STABILITY_AUDIT.md`. Desktop packaging direction lives in `aidocs/DESKTOP_PACKAGING_DECISION.md`. Release operations live in `RELEASE_CHECKLIST.md` and `CHANGELOG.md`. Web launch direction lives in `aidocs/WEB_LAUNCH_BRIEF.md`. Docs/support readiness lives in `aidocs/DOCS_SUPPORT_LAUNCH_AUDIT.md`. Settings/onboarding direction lives in `aidocs/SETTINGS_ONBOARDING_LAUNCH_BRIEF.md`.

Status meanings:

- `ready`: existing evidence is strong enough for launch scope, subject to final release gates.
- `audit`: core exists, but launch should review polish, coverage, docs freshness, or first-user clarity.
- `gap`: required launch artifact or implementation is missing.
- `defer`: intentionally post-launch or hidden from public launch messaging.

## Must-Ship Product Scope

| Area | Launch decision | Current status | Evidence | Launch action |
| --- | --- | --- | --- | --- |
| Text editor basics | Must ship | audit | `src/components/Editor.tsx`, `tests/e2e/simple-typing-test.spec.ts`, `tests/e2e/cursor-positioning.spec.ts`, `tests/e2e/keyboard-interactions.spec.ts`, `tests/e2e/paste-multi-edit-regressions.spec.ts` | Run a first-user editing audit covering typing, selection, paste, undo/redo, focus, narrow widths, and keyboard-only use. |
| Live results | Must ship | ready | `docs/Specs/LiveResult.spec.md`, `docs/Specs/implemented/live-results.md`, `tests/e2e/live-result.spec.ts`, `tests/unit/liveResultPreview.test.ts` | Keep in launch message; rerun targeted live-result tests during release candidate. |
| Explicit trigger results | Must ship | ready | `docs/Specs/ExplicitTrigger.spec.md`, `docs/Specs/implemented/explicit-trigger.md`, `tests/unit/expressionParser.test.ts`, `tests/unit/templateTriggerNormalization.test.ts` | Keep as documented syntax; include in beginner docs and homepage examples. |
| Variables and formulas | Must ship | ready | `docs/Specs/Functions.spec.md`, `docs/Specs/implemented/functions-and-user-defined-formulas.md`, `tests/unit/functions.test.ts`, `tests/unit/astParser.test.ts`, `tests/features/variable_assignments.feature` | Use as one of the central homepage examples. |
| Percentages | Must ship | audit | `src/eval/percentageEvaluatorV2.ts`, `src/lowering/percentageLowerer.ts`, `tests/unit/percentages.test.ts`, `tests/syntax-reference/percentages.spec.ts` | Confirm public docs expose common percentage patterns and at least one edge-case guardrail. |
| Units and conversions | Must ship | audit | `src/units/`, `docs/Specs/duration.spec.md`, `docs/Specs/implemented/duration-and-time-values.md`, `docs/Specs/proposed/unit-aliases-and-ratio.md`, `tests/unit/unitsnetIntegration.test.ts`, `tests/e2e/units-basic.spec.ts` | Keep core units in launch; avoid promising proposed unit aliases/decision forks as shipped behavior. |
| Currency and FX | Must ship with limitations | audit | `docs/Specs/Currency.spec.md`, `docs/Specs/implemented/currency-and-fx.md`, `src/services/fxRates.ts`, `tests/unit/currencyFx.test.ts`, `tests/unit/currencyValue.test.ts` | Document offline/cache behavior and external FX dependency in public docs and privacy copy. |
| Dates, times, and durations | Must ship | ready | `docs/Specs/Locale.spec.md`, `docs/Specs/implemented/locale-date-time.md`, `docs/Specs/duration.spec.md`, `tests/unit/localeDate.test.ts`, `tests/unit/dateMathEvaluator.test.ts`, `tests/e2e/grouped-input-and-date-settings.spec.ts` | Keep examples locale-safe; mention locale setting in onboarding/docs. |
| Lists and ranges | Must ship | ready | `docs/Specs/Lists.spec.md`, `docs/Specs/Ranges.spec.md`, `docs/Specs/implemented/lists.md`, `docs/Specs/implemented/ranges.md`, `tests/unit/listSpecExamples.test.ts`, `tests/unit/range.test.ts` | Include practical examples; avoid implying table support. |
| Solve and symbolic math | Should ship | audit | `docs/Specs/Solve.spec.md`, `docs/Specs/implemented/solve-and-symbolic-math.md`, `tests/unit/solve.test.ts`, `tests/unit/capabilitySprintTemplate.test.ts` | Keep as advanced feature; do not lead launch messaging with symbolic math until UX copy is reviewed. |
| Plotting and dependency views | Should ship | audit | `docs/Specs/Plotting.spec.md`, `docs/Specs/implemented/plotting-and-dependency-views.md`, `tests/unit/plotViewEvaluator.test.ts`, `tests/e2e/plot-view-interactions.spec.ts`, `tests/e2e/visual-insights-template.spec.ts` | Use screenshots/video if release-candidate visual checks pass; otherwise frame as beta/advanced. |
| Result chips and references | Must ship | audit | `docs/Specs/ResultChipsAndValueGraph.spec.md`, `docs/Specs/implemented/result-chips-and-references.md`, `tests/e2e/result-reference.spec.ts`, `tests/e2e/result-reference-drag-only.spec.ts`, `tests/e2e/live-result.spec.ts` | Finish `T-2026-06-04-01` user review and known chip parity/caret tasks before treating as launch-polished. |
| Sheets and local persistence | Must ship | audit | `docs/Specs/FileManagement.spec.md`, `docs/Specs/implemented/file-management.md`, `src/storage/sheetsDb.ts`, `src/components/SheetSync.tsx`, `tests/e2e/save-load-buttons.spec.ts`, `tests/e2e/migration-verification.spec.ts` | Run release-candidate persistence/import/export smoke across fresh profile and upgraded profile. |
| Import/export portability | Must ship | audit | `docs/Specs/FileManagement.spec.md`, `docs/Specs/implemented/file-management.md`, `tests/e2e/save-load-buttons.spec.ts`, `website/docs/guides/files-and-privacy.md` | Verify copy says user owns files and explains backup limitations. |
| Settings | Must ship | audit | `ed5511db`, `aidocs/SETTINGS_ONBOARDING_LAUNCH_BRIEF.md`, `src/components/ui/SettingsSections.tsx`, `src/components/ui/SettingsModal.tsx`, `src/state/settingsStore.ts`, `tests/unit/settingsStore.test.ts`, `tests/e2e/settings-integration.spec.ts` | Professional Settings layout is approved; keep persistence/reset/date locale/reuse coverage in release-candidate checks and capture final screenshots after first-run framing is stable. |
| First-run onboarding | Must ship | gap | `src/templates/quickTourTemplate.ts`, `tests/unit/quickTourTemplate.test.ts`, `tests/e2e/quick-tour-template.spec.ts` | Pair quick tour with product-level onboarding/empty-state copy so users know what to do first, then review desktop/mobile first-run screenshots before launch assets are captured. |
| Autocomplete | Should ship if confirmed | audit | `docs/Specs/proposed/autocomplete.md`, `tests/unit/autocompleteSuggestions.test.ts`, `tests/e2e/autocomplete.spec.ts`, backlog `T-2026-06-04-01` | Keep as beta/proposed until user confirms current behavior and spec status is reconciled. |

## Public Project Scope

| Area | Launch decision | Current status | Evidence | Launch action |
| --- | --- | --- | --- | --- |
| Public web app | Must ship | audit | `.github/workflows/deploy-pages.yml`, `package.json`, `vite.config.ts` | Run deploy-path smoke and confirm final public URL, routing, docs link, and cache behavior. |
| Public documentation | Must ship | ready | `aidocs/DOCS_SUPPORT_LAUNCH_AUDIT.md`, `website/docs/`, `public/docs/`, `tests/e2e/docs-ia.spec.ts`, `package.json` docs scripts | Public docs IA/copy are user-approved; keep docs generated, link from future homepage, and verify homepage-to-docs-to-app journey after homepage exists. |
| Promotional product website | Must ship last | gap | `aidocs/WEB_LAUNCH_BRIEF.md`; `website/` exists as docs site only; no standalone promotional product site exists | Build a separate, modern product website from scratch as the final launch step, with real app videos, interactive examples, app/docs/download CTAs, privacy copy, and signup. |
| Update signup | Must ship for audience growth | gap | `aidocs/WEB_LAUNCH_BRIEF.md`; no provider/config found | Decide provider and hosting constraints; prefer simple static-compatible signup. |
| Screenshots/video assets | Should ship | gap | `aidocs/WEB_LAUNCH_BRIEF.md`; `public/smartpad.png`, `smartpad.png`; no launch asset inventory | Capture reproducible screenshots and short demo clips from verified launch demo sheets after settings/onboarding polish. |
| SEO/Open Graph | Should ship | gap | `aidocs/WEB_LAUNCH_BRIEF.md`; Docusaurus site exists; no launch OG asset inventory found | Add title/description/OG image for homepage and docs. |
| Issue intake | Must ship | ready | `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.md` | Review templates for public beta wording and expected repro details. |
| Changelog/versioning | Must ship | audit | `RELEASE_CHECKLIST.md`, `CHANGELOG.md` | Dry-run the checklist on a release candidate and keep changelog entries current before tagging. |
| Privacy/security notes | Must ship | ready | `website/docs/guides/files-and-privacy.md`, `public/docs/guides/files-and-privacy/index.html` | Keep in sync when signup/analytics provider or desktop artifact status changes. |
| CI/reliability gates | Must ship | ready | `.github/workflows/ci.yml`, `scripts/verify-changed.js`, `aidocs/AI_RELIABILITY_SYSTEM.md` | Keep as launch release gate; add release-candidate checklist that names exact commands. |
| Desktop packaging | Should ship as beta | gap | `aidocs/DESKTOP_PACKAGING_DECISION.md`; no Electron/Tauri package files found | Start with a minimal Electron shell after settings/onboarding polish is underway, then package an unsigned macOS beta and document cross-platform CI/release steps. |
| Auto-update | Defer unless cheap | defer | No desktop release pipeline yet | Do not block first public web launch; document desktop beta update process manually. |
| Signing/notarization | Required for polished desktop, optional for beta | gap | No signing config found | Decide beta warning tolerance; document signing plan before stable desktop release. |
| Support path | Must ship | audit | `website/docs/guides/support.md`, `public/docs/guides/support/index.html`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.md` | Docs support path is live; link it from the future launch homepage and review issue templates for public beta wording. |

## Explicit Defer Or Hide List

| Item | Decision | Reason | Required action |
| --- | --- | --- | --- |
| Accounts/cloud sync/collaboration | defer | Not part of local-first launch promise and requires backend/support model. | Do not mention as shipped; optional roadmap only. |
| Billing/teams | defer | Premature before public usage validation. | Keep out of launch website. |
| Plugin architecture | defer | No current implementation/signing/security model. | Keep as internal future idea. |
| AI-assisted formulas | defer | Requires privacy, hallucination/error, and product-positioning decisions. | Do not imply AI features. |
| Tables/structured collections | defer | Proposed only; no launch-grade implementation. | Avoid table screenshots/copy. |
| Auto-suggested plots | defer | Proposed; could create expectation mismatch. | Use manual `@view` plotting examples only. |
| Goal-seek interactions | defer/advanced | Proposed interaction surface; solve exists but UX needs clarity. | Mention solve carefully, not as headline. |
| Date keywords/timezones/business days | defer | Proposed only. | Avoid examples requiring them. |
| Unit decision forks | defer | Proposed only. | Keep public unit examples within implemented behavior. |
| Internal tracing/debug tools | hide | Useful for development but weak public signal. | Remove from public UI or frame clearly as developer/debug only before launch. |

## Launch Blocker Summary

P0 blockers:

1. First-run onboarding needs product-level framing before launch screenshots.
2. Standalone promotional product website, signup, and launch assets do not exist yet and intentionally come last.
3. Desktop packaging path is undecided and unimplemented.
4. Release checklist/changelog/versioning exist but need a release-candidate dry run.
5. Launch scope still needs user confirmation.

P1 blockers:

1. Public docs/support/privacy are approved but still need visible promotional-site links after the homepage exists.
2. Signup/analytics copy must stay aligned with the final provider decision.
3. Public support path has GitHub intake but still needs homepage/footer links in the promotional site.
4. Autocomplete needs user confirmation and spec-status reconciliation before being messaged as shipped.

## Recommended Next Work

1. Confirm launch scope with the user.
2. Add lightweight first-run onboarding/framing before marketing screenshots.
3. Start the launch stability audit from the remaining `audit` rows.
4. Build the standalone promotional product website last, after product screenshots/video are stable.
5. Run desktop packaging spike after settings/onboarding polish is underway, unless desktop beta becomes the launch-critical channel.
