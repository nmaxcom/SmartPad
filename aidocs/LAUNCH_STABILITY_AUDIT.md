# SmartPad Launch Stability Audit

This audit starts `T-2026-06-06-02`. It converts the `audit` rows in `aidocs/LAUNCH_SCOPE_MATRIX.md` into release-candidate checks.

The audit is not complete until the checks have been run on a launch candidate and every p0 issue is fixed, explicitly deferred, or documented as a known limitation.

## Gate Policy

Launch-candidate work must pass:

1. Targeted checks for touched behavior.
2. Core release-candidate smoke checks listed below.
3. `npm run docs:map`
4. `npm run docs:drift`
5. `npm run spec:test`
6. `npm run spec:trust`
7. `npm run verify:changed`
8. `npm run build`
9. User confirmation for visible launch scope and product polish.

For docs-only planning changes, `git diff --check` is enough. For code, docs, tests, release, website, packaging, or generated public assets, use the launch-candidate gates above.

## P0 Release-Candidate Checks

| Check | Scope | Existing coverage | Command | Blocks launch if |
| --- | --- | --- | --- | --- |
| First load and quick tour | First-time user can open app and understand the starter document. | `tests/unit/quickTourTemplate.test.ts`, `tests/e2e/quick-tour-template.spec.ts` | `npm run test:unit -- tests/unit/quickTourTemplate.test.ts --runInBand`; `npx playwright test tests/e2e/quick-tour-template.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Starter content has parser errors, unclear first action, broken template, or poor first viewport. |
| Basic editing | Typing, selection, cursor position, keyboard behavior, paste, and multi-edit safety. | `tests/e2e/simple-typing-test.spec.ts`, `tests/e2e/cursor-positioning.spec.ts`, `tests/e2e/keyboard-interactions.spec.ts`, `tests/e2e/paste-multi-edit-regressions.spec.ts` | `npx playwright test tests/e2e/simple-typing-test.spec.ts tests/e2e/cursor-positioning.spec.ts tests/e2e/keyboard-interactions.spec.ts tests/e2e/paste-multi-edit-regressions.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Text entry, navigation, paste, or undo-like editing behavior corrupts user content. |
| Live and explicit results | Core calculation loop for live previews and `=>` results. | `tests/e2e/live-result.spec.ts`, `tests/unit/liveResultPreview.test.ts`, `tests/unit/expressionParser.test.ts` | `npm run test:unit -- tests/unit/liveResultPreview.test.ts tests/unit/expressionParser.test.ts --runInBand`; `npx playwright test tests/e2e/live-result.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Results are stale, wrong, intrusive, or unexplained on common input. |
| Core expression engine | Variables, functions, arithmetic, symbolic solve, percentages, and regression bug-hunt cases. | `tests/unit/functions.test.ts`, `tests/unit/solve.test.ts`, `tests/unit/percentages.test.ts`, `tests/unit/bugHuntRegression.test.ts`, `scripts/run-temporary-edge-tests.js` | `npm run test:unit -- tests/unit/functions.test.ts tests/unit/solve.test.ts tests/unit/percentages.test.ts tests/unit/bugHuntRegression.test.ts --runInBand`; `npm run test:temporary-edge` | Common launch examples fail or an old p0 parser bug reappears. |
| Units, duration, dates, and currency | Unit conversion, compact units, duration/date math, locale, and FX behavior. | `tests/unit/unitsnetIntegration.test.ts`, `tests/unit/unitAliasExamples.test.ts`, `tests/unit/dateMathEvaluator.test.ts`, `tests/unit/localeDate.test.ts`, `tests/unit/currencyFx.test.ts`, `tests/e2e/units-basic.spec.ts`, `tests/e2e/grouped-input-and-date-settings.spec.ts` | `npm run test:unit -- tests/unit/unitsnetIntegration.test.ts tests/unit/unitAliasExamples.test.ts tests/unit/dateMathEvaluator.test.ts tests/unit/localeDate.test.ts tests/unit/currencyFx.test.ts --runInBand`; `npx playwright test tests/e2e/units-basic.spec.ts tests/e2e/grouped-input-and-date-settings.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Launch examples produce wrong values, locale confusion, or unexplained offline/external dependency failures. |
| Lists and ranges | Lists, ranges, grouped input guardrails, and range examples. | `tests/unit/listSpecExamples.test.ts`, `tests/unit/list.test.ts`, `tests/unit/range.test.ts`, `tests/unit/thousandGroupingFormatting.test.ts` | `npm run test:unit -- tests/unit/listSpecExamples.test.ts tests/unit/list.test.ts tests/unit/range.test.ts tests/unit/thousandGroupingFormatting.test.ts --runInBand` | Public list/range examples fail or unsupported grouped numbers become ambiguous. |
| Result chips and references | Copy, insert/reference, drag behavior, lane chips, hover controls, and no accidental mutation. | `tests/e2e/result-reference.spec.ts`, `tests/e2e/result-reference-drag-only.spec.ts`, `tests/e2e/results-decorator-regression.spec.ts`, `tests/e2e/live-result.spec.ts` | `npx playwright test tests/e2e/result-reference.spec.ts tests/e2e/result-reference-drag-only.spec.ts tests/e2e/results-decorator-regression.spec.ts tests/e2e/live-result.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | A user cannot intentionally reuse results, chips flicker/wrap badly, or chips mutate text unexpectedly. |
| Plotting and dependency views | `@view` rendering, pan/zoom/scrub interactions, and screenshot-ready behavior. | `tests/unit/plotViewEvaluator.test.ts`, `tests/e2e/plot-view-interactions.spec.ts`, `tests/e2e/visual-insights-template.spec.ts` | `npm run test:unit -- tests/unit/plotViewEvaluator.test.ts tests/unit/visualInsightsTemplate.test.ts --runInBand`; `npx playwright test tests/e2e/plot-view-interactions.spec.ts tests/e2e/visual-insights-template.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Plot examples are blank, visually broken, or interaction regressions undermine demo/screenshots. |
| Sheets and persistence | Sheet create/rename/delete/reorder, saved content, migration, import/export. | `tests/e2e/save-load-buttons.spec.ts`, `tests/e2e/migration-verification.spec.ts`, `src/storage/sheetsDb.ts` | `npx playwright test tests/e2e/save-load-buttons.spec.ts tests/e2e/migration-verification.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | User data is lost, duplicated, not exportable/importable, or migration behavior is unclear. |
| Settings | Settings persistence, reset, date locale, grouped input, panel settings, and launch-ready IA. | `tests/unit/settingsStore.test.ts`, `tests/e2e/settings-integration.spec.ts`, `tests/e2e/grouped-input-and-date-settings.spec.ts` | `npm run test:unit -- tests/unit/settingsStore.test.ts --runInBand`; `npx playwright test tests/e2e/settings-integration.spec.ts tests/e2e/grouped-input-and-date-settings.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Settings feel internal, are inaccessible, fail persistence/reset, or users cannot understand date/output choices. |
| Autocomplete | Current-sheet variables, functions, `@view` params, conversion units, and non-disruptive typing. | `tests/unit/autocompleteSuggestions.test.ts`, `tests/e2e/autocomplete.spec.ts`, backlog `T-2026-06-04-01` | `npm run test:unit -- tests/unit/autocompleteSuggestions.test.ts --runInBand`; `npx playwright test tests/e2e/autocomplete.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Autocomplete interrupts normal typing, suggests wrong conversions, or remains unconfirmed by user review. |
| Docs embeds and public docs IA | Docs examples render, embedded previews do not mutate user sheets, docs routes work. | `tests/e2e/docs-ia.spec.ts`, `website/docs/`, `public/docs/` | `npm run docs:docusaurus:publish-local`; `npx playwright test tests/e2e/docs-ia.spec.ts --project=chromium --config=playwright.config.ts --workers=1` | Docs examples fail, docs routing breaks, or preview embeds create persistent sheets. |
| Public app deployment path | Production build, GitHub Pages path, app/docs links, generated docs assets. | `.github/workflows/deploy-pages.yml`, `package.json`, `src/components/Layout/docsUrl.ts`, `tests/unit/docsUrl.test.ts` | `npm run docs:docusaurus:publish-prod`; `npm run build`; `npm run test:unit -- tests/unit/docsUrl.test.ts --runInBand` | Production paths or docs links break under `/SmartPad/`. |

## Manual Visual And Accessibility Pass

Run after product polish and before capturing launch assets.

Checklist:

- Desktop width around 1440px.
- Narrow desktop/tablet width around 900px.
- Mobile/narrow width around 390px.
- First viewport shows the product clearly, with no overlapping text or controls.
- Settings can be opened, scanned, changed, reset, and closed by keyboard.
- Result chips do not alter line height or hide important text while hovered.
- Plot views are nonblank, framed correctly, and usable with pointer input.
- Docs embeds do not show double scrollbars.
- Offline FX banner is understandable and not alarming.
- Contrast and focus states are visible.

Evidence to capture:

- Screenshots for first load, settings, result chips, plotting, docs embed, and mobile/narrow viewport.
- Notes on any issue converted to a backlog item.

## Known Launch Risks

| Risk | Severity | Current handling |
| --- | --- | --- |
| Settings surface feels too internal for public users. | p0 | Covered by `T-2026-06-06-03`; blocks polished launch screenshots. |
| Autocomplete is implemented but still proposed and pending user confirmation. | p1 | Keep out of headline copy until user confirms and spec status is reconciled. |
| FX rates depend on external service/cache behavior. | p1 | Document in privacy/portability docs and website copy. |
| Desktop packaging is not implemented. | p0 for desktop launch, p1 for web-first launch | Treat desktop as beta/spike until package pipeline exists. |
| Marketing screenshots cannot be stable until settings/onboarding/chips are polished. | p0 | Capture assets only after product polish and stability audit. |
| Proposed docs may be mistaken for shipped behavior. | p1 | Audit public docs IA and avoid proposed pages in launch funnel unless clearly labeled. |

## Recommended Execution Order

1. Finish user review for `T-2026-06-04-01` because autocomplete/chip polish affects first impressions.
2. Run settings/onboarding redesign and tests under `T-2026-06-06-03`.
3. Run the P0 release-candidate checks above and create bug tasks for failures.
4. Patch public docs/privacy/known limitations from audit results.
5. Capture screenshots/video only after the UI pass is clean.
6. Build marketing homepage and signup once assets and copy are stable.
7. Start desktop packaging spike and release checklist in parallel after web launch path is clear.
