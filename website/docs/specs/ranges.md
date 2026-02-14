---
title: "Ranges"
description: "Generate numeric and date ranges for plans, projections, and schedules."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Data and Collections</p>
<h2>Ranges</h2>
<p>Generate numeric and date ranges for plans, projections, and schedules.</p>
</div>

## Why this matters

Range generation removes repetitive manual input and keeps models editable.

## Use it when

- You model repeated values or time windows quickly.
- You need aggregates and filtering without exporting to another tool.
- You want the sheet to stay editable while logic grows.

## Try it in SmartPad

<ExamplePlayground title={"Ranges: quick win"} description={"Run this interactive example and tweak values immediately."} code={"<start>..<end>\n<start>..<end> step <step>"} />

<ExamplePlayground title={"Ranges: edge behavior"} description={"Use this to understand guardrails and failure modes."} code={"0..10 step 0 =>⚠️ step cannot be 0"} />

## What this feature guarantees

- Overview: what range-generated lists are and why they matter
- Design decision: use `..` (not `to`) for range generation
- Scope
- Syntax
- Semantics & rules (Numeric ranges)
- Postfix `to` on lists (Unit annotation vs conversion)
- Maximum list size guardrail (Setting)
- Composition with existing features
- Proposed extension: date and time ranges
- Minimal test suite summary (Numeric v1 + unit postfix)

## Common mistakes

- Use exact SmartPad syntax first, then optimize for brevity.
- Check edge and guardrail behavior before scaling your sheet.
- Keep context explicit (units, currencies, locale) when composing formulas.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Ranges.spec.md">docs/Specs/Ranges.spec.md</a></p>
