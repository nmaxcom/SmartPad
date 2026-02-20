# Implemented Specs

These features are treated as shipped and trusted.

Source of truth for enforcement: `docs/spec-trust.json`.

| Feature | Canonical card | Source spec | Verification tests |
|---|---|---|---|
| Live Results | `docs/Specs/implemented/live-results.md` | `docs/Specs/LiveResult.spec.md` | `tests/e2e/live-result.spec.ts`, `tests/unit/liveResultPreview.test.ts` |
| Result Chips and References | `docs/Specs/implemented/result-chips-and-references.md` | `docs/Specs/ResultChipsAndValueGraph.spec.md` | `tests/e2e/result-reference.spec.ts`, `tests/e2e/results-decorator-regression.spec.ts` |
| Currency and FX | `docs/Specs/implemented/currency-and-fx.md` | `docs/Specs/Currency.spec.md` | `tests/unit/currency-expression-evaluator.test.ts`, `tests/unit/currencyFx.test.ts` |
| Lists | `docs/Specs/implemented/lists.md` | `docs/Specs/Lists.spec.md` | `tests/unit/list.test.ts`, `tests/unit/listSpecExamples.test.ts` |
| Ranges | `docs/Specs/implemented/ranges.md` | `docs/Specs/Ranges.spec.md` | `tests/unit/range.test.ts` |
| Locale Date and Time | `docs/Specs/implemented/locale-date-time.md` | `docs/Specs/Locale.spec.md` | `tests/unit/localeDate.test.ts` |
| Duration and Time Values | `docs/Specs/implemented/duration-and-time-values.md` | `docs/Specs/duration.spec.md` | `tests/unit/durationMath.test.ts`, `tests/unit/dateMathEvaluator.test.ts` |
| File Management | `docs/Specs/implemented/file-management.md` | `docs/Specs/FileManagement.spec.md` | `tests/e2e/save-load-buttons.spec.ts`, `tests/e2e/migration-verification.spec.ts` |
