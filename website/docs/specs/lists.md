---
title: "Lists"
description: "Model repeated values with aggregation, mapping, filtering, and zip math."
sidebar_position: 13
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Lists</h2>
<p>Model repeated values with aggregation, mapping, filtering, and zip math.</p>
</div>

## What this feature gives you

- Lists make one-line calculations scale to many values
- Aggregators reduce lists to scalar decisions
- Element-wise operations preserve units and currencies

## Syntax and usage contract

- List literal: comma-separated values (`costs = $12, $15, $9`).
- Filter: `xs where > 10` / `xs where = 0.3`.
- Zip math requires matching list lengths.

## Runnable examples

<ExamplePlayground title={"Monthly expense summary"} description={"Aggregate costs, inspect max, and compute average quickly."} code={"rent = $1250\nutilities = $185\ninternet = $75\nsubscriptions = $49.99\nexpenses = rent, utilities, internet, subscriptions\nsum(expenses) =>\navg(expenses) =>\nmax(expenses) =>"} />

<ExamplePlayground title={"Percent distribution"} description={"Turn category totals into contribution percentages."} code={"expenses = $1250, $185, $75, $49.99\ntotal = sum(expenses) =>\nexpenses / total as % =>"} />

<ExamplePlayground title={"Fitness volume via zip multiply"} description={"Element-wise list math for set planning."} code={"weights = 80 kg, 85 kg, 90 kg\nreps = 5, 5, 3\nvolume = weights * reps =>\nsum(volume) =>"} />

## Guardrail examples

<ExamplePlayground title={"Nested list rejection"} description={"Aggregators reject nested list shapes."} code={"rent = 1200, 1200\nutilities = 200, 200\nexpenses = rent, utilities\nsum(expenses) =>"} />

<ExamplePlayground title={"Zip length mismatch"} description={"Pairwise operations require equal list lengths."} code={"a = 1, 2, 3\nb = 10, 20\na + b =>"} />

## Critical behavior rules

- **Element-wise arithmetic by default**
- incompatible units raise an error

## Power-user checklist

- Use named list variables before chaining advanced operations.
- Validate list length assumptions before pairwise arithmetic.
- Keep list element dimensions compatible to avoid hard errors.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Lists.spec.md">docs/Specs/Lists.spec.md</a></p>
