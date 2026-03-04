---
title: "Explicit Trigger (`=>`)"
description: "Use `=>` when you want deliberate evaluation, explicit errors, or solve execution."
sidebar_position: 11
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Explicit Trigger (`=>`)</h2>
<p>Use `=>` when you want deliberate evaluation, explicit errors, or solve execution.</p>
</div>

## What this feature gives you

- Deterministic explicit evaluation intent.
- Explicit error surfacing on the same line.
- Authoritative solve trigger path (`target =>` and `solve ... =>`).

## Syntax and usage contract

- Expression trigger: `expression =>`
- Assignment + result trigger: `variable = expression =>`
- Implicit solve/value request: `target =>`
- Explicit solve: `solve target in equation =>`

## Runnable examples

<ExamplePlayground title={"Explicit expression output"} description={"Force visible result output on key lines."} code={"hours = 40\nrate = $82/hour\ngross = hours * rate =>"} />

<ExamplePlayground title={"Explicit error surfacing"} description={"Use `=>` to intentionally surface unresolved issues."} code={"unknown_var + 5 =>"} />

<ExamplePlayground title={"Explicit solve trigger"} description={"Solve workflows require explicit trigger syntax."} code={"solve qty in total = price * qty =>"} />

## Guardrail examples

<ExamplePlayground title={"Solve without trigger is not executable"} description={"`solve ...` must end with `=>` to run."} code={"solve x in y = 2 * x"} />

<ExamplePlayground title={"Malformed explicit solve"} description={"Invalid solve forms return explicit solve errors."} code={"solve v distance = v * time =>"} />

## Critical behavior rules

- Live result previews do not replace explicit `=>` workflows.
- `solve ...` without `=>` is not an executable solve request.
- Template normalization preserves `=>` on solve and explicit error-demo lines.

## Power-user checklist

- Keep `=>` on final outputs for review clarity.
- Use `=>` when you want errors shown intentionally instead of live suppression.
- Use `=>` for solve lines even when live results are enabled.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ExplicitTrigger.spec.md">docs/Specs/ExplicitTrigger.spec.md</a></p>
