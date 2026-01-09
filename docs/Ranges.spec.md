# Range List Generation in Smartpad (Rudimentary Spec)

This spec defines **range-generated lists** (e.g., `1..5`) as a first incremental feature to implement **before** the full list spec. It focuses on: predictable syntax, minimal ambiguity with existing `to` (unit conversion), and high test coverage.

---

## Overview: what range-generated lists are and why they matter

A **range-generated list** is a compact way to create a list of evenly spaced numbers without typing them one by one.

This is useful for:

* **Finance:** “simulate months 1..12”, “apply a rule to year indices”, “compute totals for quantities 1..N”
* **Science/engineering:** sample points, sweep values, quick sanity checks
* **Everyday:** multiplication tables, repeated scenarios, quick enumerations

Range-generated lists should feel like: **“make a list by describing its pattern.”**

---

## Design decision: use `..` (not `to`) for range generation

Smartpad already uses `to` for **unit conversion** (and likely other semantic conversions). Using `to` for ranges would create frequent ambiguity:

* `speed to mph` (conversion) vs `1 to 5` (range)
* `x to y` could also look like conversion if `y` resembles a unit symbol or variable name

Therefore, **range generation uses `..`**:

* `1..5` generates `1, 2, 3, 4, 5`
* `0..10 step 2` generates `0, 2, 4, 6, 8, 10`

This also aligns with slicing syntax already using `..` (e.g., `xs[1..3]`), reinforcing one mental model: **`..` means span**.

---

## Scope (Rudimentary v1)

### Supported in v1

* Integer start and end (unitless integers)
* Optional integer `step`
* Inclusive endpoints when aligned by step
* Increasing and decreasing ranges
* Use as a list value in expressions (element-wise operations if lists already exist)

### Not supported in v1 (must error)

* Non-integer endpoints (e.g., `0.5..2.5`)
* Units and dates/times (e.g., `1..5 to m`, `2026-01-01..2026-01-07`)
* Non-integer step
* Enormous ranges exceeding configured maximum size

---

## Syntax

### Basic inclusive range

```text
<start>..<end>
```

### Range with step

```text
<start>..<end> step <step>
```

### Notes

* `start`, `end`, and `step` must evaluate to **unitless integers** in v1.
* `step` may be positive or negative, but must be consistent with direction (see rules).

---

## Semantics & rules

### Rule 1 — Inclusive endpoints (if aligned)

A range includes the start value and attempts to include the end value **only if** it lands exactly on the step sequence.

#### Tests

```text
1..5 =>1, 2, 3, 4, 5
0..10 step 2 =>0, 2, 4, 6, 8, 10
```

If not aligned, stop at the last value that does not exceed the end in the given direction.

```text
0..10 step 3 =>0, 3, 6, 9
```

---

### Rule 2 — Default step

If `step` is omitted:

* If `start < end`, default `step = 1`
* If `start > end`, default `step = -1`
* If `start == end`, the result is a single-element list

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

### Rule 5 — Empty ranges are allowed only when logically empty

If the direction and step rules are satisfied, ranges should not be empty.
But if you choose to permit “empty spans” as a result of invalid bounds without throwing (not recommended), you must be consistent.

**Recommended (v1): treat direction mismatch as error, not empty.**

#### Tests (recommended behavior)

```text
1..0 step 1 =>⚠️ step must be negative for a decreasing range
0..1 step -1 =>⚠️ step must be positive for an increasing range
```

---

### Rule 6 — Types: only unitless integers in v1

Start/end/step must be unitless integers.

#### Tests

```text
0.5..3 =>⚠️ range endpoints must be integers (got 0.5)
1..5 step 0.5 =>⚠️ step must be an integer (got 0.5)
```

If variables are used, they must resolve to unitless integers:

```text
a = 1
b = 5
a..b =>1, 2, 3, 4, 5
```

If variables resolve to a unit-bearing value:

```text
a = 1 m
b = 5 m
a..b =>⚠️ range endpoints must be unitless integers (got m)
```

---

### Rule 7 — Maximum list size guardrail

To prevent runaway memory/time use, impose a maximum number of elements (e.g., `MAX_RANGE_LEN` in settings or a constant).

#### Tests (assumes MAX_RANGE_LEN = 10000; adjust to your value)

```text
1..100000 =>⚠️ range too large (100000 elements; max 10000)
```

---

## Precedence and composition with existing features

Range generation produces a **list value** that can be used anywhere a list literal can.

### Element-wise operations with scalars

#### Useful examples

* Multiply a whole sequence:
* Generate tables quickly

#### Tests

```text
(1..5) * 2 =>2, 4, 6, 8, 10
(0..10 step 2) + 1 =>1, 3, 5, 7, 9, 11
```

### As function arguments

#### Useful examples

* Aggregate a generated list

#### Tests

```text
sum(1..5) =>15
mean(1..5) =>3
min(1..5) =>1
max(1..5) =>5
count(1..5) =>5
```

(If `count` is not yet implemented, replace with the equivalent list-length operation you currently have; otherwise this is a required test once `count` exists.)

---

## User-centric mini-recipes (complete, runnable examples)

### Finance: quantity ladder for pricing

```text
unit price = $3
qty = 1..6
line totals = unit price * qty =>$3, $6, $9, $12, $15, $18
sum(line totals) =>$63
```

### Science: quick sweep of input values

```text
x = 0..10 step 2
y = x^2 =>0, 4, 16, 36, 64, 100
```

### Everyday: “show me a simple table”

```text
n = 1..10
n * 7 =>7, 14, 21, 28, 35, 42, 49, 56, 63, 70
```

---

## Ambiguity rules (must be explicit)

### `..` is reserved for spans and cannot be used as a variable name token

#### Tests

```text
.. = 3 =>⚠️ invalid identifier
```

### `to` remains reserved for conversions (range generation must not use `to`)

#### Tests

```text
1 to 5 =>⚠️ Use ".." for ranges (e.g., 1..5)
```

(Exact wording is up to you; the behavior must be deterministic.)

---

## Required test suite summary (Rudimentary Range Generation)

Implement as a single suite first, covering:

* Basic range: `1..5`
* Step range: `0..10 step 2`
* Non-aligned end: `0..10 step 3`
* Decreasing range defaults: `6..2`
* Single-element range: `5..5`
* Step zero error
* Step direction mismatch errors
* Non-integer endpoints/step errors
* Variable endpoints (valid + invalid with units)
* Max size guardrail
* Composition: arithmetic + aggregations

---

## Implementation notes

- `parseExpressionComponents` rewrites every `..` span into a hidden `__rangeLiteral` helper so the parser/evaluator always treat it as a list literal without exposing the helper in the UI.
- `__rangeLiteral` enforces unitless integers, non-zero steps, direction-matching steps, and a guardrail of `MAX_RANGE_ELEMENTS = 10000` (error: `range too large (X elements; max 10000)`), then emits `ListValue.fromItems(...)`.
- `tests/unit/range.test.ts` now covers every success and failure case listed above, so the required test suite is tied directly to the spec.
- A new `Range Spec Lab` template in the Variable Panel reuses those examples for quick experimentation and demonstrates the mini-recipes.

# IMPLEMENTING_LISTS.md

## Chunk plan

### Chunk 1 — Comprehensive test suite for range-generated lists (Rudimentary v1)

**Goal:** Add a complete test suite for all behaviors in this spec (including error cases).
**Output:** A passing test suite is required before implementation.

**Test cases to include (minimum):**

1. `1..5 =>1, 2, 3, 4, 5`
2. `0..10 step 2 =>0, 2, 4, 6, 8, 10`
3. `0..10 step 3 =>0, 3, 6, 9`
4. `2..6 =>2, 3, 4, 5, 6`
5. `6..2 =>6, 5, 4, 3, 2`
6. `5..5 =>5`
7. `0..10 step 0 =>⚠️ step cannot be 0`
8. `0..10 step -2 =>⚠️ step must be positive for an increasing range`
9. `10..0 step 2 =>⚠️ step must be negative for a decreasing range`
10. `0.5..3 =>⚠️ range endpoints must be integers (got 0.5)`
11. `1..5 step 0.5 =>⚠️ step must be an integer (got 0.5)`
12. Variables:

    * `a=1; b=5; a..b =>1, 2, 3, 4, 5`
    * `a=1 m; b=5 m; a..b =>⚠️ range endpoints must be unitless integers (got m)`
13. Guardrail:

    * `1..100000 =>⚠️ range too large (...)`
14. Composition:

    * `(1..5)*2 =>2, 4, 6, 8, 10`
    * `sum(1..5) =>15`

### Chunk 2 — Parser support for `..` range literals

Implement parsing of:

* `<int>..<int>`
* `<int>..<int> step <int>`
  with correct precedence and parentheses handling.

### Chunk 3 — Evaluator support for range generation

Implement generation logic:

* default step rules
* alignment behavior
* direction checks
* guardrail

### Chunk 4 — Integration with existing list operations

Ensure generated lists are valid inputs to:

* element-wise arithmetic (list-scalar)
* existing aggregations/functions you already support

---
