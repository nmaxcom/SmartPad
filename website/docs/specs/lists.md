---
title: "Lists"
description: "Aggregate, map, filter, sort, and index data with unit-aware operations."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Data and Collections</p>
<h2>Lists</h2>
<p>Aggregate, map, filter, sort, and index data with unit-aware operations.</p>
</div>

## Why this matters

Lists let SmartPad behave like a mini analytics notebook without heavy tooling.

## Use it when

- You model repeated values or time windows quickly.
- You need aggregates and filtering without exporting to another tool.
- You want the sheet to stay editable while logic grows.

## Try it in SmartPad

<ExamplePlayground title={"Lists: quick win"} description={"Run this interactive example and tweak values immediately."} code={"xs = 10, 20, 30\nys = xs[2..2]\nys =>20\ncount(ys) => 1"} />

<ExamplePlayground title={"Lists: edge behavior"} description={"Use this to understand guardrails and failure modes."} code={"x = 20\ncount(x) => ⚠️ Expected list"} />

## What this feature guarantees

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

## Common mistakes

- Treat formatted display as presentation, not implicit conversion logic.
- Keep context explicit (units, currencies, locale) when composing formulas.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Lists.spec.md">docs/Specs/Lists.spec.md</a></p>
