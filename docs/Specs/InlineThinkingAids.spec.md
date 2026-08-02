# SmartPad Inline Thinking Aids Spec

Status: implemented

Implemented in: `1.0.0-rc.16`

This spec defines two transient editor aids: selection statistics and caret substitution. Both keep the visible sheet as the only navigation surface.

## 1. Selection statistics

When the focused editor has a non-empty text selection containing at least two compatible scalar values, a compact toolbar appears beside the selection. It offers:

- sum (`Σ`)
- mean (`μ`)
- minimum
- maximum

Values are grouped by compatible semantic identity: plain numbers, percentages, currency symbol/code, physical dimension, currency-unit rate, or duration. Up to three groups are shown, ordered by count. Result/reference decorations are excluded from extraction.

Choosing an action inserts a normal visible SmartPad line after the selected paragraph, for example:

```smartpad
sum(10 EUR, 20 EUR, 5 EUR) =>
```

The inserted line is editable, participates in undo/history, and is the source of its live result. The toolbar hides when the editor loses focus, the selection collapses, or no valid group remains. Selected uncertain `±` constructors are skipped in this version because aggregate call arguments cannot yet contain nested uncertainty literals.

## 2. Caret substitution lens

With an empty caret on a calculated expression or derived assignment, SmartPad shows one muted line beneath that formula with current numeric variable values substituted and the current result.

```smartpad
revenue = demand * price =>
# values  (100 ± 10) * 2 = 200 [180 – 220]
```

The lens:

1. replaces longest variable names first and respects identifier and quoted-text boundaries;
2. adds parentheses around negative and uncertain replacements when needed for clarity;
3. uses the configured numeric formatting;
4. does not modify the document, selection, variables, history, or clipboard;
5. appears only for the current formula and disappears when the caret moves elsewhere or becomes a range selection;
6. is capped at 10 replacements, a 180-character source expression, and a 260-character substituted display.

Lists, matrices, tables, text, symbolic values, and non-numeric variables are not substituted. The lens explains current evaluation; it is not a step-by-step algebra proof.

## 3. UX contract

Neither aid lives in the Variables panel, requires a result menu, or creates persistent controls. The interaction begins at the text the user is already reading and any durable outcome is ordinary SmartPad syntax.

## 4. Acceptance gate

The feature requires extraction/boundary unit tests, real-browser selection/insertion and caret/hide flows, accessibility labels on selection actions, documentation/spec-trust checks, and a production build.
