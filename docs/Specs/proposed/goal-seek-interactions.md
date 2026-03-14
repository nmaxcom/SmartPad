# Goal-Seek Interactions

Status: proposed

This document defines a text-first goal-seek feature for SmartPad that lets users say:

- make this result become that value
- by changing one or more chosen variables
- without introducing new `@...` directive language

## 1. Purpose

Goal-seek is for cases where the user knows the desired outcome, but not the input value that achieves it.

Examples:

- "What salary gives me EUR 4,000 take-home?"
- "How much should I save each month to hit EUR 20,000 in 18 months?"
- "What blend ratio gives 18% protein?"
- "What launch angle gives 40 m range?"

This feature is distinct from general symbolic solve:

- symbolic solve starts from an equation the user already wrote
- goal-seek starts from a computed result the user already trusts

## 2. Core principles

1. No `@goal` or other new directive language.
2. The feature starts from a result chip or a natural-language goal line.
3. The result being targeted must stay visibly tied to its source expression.
4. V1 must be reliable for one free variable.
5. Two-plus free variables must not pretend there is one obvious answer unless the strategy is explicit.

## 3. Entry points

### 3.1 Result-chip menu

Every result chip menu may expose:

- `Set target...`
- `Set target by...`

When chosen, SmartPad inserts a goal-seek line directly below the source line and anchors it to the source result using the same stable-chip mechanism used elsewhere in the editor.

### 3.2 Manual goal line

Users may also type a goal line directly.

Canonical form:

```smartpad
make <target result> = <desired value> by <variable>[, <variable>...][ with <constraint>, <constraint>...] =>
```

Notes:

- `<target result>` may be typed as a phrase variable name or inserted as a source result chip.
- The chip form is preferred when the target is an unnamed result.
- `=>` is required so this feature stays deterministic and does not interfere with normal live interpretation.

## 4. UX flow

### 4.1 One-variable flow

1. User opens a result chip menu.
2. User chooses `Set target by...`.
3. User enters:
   - desired value
   - the variable to change
4. SmartPad inserts a goal line and computes the answer.
5. If valid, the chosen variable is solved and the user can optionally apply it to the sheet.

### 4.2 Two-plus-variable flow

If the user selects multiple free variables:

- SmartPad must ask for a strategy before solving.

Supported strategies in the proposal:

- `minimize total change`
- `change variables proportionally`
- `hold all but one and show frontier`
- `show feasible combinations`

Default behavior:

- no implicit default for multi-variable goal-seek
- user must choose a strategy

## 5. Output contract

### 5.1 One free variable

Return a single solved value when possible.

Example:

```smartpad
monthly payment = principal * monthly rate / (1 - (1 + monthly rate)^(-months)) => EUR 629.64
make monthly payment = EUR 550 by principal =>
```

Expected shape:

```smartpad
principal = EUR 92,114.37
```

### 5.2 Two or more free variables

Return one of:

- a chosen best-fit solution based on explicit strategy
- a feasible set summary
- a frontier table or plot suggestion

Example:

```smartpad
profit = units * (price - unit cost) - rent => EUR 2,400
make profit = EUR 4,000 by price, units with minimize total change =>
```

Expected shape:

```smartpad
price = EUR 18.40
units = 392
```

or, if a frontier strategy was selected:

```smartpad
feasible combinations:
  units | price
  380   | EUR 18.63
  400   | EUR 18.00
  420   | EUR 17.43
```

## 6. Difficult examples

### 6.1 Nonlinear finance

```smartpad
principal = EUR 110000
annual rate = 4.8%
monthly rate = annual rate / 12
months = 20 years
monthly payment = principal * monthly rate / (1 - (1 + monthly rate)^(-months))
make monthly payment = EUR 650 by principal =>
```

### 6.2 Mixing / concentration

```smartpad
protein mix = soy * 0.11 + whey * 0.72
total mass = soy + whey
protein percent = protein mix / total mass as %
make protein percent = 18% by soy, whey with total mass = 500 g, change variables proportionally =>
```

### 6.3 Motion / physics

```smartpad
range = speed^2 * sin(2 * angle) / g
speed = 22 m/s
g = 9.81 m/s^2
make range = 40 m by angle =>
```

### 6.4 Operational planning

```smartpad
warehouse pick time = orders * seconds per order / workers
orders = 1200
seconds per order = 18 s
make warehouse pick time = 2 h by workers =>
```

## 7. Proficient-user expectations

Proficient users will reasonably expect:

1. unit-aware targets
2. currency-aware targets
3. explicit constraints
4. one-click "apply solved value"
5. one-click "create scenario instead of applying"
6. frontier visualization when multiple variables are free
7. readable failure states, not silent impossibility

## 8. Guardrails

1. Goal lines must not run without `=>`.
2. V1 must reject unsupported multi-variable requests unless a strategy is supplied.
3. If the target conflicts with constraints, show `No feasible solution under current constraints`.
4. Goal-seek must never overwrite document values automatically.
5. Apply-to-sheet must be a separate explicit action.
6. When the source result breaks, the goal line stays visible and shows a broken-source state.

## 9. Acceptance examples

### 9.1 Reverse salary planning

```smartpad
tax = 22%
take home = gross - tax on gross
make take home = EUR 4000 by gross =>
```

Result:

```smartpad
gross = EUR 5,128.21
```

### 9.2 Savings target

```smartpad
goal fund = current savings + monthly saving * months
current savings = EUR 3200
months = 18
make goal fund = EUR 20000 by monthly saving =>
```

Result:

```smartpad
monthly saving = EUR 933.33
```

### 9.3 Multi-variable explicit strategy

```smartpad
distance = speed * time
make distance = 300 km by speed, time with show feasible combinations =>
```

Result shape:

```smartpad
feasible combinations:
  speed   | time
  60 km/h | 5 h
  75 km/h | 4 h
  100 km/h| 3 h
```

## 10. Implementation gate

This feature is not promotable until all of the following are green:

1. targeted Jest unit coverage for parsing, solving, constraints, and result-source anchoring
2. targeted Playwright coverage for chip-menu entry, multi-variable strategy choice, apply-to-sheet, and failure states
3. full Jest suite
4. full Playwright suite
5. general regression runs required by the repo gate
6. iteration on all discovered failures until behavior matches this spec exactly
