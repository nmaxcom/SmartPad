---
title: "Ranges"
description: "Defines numeric and date/time range generation, step rules, guardrails, and list interoperability."
---

> Source: `docs/Specs/Ranges.spec.md`

## At a glance

Defines numeric and date/time range generation, step rules, guardrails, and list interoperability.

## Quick examples

### Happy path
```smartpad
<start>..<end>
<start>..<end> step <step>
```

### Edge case
```smartpad
0..10 step 0 =>⚠️ step cannot be 0
```

## What this covers

- Overview: what range-generated lists are and why they matter
- Design decision: use `..` (not `to`) for range generation
- Scope
- Syntax
- Semantics & rules (Numeric ranges)
- Postfix `to` on lists (Unit annotation vs conversion)
- Maximum list size guardrail (Setting)
- Composition with existing features
- Proposed extension: date and time ranges
- Minimal test suite summary (Numeric v1 + unit postfix)

## Full specification

<details>
<summary>Open full spec: Range List Generation in Smartpad (Updated Spec — Rudimentary v1 + Extensions)</summary>

This spec defines **range-generated lists** (e.g., `1..5`) as an incremental feature to implement before the full list spec, while adding two key unit-related behaviors and a forward-looking plan for date/time ranges.

---

## Overview: what range-generated lists are and why they matter

A **range-generated list** is a compact way to create a list of evenly spaced values without typing them one by one.

Useful for:

* Finance: quantities `1..N`, scenario sweeps, sensitivity checks
* Science/engineering: parameter sweeps, sampling indices
* Everyday: sequences, tables, repeated planning values
* (Extension) Scheduling: date sequences, time slots

Range lists should feel like: **“make a list by describing its pattern.”**

---

## Design decision: use `..` (not `to`) for range generation

Smartpad uses `to` for **unit conversion / unit annotation**. Using `to` for ranges would be ambiguous.

Therefore range generation uses `..`:

* `1..5` generates `1, 2, 3, 4, 5`
* `0..10 step 2` generates `0, 2, 4, 6, 8, 10`

This also aligns with slicing syntax `xs[1..3]` (span semantics).

---

## Scope

### v1 (implement first)

* Unitless **integer** start/end
* Optional integer `step`
* Inclusive endpoints when aligned by step
* Increasing and decreasing ranges
* Works as a list value in expressions and functions

### v1 additions (unit-related)

* Unit annotation of generated unitless lists via `to <unit>`
* Unit conversion of unit-bearing lists via `to <unit>`, when all elements share dimension compatibility

### Not supported in v1 (must error)

* Decimal endpoints or decimal steps
* Unit-bearing endpoints directly in the range literal (e.g., `1 kg..5 kg`)
* Date/time endpoints in range literals (this spec includes a proposed extension below)

---

## Syntax

### Numeric range (unitless integers)

```text
<start>..<end>
<start>..<end> step <step>
```

### Postfix `to` behavior (unit annotation or conversion)

```text
<list_expr> to <unit>
```

---

## Semantics & rules (Numeric ranges)

### Rule 1 — Inclusive endpoints (if aligned)

A range includes `start` and includes `end` only if it lands exactly on the step sequence.

#### Tests

```text
1..5 =>1, 2, 3, 4, 5
0..10 step 2 =>0, 2, 4, 6, 8, 10
0..10 step 3 =>0, 3, 6, 9
```

---

### Rule 2 — Default step

If `step` is omitted:

* If `start < end`, default `step = 1`
* If `start > end`, default `step = -1`
* If `start == end`, result is a single-element list

#### Tests

```text
2..6 =>2, 3, 4, 5, 6
6..2 =>6, 5, 4, 3, 2
5..5 =>5
```

---

### Rule 3 — Step must not be 0

#### Tests

```text
0..10 step 0 =>⚠️ step cannot be 0
```

---

### Rule 4 — Step direction must match range direction

If `start < end`, step must be positive.
If `start > end`, step must be negative.

#### Tests

```text
0..10 step -2 =>⚠️ step must be positive for an increasing range
10..0 step 2 =>⚠️ step must be negative for a decreasing range
```

---

### Rule 5 — Types: integers only in v1

Start/end/step must evaluate to **unitless integers**.

#### Tests

```text
0.5..3 =>⚠️ range endpoints must be integers (got 0.5)
1..5 step 0.5 =>⚠️ step must be an integer (got 0.5)
```

Variables are allowed if they resolve correctly:

```text
a = 1
b = 5
a..b =>1, 2, 3, 4, 5
```

Units in endpoints are rejected in v1:

```text
a = 1 m
b = 5 m
a..b =>⚠️ range endpoints must be unitless integers (got m)
```

---

## Postfix `to` on lists (Unit annotation vs conversion)

### Rule 6 — `to <unit>` on a unitless list **annotates** each element

If the list elements are unitless numeric values, `to <unit>` assigns that unit to each element.

#### Tests

```text
1..5 to kg =>1 kg, 2 kg, 3 kg, 4 kg, 5 kg
0..10 step 2 to m/s =>0 m/s, 2 m/s, 4 m/s, 6 m/s, 8 m/s, 10 m/s
```

Also works on list literals:

```text
xs = 3, 4, 5
xs to m =>3 m, 4 m, 5 m
```

If any element already has a unit, behavior depends on the conversion rule below (Rule 7).

---

### Rule 7 — `to <unit>` on a unit-bearing list **converts** each element (same dimension)

If all elements are unit-bearing and dimensionally compatible with the target unit, convert each element to the target unit.

#### Tests (heterogeneous units, same dimension)

```text
a = 2 m, 7 cm, 2 km, 1 ft
a to m =>2 m, 0.07 m, 2000 m, 0.3048 m
```

```text
b = 1200 rpm, 20 Hz
b to Hz =>20 Hz, 20 Hz
```

#### Tests (incompatible dimension)

```text
mix = 2 m, 3 s
mix to m =>⚠️ Cannot convert s to m (incompatible dimensions)
```

#### Mixed unitless + unit-bearing list (recommended strict behavior)

If any element is unit-bearing, then `to <unit>` is treated as **conversion**, and unitless elements are invalid because there is no source unit to convert from.

```text
x = 1, 2 m, 3
x to m =>⚠️ Cannot convert unitless value to m when converting a unit-bearing list
```

(If you prefer permissive behavior later, that would be a v2 change; v1 should stay strict.)

---

## Maximum list size guardrail (Setting)

### Rule 8 — Range generation must obey a configurable maximum length

To prevent runaway memory/time usage, the maximum number of generated elements is a **user setting**.

* Setting name (suggested): `max generated list size`
* Default (suggested): `10000`
* Applies to numeric ranges and (future) date/time ranges.

#### Tests (assumes setting = 10000)

```text
1..10000 =>1, 2, 3, ..., 10000
1..10001 =>⚠️ range too large (10001 elements; max 10000)
```

---

## Composition with existing features

Range generation produces a **list** and should work with:

* element-wise arithmetic with scalars
* aggregations/functions that accept lists

#### Tests

```text
(1..5) * 2 =>2, 4, 6, 8, 10
sum(1..5) =>15
mean(1..5) =>3
min(1..5) =>1
max(1..5) =>5
```

---

## Proposed extension: date and time ranges

This section proposes how to include dates and times into ranges while keeping semantics predictable. It is **not part of numeric v1** unless you choose to implement it now.

### Goals

* Generate sequences of dates (daily/weekly/monthly)
* Generate sequences of times (time slots)
* Avoid ambiguity with numeric `step`
* Keep guardrails and inclusivity rules consistent

### Recommended approach

Use the same `..` span operator, but require an explicit **time unit step** (not a number).

#### Date range (daily by default, optional)

Option A (default daily step if omitted):

```text
2026-01-01..2026-01-05 =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05
```

Option B (require step for clarity; safer):

```text
2026-01-01..2026-01-05 step 1 day =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05
```

#### Weekly stepping

```text
2026-01-01..2026-02-01 step 1 week =>2026-01-01, 2026-01-08, 2026-01-15, 2026-01-22, 2026-01-29
```

#### Monthly stepping (calendar-aware)

```text
2026-01-15..2026-05-15 step 1 month =>2026-01-15, 2026-02-15, 2026-03-15, 2026-04-15, 2026-05-15
```

#### Month-end behavior (must be defined)

When stepping monthly from dates that don’t exist in all months (e.g., Jan 31):

Recommended rule: **clamp to last valid day of month**.

```text
2026-01-31..2026-05-31 step 1 month =>2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31
```

(Non-leap-year example; leap years should produce Feb 29.)

#### Time-of-day range (same day)

Require explicit step with a duration:

```text
09:00..11:00 step 30 min =>09:00, 09:30, 10:00, 10:30, 11:00
```

#### Datetime range

```text
2026-01-01 09:00..2026-01-01 12:00 step 1 h =>2026-01-01 09:00, 10:00, 11:00, 12:00
```

### Date/time rules (proposed)

#### Rule D1 — Step must be a duration unit

Allowed: `min`, `h`, `day`, `week`, `month`, `year` (and plural forms if you support them).

```text
2026-01-01..2026-01-05 step 2 =>⚠️ Date ranges require a duration step (e.g., 1 day)
```

#### Rule D2 — Inclusive endpoint if aligned

Same as numeric ranges:

```text
09:00..10:00 step 40 min =>09:00, 09:40
```

#### Rule D3 — Guardrail applies

```text
09:00..23:59 step 1 min =>⚠️ range too large (...)  (if exceeds setting)
```

#### Rule D4 — Timezone behavior (must be explicit)

* `date` is timezone-agnostic (calendar date)
* `time` is local-time by default
* `datetime` uses Smartpad’s configured timezone unless explicitly specified

#### Rule D5 — DST transitions (must be defined for datetimes)

Recommended v1 behavior for datetime stepping across DST:

* Step in **wall-clock units** for `hour/min` lists (may skip or repeat times)
* Provide an explicit warning when DST causes non-uniform intervals

(If this is too heavy initially, restrict datetime ranges to not cross DST boundaries and error when they do.)

---

## Minimal test suite summary (Numeric v1 + unit postfix)

### Numeric range basics

```text
1..5 =>1, 2, 3, 4, 5
0..10 step 2 =>0, 2, 4, 6, 8, 10
0..10 step 3 =>0, 3, 6, 9
6..2 =>6, 5, 4, 3, 2
5..5 =>5
0..10 step 0 =>⚠️ step cannot be 0
0..10 step -2 =>⚠️ step must be positive for an increasing range
10..0 step 2 =>⚠️ step must be negative for a decreasing range
0.5..3 =>⚠️ range endpoints must be integers (got 0.5)
1..5 step 0.5 =>⚠️ step must be an integer (got 0.5)
```

### Unit annotation on unitless lists

```text
1..5 to kg =>1 kg, 2 kg, 3 kg, 4 kg, 5 kg
(3, 4, 5) to m =>3 m, 4 m, 5 m
```

### Unit conversion on unit-bearing lists

```text
a = 2 m, 7 cm, 2 km, 1 ft
a to m =>2 m, 0.07 m, 2000 m, 0.3048 m
mix = 2 m, 3 s
mix to m =>⚠️ Cannot convert s to m (incompatible dimensions)
```

### Guardrail setting

```text
1..10001 =>⚠️ range too large (10001 elements; max 10000)
```

---

## Notes for implementation order (recommended)

1. Numeric range parsing/eval (`..`, optional `step`)
2. Guardrail as a setting (readable by evaluator)
3. Postfix `to` on lists: annotation for unitless lists, conversion for unit-bearing lists (strict mixed behavior)
4. (Optional later) Date/time ranges with duration step and calendar rules

</details>
