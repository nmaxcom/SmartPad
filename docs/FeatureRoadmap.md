## SmartPad Feature Roadmap and Syntax Guide

This document captures proposed high‑impact features, suggested syntax, examples, expected behavior, and the recommended implementation order. It follows SmartPad’s architecture: expression parsing → evaluator selection (Strategy) → library adapters (Adapter) → UI results as non‑editable widgets with `data-result` and a deterministic `uiRenderComplete` signal.

### Principles
- Results and errors are widgets (not inline text). The text the user typed remains intact; widgets carry the value via `data-result` with accessible `title`/`aria-label`.
- Trigger operator is `=>` for evaluation. No trigger, no widget.
- Strict, testable formatting policies: integer display rules, scientific notation thresholds, currency/units formatting.
- Evaluators are pluggable: each capability lives behind a clean adapter and is registered with priority in the evaluator registry.

---

### 1) Natural Percentages
**Syntax**
- multiply `x% of/* y` 
- add `x% on y` 
- subtract `x% off y`
- percent `p of A is %`
- Works with money/units: `15% of €200 => €30`

**Examples**
Multiply:
    30% of 500 => 150
    30% * 500 => 150

    total_sales = 5000
    commission_rate = 5.5%
    commission = commission_rate of total_sales => 275

    20% of 50% of 1000 => 100

    30% of (250 + 150) => 120
Add:
    20% on 80 => 96
    80 + 20% => 96
    
    price = 75
    tax = 8.5%
    final_price = tax on price => 81.375

    100 + 20% on 200 => 140 (Should be treated as 100 + (20% on 200))
Subtract:
    20% off 80 => 64
    80 - 20% => 64

    retail_price = $120
    discount = 25%
    sale_price = discount off retail_price => $90

    500 - 10% - 5% => 427.5 (This should be parsed as (500 - 10%) - 5%)
Percent:
    20kg of 80kg is % => 25%

**Behavior**
- Tiny grammar covering of/on/off/is %.
- Composable with currencies/units; formatting adheres to the underlying formatter (money shows symbol, units keep their unit string).
- Should work exactly the same regardless of the unit or currency of the numbers

---

### 2) Currencies (with conversions)
**Syntax**
- Amounts: `200 USD`, `$200`, `30 €`, `¥5000`
- Conversions: `30 € to $ =>`, `100 USD to EUR =>`, `5000 JPY to GBP =>`
- Inline math: `2 × $15.99 =>`, `$200 + 30 € =>`

**Examples**
- `$200 + 30 € => $232.50`
- `100 USD to EUR => €91.74`
- `2 × ¥1200 => ¥2400`

**Behavior**
- Detect symbols/codes; normalize to ISO internally.
- Conversion rates: start with a bundled static table plus user overrides (no network); later, optional live refresh.
- Rounding: default 2 decimals; currency‑specific exceptions (e.g., JPY no decimals).

**Edge cases**
- Ambiguous `$` symbol; mixed‑currency arithmetic (convert to left‑hand currency by default); negatives.

---

### 3) Date/Time Calculations
**Syntax**
- `today + 3 weeks 2 days =>`
- `now + 2h 30m =>`
- `2025-01-10 - 2024-12-31 => 10 days`
- `diff(2025-01-10, 2024-12-31) in days => 10`

**Examples**
- `today + 3w 2d => 2025-…`
- `2025-03-01 - 2024-03-01 => 366 days`

**Behavior**
- Pure browser evaluator, no network.
- Respect timezone; show ISO date/time; friendly display in tooltip.

**Edge cases**
- DST transitions; leap years; invalid dates.

---

### 4) Function Plots
**Syntax**
- `plot y = sin(x) from 0 to 2*pi =>`
- `plot f(x) = x^2; g(x) = 2*x + 1 from -5 to 5 =>`
- `plot [1,2,3]; [2,4,9] =>` (data points)

**Examples**
- `plot y = exp(-x^2) from -3 to 3 =>`
- `plot y = sin(x), y = cos(x) from 0 to 2*pi =>`

**Behavior**
- Render SVG/Canvas chart as a widget; auto ticks; pan/zoom optional.
- Export (SVG/PNG) on hover; sampling step auto with override.

**Edge cases**
- Discontinuities; huge ranges (cap samples), multiple series.

---

### 5) Symbolic Solving (Basic Equations)
**Syntax**
- Two‑line: `3*price = 80` then `price =>`
- Inline: `solve 3*x = 80 for x => 26.666…`
- Polynomials: `x^2 - 4 = 0; solve(x) => {x=2, x=-2}`

**Examples**
- `3*price = 80; price => 26.666…`
- `x^2 - 4 = 0; solve(x) => {2, -2}`

**Behavior**
- Add a `SymbolicEvaluator` adapter (e.g., Nerdamer) behind a clean interface.
- If symbolic fails, fall back to numeric/isolation for simple cases.
- Widget shows exact form (fractions/roots) plus approximation.

**Edge cases**
- Under/over‑determined systems; no real roots; multiple solutions.

---

### 6) Online Queries (Opt‑in)
**Syntax**
- `usa population ?> => 331,000,000`
- `EURUSD ?> => 1.09`

**Examples**
- `fed funds rate ?> => 5.25%`
- `btc price ?> => $68,123.45`

**Behavior**
- `?>` operator triggers an online lookup via an `OnlineKnowledgeAdapter` in a worker.
- User‑controlled toggle (“Allow online lookups”), cached results with source and timestamp.

**Edge cases**
- Rate‑limits, CORS, stale data, privacy/PII safety.

---

### Implementation Order
1. Natural Percentages (small grammar, high utility)
2. Currencies (static conversion table + overrides)
3. Date/Time math (pure client)
4. Function Plots (self‑contained widget)
5. Symbolic Solving (adapter to CAS library)
6. Online Queries (opt‑in, caching, policies)

### Testing Approach
- E2E: assert widgets via `data-result` and wait on `uiRenderComplete`.
- Unit: evaluator grammar, adapter conversions, formatting policies, edge cases.

### Display Policy
- Keep integers without decimals; scientific notation for very large/small values.
- Money defaults to two decimals (currency‑specific exceptions).
- Tooltips/aria show canonical forms (e.g., ISO currency codes).


