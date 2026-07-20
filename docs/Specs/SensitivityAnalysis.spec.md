# Inline Result Explorer Specification

Status: implemented

## 1. Purpose

The inline result explorer turns a named numeric result into one coherent thinking surface: what it is now, where it comes from, which editable assumptions drive it, how those assumptions change it, and what the user may want to try next.

Its analysis is deterministic and local. It is not a probability forecast, and user-driven changes always rewrite visible sheet text.

## 2. Entry point

1. A named numeric result with at least one non-zero numeric root input exposes `Explore result` near the top of its existing `⋯` menu.
2. Activating the action pins one explorer to that result for the current sheet.
3. If another result is already pinned, the action reads `Explore this result instead`.
4. When the selected result is already visible, the disabled action reads `Exploring this result`.
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
4. Automatic probes replace the varied input only inside a temporary evaluation context. Sheet text, live variables, baselines, and scenarios are not mutated by analysis.
5. Percentages retain percentage semantics while currencies, units, durations, and plain numbers retain their compatible semantic behavior.
6. An input's impact is the larger absolute output change observed between its `−10%` and `+10%` evaluations.
7. Rows are ordered from largest impact to smallest, with variable name as the deterministic tie-breaker.
8. A failed variation is omitted from the ranking and reported in the widget's accessible metadata/title rather than producing a misleading zero.
9. The top-ranked input is sampled deterministically from `0.1×` through `2×` its current value. If adjacent samples cross zero, SmartPad interpolates a possible break-even input and labels it as sampled, not exact or guaranteed.

## 5. Inline explorer

1. The explorer renders directly below the selected result as `Explore · <result>`.
2. Its summary shows the current live result and the editable SmartPad source expression.
3. SmartPad writes a concise automatic strongest-driver statement and, when detected, a sampled break-even statement.
4. Each row contains the input name, its current value, a centered two-color impact range, a three-point mini response curve, and the two recalculated output values.
5. The current input value is a horizontal scrub control. Its label and `↔` affordance state that dragging changes the corresponding assignment in the sheet.
6. Dragging a row value rewrites that root assignment's visible semantic value. Currency, percentage, unit, duration, and number semantics are retained; dependent results, plots, and the explorer update live.
7. `Shift` makes the gesture finer, `Alt`/`Option` makes it coarser, and `Escape` restores the source value captured at gesture start.
8. The `−10%` input case uses teal; the `+10%` input case uses pink.
9. Every range uses the largest observed absolute delta as the shared visual scale.
10. The widget exposes group/list semantics and complete text alternatives for every row.
11. A discreet close button hides the explorer and returns the result menu to its normal action state.

## 6. Natural intent compiler

1. `Ask in plain language…` opens inside the explorer, never in the Variables panel or a detached global assistant.
2. The initial local compiler recognizes bounded intent families in Spanish and English: create a plot, find an input for a target, convert a named value, and set an existing input.
3. Interpretation produces a structured intent first. A deterministic compiler then emits canonical SmartPad syntax and validates it with SmartPad's parser.
4. The proposed syntax is visible and editable. No change occurs until the user reviews it and chooses `Insert`.
5. A `set` proposal updates the existing visible assignment. Other valid proposals insert a normal editable SmartPad line beside the explored source.
6. Ambiguous requests produce guidance rather than guessed syntax.
7. A future optional language model may populate the same structured intents, but it must not emit trusted syntax directly or mutate a sheet without local compilation, validation, and review.

## 7. Reactivity and persistence

1. The selected result, variation, and source identity persist locally per sheet.
2. Editing, row scrubbing, number scrubbing, or graph-point dragging recalculates the center, both variations, ranking, curves, insights, and labels.
3. Reloading the sheet restores the explorer at the same stable source line, with line-number fallback if an internal id changed.
4. Moving the explorer replaces the previous selection; this first version keeps one visible explorer per sheet.

## 8. Guardrails

1. The workflow is available only for named numeric outputs so persistence and source identity remain understandable.
2. The fixed ±10% range is always visible; SmartPad must not present it as a universal or probabilistic conclusion.
3. Input distributions, correlations, Monte Carlo simulation, adjustable analysis ranges, and multi-output comparison remain separate future capabilities.
4. Automatic sensitivity/break-even evaluation must not add undo history, edit formulas, overwrite assumptions, set a baseline, or save a scenario. Only an explicit user manipulation or reviewed intent proposal may change source text.
5. Natural-language interpretation is not an autonomous agent and makes no network/model request in this release.
6. Existing result actions remain pointer- and keyboard-operable through the same menu.

## 9. Verification

- `tests/unit/sensitivityAnalysis.test.ts`
- `tests/unit/naturalIntent.test.ts`
- `tests/unit/authoritativeNumericEditing.test.ts`
- `tests/unit/sensitivityAnalysisStore.test.ts`
- `tests/e2e/sensitivity-analysis.spec.ts`
- `tests/e2e/result-chip-keyboard-accessibility.spec.ts`
- `tests/e2e/result-reference-drag-only.spec.ts`
