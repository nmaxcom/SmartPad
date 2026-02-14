---
title: "Currency and FX"
description: "Model money with robust unit behavior, conversion syntax, and FX source rules."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Math and Units</p>
<h2>Currency and FX</h2>
<p>Model money with robust unit behavior, conversion syntax, and FX source rules.</p>
</div>

## Why this matters

Global planning only works when conversion behavior is explicit and trustworthy.

## Use it when

- You plan across currencies and need conversion rules that users can trust.
- You compare scenarios with manual rates versus live FX behavior.
- You want readable outputs without losing unit correctness.

## Try it in SmartPad

<ExamplePlayground title={"Currency and FX: quick win"} description={"Run this interactive example and tweak values immediately."} code={"price = $19.99\nprice in EUR => EUR 18.42\n\nrate = CAD 120\nrate in USD => $88.35\n\nbtc = BTC 0.015\nbtc in USD => $937.42"} />

## What this feature guarantees

- Goals
- Currency units and symbols
- Conversion syntax (must use `to` / `in`)
- FX conversion behavior
- Manual FX overrides (take precedence)
- Currency with units (rates)
- Formatting and display
- Settings indicator (status + provider)
- Regular user examples (syntax)
- Edge cases and guardrails

## Common mistakes

- Use exact SmartPad syntax first, then optimize for brevity.
- Check edge and guardrail behavior before scaling your sheet.
- Treat formatted display as presentation, not implicit conversion logic.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Currency.spec.md">docs/Specs/Currency.spec.md</a></p>
