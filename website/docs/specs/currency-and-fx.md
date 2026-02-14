---
title: "Currency and FX"
description: "Covers currency units, FX conversion, manual overrides, and formatting rules for money calculations."
---

<div className="guide-masthead">

**What this unlocks:** Covers currency units, FX conversion, manual overrides, and formatting rules for money calculations.

**Source spec:** [docs/Specs/Currency.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Currency.spec.md)

</div>

## Why this matters

This guide translates the Currency and FX contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Copy these into a SmartPad sheet and watch live results update as you type.

### Happy path
```smartpad
price = $19.99
price in EUR => EUR 18.42

rate = CAD 120
rate in USD => $88.35

btc = BTC 0.015
btc in USD => $937.42
```

## Common pitfalls

- Use the documented syntax exactly; SmartPad intentionally avoids ambiguous shorthand.
- Watch edge-case behavior and guardrails before assuming spreadsheet-style coercions.
- Display formatting can differ from internal values; verify conversion targets explicitly.

## Capability map

- 0) Goals
- 1) Currency units and symbols
- 2) Conversion syntax (must use `to` / `in`)
- 3) FX conversion behavior
- 4) Manual FX overrides (take precedence)
- 5) Currency with units (rates)
- 6) Formatting and display
- 7) Settings indicator (status + provider)
- 8) Regular user examples (syntax)
- 9) Edge cases and guardrails
- 10) Implementation notes (fit with current code)

## Deep reference

- Canonical behavior contract: [Currency.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Currency.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
