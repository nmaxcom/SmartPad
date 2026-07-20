# Inline Result Explorer

- Status: implemented
- Source spec: `docs/Specs/SensitivityAnalysis.spec.md`
- Core implementation:
  - `src/analysis/sensitivityAnalysis.ts`
  - `src/state/sensitivityAnalysisStore.ts`
  - `src/components/ResultReferenceInteractionExtension.ts`
  - `src/components/Editor.css`
  - `src/intent/naturalIntent.ts`
  - `src/interaction/authoritativeNumericEditing.ts`
- Verification:
  - `tests/unit/sensitivityAnalysis.test.ts`
  - `tests/unit/sensitivityAnalysisStore.test.ts`
  - `tests/unit/naturalIntent.test.ts`
  - `tests/unit/authoritativeNumericEditing.test.ts`
  - `tests/e2e/sensitivity-analysis.spec.ts`

Implemented interaction contract:

- A named numeric result exposes `Explore result` near the top of its existing result menu when SmartPad can find at least one eligible non-zero numeric root assumption.
- SmartPad recursively expands derived dependencies, changes each root assumption by ±10% one at a time in an isolated evaluation context, and ranks the maximum output impact.
- The sheet shows one persistent live explorer with the current result, source formula, strongest-driver and sampled break-even insights, scrubbable assumptions, mini response curves, both recalculated outputs, and a close action.
- Automatic analysis never mutates the model. Explicitly dragging a displayed assumption rewrites its visible source assignment and updates the full sheet live.
- `Ask in plain language…` deterministically compiles supported Spanish/English plot, target, conversion, and set requests to visible parser-validated syntax. The user can edit it and nothing changes before `Insert`.
- The visible ±10% method is deterministic local sensitivity, not probability or Monte Carlo analysis.
