# Baseline Comparison

Status: implemented

This document defines SmartPad's first persistent comparison workflow: capture the current numeric model from a result, manipulate the sheet, and read live changes where the editable text and results already live.

## 1. Purpose

Baseline comparison supports the thinking loop:

`assumptions -> baseline -> explore -> compare -> decide`

It is intentionally smaller than named scenario sheets. The sheet remains the only source of truth; the baseline is a local snapshot used for comparison, never a second editable model.

## 2. User flow

1. Open a sheet with numeric variables.
2. Open the `⋯` actions menu on any result chip and choose `Set baseline`.
3. Edit or scrub numbers in the sheet.
4. Read a direct input's captured value beside its editable line and propagated deltas beside their result chips.
5. Open any result menu and choose `Update baseline` to accept the current model, or `Clear baseline` to stop comparing.

The Decision Playground teaches this flow before its first scrubbing gesture.

## 3. Capture contract

- A baseline belongs to one sheet id and persists in browser-local storage across reloads.
- Capturing stores each finite numeric variable's semantic numeric value, displayed value, semantic type, and role.
- Non-numeric values are not captured.
- `Update` replaces the complete snapshot for the active sheet.
- `Clear` removes only the active sheet's snapshot.
- A missing, inaccessible, or corrupt stored snapshot must fail quietly and leave comparison off.

## 4. Input and derived roles

A variable is labeled `input` when its assignment value is a standalone numeric literal, including a literal percentage, currency, or unit value. Examples:

```smartpad
attendees = 140
ticket price = 32 EUR
discount = 12%
distance = 42 km
```

A numeric variable is labeled `derived` when its assignment value is an expression or another variable. Examples:

```smartpad
revenue = attendees * ticket price
margin = profit / revenue
```

The roles explain model structure; they do not alter evaluation or prevent editing. They are used to choose the inline presentation: direct inputs retain their captured value beside the source line, while derived variables show a compact delta beside the result.

## 5. Comparison contract

- Variables that still exist in the current sheet are matched to baseline entries by variable name.
- Values are compared using their semantic numeric values, not their formatted strings.
- A type change is always reported as changed.
- A numeric change is ignored only inside a small floating-point tolerance.
- For a non-zero baseline, the displayed delta is `(current - baseline) / abs(baseline) * 100`.
- For a zero baseline, a changed value is labeled `changed` because a percentage delta would be misleading.
- Unchanged variables remain visually quiet.
- Variables added after capture and baseline variables removed or renamed after capture are not paired in this first slice.
- The captured display string remains a snapshot even if formatting settings later change.

## 6. Presentation contract

- Without a baseline, every result-chip `⋯` menu offers `Set baseline` immediately after `Copy value`.
- With a baseline, every result menu offers `Update baseline` and `Clear baseline` in the same position.
- A tiny accent dot on result-menu controls indicates that comparison is active without competing with the answer.
- A changed direct input shows `Base <captured value> · <delta>` beside the editable assignment.
- A changed derived variable shows its compact delta beside the result chip.
- Percentage labels and captured values make the comparison readable without relying on color alone.
- The Variables panel remains read-only and contains no baseline navigation or actions.
- The feature must not add syntax or replace text editing with form controls.

## 7. Acceptance examples

Given:

```smartpad
ticket price = 32 EUR
attendees = 140
revenue = attendees * ticket price
```

Immediately after capture, no change markers are shown.

After changing `ticket price` to `40 EUR`:

- its source line shows `Base 32 EUR · +25%`
- `revenue` also shows a positive delta beside its result chip
- the comparison remains visible without opening a side panel

After `Update baseline`, all markers disappear because the current model is now the reference. Reloading retains the comparison; `Clear baseline` removes it.

## 8. Verification

- `tests/unit/variableBaselineStore.test.ts`
- `tests/unit/resultBaselineInteraction.test.ts`
- `tests/e2e/variable-baseline-comparison.spec.ts`
- `tests/unit/decisionPlaygroundTemplate.test.ts`
- `tests/e2e/decision-playground-template.spec.ts`
