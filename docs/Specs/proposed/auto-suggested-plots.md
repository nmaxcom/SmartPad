# Auto-Suggested Plots

Status: proposed

This document defines a plot-suggestion system that uses result-chip menus and visual cues to advertise when richer plot types are available.

## 1. Purpose

Almost any numeric result can be turned into a plot. That alone is not a useful signal.

The useful signal is:

- this result has a meaningful non-line-chart visualization available
- SmartPad can see that now
- and it wants to steer the user toward it

## 2. Core principles

1. Suggestions must never interrupt typing.
2. Suggestions must appear in the result-chip menu, not as random floating UI.
3. Non-line-chart opportunities get a stronger cue than generic line exploration.
4. Drag/drop and copy affordances must remain intact.

## 3. Result-chip affordance

On hover, result chips show:

- copy icon
- menu icon

Clicking the menu opens actions such as:

- `Explore dependencies`
- `Plot as histogram`
- `Plot as scatter`
- future plot types

If histogram/scatter or other richer plot types are available:

- those menu items must be highlighted in the same accent color
- the chip itself may show a small matching cue dot or tint

This cue means:

- "there is a better-than-boring chart here"

## 4. Suggestion rules

### 4.0 Source binding for Plot from result

`Plot from result` must create a live view of the thing the user is studying, not a copied text snapshot.

Bad generated output:

```smartpad
distance = 120 km
time = 2 h
speed = distance / time =>
@view plot y=distance / time size=md
```

Why this is bad:

- the plot duplicates the source formula
- editing `speed = distance / time =>` later does not update the generated `y=...`
- the user now has two formulas that look related but can silently diverge

Preferred generated output for a named result:

```smartpad
distance = 120 km
time = 2 h
speed = distance / time =>
@view plot x=time y=speed size=md
```

Preferred generated output for an unnamed expression directly above the view:

```smartpad
distance / time =>
@view plot x=time size=md
```

In the unnamed case, omitting `y=` is intentional: the view binds to the nearest source expression above it. Editing that source expression changes the plot because there is no copied formula to drift.

Product rule:

1. Named result chips should generate plots using the result name as `y=...` when a stable variable name exists.
2. Unnamed result chips should generate a source-adjacent view without `y=...`, relying on the existing nearest-expression binding.
3. If the source expression has one candidate independent variable, SmartPad can choose it automatically as `x=...`.
4. If the source expression has multiple candidate independent variables, SmartPad must ask through the menu/submenu instead of silently choosing the first token.
5. Scalar-only results must keep `Plot from result` disabled, because they cannot produce a meaningful function plot.
6. The visual chart title/legend may use friendly labels, but the binding must stay live.

### 4.0.1 X-variable choice

When a formula contains multiple variables, the useful question is "what do you want to vary?"

Example:

```smartpad
distance = 120 km
time = 2 h
speed = distance / time =>
```

Menu should not create a plot immediately. It should expose choices such as:

- `Plot vs distance`
- `Plot vs time`

Choosing `Plot vs time` emits:

```smartpad
@view plot x=time y=speed size=md
```

Choosing `Plot vs distance` emits:

```smartpad
@view plot x=distance y=speed size=md
```

Guardrail:

- the selected x-variable must be numeric, duration, currency, percentage, or a compatible unit value that the plot engine can sample
- if a variable cannot be sampled, show it disabled with a short reason

### 4.0.2 Source mutation scenarios

Generated plots must remain useful after normal edits:

1. User edits the source formula body.
   - `speed = distance / time =>` becomes `speed = distance / (time + stops) =>`
   - expected: plot still tracks `speed`
2. User edits an unnamed expression above a source-adjacent plot.
   - `distance / time =>` becomes `(distance - detour) / time =>`
   - expected: plot updates because `y=` was omitted
3. User renames a named result.
   - `speed = ... =>` becomes `pace = ... =>`
   - expected: plot disconnects with a clear missing-source message or offers a repair action; it must not silently keep an old formula copy
4. User inserts a line between source and source-adjacent unnamed plot.
   - expected: either the plot stays anchored to original source through metadata, or the UI warns that the nearest-expression binding changed

### 4.1 Histogram

Suggest when the source resolves to:

- one numeric list
- one duration list
- one currency list
- one unit list of compatible type

Example:

```smartpad
delivery times = 24 min, 27 min, 29 min, 31 min, 31 min, 32 min, 34 min, 41 min
```

### 4.2 Scatter

Suggest when the source resolves to:

- two equal-length numeric lists
- two numeric table columns
- one table with one strong numeric-x and numeric-y pairing

Example:

```smartpad
study hours = 2, 3, 4, 5, 6, 8, 9
test score = 58, 61, 68, 73, 79, 88, 92
```

### 4.3 Time series

Suggest when:

- x values are dates/times
- y values are numeric

### 4.4 Default dependency plot

Still available for normal scalar results through `Explore dependencies`, but not treated as a special suggestion.

## 5. No new text syntax in v1

V1 adds no new user-typed syntax for plot suggestions themselves.

Behavior:

- the suggestion is interaction-only
- if the user persists the chart, SmartPad may emit the existing persistent plot syntax already used by the plotting system

## 6. Examples

### 6.1 Histogram candidate

```smartpad
heights = 168 cm, 171 cm, 172 cm, 174 cm, 176 cm, 180 cm, 181 cm, 183 cm
```

Menu cue:

- `Plot as histogram` highlighted

### 6.2 Scatter candidate

```smartpad
ad spend = EUR 200, EUR 260, EUR 310, EUR 390, EUR 470
sales = EUR 2100, EUR 2480, EUR 2920, EUR 3510, EUR 4020
```

Menu cue:

- `Plot as scatter` highlighted

### 6.3 Table candidate

```smartpad
Orders:
  day | visits | revenue
  Mon | 480 | EUR 2200
  Tue | 530 | EUR 2460
  Wed | 610 | EUR 2780
```

Menu cue on relevant result/table summary:

- `Plot as scatter` highlighted

## 7. Guardrails

1. No suggestion if data shape is ambiguous and confidence is low.
2. No suggestion for lists with incompatible mixed semantic types.
3. Dismissal must be sticky per line/result unless the data shape changes materially.
4. The accent cue must not be confused with error, copy, or broken-link styling.

## 8. Acceptance examples

### 8.0 Live-bound plot from named result

Input:

```smartpad
distance = 120 km
time = 2 h
speed = distance / time =>
```

Menu:

- includes `Plot vs distance`
- includes `Plot vs time`
- does not emit `y=distance / time`

After choosing `Plot vs time`, expected inserted view:

```smartpad
@view plot x=time y=speed size=md
```

Then edit:

```smartpad
speed = distance / (time + 0.25 h) =>
```

Expected:

- the existing plot remains connected
- the plotted y-series updates through `speed`
- no duplicated stale formula remains in the view directive

### 8.0.1 Live-bound plot from unnamed result

Input:

```smartpad
distance = 120 km
time = 2 h
distance / time =>
```

After choosing `Plot vs time`, expected inserted view directly below the source:

```smartpad
@view plot x=time size=md
```

Then edit:

```smartpad
(distance - 10 km) / time =>
```

Expected:

- plot updates to the edited nearest source expression
- generated view still has no duplicated `y=` formula

### 8.0.2 Scalar-only result stays disabled

Input:

```smartpad
100 + 20 =>
```

Expected:

- menu includes `Plot from result` only if useful as a disabled item
- no click path creates a disconnected plot

### 8.1 Histogram available

Input:

```smartpad
wait times = 3 min, 4 min, 4 min, 5 min, 8 min, 12 min
```

Expected:

- menu includes `Plot as histogram`
- item is visually highlighted

### 8.2 Scatter available

Input:

```smartpad
speed = 40, 50, 60, 70 km/h
fuel use = 4.8, 5.1, 5.9, 7.1 L/100km
```

Expected:

- menu includes `Plot as scatter`
- item is visually highlighted

## 9. Implementation gate

Promotion requires:

1. targeted Jest coverage for source-binding and x-variable eligibility logic
2. targeted Jest coverage for list/range suggestion eligibility logic
3. targeted Playwright coverage for named-result plot creation and source-formula edit propagation
4. targeted Playwright coverage for unnamed-result source-adjacent plot creation and edit propagation
5. targeted Playwright coverage for multi-variable chooser behavior and disabled non-sampleable variables
6. targeted Playwright coverage for scalar-only disabled plot action
7. targeted Playwright coverage for cue rendering, menu highlighting, and plot creation from chip menus
8. full Jest suite
9. full Playwright suite or explicit documented deferral with focused coverage rationale
10. all general regression checks green
11. iteration until no behavior contradicts this spec
