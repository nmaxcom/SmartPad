# SmartPad Currency + FX Spec

This spec defines currency as a first-class unit, how FX conversion works, and how manual rate overrides interact with live data. It is written to fit SmartPad's existing unit math and `to`/`in` conversion rules.

---

## 0) Goals

1) Treat currency like any other unit dimension (it can combine with other units).
2) Allow inline conversions with `to` / `in` (no new syntax, no @ directives).
3) Use live FX rates by default, with Frankfurter as primary and ECB as backup.
4) If the user declares a manual rate, ignore live FX for that pair.
5) Keep outputs readable and consistent with existing formatting.

---

## 1) Currency units and symbols

SmartPad supports currency in two interchangeable forms:

- Symbol form (existing): dollar sign, euro sign, pound sign, yen sign, rupee sign, bitcoin sign, plus suffix symbols `CHF`, `CAD`, `AUD`.
- ISO code form (new for FX): `USD`, `EUR`, `GBP`, `JPY`, `INR`, `BTC`, `CHF`, `CAD`, `AUD`.

Mapping rules (display + parsing):

- `$` is `USD`. Euro sign is `EUR`, pound sign is `GBP`, yen sign is `JPY`, rupee sign is `INR`, bitcoin sign is `BTC`.
- Other ISO codes may render with their familiar symbols in the UI, but the code form is always valid.
- `CHF`, `CAD`, `AUD` display as suffix (e.g., `100 CHF`).
- Symbols remain the default display unless the user explicitly targets a code.

Examples:

```text
price = $19.99
price in EUR => EUR 18.42

rate = CAD 120
rate in USD => $88.35

btc = BTC 0.015
btc in USD => $937.42
```

---

## 2) Conversion syntax (must use `to` / `in`)

Currency conversion uses the existing conversion suffix:

```text
$120 in EUR
EUR 50 to USD
CAD 300 in GBP
```

Rules:

- `to` / `in` bind last and weakest, as defined in `Unit.spec.md`.
- `to` / `in` only trigger when the right-hand side parses as a valid unit target.
- No `->` conversion syntax (not supported).

---

## 3) FX conversion behavior

### 3.1 When FX is needed

- Same-currency math works as today.
- Cross-currency conversion requires an FX rate.

### 3.2 Live FX sources (priority order)

1) Frankfurter (primary)
2) ECB (fallback, seamless)

Frankfurter uses ECB rates, but we still treat ECB as a separate fallback for resilience.

### 3.3 Live rate usage

- Use the most recent available rate from the active provider.
- Cache rates locally and reuse until stale (daily cadence is acceptable).
- If live rates are unavailable, show a clear error (unless manual overrides exist).

---

## 4) Manual FX overrides (take precedence)

If the user declares a rate in the document, use it instead of live FX for that pair.

Manual rates are declared with normal assignments. Since currency codes are valid currency literals, a manual rate can be written as:

```text
EUR = 1.08 USD
GBP = 1.26 USD
JPY = 0.0067 USD
```

That means:

```text
$100 in EUR => EUR 92.59
GBP 50 in USD => $63.00
```

Rules:

- Manual rates override live FX for the matching pair.
- If both directions are declared, use the direct one.
- If only one direction is declared, the inverse is derived.
- Scope and precedence follow normal SmartPad variable rules (nearest wins).

---

## 5) Currency with units (rates)

Currency values can combine with other units as today, and FX should only affect the currency portion.

Examples:

```text
hourly = $85/hour
hourly in EUR/hour => EUR 78.30/hour

fuel = EUR 1.89/liter
fuel in USD/liter => $2.05/liter
```

---

## 6) Formatting and display

- Use SmartPad's existing number formatting rules (commas, decimals, scientific thresholds).
- Default display uses symbols unless the user targets a code.
- Preserve the user's requested unit target in output.

Examples:

```text
EUR 1200 in USD => $1,301.40
CAD 1000 to EUR => EUR 684.72
```

---

## 7) Settings indicator (status + provider)

Add a small, friendly indicator in Settings > Currency that shows which FX source is currently active.

Example UI copy (text-only mock):

```
Live FX: Frankfurter  [active] (updated 3h ago)
Backup: ECB           [standby]
```

Behavior:

- Green status when Frankfurter is active.
- Amber status when ECB is active (fallback).
- Gray status when offline or rates are stale.
- Tooltip or subtitle shows last successful update time.

---

## 8) Regular user examples (syntax)

### Travel
```text
hotel = EUR 240
hotel in USD => $260.30

budget = $1,500
budget in EUR => EUR 1,384.20
```

### Shopping
```text
price = GBP 79
price in USD => $99.50

shipping = $12
shipping in GBP => GBP 9.55
```

### Salary + rates
```text
hourly = $85/hour
monthly hours = 168 h
pay = hourly * monthly hours => $14,280
pay in EUR => EUR 13,150
```

### Manual override (fixed trip rate)
```text
EUR = 1.10 USD
meal = EUR 18
meal in USD => $19.80
```

### Mixed currency plan
```text
subscription = CAD 15/month
subscription in USD/month => $11.05/month
```

---

## 9) Edge cases and guardrails

- Unknown currency code => error with suggestion.
- Conversion requested with no live rate and no manual rate => error.
- Cryptocurrency support is manual-first unless the provider offers the pair.
- Rates must be positive finite numbers.

---

## 10) Implementation notes (fit with current code)

- Currency remains a first-class type (`CurrencyValue`, `CurrencyUnitValue`).
- ISO codes are treated as built-in currency tokens that render as suffixes by default.
- `to` / `in` conversion should detect currency targets and route through FX conversion logic.
- Manual rate declarations are detected when a currency code variable is assigned a value in a different currency.
