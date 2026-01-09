# SmartPad Date/Time Ranges & Display Spec (Locale-aware, Opinionated, With Tests)

This spec resolves current failures and confusion around:

* locale-aware date parsing (`es-ES` inputs like `01-02-2023`)
* routing range expressions before date-math/solver parsing
* correct stepping (including month-end clamping)
* guardrails and user-facing error normalization
* output formatting (timezone label, compact display without repeating identical dates)

SmartPad philosophy: **natural input, predictable meaning, honest errors, and readable output.**
If a user can reasonably type it, SmartPad should either understand it or give a targeted correction—not a solver/equation error.

---

## 1) Range Expression Routing (must happen before date-math and solver)

### Requirement

Any expression containing `..` must be treated as a **range candidate** and parsed using the range parser/evaluator **before**:

* dateMath/date-expression parsing
* solver/equation parsing
* generic “named argument” parsing

### Rationale

Range syntax is a top-level construct in SmartPad (“do the same reasoning, but plural”). It should not be accidentally swallowed by other parsers.

### Behavior

* If range parsing succeeds → evaluate range and return list (or set variable).
* If range parsing fails → surface a **range-specific error**, not a date-math or solver error.

### Tests (routing)

```text
period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
```

Must **not** produce:

```text
⚠️ Invalid date expression near "..2026-01-05"
```

```text
slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>
```

Must **not** produce:

```text
⚠️ Cannot solve: equation is not valid
```

---

## 2) Range Grammar (natural “step” suffix, not named args)

### Syntax

A range expression is:

```text
<start>..<end>
<start>..<end> step <stepValue>
```

Where `step` is a **keyword suffix** in range grammar, not a named argument.

### Step value types

* Numeric ranges: step must be an integer number (unitless)
* Date/Time/Datetime ranges: step must be a duration (e.g., `30 min`, `1 day`, `2 weeks`, `1 month`)

### Tests (grammar)

```text
1..5 =>1, 2, 3, 4, 5
0..10 step 2 =>0, 2, 4, 6, 8, 10
09:00..11:00 step 30 min =>09:00, 09:30, 10:00, 10:30, 11:00
2026-01-01..2026-01-05 step 1 day =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05
```

---

## 3) Locale-Aware Date/Datetime Input Parsing (es-ES)

### Requirement

SmartPad must accept locale-friendly date formats for input when the user has configured a locale. For `es-ES`, accept:

* `DD-MM-YYYY`
* `DD/MM/YYYY` (optional but recommended)

These must be tokenized as `DATE_LITERAL`, not as arithmetic with `-`.

### Canonical internal representation

Regardless of input format, internal values are normalized to ISO:

* date: `YYYY-MM-DD`
* time: `HH:MM`
* datetime: ISO + timezone-aware instant

### Accepted literals for es-ES

#### Date literal (es-ES)

* `01-02-2023` = 1 Feb 2023
* `14/02/2023` = 14 Feb 2023

#### Datetime literal (es-ES)

A datetime literal is `DATE_LITERAL` + space + `TIME_LITERAL`:

* `01-02-2023 09:00`
* `14/02/2023 11:00`

### Disambiguation policy (opinionated)

* In `es-ES`, `DD-MM-YYYY` is not ambiguous → always interpret as day-month-year.
* If the locale is unknown/unset, only ISO is accepted as input.

### Tests (es-ES parsing)

Assume context locale = `es-ES`:

```text
d = 01-02-2023
d =>2023-02-01
```

```text
t = 09:30
t =>09:30
```

```text
dt = 01-02-2023 09:30
dt =>2023-02-01 09:30 Europe/Madrid (UTC+1)
```

Range with es-ES dates:

```text
slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>
```

Must not error as solver/dateMath; must produce a datetime list (guardrail permitting).

### Invalid locale date should be a targeted error (not solver)

```text
d = 32-02-2023 =>⚠️ Invalid date literal "32-02-2023"
```

If locale is unset and user uses `DD-MM-YYYY`:

```text
d = 01-02-2023 =>⚠️ Unsupported date format "01-02-2023". Use ISO "2023-02-01".
```

---

## 4) Date/Time/Datetime Range Semantics

### Step requirement (opinionated)

For `date`, `time`, and `datetime` ranges: **step is required**.

This avoids “silent assumptions” and keeps user intent explicit.

#### Tests (missing step)

```text
period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
slots = 09:00..11:00 =>⚠️ Date/time ranges require a duration step (e.g., step 30 min)
```

### Invalid step types

```text
period = 2026-01-01..2026-01-05 step 2 =>⚠️ Invalid range step: expected duration, got number
xs = 1..10 step 1 day =>⚠️ Invalid range step: expected integer, got duration
```

### Inclusivity rule

A range includes the end value only if it aligns exactly on the step sequence.

#### Tests

```text
09:00..10:00 step 30 min =>09:00, 09:30, 10:00
09:00..10:00 step 40 min =>09:00, 09:40
```

### Weekly stepping preserves weekday

#### Test

```text
2026-01-01..2026-02-01 step 1 week =>2026-01-01, 2026-01-08, 2026-01-15, 2026-01-22, 2026-01-29
```

### Monthly stepping: “same day-of-month” rule with anchor

Monthly stepping must use the **original start day-of-month** as the anchor, not the previously emitted date’s day.

#### Test (same day-of-month)

```text
2026-01-15..2026-05-15 step 1 month =>2026-01-15, 2026-02-15, 2026-03-15, 2026-04-15, 2026-05-15
```

### Month-end stepping: clamp-to-last-day semantics (anchored)

If the anchor day doesn’t exist in a target month, clamp to the last day of that month **but keep the original anchor for subsequent months**.

#### Test (critical)

```text
2026-01-31..2026-05-31 step 1 month =>2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31
```

---

## 5) Guardrails (must be a user setting)

### Setting

* Name (suggested): `max generated list size`
* Default (suggested): `10000`
* Applies to all generated ranges (numeric/date/time/datetime)

### Behavior

After parsing and validating step, compute number of elements.
If exceeds setting, error:

```text
⚠️ Range too large (<n> elements; max <max>)
```

### Tests

Assume setting `max generated list size = 500`:

```text
slots = 2026-01-01 09:00..2026-01-01 23:59 step 1 min =>
⚠️ Range too large (900 elements; max 500)
```

Guardrail must not be shadowed by date-math parser errors.

---

## 6) Error Normalization (no raw parser leaks for `..`)

### Requirement

If an input contains `..`, SmartPad must never surface:

* raw dateMath “Invalid date expression near …”
* raw parser “Invalid named argument …”
* solver “Cannot solve …”
* any unrelated internal parse errors

Instead, errors must be normalized to one of:

1. Missing duration step (date/time/datetime):

```text
⚠️ Date/time ranges require a duration step (e.g., step 1 day)
```

2. Invalid step type:

```text
⚠️ Invalid range step: expected <expected>, got <got>
```

3. Guardrail:

```text
⚠️ Range too large (<n> elements; max <max>)
```

4. Generic malformed range:

```text
⚠️ Invalid range expression near "<snippet>"
```

### Tests (normalization)

```text
2026-01-01....2026-01-05 =>⚠️ Invalid range expression near "2026-01-01....2026-01-05"
2026-01-01.. step 1 day =>⚠️ Invalid range expression near "2026-01-01.. step 1 day"
..2026-01-05 step 1 day =>⚠️ Invalid range expression near "..2026-01-05 step 1 day"
```

---

## 7) Output Formatting (Timezone label + compact display)

### 7.1 No “local” in user-facing datetime output when locale/timezone is configured

If the user has configured locale/timezone (e.g., `es-ES`, `Europe/Madrid`), never print “local”.
Use one of:

* `Europe/Madrid (UTC+1)` (recommended)
* `UTC+1` (acceptable minimal)
* `Europe/Madrid` (acceptable)

### Tests (timezone label)

Assume timezone `Europe/Madrid`, date in winter:

```text
dt = 2026-01-01 09:00
dt =>2026-01-01 09:00 Europe/Madrid (UTC+1)
```

### 7.2 Compact list display: suppress repeating identical dates in datetime lists

When displaying a list of datetimes where multiple consecutive items share the same date, print the date once and then only times (with timezone) for subsequent items until the date changes.

#### Example output format (recommended)

```text
slots =>2026-01-01: 09:00, 09:18, 09:36, 09:54, 10:12, 10:30, 10:48 Europe/Madrid (UTC+1)
```

If the list spans multiple dates:

```text
slots =>2026-01-01: 23:30, 23:48 Europe/Madrid (UTC+1); 2026-01-02: 00:06, 00:24 Europe/Madrid (UTC+1)
```

### Tests (compact display)

```text
slots = 2026-01-01 09:00..2026-01-01 11:00 step 18 min =>
slots =>2026-01-01: 09:00, 09:18, 09:36, 09:54, 10:12, 10:30, 10:48 Europe/Madrid (UTC+1)
```

Crossing midnight:

```text
slots = 2026-01-01 23:30..2026-01-02 00:30 step 18 min =>
slots =>2026-01-01: 23:30, 23:48 Europe/Madrid (UTC+1); 2026-01-02: 00:06, 00:24 Europe/Madrid (UTC+1)
```

### 7.3 “=>” display vs assignment-only behavior (must match SmartPad core concept)

* Lines without `=>` assign silently (return null)
* Lines with `=>` produce display output

#### Tests

```text
slots = 2026-01-01 09:00..2026-01-01 11:00 step 30 min
=> (no output; evaluateLine returns null; variable is set)

slots =>2026-01-01: 09:00, 09:30, 10:00, 10:30, 11:00 Europe/Madrid (UTC+1)
```

---

## 8) Reference Test Set (focused on the reported failures)

These map to your failing `dateRange.test.ts` cases:

### Missing step

```text
period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
```

### Month-end clamp

```text
period = 2026-01-31..2026-05-31 step 1 month
period =>2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31
```

### Time slots (assignment line returns null; value exists)

```text
slots = 2026-01-01 09:00..2026-01-01 11:00 step 30 min
```

Then:

```text
slots =>2026-01-01: 09:00, 09:30, 10:00, 10:30, 11:00 Europe/Madrid (UTC+1)
```

### Guardrail

```text
slots = 2026-01-01 09:00..2026-01-01 23:59 step 1 min =>⚠️ Range too large (900 elements; max 500)
```

### Non-duration step

```text
period = 2026-01-01..2026-01-05 step 2 =>⚠️ Invalid range step: expected duration, got number
```

### es-ES date input must not route to solver

```text
slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>
```

Must produce either:

* the computed list (if within guardrail)
  or:
* `⚠️ Range too large (...)`
  but never a solver error.
