# Sensitivity Analysis Specification

Status: implemented

## 1. Purpose

Sensitivity analysis answers a practical question about a named numeric result: which editable assumptions move it the most near the current model?

The first shipped workflow is deterministic and local. It is not a probability forecast.

## 2. Entry point

1. A named numeric result with at least one non-zero numeric root input exposes `See what matters most` in its existing `⋯` menu.
2. Activating the action pins one sensitivity analysis to that result for the current sheet.
3. If another result is already pinned, the action reads `Move sensitivity here`.
4. When the selected result is already visible, the disabled action reads `Sensitivity shown here`.
5. No sensitivity controls are added to the Variables panel.

## 3. Input discovery

1. SmartPad begins with the variables referenced by the selected result.
2. Derived variables are expanded recursively until numeric leaf assignments are reached.
3. A leaf is eligible when its current semantic value is a finite non-zero number, percentage, currency, unit, currency-unit, or duration.
4. Repeated leaves are analyzed once, even when several dependency paths use them.
5. The selected output itself is never treated as its own input.
6. Dates, clock times, lists, symbolic values, errors, and zero-valued inputs are excluded from this first workflow.

## 4. Calculation contract

1. The current live result is the center value.
2. Each eligible input is varied by `−10%` and `+10%`, one input at a time.
3. For each variation, SmartPad reevaluates the sheet from the beginning through the selected result line.
4. The varied input assignment is replaced only inside the temporary evaluation context. Sheet text, live variables, baselines, and scenarios are never mutated.
5. Percentages retain percentage semantics while currencies, units, durations, and plain numbers retain their compatible semantic behavior.
6. An input's impact is the larger absolute output change observed between its `−10%` and `+10%` evaluations.
7. Rows are ordered from largest impact to smallest, with variable name as the deterministic tie-breaker.
8. A failed variation is omitted from the ranking and reported in the widget's accessible metadata/title rather than producing a misleading zero.

## 5. Inline tornado

1. The analysis renders directly below the selected result as `What matters most · <result>`.
2. The header states `±10% · one input at a time` and shows the current live result.
3. Each row contains the input name, a centered two-color tornado bar, and the two recalculated output values.
4. The `−10%` input case uses teal; the `+10%` input case uses pink.
5. Every bar uses the largest observed absolute delta as the shared visual scale.
6. The footer names the most influential input in the tested range.
7. The widget exposes group/list semantics and complete text alternatives for every row.
8. A discreet close button hides the analysis and returns the result menu to its normal action state.

## 6. Reactivity and persistence

1. The selected result, variation, and source identity persist locally per sheet.
2. Editing or scrubbing the model recalculates the center, both variations, ranking, bars, and labels.
3. Reloading the sheet restores the analysis at the same stable source line, with line-number fallback if an internal id changed.
4. Moving the analysis replaces the previous selection; this first version keeps one visible sensitivity analysis per sheet.

## 7. Guardrails

1. The workflow is available only for named numeric outputs so persistence and source identity remain understandable.
2. The fixed ±10% range is always visible; SmartPad must not present it as a universal or probabilistic conclusion.
3. Input distributions, correlations, Monte Carlo simulation, adjustable ranges, and multi-output comparison remain separate future capabilities.
4. Sensitivity evaluation must not add undo history, edit formulas, overwrite assumptions, set a baseline, or save a scenario.
5. Existing result actions remain pointer- and keyboard-operable through the same menu.

## 8. Verification

- `tests/unit/sensitivityAnalysis.test.ts`
- `tests/unit/sensitivityAnalysisStore.test.ts`
- `tests/e2e/sensitivity-analysis.spec.ts`
- `tests/e2e/result-chip-keyboard-accessibility.spec.ts`
- `tests/e2e/result-reference-drag-only.spec.ts`
