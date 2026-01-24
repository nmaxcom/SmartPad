Background:

Here you can see a few examples where smartpad struggles.

1. Content Creation & Productivity
writing speed = 500 words/hour
book target = 80000 words
time needed = book target / writing speed => book target / writing speed
time needed in workweeks => (book target / writing speed) in workweeks

video editing = 3 hours/minute
project length = 45 min
total editing = project length * video editing => 135 h
 
2. Resource Consumption
server cost = $0.15/hour
monthly budget = $500
max uptime = monthly budget / server cost => ⚠️ Cannot divide currency and currencyUnit: invalid currency division
  Left operand: $500 (currency)
  Right operand: $0.15/hour (currencyUnit)
max uptime in months => $500 / ($0.15/hour) in months

data usage = 2.5 GB/day
plan limit = 100 GB/month
daily allowance = plan limit / 30 days => plan limit / 30 days
overage = data usage - daily allowance => data usage - daily allowance
3. Health & Fitness
burn rate = 450 calories/hour
workout session = 1.5 hours
calories burned = burn rate * workout session => burn rate * 1 h 30 min

heart rate = 72 beats/minute
daily beats = heart rate * 24 hours => heart rate * 24 hours
yearly beats = daily beats * 365 days => daily beats * 365 days
4. Manufacturing & Production
assembly line = 12 units/hour
shift length = 8 hours
daily output = assembly line * shift length => assembly line * 8 h
monthly output = daily output * 22 workdays => ⚠️ Cannot parse "22workdays" as any semantic value type
5. Learning & Training
practice needed = 10000 hours (mastery)
daily practice = 3 hours/day
years to mastery = practice needed / daily practice => practice needed / (3 h/day)
years to mastery in years => ⚠️ Cannot solve: no equation found for "years"
---

# Smartpad Spec: Rates + Time Conversions (Minimal Base)

## 0) Goals

1. Make rate arithmetic dimensionally correct (no “special case” currencyUnit errors).
2. Make `to` conversions work for **rates** and **durations** reliably.
3. Enable users to define **named time units** (e.g., `workweek`) in plain Smartpad style.
4. When conversion needs assumptions, require users to define them explicitly (but keep it frictionless).

Non-goals (for now): calendars/holiday sets, named schedules, inference prompts, IANA time zones.

---

### Quick defaults & overrides (scan)

* Unit conversions use fixed-length time: 1 month = 30 days, 1 year = 365 days.
* Date math (DateValue + month/year) remains calendar-aware.
* A user-defined alias named `month` or `year` overrides defaults for unit conversions.
* `to` / `in` bind to the full expression on their left; only one per expression.
* `per` (or `/`) forms a **rate literal only if the unit token is known** (built-in or user-defined alias). Unknown tokens are treated as plain identifiers in expressions.

# 1) Value Types (existing + clarified)

Smartpad already has:

* Number (dimensionless)
* Currency (e.g., `$500`)
* UnitValue (e.g., `12 km`, `3 m/s`)
* DurationValue (time duration literal: `2h 30min`)
* Date/Time/DateTime

**Spec addition (minimal):**

### 1.1 Rate is just a UnitValue with a compound unit

A “rate” is not a separate type. It’s a UnitValue whose unit has a denominator:

* `$0.15/h` is a UnitValue with unit `USD·h^-1`
* `500 words/hour` is `words·hour^-1`
* `12 units/h` is `units·h^-1`

So you don’t need currencyUnit vs currency. You just need dimensional algebra to work (use existing dimensional analysis?).

---

# 2) Dimensional Algebra Rules (the big fix)

## 2.1 Multiplication and Division must support cancellation

When evaluating `A * B` or `A / B`, units combine using exponent arithmetic.

Examples:

* `($/h) * h => $`
* `$ / ($/h) => h` ✅ (this is the server-cost fix)
* `(GB/day) * day => GB`
* `h / (h/day) => day`
* `($/h) / ($/day) => day/h` (dimensionless-ish ratio, still valid)

## 2.2 Currency behaves like a unit dimension

Treat currency as a unit dimension (e.g., `USD`), not as a special primitive that forbids division.

* `$500` is `500 USD`
* `$0.15/h` is `0.15 USD·h^-1`
* Different currency symbols are incompatible unless an exchange rate is explicitly provided.

In a simple example: "$500 / ($0.15/hour)=> ⚠️ Cannot divide currency and currencyUnit: invalid currency division
  Left operand: $500 (currency)
  Right operand: $0.15/hour (currencyUnit)"
This eliminates your current error:

> ⚠️ Cannot divide currency and currencyUnit

It should become:

* `$500 / ($0.15/h) => 3333.33 h`

---

# 3) “to” / “in” Conversion Semantics (rates included)

Smartpad currently supports `to` / `in` for units. This spec extends it **without new syntax**.

## 3.1 `X to U` converts the *entire unit* of X to target unit U

* `speed = 12 km/h`
* `speed to m/s => 3.333 m/s`

## 3.2 `X to A/B` converts to a compound target unit

Examples:

* `server cost = $0.15/h`

* `server cost to $/day => $3.60/day`

* `writing = 500 words/hour`

* `writing to words/day => 12000 words/day` (uses `1 day = 24 h`)

## 3.3 `X in U` is alias for `X to U`

Keep both for user friendliness.

## 3.4 Fixed-length time definitions for duration/unit conversions

These apply to:

* duration conversions (e.g., `time in months`)
* rate conversions (e.g., `$/month`, `words/year`)
* any unit math that is not date stepping

Defaults:

* 1 minute = 60 seconds
* 1 hour = 60 minutes
* 1 day = 24 hours
* 1 week = 7 days
* 1 month = 30 days
* 1 year = 365 days

## 3.5 User overrides for `month` / `year` (alias precedence)

Users can override defaults by defining an alias with the same name in their sheet:

```text
month = 365 days / 12
year = 365.25 days
billing month = 30 days
```

**Precedence rule:** a user-defined alias named `month` or `year` takes priority for unit conversions. Date math still uses calendar months/years when stepping dates.

## 3.6 `to` / `in` precedence and chaining

* `to` / `in` are postfix conversion operators with very low precedence.
* They bind to the entire expression on their left.

Example:

```text
book target / writing speed in workweeks
```

parses as:

```text
(book target / writing speed) in workweeks
```

If a user wants conversion only on the right operand, they must parenthesize:

```text
book target / (writing speed in workweeks)
```

Only one conversion per expression. If multiple appear, return an error:

```text
X in U to V => ⚠️ Multiple conversions in one expression; use parentheses or separate lines.
```

---

# 4) User-Defined Named Time Units (new feature, minimal)

## 4.1 Define a named time unit by assigning it a DurationValue

A variable assigned to a DurationValue may be used as a **time unit alias** in conversions and unit expressions.

Example:

```text
workday = 8 h
workweek = 5 workday
```

### Rules:

1. A “time unit alias” must evaluate to a DurationValue (or a UnitValue convertible to time).
2. Aliases are **fixed-length** durations (like your existing duration conversions), not calendar-aware.
3. Aliases can be used anywhere a time unit can be used: in multiplication/division, and in `to`/`in`.

## 4.2 Using a named time unit alias as a unit

If `workweek = 40 h`, then:

* `$/workweek` is valid unit
* `hours/workweek` is valid unit
* converting to/from `workweek` uses `workweek ↔ hours` conversion.

Examples:

```text
workweek = 40 h
salary = $20/h
salary to $/workweek => $800/workweek
salary to $/week => $3360/week  # if week is 7 days (calendar unit)
```

## 4.3 Aliases compose (strongly encouraged)

```text
shift = 7.5 h
shiftweek = 5 shift
```

## 4.4 Alias matching and pluralization

Alias matching is case-insensitive. When resolving a unit token that is not a built-in unit:

1. Try exact match against defined aliases (case-insensitive).
2. If the token ends with `s`, try singular by stripping one trailing `s` (`workweeks` -> `workweek`).
3. If the token ends with `es`, try stripping `es` (`boxes` -> `box`).
4. If still not found: unknown unit error.

Conflict rule: if both singular and plural are explicitly defined, exact match wins.

---

# 5) Parser Convenience Fix (tiny, high impact)

## 5.1 Accept `22workdays` style concatenation for known units and aliases

You already accept `125s`. Extend this to:

* numeric literal + unit token, without whitespace, for:

  * built-in units (`days`, `hours`, `min`, etc.)
  * user-defined aliases (`workday`, `workweek`, `shift`, etc.)

So both parse:

* `22workdays`
* `22 workdays`

**Important:** this is purely lexical sugar; semantic meaning comes from the unit/alias definition.

---

# 6) Durations vs Calendar Steps (avoid ambiguity)

Smartpad already has **business days** as a calendar stepping operator for dates.

This spec keeps that clean separation:

* `business day(s)` remains **calendar-aware stepping** when added to dates.
* `workday`, `shift`, `workweek` are **durations**, defined by the user.

### Recommendation (documented convention)

* Use `business days` when you mean *Mon–Fri stepping on dates*
* Use `workday` when you mean *N hours of work*

Examples:

```text
# Calendar stepping
2024-11-25 + 5 business days => 2024-12-02

# Duration math
workday = 8 h
22 workdays => 176 h
```

---

# 7) Errors & Diagnostics (minimal but crucial)

## 7.1 When conversion is impossible, explain what’s missing

If user asks:

```text
salary = $20/h
salary to $/workmonth
```

and `workmonth` is undefined:
Return:

> ⚠️ Unknown unit: workmonth. Define it (example: `workmonth = 52 workweek / 12`).

## 7.2 When unit mismatch occurs, show dimensional mismatch

Example:
`19:30 + 18:00` stays your existing time-time error.
For rates:

* `$20/h to km` => “Cannot convert USD·h^-1 to length”

## 7.3 When currencies differ, require an exchange rate

Example:

* `$20/h + €3/h` => “Cannot combine different currencies without an exchange rate.”

---

# 8) Canonical Examples (use in docs + tests)

## 8.1 Salary / consulting (the obvious)

```text
workweek = 40 h
workmonth = 52 workweek / 12
salary = $20/h
salary to $/workweek => $800/workweek
salary to $/workmonth => $3466.67/workmonth
salary to $/year => $41600/year
```

## 8.2 Content creation

```text
workweek = 25 h
writing = 500 words/h
writing to words/workweek => 12500 words/workweek

book target = 80000 words
time needed = book target / writing => 160 h
time needed in workweeks => 6.4 workweeks
```

## 8.3 Video editing ratios (your example)

```text
workday = 6 h
workweek = 5 workday
edit ratio = 3 h/min
final length = 45 min
edit time = edit ratio * final length => 135 h
edit time in workdays => 22.5 workdays
edit time in workweeks => 4.5 workweeks
```

## 8.4 Server budget runway (fix your current failure)

```text
server cost = $0.15/h
budget = $500
max uptime = budget / server cost => 3333.33 h
max uptime in days => 138.89 days
max uptime in months => 4.63 months
```

## 8.5 Data usage plan (calendar vs alias)

```text
usage = 2.5 GB/day
limit = 100 GB/month
daily allowance = limit to GB/day => 3.33 GB/day   # month as fixed 30d (your current rule)
overage = usage - daily allowance => -0.83 GB/day
```

Optional “billing month” alias (if user wants explicit):

```text
billing month = 30 days
daily allowance = limit / billing month => 3.33 GB/day
```

## 8.6 Manufacturing shifts

```text
shift = 8 h
line = 12 units/h
per shift = line * shift => 96 units/shift

shiftweek = 10 shift   # 2 shifts/day * 5 days, if they want
weekly output = per shift * shiftweek => 960 units/shiftweek
```

## 8.7 Fitness / physiology

```text
burn = 450 calories/h
session = 1.5 h
calories = burn * session => 675 calories

heart = 72 beats/min
heart to beats/day => 103680 beats/day
heart to beats/year => 37.8432e6 beats/year
```

## 8.8 Learning / mastery (fix “in years”)

```text
practice = 10000 h
daily = 3 h/day
time = practice / daily => 3333.33 days
time in years => 9.13 years
```

---

# 9) Implementation Notes (tight and testable)

## 9.1 Unit system needs exponent maps

Represent units as a map: `{USD:1, h:-1}` etc.
Multiplication/division adds/subtracts exponents and cancels zeros.

## 9.2 Duration aliases compile to base time units

When encountering `workweek` in a unit expression, replace with its evaluated duration in base time units (seconds) for conversion.

## 9.3 “to compound unit” conversion path

To convert `X` from unit `Ux` to `Ut`:

1. Convert value to base SI-like representation (or your internal canonical).
2. Convert base to target.
3. Preserve formatting and friendly display.

## 9.4 Date math remains separate

Duration aliases do **not** become calendar periods. They’re fixed-length durations.

---

# 10) What this spec fixes immediately (your list)

* ✅ `budget / ($/h)` works (currency cancels)
* ✅ `... in years` works as duration conversion
* ✅ `22workdays` parses (lexical sugar)
* ✅ Workweek/workmonth is user-definable with no new syntax
* ✅ Rate conversions become predictable (`to $/workweek`, `to words/day`, etc.)

---
