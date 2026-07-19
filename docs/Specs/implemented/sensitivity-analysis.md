# Sensitivity Analysis

- Status: implemented
- Source spec: `docs/Specs/SensitivityAnalysis.spec.md`
- Core implementation:
  - `src/analysis/sensitivityAnalysis.ts`
  - `src/state/sensitivityAnalysisStore.ts`
  - `src/components/ResultReferenceInteractionExtension.ts`
  - `src/components/Editor.css`
- Verification:
  - `tests/unit/sensitivityAnalysis.test.ts`
  - `tests/unit/sensitivityAnalysisStore.test.ts`
  - `tests/e2e/sensitivity-analysis.spec.ts`

Implemented interaction contract:

- A named numeric result exposes `See what matters most` from its existing result menu when SmartPad can find at least one eligible non-zero numeric root assumption.
- SmartPad recursively expands derived dependencies, changes each root assumption by ±10% one at a time in an isolated evaluation context, and ranks the maximum output impact.
- The sheet shows one persistent, live inline tornado with the current result, both recalculated output values, a common impact scale, an accessible text description, and a close action.
- The analysis never mutates sheet text, variables, baselines, scenarios, or undo history.
- The visible ±10% method is deterministic local sensitivity, not probability or Monte Carlo analysis.
