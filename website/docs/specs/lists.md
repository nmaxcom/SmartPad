---
title: "Lists"
description: "Defines list creation, aggregations, filtering, mapping, sorting, indexing, and unit-safe list operations."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Lists</h3>
<p><strong>What this unlocks:</strong> Defines list creation, aggregations, filtering, mapping, sorting, indexing, and unit-safe list operations.</p>
<p><strong>Why teams care:</strong> Treat line-based notes like structured datasets when you need analysis depth.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Lists.spec.md">docs/Specs/Lists.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade lists behavior in real SmartPad sheets.

## Live playground

<ExamplePlayground title={"Lists quick win"} description={"Copy, run, and adapt this baseline to your own sheet."} code={"xs = 10, 20, 30\nys = xs[2..2]\nys =>20\ncount(ys) => 1"} />

<ExamplePlayground title={"Lists guardrail check"} description={"Use this to understand expected behavior around edge conditions."} code={"x = 20\ncount(x) => ⚠️ Expected list"} />

## Design notes

- Keep formulas legible by splitting intent into named lines before collapsing math.
- Prefer explicit conversions and target units instead of inferring context from nearby lines.
- Validate expected output with at least one positive and one guardrail-oriented example.

## Common pitfalls

- Display strings are not always canonical values; verify the target unit/currency explicitly.
- Keep context (unit, locale, currency) explicit when composing lines across domains.

## Capability map

- Overview: what a “list” is and why it matters
- What counts as a list
- Limits
- Creating lists
- Display, formatting, and ambiguity rules
- Applying units/currency to whole lists
- Aggregations (reduce list → scalar)
- Indexing and slicing
- Sorting and ordering
- Filtering
- Mapping (element-wise transforms)
- Pairwise operations (zip behavior)

## Deep reference

- Canonical behavior contract: [Lists.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Lists.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
