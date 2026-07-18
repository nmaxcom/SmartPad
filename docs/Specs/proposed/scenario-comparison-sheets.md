# Scenario Comparison Sheets

Status: partial

This document spans two scenario layers: the implemented named-snapshot comparison inside a normal sheet, and a future workflow where a user can branch one sheet into multiple editable variants.

The implemented layer deliberately keeps every action and comparison beside the text and result chips. Scenario sheets, inherited overrides, compare lines, independent editing, and apply-back remain proposed.

## 0. Implemented partial: named in-sheet snapshots

### 0.1 User flow

1. Open a named result chip's discreet `⋯` menu and choose `Set baseline`.
2. Edit or scrub the model until it represents a useful alternative.
3. Open the result menu again and choose `Save current scenario…`.
4. Name the scenario in the small form anchored to that result menu.
5. Read the inline comparison strip beside the result: `Base`, each saved scenario, and `Live`.

The strip shows each available value and its delta from Base. Saved snapshots remain fixed while Live continues to update as the sheet changes.

### 0.2 Result-menu actions

- `Save current scenario…` captures all current numeric variables and pins the strip to that result.
- `Compare this result` moves the existing strip to another named numeric result without changing any snapshot.
- `Clear scenarios` removes the sheet's named snapshots.
- The discreet `×` on a saved value removes that snapshot only.

No scenario action belongs in the Variables panel or another navigation surface.

### 0.3 State and guardrails

1. A sheet may keep at most six named snapshots.
2. Names are trimmed, whitespace-normalized, limited to 48 characters, and made unique within the sheet.
3. Baselines and scenarios persist locally per sheet across reloads.
4. A snapshot stores display, numeric, semantic-type, and input/derived-role information for each numeric variable available at capture time.
5. If the pinned variable did not exist in a saved snapshot, that saved cell reads `Not available`; other cells remain usable.
6. Scenario state never edits sheet text, creates hidden formulas, or changes the baseline.
7. Scenario state is not yet included in sheet export/import.

### 0.4 Implemented acceptance examples

- After Base profit is `1,022.4 EUR`, saving `Higher ticket` at `2,500.8 EUR` shows the fixed scenario value and `+145%` beside profit.
- Scrubbing again changes only Live; `Base` and `Higher ticket` stay fixed.
- Choosing `Compare this result` from margin moves the same Base/scenario/Live strip to margin.
- Reloading keeps the pinned output and saved names; clearing scenarios removes the strip.

Verification:

- `tests/unit/scenarioComparisonStore.test.ts`
- `tests/e2e/scenario-comparison.spec.ts`

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

## 3. Proposed full-sheet creation flow

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

## 4. Proposed full-sheet UX model

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

## 10. Full-sheet implementation gate

Promotion of the remaining full-sheet workflow requires:

1. targeted Jest coverage for inheritance, override resolution, compare-line parsing, and persistence
2. targeted Playwright coverage for scenario creation, editing, compare UI, and broken-output states
3. full Jest suite
4. full Playwright suite
5. all repo-wide regression checks green
6. iteration on every discovered failure until the feature matches this spec
