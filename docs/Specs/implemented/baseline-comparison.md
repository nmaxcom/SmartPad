# Baseline Comparison

- Status: `implemented`
- Source spec: `docs/Specs/BaselineComparison.spec.md`
- Mapped group: `Editor And Result Chips`
- Verification tests:
  - `tests/unit/variableBaselineStore.test.ts`
  - `tests/unit/resultBaselineInteraction.test.ts`
  - `tests/e2e/variable-baseline-comparison.spec.ts`
  - `tests/unit/decisionPlaygroundTemplate.test.ts`
  - `tests/e2e/decision-playground-template.spec.ts`

This card is the trust declaration for SmartPad's shipped baseline-comparison workflow.

Implemented interaction contract:

- Every result-chip actions menu can capture, update, persist, and clear one numeric baseline per sheet.
- Direct literal assignments show their captured value and delta beside the editable line.
- Expression-backed variables show propagated deltas beside their result chips.
- The Variables panel remains read-only; comparison navigation stays inside the sheet.
- Comparison uses semantic numeric values and flags semantic type changes.
- Baseline snapshots never alter the sheet or introduce hidden evaluation state.
