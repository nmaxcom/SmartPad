---
title: "Ranges"
description: "Generate numeric/date/time lists with predictable `..` span semantics."
sidebar_position: 14
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Ranges</h2>
<p>Generate numeric/date/time lists with predictable `..` span semantics.</p>
</div>

## What this feature gives you

- `..` builds sequences faster than manual list typing
- Step semantics are explicit, directional, and guardrailed
- Range outputs compose with list math and conversions

## Syntax and usage contract

- Numeric: `<start>..<end>` or `<start>..<end> step <step>`.
- Temporal ranges require explicit duration step.
- `to <unit>` annotates/converts range-produced lists under list rules.

## Runnable examples

<ExamplePlayground title={"Numeric scenarios"} description={"Build sensitivity ranges with custom step size."} code={"1..5 =>\n0..10 step 2 =>\n(1..5) * 2 =>\nsum(1..5) =>"} />

<ExamplePlayground title={"Descending ranges"} description={"Default step follows direction when omitted."} code={"6..2 =>\n10..0 step -2 =>"} />

<ExamplePlayground title={"Range + unit annotation"} description={"Annotate generated unitless ranges with target units."} code={"1..5 to kg =>\n0..10 step 2 to m/s =>"} />

## Guardrail examples

<ExamplePlayground title={"Invalid triple-dot typo"} description={"`...` is rejected instead of silently auto-corrected."} code={"1...5 =>"} />

<ExamplePlayground title={"Step direction mismatch"} description={"Step sign must match range direction."} code={"0..10 step -2 =>\n10..0 step 2 =>"} />

## Critical behavior rules

- Date/time endpoints in range literals (this spec includes a proposed extension below)
- If `start < end`, default `step = 1`
- If `start > end`, default `step = -1`
- Keep guardrails and inclusivity rules consistent
- `time` is local-time by default
- Guardrail as a setting (readable by evaluator)

## Power-user checklist

- Use `step` explicitly when sequence size matters for performance.
- Check max generated list size when exploring large spans.
- Prefer `..` for generation and reserve `to/in` for conversions.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Ranges.spec.md">docs/Specs/Ranges.spec.md</a></p>
