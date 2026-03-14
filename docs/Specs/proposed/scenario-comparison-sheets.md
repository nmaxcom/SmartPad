# Scenario Comparison Sheets

Status: proposed

This document defines a scenario workflow for SmartPad where a user can branch one sheet into multiple variants, compare selected outputs, and preserve the text-first editing model.

## 1. Purpose

Scenario comparison is for questions like:

- "What if I move downtown?"
- "What if rates drop by 1.5%?"
- "What if we hire one more person?"
- "What if fuel is EUR 1.80/L instead of EUR 1.62/L?"

The goal is not version control. The goal is decision-making.

## 2. Core principles

1. A scenario is still just a normal SmartPad sheet.
2. The base sheet remains readable text, not hidden configuration.
3. Scenario sheets store only overrides and inherit everything else from the base.
4. Comparison focuses on chosen outputs, not raw diffs.

## 3. Creation flow

### 3.1 Sheet menu action

Add:

- `Create Scenario from Current Sheet`

This creates a new sheet linked to the current one.

### 3.2 Comparison pin line

Use a natural compare line in the sheet text:

```smartpad
compare monthly total, commute time, free cash
```

Rules:

- `compare` is a reserved keyword line
- it produces no scalar result
- it defines which outputs appear in the scenario comparison bar or panel

## 4. UX model

Base sheet:

- contains the full model
- may contain one or more `compare ...` lines

Scenario sheet:

- starts as a visual clone of the base
- overridden lines are marked as overridden
- non-overridden lines are inherited

Comparison view:

- shows pinned outputs across base + scenarios
- may be opened from the sheet tabs area

## 5. Example

Base sheet:

```smartpad
rent = EUR 1250
groceries = EUR 320
commute = EUR 180
coffee = EUR 60
monthly total = rent + groceries + commute + coffee => EUR 1810
compare monthly total
```

Scenario A:

```smartpad
rent = EUR 1650
commute = EUR 40
monthly total => EUR 2070
```

Scenario B:

```smartpad
rent = EUR 1100
commute = EUR 260
monthly total => EUR 1740
```

## 6. Higher-value examples

### 6.1 Mortgage choice

```smartpad
home price = EUR 280000
down payment = EUR 50000
loan = home price - down payment
annual rate = 4.2%
term = 25 years
monthly payment = loan * (annual rate/12) / (1 - (1 + annual rate/12)^(-term))
compare monthly payment
```

Scenario overrides:

- fixed-rate bank A
- fixed-rate bank B
- longer term, lower payment

### 6.2 Operations staffing

```smartpad
orders per day = 1400
seconds per order = 16 s
workers = 5
daily pick time = orders per day * seconds per order / workers => 1.244 h
compare daily pick time, workers
```

Scenario overrides:

- seasonal load
- overtime plan
- extra worker

## 7. Guardrails

1. Scenarios must never mutate the base sheet.
2. Deleting a scenario must not affect siblings.
3. Apply-from-scenario-back-to-base must be explicit and line-scoped.
4. Circular scenario inheritance is forbidden.
5. If a pinned output breaks in one scenario, the comparison view must show the broken state for that scenario only.

## 8. Advanced expectations

Proficient users will expect:

1. quick duplication from any scenario
2. rename and color-label scenarios
3. copy one override into another scenario
4. one-click "promote scenario to full standalone sheet"
5. comparison sorting by best/worst output

## 9. Acceptance examples

### 9.1 Compare line parsing

```smartpad
compare monthly total, commute time
```

Expected behavior:

- no scalar result
- both outputs appear in compare UI

### 9.2 Missing output

If a compare line names a value that does not resolve in one scenario:

- comparison cell shows broken state
- base and other scenarios remain readable

## 10. Implementation gate

Promotion requires:

1. targeted Jest coverage for inheritance, override resolution, compare-line parsing, and persistence
2. targeted Playwright coverage for scenario creation, editing, compare UI, and broken-output states
3. full Jest suite
4. full Playwright suite
5. all repo-wide regression checks green
6. iteration on every discovered failure until the feature matches this spec
