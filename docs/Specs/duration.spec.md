Below is a **spec add-on** that covers your 3 failing examples and a bunch of “you’ll hit these soon” cases around **durations**, **time-only expressions**, and **datetime + duration** parsing. It’s written to be descriptive (not just grammar), with lots of examples + expected results.

---

## 1) New concept: `Duration` is a first-class value (not just “unit math”)

### 1.1 Duration literal forms (all equivalent)

A `Duration` is a signed sum of component parts (hours/minutes/seconds/etc).

**Accepted units (canonical):**

* `week`, `day`, `hour`, `minute`, `second`, `ms`
* Also accept common aliases:

  * hours: `hr`, `hrs`
  * minutes: `m` (in context of time, not length)
  * seconds: `sec`, `secs`
  * months: `mo`, `mos`

**Spacing rules (important for your errors):**

* Allow **no space** between number and unit: `2hours`, `1min`, `3s`
* Allow **space**: `2 hours`, `1 min`, `3 s`
* Allow **mixed**: `2hours 1min`, `2 hours 1min`, `2hours 1 min`

**Chaining:**

* A duration may contain multiple components in sequence, separated by spaces and/or plus signs.
* `+` is optional and purely cosmetic inside durations.

Examples:
2hours 1min => 2 h 1 min

-2hours 1min => -2 h 1 min (whole literal is negative)

-2hours + 1min => -1 h 59 min (explicit mixed-sign math)

### 1.2 Duration parsing precedence

When the parser sees something like `3h` it must prefer `Duration` over “3 * h variable”. Concretely:

* If a token matches `{number}{duration-unit}` or `{number} {duration-unit}`, interpret as `DurationComponent` (unless the unit is clearly a different physical unit like `m` in a context where meters are expected).
* durations should still be their own “time duration” unit family, so they can convert to `s/min/h/d` etc reliably.

### 1.3 Normalization and display of Duration

Rule: a leading sign applies to the entire duration literal.

-3h 15min means -(3h + 15min).

Normalization may change how it’s displayed (e.g., seconds to minutes), but must never change the meaning.

Correct examples:

125s => 2 min 5 s
-90min => -1 h 30 min
1h 90min => 2 h 30 min
-3h 15min => -3 h 15 min

Mixed-sign math must be explicit:

-3h + 15min => -2 h 45 min
-3h - 15min => -3 h 15 min

---

## 2) Time-of-day values: support `Time` as distinct from `DateTime`

Right now you clearly support `Date` and `DateTime`. The missing piece is making `19:30` a real type.

### 2.1 `Time` literal format

Accept:

* `HH:MM`
* `HH:MM:SS`
* Optional seconds with `s` suffix should remain duration, not time-of-day.

Examples:

* `19:30` => `19:30`
* `07:05:09` => `07:05:09`

### 2.2 `Time` arithmetic with `Duration`

**Time ± Duration => Time (with day rollover metadata)**

This solves:
`19:30 + 5h 20min 3s =>`

Rules:

* Result is a `Time`, but computation must be done modulo 24h.
* If rollover occurs, attach a day delta internally (`+1 day`, `-1 day`, etc).
* Default display: show time only **plus** a rollover hint when non-zero.

Examples:

* `19:30 + 5h 20min 3s => 00:50:03 (+1 day)`
* `00:10 - 45min => 23:25 (-1 day)`
* `23:59:30 + 90s => 00:01:00 (+1 day)`

**Time - Time => Duration**

* `19:30 - 18:00 => 1 h 30 min`
* If negative, keep sign:

  * `18:00 - 19:30 => -1 h 30 min`

**Time + Time is invalid**

* `19:30 + 18:00 => error: cannot add two clock times; did you mean a duration?`

### 2.3 “Time context” when the user mixes Time with Date/DateTime

If an expression contains:

* a `Date` and a `Time` => combine to a `DateTime` in the current timezone
* a `DateTime` and a `Time` => **invalid** unless explicitly requested (too ambiguous)

Examples:

* `2025-04-01 + 19:30 => 2025-04-01 19:30 <local tz>`
* `01/04/2025 19:30` (already supported) stays `DateTime` (see §4.1)

---

## 3) Conversions: `to` should work for Duration and Time

### 3.1 Duration conversions (this is your third failing example)

Allow:

* `duration to <time-unit>`
* `duration in <time-unit>` (alias)
* `as <time-unit>` optionally (if you want symmetry)

**Conversion outputs a scalar with unit**, not a normalized multi-part duration.

Example (your failing case):

* `3h 7min 12s to min => 187.2 min`

More:

* `125s to min => 2.083333 min`
* `2 days 3h to h => 51 h`
* `1h to s => 3600 s`

### 3.2 Time conversions

This is optional but useful:

* `19:30 to s` is ambiguous (seconds since when?). So **forbid** converting `Time` directly to duration units unless an anchor is provided.

Instead:

* Allow formatting conversions:

  * `19:30 as HHMM => 1930`
  * `19:30 as 12h => 7:30 PM` (if you want locale formatting features)

If you don’t want formatting features yet: just keep `Time` unconvertible except with an anchor date.

Anchor-based:

* `2025-04-01 19:30 to UTC => 2025-04-01 18:30 UTC` (you already support zone conversion for DateTime)

---

## 4) DateTime + Duration parsing: accept “duration phrases” without punctuation

This fixes:
`01/04/2025 19:30 - 2hours 1min =>`

### 4.1 DateTime literals with locale date formats

Given your earlier example:

* `06/05/2024 => 2024-05-06`
  …your locale is effectively **DD/MM/YYYY**.

So:

* `01/04/2025 19:30` must parse as `2025-04-01 19:30` (local timezone unless specified)

### 4.2 DateTime ± Duration => DateTime

Rules:

* DateTime arithmetic must accept any `Duration` form (spaced or unspaced).
* Duration components may be in any order.

Example (your failing case):

* `01/04/2025 19:30 - 2hours 1min => 2025-04-01 17:29`

More:

* `2025-04-01 00:10 - 45min => 2025-03-31 23:25`
* `2025-04-01 19:30 + 1h 90min => 2025-04-01 23:00`
* `2025-04-01 19:30 + 24h => 2025-04-02 19:30`

### 4.3 DateTime - DateTime => Duration

* `2025-04-01 19:30 - 2025-04-01 17:29 => 2 h 1 min`
* Crossing DST: if you support timezone-aware DateTimes, the difference must reflect the actual elapsed seconds in that zone.

---

## 5) Disambiguation + safety rules (stuff that will bite you later)

### 5.1 The `m` problem: minutes vs meters

Strong opinion: **do not** treat bare `m` as minutes by default, because you already have physical units (`m` = meters). Safer rules:

* `min` is minutes; `m` is meters
* If user writes `5m` in a time-only context (like right after a `Time` or inside a duration list), you may accept it as minutes, but warn/gray-hint.

Examples:

* `19:30 + 5m => 19:35` (allowed in “time context”)
* `height = 5m => 5 m` (meters)

### 5.2 Implicit “time context” heuristics

If an expression begins with a `Time` literal, prefer time math:

* `19:30 + 5h =>` time-of-day result (with rollover hint)
* `19:30 * 2 =>` **error** (multiplying a clock time is nonsense)

If the expression contains a `DateTime`, it’s DateTime math.

### 5.3 Clear errors that suggest fixes

When rejecting something, suggest what the system thinks they meant.

Examples:

* `19:30 + 18:00`

  * Error: “Cannot add two clock times. Did you mean `19:30 - 18:00` or `19:30 + 18h`?”
* `3h 7min 12s to kg`

  * Error: “Cannot convert a duration to mass.”

---

## 6) Concrete expected outputs for your 3 failing lines

Assuming locale **DD/MM/YYYY** and local timezone (Europe/Madrid unless overridden):

1. `01/04/2025 19:30 - 2hours 1min=>`
   **Result:** `2025-04-01 17:29`

2. `19:30 + 5h 20min 3s=>`
   **Result:** `00:50:03 (+1 day)`

3. `3h 7min 12s to min =>`
   **Result:** `187.2 min`

---

## 7) Extra examples you probably want tests for (high value)

### Duration parsing torture tests

* `2h1min` => `2 h 1 min` (no spaces between components if you choose to support it; optional)
* `1h -30min` => `30 min`
* `-1h 30min` => `-30 min`

### Time rollover clarity

* `00:00 - 1s => 23:59:59 (-1 day)`
* `23:00 + 2h => 01:00 (+1 day)`

### Mixed date + time

* `today + 19:30 => <today-date> 19:30`
* `2025-04-01 + 25h => 2025-04-02 01:00` (if you allow Date + Duration to become DateTime; if not, forbid)

### Differences

* `2025-04-01 19:30 - 19:00 => 30 min` (DateTime - Time should be invalid unless you coerce Time to same date; if you *do* coerce, define it explicitly)

---

If you want a very clean implementation boundary: implement **Duration** + **Time** types, then add:

* robust duration tokenization (space/no-space)
* `Time ± Duration`, `Time - Time`
* `Duration to <unit>` conversion

That alone will eliminate the three errors and make Smartpad feel *way* more “how I think” for everyday planning.
