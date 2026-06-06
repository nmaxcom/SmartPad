---
title: "Ranges"
description: "Generate number, date, and time sequences with `..`."
sidebar_position: 16
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>Ranges</h2>
<p>Generate number, date, and time sequences with `..`.</p>
</div>

## What this helps with

- `..` builds sequences faster than manual list typing
- Steps are explicit, directional, and designed to fail clearly when they do not make sense
- Range outputs compose with list math and conversions

## How to use it

- Numeric: `<start>..<end>` or `<start>..<end> step <step>`.
- Temporal ranges require explicit duration step.
- `to <unit>` annotates/converts range-produced lists under list rules.

## Examples to try

<ExamplePlayground title={"Numeric scenarios"} description={"Build sensitivity ranges with custom step size."} code={"1..5\n0..10 step 2\n(1..5) * 2\nsum(1..5)"} />

<ExamplePlayground title={"Descending ranges"} description={"Default step follows direction when omitted."} code={"6..2\n10..0 step -2"} />

<ExamplePlayground title={"Range + unit annotation"} description={"Annotate generated unitless ranges with target units."} code={"1..5 to kg\n0..10 step 2 to m/s"} />

## When SmartPad should push back

<ExamplePlayground title={"Invalid triple-dot typo"} description={"`...` is rejected instead of silently auto-corrected."} code={"1...5 =>"} />

<ExamplePlayground title={"Step direction mismatch"} description={"Step sign must match range direction."} code={"0..10 step -2 =>\n10..0 step 2 =>"} />

## Good habits

- Use `step` explicitly when sequence size matters for performance.
- Check max generated list size when exploring large spans.
- Prefer `..` for generation and reserve `to/in` for conversions.
