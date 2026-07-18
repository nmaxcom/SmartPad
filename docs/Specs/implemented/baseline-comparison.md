# Baseline Comparison

- Status: `implemented`
- Source spec: `docs/Specs/BaselineComparison.spec.md`
- Mapped group: `UI Panels And Settings`
- Verification tests:
  - `tests/unit/variableBaselineStore.test.ts`
  - `tests/unit/variablePanelBaseline.test.tsx`
  - `tests/e2e/variable-baseline-comparison.spec.ts`
  - `tests/unit/decisionPlaygroundTemplate.test.ts`
  - `tests/e2e/decision-playground-template.spec.ts`

This card is the trust declaration for SmartPad's shipped baseline-comparison workflow.

Implemented interaction contract:

- The Variables panel can capture, update, persist, and clear one numeric baseline per sheet.
- Direct literal assignments are labeled as inputs; expression-backed variables are labeled as derived.
- Scrubbing or editing the sheet updates a changed-variable count and per-variable baseline deltas live.
- Comparison uses semantic numeric values and flags semantic type changes.
- Baseline snapshots never alter the sheet or introduce hidden evaluation state.
