---
title: "Result Chips and References"
description: "Reuse results as draggable, copyable chips with stable dependency links."
sidebar_position: 9
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Result Chips and References</h2>
<p>Reuse results as draggable, copyable chips with stable dependency links.</p>
</div>

## What this feature gives you

- Live and trigger results share one interaction contract
- Click/drag/paste chips to build formulas
- Stable source-linked references survive reorder and edits

## Syntax and usage contract

- Chips insert hidden reference nodes, not brittle line-number text.
- Rich copy/paste preserves reference identity for SmartPad round trips.
- External plain-text export follows `referenceTextExportMode` policy.

## Runnable examples

<ExamplePlayground title={"Reference-first budgeting"} description={"Build totals by inserting chips instead of retyping values."} code={"monthly rent = $2500\nphone bill = $45\nfood/day = $50\nfood total = food/day * 30 =>\nmonthly total = monthly rent + phone bill + food total =>"} />

<ExamplePlayground title={"Percent workflows with chip reuse"} description={"Use prior results as clean inputs for taxes and discounts."} code={"subtotal = $420\ntax = 8.5% on subtotal =>\ndiscount = 15% off subtotal =>\nfinal total = subtotal + tax - discount =>"} />

<ExamplePlayground title={"Reference chains across units"} description={"Referenced values keep semantic types (currency/unit/list)."} code={"distance = 42 km\ntime = 52 min\nspeed = distance / time =>\nspeed in km/h =>"} />

## Guardrail examples

<ExamplePlayground title={"Broken source behavior"} description={"Downstream references should clearly indicate source failure."} code={"subtotal = 120\ntax = subtotal * 0.15 =>\nsubtotal = 12 / 0\ntax =>"} />

<ExamplePlayground title={"Cycle prevention mindset"} description={"Avoid making a line depend on itself through chip insertion."} code={"base = 100\nprofit = base * 0.2 =>\nbase = profit + 50"} />

## Critical behavior rules

- Broken-source states and dependency error UX.
- Reference value payload must resolve from the rendered chip text first (then `aria-label`/`title`), and only use `data-result` as last-resort fallback.
- In-flight drag payload must survive transient `dragleave` events so drop insertion remains reliable during normal pointer movement.
- Drop cursor should be visually prominent (thicker/high-contrast) so line insertion is easy to target.
- Last-line drop should expose a generous bottom drop band that creates a new line when dropped near the editor bottom.
- Boundary targeting must use one canonical resolver where the shown boundary indicator and the final insertion boundary are the same target.
- Boundary insertion must tolerate missing paragraph `data-line-id` in the DOM by falling back to textblock line index, not defaulting silently to document end.
- Dragging result chips must not trigger sheet/file import drop overlays.
- Inserted reference chip label must match the exact visible source result, not the source expression text.
- Bottom drop affordance must remain visible near the end of the document, including last-line drop for newline insertion.

## Power-user checklist

- Prefer chip insertion for dependency-heavy sheets to reduce typo risk.
- When a source breaks, inspect warning chips first before rewriting lines.
- Use copy-value action for external sharing; keep references for in-app work.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ResultChipsAndValueGraph.spec.md">docs/Specs/ResultChipsAndValueGraph.spec.md</a></p>
