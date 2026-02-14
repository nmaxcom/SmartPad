---
title: "Result Chips and References"
description: "Defines chip interactions, hidden references, dependency behavior, and result-lane UX in the editor."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Result Chips and References</h3>
<p><strong>What this unlocks:</strong> Defines chip interactions, hidden references, dependency behavior, and result-lane UX in the editor.</p>
<p><strong>Why teams care:</strong> Turn lines into reusable building blocks without losing readability.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ResultChipsAndValueGraph.spec.md">docs/Specs/ResultChipsAndValueGraph.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade result chips and references behavior in real SmartPad sheets.

## Live playground

<ExamplePlayground title={"Result Chips and References quick win"} description={"Copy, run, and adapt this baseline to your own sheet."} code={"monthly rent = 2500                              [2,500]\nphone bill   = 45                                   [45]\nfood = 50/day * 30 days                          [1,500]\ntotal cost per month                             [4,045]"} />

<ExamplePlayground title={"Result Chips and References guardrail check"} description={"Use this to understand expected behavior around edge conditions."} code={"subtotal = 120                                      [120]\ntax = [subtotal] * 0.15                              [18]\n\n# source line later breaks:\nsubtotal = 12 / 0                                    [⚠ Division by zero]\ntax = [subtotal ⚠] * 0.15                            ⚠ source line has error"} />

## Design notes

- Keep formulas legible by splitting intent into named lines before collapsing math.
- Prefer explicit conversions and target units instead of inferring context from nearby lines.
- Validate expected output with at least one positive and one guardrail-oriented example.

## Common pitfalls

- Check guardrails before assuming spreadsheet-style coercion rules.

## Capability map

- 0) Product Intent
- 1) Scope
- 2) UX Pillars
- 3) Feature Overview
- 4) Visual System
- 5) Interaction Model
- 6) Broken Dependency UX (Requested "tax" case)
- 7) Internal Data Model
- 8) System Integration
- 9) Interaction Rules and Edge Cases
- 10) Accessibility
- 11) Performance Targets

## Deep reference

- Canonical behavior contract: [ResultChipsAndValueGraph.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ResultChipsAndValueGraph.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
