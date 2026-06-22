# Locale Date and Time

- Status: `implemented`
- Source spec: `docs/Specs/Locale.spec.md`
- Mapped group: `Date Time And Duration`
- Verification tests:
  - `tests/unit/localeDate.test.ts`
  - `tests/unit/dateRange.test.ts`
  - `tests/unit/dateMathEvaluator.test.ts`
  - `tests/unit/liveResultPreview.test.ts`
  - `tests/e2e/live-result.spec.ts`
  - `tests/e2e/grouped-input-and-date-settings.spec.ts`

This card is the trust declaration for shipped locale date/time behavior.

Implemented interaction contract:

- `today`, `tomorrow`, `yesterday`, and `now` are built-in date/time shortcuts.
- Live result previews treat those shortcuts as resolvable identifiers, so lines such as `now + 20 minutes` and `today + 10 days` render date/time previews without unresolved-identifier warnings.
