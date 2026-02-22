# Smartpad v1 — Generalized Unit Aliases & Ratio Reasoning Spec

This spec formalizes unit aliases and ratio reasoning while keeping the existing syntax and unit algebra. It is intentionally small and direct, with precise rules and examples.

## 0. Motivation (what problem this solves)

Smartpad is good at:

* units
* arithmetic
* conversions
* readability

It currently struggles with:

* rates (`$/h`, `words/day`, `kg/m²`)
* converting those rates across contexts
* reasoning about “per X” where X isn’t just time

Instead of adding **special handling for time**, this spec introduces a **general mechanism**:

> Let users define named unit chunks (“aliases”) and let compound-unit algebra do the rest.

This makes time rates, per-person costs, per-batch production, per-distance emissions, etc. all work through the *same logic*.

---

## 1. Core Principle

> **Any value that evaluates to a unitful quantity may act as a unit alias.**

No new syntax. No new operators.

Clarification: `per` (or `/`) forms a **rate literal only when the unit token is known** (built-in unit or user-defined alias). Unknown tokens remain plain identifiers in math expressions, so `1 / period` is treated as algebra unless `period` is defined as a unit alias.
Just predictable substitution + unit algebra.

---

## 2. Definitions

### 2.1 UnitValue (existing, clarified)

A UnitValue is:

* a magnitude
* multiplied by a unit expression (possibly compound)

Examples:

* `40 h`
* `$0.15 / h`
* `500 words/hour`
* `12 units`
* `3 kg/m^2`

Currency is treated as a **unit dimension**, not a special primitive.

### 2.2 Countables are first-class units (decision)

Smartpad treats **unknown unit tokens** as count units by default. This means domain nouns do not need to be pre-registered.

* They appear in outputs (`$500/person/month`)
* They participate in dimensional cancellation (`defect/unit`)
* They can be used in alias definitions (`dozen = 12 unit`)

This preserves meaning in ratios and rates instead of collapsing to a bare number.

---

### 2.3 Unit Alias (new, generalized)

A variable `X` is a **Unit Alias** if and only if it evaluates to:

* a UnitValue, or
* a DurationValue (internally a UnitValue of seconds)

Examples:

```text
workweek = 40 h
dozen = 12 unit
batch = 24 item
Mreq = 1e6 request
serving = 1 serving
```

If you want a **domain tag** to behave like a known dimension, define it explicitly:

```text
kgCO2 = 1 kg
```

Not eligible:

```text
x = 12           # pure number → NOT a unit alias
today = 2026-01-10
list = 1, 2, 3
```

---

## 3. Where Unit Aliases Apply

A Unit Alias may appear **only in unit positions**:

1. After a number

```text
5 workweek
2 dozen
```

2. Inside a compound unit

```text
$/workweek
defect/batch
words/serving
```

3. As a conversion target

```text
to workweek
to $/batch
in words/workday
```

Unit aliases are **not substituted** in normal expression positions; the variable value is used as-is like any other UnitValue.

Phrase variables (containing spaces) are valid in unit positions when defined, to keep syntax consistent with the rest of Smartpad.

---

## 4. Resolution Rules (unambiguous)

When parsing a unit token `t` (case-insensitive):

1. If `t` matches a defined Unit Alias → use it.
2. Else if `t` is a built-in unit → use it.
3. Else → treat `t` as a count unit (with regular plural handling).

Tokens with invalid unit characters still produce an error.

### Precedence

* Exact match always wins over plural fallback.
* A user-defined alias with the same name as a built-in unit overrides the built-in for unit math (see 8.3). Date math is unaffected.

### 4.1 Scaled units and grouping

Numbers are not part of unit tokens; they create UnitValues. This matters when you want a scaled unit in a compound denominator or numerator.

Use parentheses to make the grouping explicit:

```text
rate = defects / production
rate to defect/(1000 unit) => 5.83 defect/(1000 unit)
```

Without parentheses, `defect/1000 unit` could be parsed as `(defect/1000) unit` or as an unknown unit token. Parentheses force the intended `defect / (1000 unit)` grouping.

If you want to avoid parentheses, define a scaled alias:

```text
kunit = 1000 unit
rate to defect/kunit => 5.83 defect/kunit
```

The system preserves the requested target formatting for reporting and readability rather than simplifying it away.

### 4.2 Unit token adjacency (lexical sugar)

Smartpad accepts numeric literals immediately followed by a unit token, with no whitespace:

```text
22workdays
125s
0.75kW
```

This works for built-in units and user-defined unit aliases (including plurals). It is purely syntactic sugar — the semantic meaning still comes from the unit or alias definition.

### 4.3 Constant-vs-unit safety

Trailing unit-suffix rewrites must only run when the left side is a complete operand.

Guardrail example:

```text
23*PI
```

This must stay arithmetic with the `PI` constant and must never be rewritten into malformed unit text.

---

## 5. Semantics: Alias Substitution Model

A unit alias is a **conversion definition**:

```text
workweek = 40 h
```

means:

```text
1 workweek ≡ 40 h
```

This substitution happens **before** dimensional algebra.

Example:

```text
salary = $20/h
salary to $/workweek
```

Internally:

```text
$/workweek → $/(40 h)
$20/h × 40 h → $800
```

Displayed as:

```text
$800/workweek
```

---

## 6. Dimensional Algebra (engine rule)

All arithmetic on UnitValues follows exponent algebra:

* multiplication adds exponents
* division subtracts exponents
* units cancel when exponents reach zero

Currency behaves like any other unit.

### Examples

```text
$500 / ($0.15/h) => 3333.33 h
18 GB / (120 MB/s) => 153.6 s
7 defect / 1200 unit => 0.00583 defect/unit
```

No “currencyUnit” special cases.

### 6.1 Information and throughput units

Information units are treated as first-class unit symbols and can be converted between bit-based
and byte-based representations:

* Information size: `bit`, `B`, `KB`, `MB`, `GB`, `TB`, `KiB`, `MiB`, `GiB`, `TiB`
* Information rate: `bit/s`, `kbit/s`, `Mbit/s`, `Gbit/s`, `Tbit/s`, `B/s`, `KB/s`, `MB/s`, `GB/s`, `TB/s`
* Common aliases: `bps`, `kbps`, `Mbps`, `Gbps`, `MBps` (mapped to canonical units)

Examples:

```text
24 Mbit/s to MB/s => 3 MB/s
24 Mbps to MB/s => 3 MB/s
2048 B to KiB => 2 KiB
1 MiB to B => 1048576 B
```

Guardrail:

* Unknown/custom count units can still participate in internal arithmetic, but they do **not** auto-convert to information units.
* Example: `6dsbidt/s * 2 h => 43200 dsbidt` is allowed, but `... to MB` must fail with conversion error.

---

## 7. Conversion (`to` / `in`) Rules

### 7.1 Meaning

`X to U` or `X in U` converts the **entire evaluated expression** `X` to unit `U`.

### 7.2 Precedence

`to` / `in` bind **last and weakest**, but only when they form a **valid conversion suffix**.

Smartpad uses structural awareness:

* It only treats a `to`/`in` token as a conversion keyword if the **right-hand side parses as a valid unit target**.
* Otherwise, the keyword is treated as part of a phrase variable name.

```text
book target / writing speed in workweeks
```

is parsed as:

```text
(book target / writing speed) in workweeks
```

If users want something else, they must parenthesize.

Examples:

```text
time to write in workweek  => (time to write) in workweek
time to write              => variable name, no conversion
distance to airport in km  => (distance to airport) in km
```

### 7.3 Single conversion per expression

Only one `to` or `in` is allowed per expression.

```text
X in U in V  => error
```

This keeps expressions readable and predictable.

---

## 8. Fixed-Length vs Calendar Time (important boundary)

### 8.1 Two worlds (must not mix)

#### A) Date Math (calendar-aware)

Applies only when:

* operating on Date / DateTime values
* using `+ 1 month`, `next Monday`, etc.

Rules already defined:

* end-of-month carry
* real calendar days
* business days are calendar stepping for dates

#### B) Unit / Rate Conversions (fixed-length)

Applies to:

* durations
* rates
* `to months`, `to years`, `$/month`, etc.

### 8.2 Default fixed-length definitions

Used for unit math unless overridden by a user alias:

```text
1 day   = 24 h
1 week  = 7 days
1 month = 30 days
1 year  = 365 days
```

### 8.3 User overrides

Users may redefine any of these as aliases; the alias value replaces the default fixed-length value for unit math only:

```text
month = 365 days / 12
workyear = 2080 h
```

These overrides apply **only to unit math**, never to date stepping.

---

## 9. Display Rules

* If a conversion explicitly targets an alias, preserve it in output.
* Preserve user-facing pluralization when a count unit is displayed (e.g., `80000 words`).
* Prefer readable currency-rate formatting (`$28/month`) over raw algebra (`$28*1/month`).
* Otherwise, Smartpad may normalize to base units as today.

Examples:

```text
salary to $/workweek => $800/workweek
salary * workweek => $800
```

---

## 10. Examples (cross-domain)

### 10.1 Time & work (classic)

```text
workday = 8 h
workweek = 5 workday

salary = $20/h
salary to $/workweek => $800/workweek
salary to $/month => $4800/month   # using 30-day month

# Converting a plain currency total into a periodic rate:
# first attach the time unit, then convert.
annual salary = $33400/year
monthly salary = annual salary to $/month
```

---

### 10.2 Content creation

```text
writing = 500 words/h
book = 80000 words

workweek = 25 h
time = book / writing => 160 h
time in workweeks => 6.4 workweeks
```

---

### 10.3 Manufacturing

```text
batch = 24 unit
line = 12 unit/h
shift = 8 h

output = line * shift => 96 unit
output to unit/batch => 4 batch
```

---

### 10.4 Per-person costs

```text
household = 3 person
rent = $1500/month

rent / household => $500/person/month
```

---

### 10.5 Cloud pricing

```text
Mreq = 1e6 request
api = $0.35 / Mreq
traffic = 80 Mreq/month

cost = api * traffic => $28/month
```

---

### 10.6 Food & recipes

```text
recipe = 8 serving
flour = 500 g

per serving = flour / recipe => 62.5 g/serving
need = 3 serving
per serving * need => 187.5 g
```

---

### 10.7 Energy & batteries

```text
battery = 60 Wh
draw = 7 W

runtime = battery / draw => 8.57 h
runtime in days => 0.357 days
```

---

### 10.8 Defect rates

```text
defects = 7 defect
production = 1200 unit

rate = defects / production => 0.00583 defect/unit
rate to defect/(1000 unit) => 5.83 defect/(1000 unit)
```

---

### 10.9 Operational budgeting

```text
server cost = $0.15/h
budget = $500
max uptime = budget / server cost => 3333.33 h
max uptime in days => 138.89 days
max uptime in months => 4.63 months
```

---

### 10.10 Data usage plans

```text
usage = 2.5 GB/day
limit = 100 GB/month
daily allowance = limit to GB/day => 3.33 GB/day
overage = usage - daily allowance => -0.83 GB/day
```

---

### 10.11 Practice / mastery pacing

```text
practice = 10000 h
daily = 3 h/day
time = practice / daily => 3333.33 days
time in years => 9.13 years
```

## 11. Guardrails (keep Smartpad sane)

1. Unit aliases only activate in **unit positions**.
2. Pure numbers cannot become unit aliases.
3. Calendar logic stays confined to Date Math.
4. No implicit assumptions — users define aliases explicitly.
5. One conversion per expression.

---

## 12. Edge cases and stress tests

These are boundary scenarios that should be well-defined and tested.

### 12.1 Alias shadowing built-ins

```text
month = 365 days / 12
1 month => 30.4167 days   # unit math uses the alias value
2026-01-31 + 1 month => 2026-02-28   # date math still uses calendar rules
```

### 12.2 Alias-of-alias expansion

```text
workday = 8 h
workweek = 5 workday
1 workweek => 40 h
```

### 12.3 Circular alias detection

```text
a = 2 b
b = 3 a
1 a => error   # cycle detected
```

### 12.4 Expression position behavior

```text
dozen = 12 unit
dozen + 5 unit => 17 unit   # allowed: dozen resolves to UnitValue
5 unit + dozen => 17 unit   # same, just a normal UnitValue
dozen in unit => 12 unit
```

```text
dozen = 12 unit
total = 3 dozen
3 dozen + 1 unit => 37 unit
```

```text
dozen = 12
3 dozen => error   # pure numbers are not aliases
```

### 12.5 Plural fallback with aliases

```text
box = 24 item
2 boxes => 48 item
```

If a built-in unit matches the plural, it still respects the alias override rule.

### 12.6 Mixed dimensions and cancellation

```text
speed = 30 km/h
trip = 150 km
time = trip / speed => 5 h
```

---

## 13. Creative boundary examples

These push the model across domains while staying within the same rules.

### 13.1 Data throughput pricing

```text
GB = 1e9 byte
TB = 1000 GB
egress = $0.09/GB
traffic = 12 TB/month
cost = egress * traffic => $1080/month
```

### 13.2 Carbon intensity and offsets

```text
intensity = 0.45 kgCO2/kWh
power = 0.75 kW
duration = 6 h
emissions = intensity * power * duration => 2.025 kgCO2
```

### 13.3 Chemical mixing

```text
solution = 250 mL
salt = 5 g
concentration = salt / solution => 0.02 g/mL
need = 2 L
salt * (need / solution) => 40 g
```

### 13.4 Latency budgets

```text
p99 = 180 ms/request
budget = 1000 request
time = p99 * budget => 180 s
```

### 13.5 Space and payload scaling

```text
payload = 15 t
rocket = 550 t
rocket in payload => 36.67 payload
```

---

## 14. Why this works

* Time rates stop being special.
* “Per X” becomes a universal pattern.
* No syntax creep.
* No ambiguity hidden from users.
* Everything is explainable with unit cancellation.

This turns Smartpad into a general ratio scratchpad by extending existing unit algebra without adding new syntax.
