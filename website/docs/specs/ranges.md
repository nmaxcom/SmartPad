---
title: "Ranges"
description: "Defines numeric and date/time range generation, step rules, guardrails, and list interoperability."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Ranges</h3>
<p><strong>What this unlocks:</strong> Defines numeric and date/time range generation, step rules, guardrails, and list interoperability.</p>
<p><strong>Why teams care:</strong> Generate planning horizons, projections, and schedules without manual fill operations.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Ranges.spec.md">docs/Specs/Ranges.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade ranges behavior in real SmartPad sheets.

## Live playground

<ExamplePlayground title={"Ranges quick win"} description={"Copy, run, and adapt this baseline to your own sheet."} code={"<start>..<end>\n<start>..<end> step <step>"} />

<ExamplePlayground title={"Ranges guardrail check"} description={"Use this to understand expected behavior around edge conditions."} code={"0..10 step 0 =>⚠️ step cannot be 0"} />

## Design notes

- Keep formulas legible by splitting intent into named lines before collapsing math.
- Prefer explicit conversions and target units instead of inferring context from nearby lines.
- Validate expected output with at least one positive and one guardrail-oriented example.

## Common pitfalls

- Use the documented syntax exactly; SmartPad avoids ambiguous shorthand on purpose.
- Check guardrails before assuming spreadsheet-style coercion rules.
- Keep context (unit, locale, currency) explicit when composing lines across domains.

## Capability map

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
- Notes for implementation order (recommended)

## Deep reference

- Canonical behavior contract: [Ranges.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Ranges.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
