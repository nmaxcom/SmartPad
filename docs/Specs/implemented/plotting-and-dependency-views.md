# Plotting and Dependency Views

- Status: `implemented`
- Source spec: `docs/Specs/Plotting.spec.md`
- Mapped group: `Plotting And Visualization`
- Verification tests:
  - `tests/unit/plotViewEvaluator.test.ts`
  - `tests/unit/plottingDependencyExpansion.test.ts`
  - `tests/e2e/plot-view-interactions.spec.ts`
  - `tests/e2e/result-reference-drag-only.spec.ts`
  - `tests/unit/visualInsightsTemplate.test.ts`
  - `tests/e2e/visual-insights-template.spec.ts`
  - `tests/unit/capabilitySprintTemplate.test.ts`

This card is the trust declaration for shipped plotting/dependency view behavior.

Implemented interaction contract:

- A connected plot's live point can be dragged horizontally to update its editable X assignment in the sheet; semantic number/currency/unit/percentage behavior is preserved and a floating value chip follows the gesture.
- A subtle chart overlay states `Drag ● ↔ to change <x>` even when plot details are hidden; the point exposes slider metadata, and `Escape` restores the gesture's starting value.
- Derived Y series recursively resolve their prior dependency formulas during X sampling, so intermediate named results cannot flatten a live model curve.
- User pan/zoom view state persists across expression, function, and source-value edits for the same plot identity.
- The plot view resets only on page refresh or an explicit chart double-click reset.
- Multi-series legends are positioned on the right side of the chart area so they do not cover the left y-axis gutter.
