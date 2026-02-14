---
title: "Currency and FX"
description: "Covers currency units, FX conversion, manual overrides, and formatting rules for money calculations."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Currency and FX</h3>
<p><strong>What this unlocks:</strong> Covers currency units, FX conversion, manual overrides, and formatting rules for money calculations.</p>
<p><strong>Why teams care:</strong> Model global pricing and planning in one sheet without brittle conversion hacks.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Currency.spec.md">docs/Specs/Currency.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade currency and fx behavior in real SmartPad sheets.

## Live playground

<ExamplePlayground title={"Currency and FX quick win"} description={"Copy, run, and adapt this baseline to your own sheet."} code={"price = $19.99\nprice in EUR => EUR 18.42\n\nrate = CAD 120\nrate in USD => $88.35\n\nbtc = BTC 0.015\nbtc in USD => $937.42"} />

## Currency + FX blueprint

- Run local budgeting in USD while instantly projecting totals to EUR/GBP for planning and approvals.
- Keep manual rates for scenario planning, but preserve live-rate behavior for day-to-day usage.
- Treat conversion syntax (`to` / `in`) as part of the model contract, not just display formatting.

## Common pitfalls

- Use the documented syntax exactly; SmartPad avoids ambiguous shorthand on purpose.
- Check guardrails before assuming spreadsheet-style coercion rules.
- Display strings are not always canonical values; verify the target unit/currency explicitly.

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
