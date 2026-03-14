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

1. targeted Jest coverage for suggestion eligibility logic
2. targeted Playwright coverage for cue rendering, menu highlighting, and plot creation from chip menus
3. full Jest suite
4. full Playwright suite
5. all general regression checks green
6. iteration until no behavior contradicts this spec
