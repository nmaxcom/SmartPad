## Range literal parsing (step/unit syntax)

### Goal

Parse natural range syntax like:

```text
2026-01-01..2026-01-05 step 1 day
09:00..11:00 step 30 min
1..10 step 2
```

into a single AST node/token:

```ts
RangeLiteral { startExpr, endExpr, stepExpr? }
```

where `stepExpr` is itself a normal expression (often a duration literal like `1 day`).

### Key decision

**`step` is not a named argument.** It is a **range operator suffix** in the grammar, similar to `to`.

This avoids the “Invalid named argument” path entirely.

### Grammar (concrete)

Treat range literals as a dedicated expression form with higher precedence than commas (so it can be used inside lists), but lower than parentheses.

#### Tokens needed

* `RANGE_DOTS` token: `..`
* `STEP_KW` token: keyword `step` (case-insensitive if you allow that elsewhere)
* Existing tokens: numbers, identifiers, dates, times, datetimes, units, duration-literals

#### Production

```ebnf
rangeExpr
  := additiveExpr ( RANGE_DOTS additiveExpr ( STEP_KW stepValue )? )?

stepValue
  := durationLiteral
   | signedIntegerLiteral
```

Where:

* Numeric ranges accept `signedIntegerLiteral` as `stepValue`
* Date/time ranges accept `durationLiteral` as `stepValue`
* (If step omitted: numeric ranges may default; date/time ranges must require explicit step unless you implement the “daily default” mode.)

### Tokenization details (must be implemented)

The lexer must recognize these compound literals as single semantic tokens (or token sequences your parser already handles):

#### Date token

* `YYYY-MM-DD` (e.g., `2026-01-01`) → `DATE_LITERAL`

#### Time token

* `HH:MM` (e.g., `09:30`) → `TIME_LITERAL`

#### DateTime token (optional for now)

* `YYYY-MM-DD HH:MM` (space-separated) → either:

  * `DATETIME_LITERAL`, or
  * `DATE_LITERAL` + `TIME_LITERAL` with a parser rule that combines them when adjacent

#### Duration literal tokenization

Duration must be parsed as a normal expression that evaluates to a duration value. Two acceptable approaches:

**Approach A (recommended): parse duration as `<number> <unit>`**

* `1 day` tokenizes as `NUMBER(1) IDENT(day)` then a duration-literal parser recognizes it.

**Approach B: pre-tokenize duration**

* `1 day` becomes `DURATION_LITERAL(1 day)`

Either is fine; pick one and be consistent across the entire language.

### Valid range forms (v1 + date/time extension)

#### Numeric (unitless integers)

```text
1..5 =>1, 2, 3, 4, 5
0..10 step 2 =>0, 2, 4, 6, 8, 10
6..2 =>6, 5, 4, 3, 2
```

#### Date range (requires step)

```text
2026-01-01..2026-01-05 step 1 day =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05
2026-01-01..2026-02-01 step 1 week =>2026-01-01, 2026-01-08, 2026-01-15, 2026-01-22, 2026-01-29
2026-01-15..2026-05-15 step 1 month =>2026-01-15, 2026-02-15, 2026-03-15, 2026-04-15, 2026-05-15
```

#### Time range (requires step)

```text
09:00..11:00 step 30 min =>09:00, 09:30, 10:00, 10:30, 11:00
```

### Omitted step rule (clarify)

To eliminate ambiguity and make parsing predictable:

* **Numeric ranges:** `step` optional (default ±1 based on direction)
* **Date/time ranges:** `step` required

#### Error when date/time step omitted

```text
2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
09:00..11:00 =>⚠️ Date/time ranges require a duration step (e.g., step 30 min)
```

### What should stop “Invalid named argument”

You must ensure `step` is parsed by the range grammar, not by function-argument parsing.
Concretely:

* In the parser, when it sees `..`, it enters `rangeExpr` mode.
* Inside that mode, the literal identifier `step` is treated as the optional suffix keyword, not a named arg.

---

## List helpers rejecting scalars/nested lists

### Required rule

List helpers (`sum`, `mean`, `min`, `max`, `median`, `stddev`, `count`, `sort`, `where`, `contains`, `indexOf`) accept only a **proper list value**.

* Scalars must error.
* Nested lists must error (list contains an element which is itself a list).

### Universal error format (make it consistent)

All list helper type errors must start with:

```text
⚠️ <helper>() expects a list, got <type>
```

Examples:

```text
sum(5) =>⚠️ sum() expects a list, got number
sort($12) =>⚠️ sort() expects a list, got currency
where(10, > 5) =>⚠️ where() expects a list, got number
```

### Nested list error format

```text
⚠️ <helper>() does not support nested lists
```

Examples:

```text
xs = (1, 2), (3, 4)
sum(xs) =>⚠️ sum() does not support nested lists
sort(xs) =>⚠️ sort() does not support nested lists
```

### `where` source must be a list

`where` operates only on a list value.

```text
x = 5
x where > 3 =>⚠️ where() expects a list, got number
```

### Type names (canonical)

Use one of these strings in errors:

* `number`
* `currency`
* `percent`
* `quantity` (unit-bearing)
* `date`
* `time`
* `datetime`
* `list`
* `unknown` (only if you truly can’t classify)

### Tests

```text
sum(5) =>⚠️ sum() expects a list, got number
sort($12) =>⚠️ sort() expects a list, got currency
x = 5
x where > 3 =>⚠️ where() expects a list, got number

xs = (1, 2), (3, 4)
sum(xs) =>⚠️ sum() does not support nested lists
```

(If you don’t yet have `( … )` list syntax implemented, use whatever nested-list construction exists in your evaluator; the error requirement still stands.)

---

## Range guardrails / step units (spec error strings)

### Requirement: normalize parser errors into Smartpad warnings for range expressions

For any input that *lexes/parses as a range attempt* (contains `..`), user-facing errors must be normalized to one of these formats rather than raw parser messages.

#### Error format A — generic range parse error

```text
⚠️ Invalid range expression near "<snippet>"
```

#### Error format B — date/time missing duration step

```text
⚠️ Date/time ranges require a duration step (e.g., step 1 day)
```

#### Error format C — invalid step type

```text
⚠️ Invalid range step: expected <expected>, got <got>
```

Examples:

```text
2026-01-01..2026-01-05 step 2 =>⚠️ Invalid range step: expected duration, got number
1..10 step 1 day =>⚠️ Invalid range step: expected integer, got duration
```

### Guardrail behavior (setting-based, not syntax-based)

Steps like `step 1 day` are **valid syntax**. They should not be rejected as “invalid date expression” unless they truly fail parsing or typing.

Guardrails apply at evaluation time:

#### Setting

* `max generated list size` (user setting)
* The evaluator computes the number of generated elements and compares.

#### Error format

```text
⚠️ Range too large (<n> elements; max <max>)
```

Examples:

```text
1..10001 =>⚠️ Range too large (10001 elements; max 10000)
09:00..23:59 step 1 min =>⚠️ Range too large (900 elements; max 500)
```

(Example max values depend on the user setting.)

### Tests (date/time)

```text
2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
2026-01-01..2026-01-05 step 2 =>⚠️ Invalid range step: expected duration, got number
09:00..11:00 step 30 min =>09:00, 09:30, 10:00, 10:30, 11:00
```

### Tests (error normalization for malformed range strings)

These should not surface raw parser errors:

```text
2026-01-01....2026-01-05 =>⚠️ Invalid range expression near "2026-01-01....2026-01-05"
2026-01-01.. step 1 day =>⚠️ Invalid range expression near "2026-01-01.. step 1 day"
..2026-01-05 step 1 day =>⚠️ Invalid range expression near "..2026-01-05 step 1 day"
```

---

## Summary of required clarifications (implementable)

1. **`step` is a range suffix keyword, not a named argument.**
   Must be handled by the range grammar triggered by `..`.

2. **Duration step parsing** must follow one consistent rule:

   * parse `<number> <durationUnit>` as a duration literal expression.

3. **Date/time ranges require explicit duration step** (no default in v1).

4. **Normalize all range-related parsing/typing errors** to Smartpad warning strings, never raw parser messages, whenever `..` is present.

5. **List helpers** must:

   * reject scalars with `⚠️ <fn>() expects a list, got <type>`
   * reject nested lists with `⚠️ <fn>() does not support nested lists`
