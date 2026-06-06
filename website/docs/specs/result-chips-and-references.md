---
title: "Result Chips and References"
description: "Reuse previous results without retyping values or losing where they came from."
sidebar_position: 11
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>Result Chips and References</h2>
<p>Reuse previous results without retyping values or losing where they came from.</p>
</div>

## What this helps with

- Live and triggered results behave the same once SmartPad has enough information
- Click/drag/paste chips to build formulas
- Stable source-linked references survive reorder and edits

## How to use it

- Chips insert hidden reference nodes, not brittle line-number text.
- Rich copy/paste preserves reference identity for SmartPad round trips.
- External plain-text export follows `referenceTextExportMode` policy.

## Examples to try

<ExamplePlayground title={"Reference-first budgeting"} description={"Build totals by inserting chips instead of retyping values."} code={"monthly rent = $2500\nphone bill = $45\nfood/day = $50\nfood total = food/day * 30\nmonthly total = monthly rent + phone bill + food total"} />

<ExamplePlayground title={"Percent workflows with chip reuse"} description={"Use prior results as clean inputs for taxes and discounts."} code={"subtotal = $420\ntax = 8.5% on subtotal\ndiscount = 15% off subtotal\nfinal total = subtotal + tax - discount"} />

<ExamplePlayground title={"Reference chains across units"} description={"Referenced values keep semantic types (currency/unit/list)."} code={"distance = 42 km\ntime = 52 min\nspeed = distance / time\nspeed in km/h"} />

## When SmartPad should push back

<ExamplePlayground title={"Broken source behavior"} description={"Downstream references should clearly indicate source failure."} code={"subtotal = 120\ntax = subtotal * 0.15 =>\nsubtotal = 12 / 0\ntax =>"} />

<ExamplePlayground title={"Cycle prevention mindset"} description={"Avoid making a line depend on itself through chip insertion."} code={"base = 100\nprofit = base * 0.2 =>\nbase = profit + 50"} />

## Good habits

- Prefer chip insertion for dependency-heavy sheets to reduce typo risk.
- When a source breaks, inspect warning chips first before rewriting lines.
- Use copy-value action for external sharing; keep references for in-app work.
