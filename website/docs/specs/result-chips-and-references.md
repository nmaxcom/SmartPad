---
title: "Result Chips and References"
description: "Reuse computed values safely with chips, hidden references, and dependency awareness."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Core Experience</p>
<h2>Result Chips and References</h2>
<p>Reuse computed values safely with chips, hidden references, and dependency awareness.</p>
</div>

## Why this matters

Turn one-off lines into composable building blocks without losing readability.

## Use it when

- You want faster iteration without switching contexts.
- You need readable formulas that teammates can follow.
- You want reliable behavior under real user inputs.

## Try it in SmartPad

<ExamplePlayground title={"Result Chips and References: quick win"} description={"Run this interactive example and tweak values immediately."} code={"monthly rent = 2500                              [2,500]\nphone bill   = 45                                   [45]\nfood = 50/day * 30 days                          [1,500]\ntotal cost per month                             [4,045]"} />

<ExamplePlayground title={"Result Chips and References: edge behavior"} description={"Use this to understand guardrails and failure modes."} code={"subtotal = 120                                      [120]\ntax = [subtotal] * 0.15                              [18]\n\n# source line later breaks:\nsubtotal = 12 / 0                                    [⚠ Division by zero]\ntax = [subtotal ⚠] * 0.15                            ⚠ source line has error"} />

## What this feature guarantees

- Product Intent
- Scope
- UX Pillars
- Feature Overview
- Visual System
- Interaction Model
- Broken Dependency UX (Requested "tax" case)
- Internal Data Model
- System Integration
- Interaction Rules and Edge Cases

## Common mistakes

- Check edge and guardrail behavior before scaling your sheet.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ResultChipsAndValueGraph.spec.md">docs/Specs/ResultChipsAndValueGraph.spec.md</a></p>
