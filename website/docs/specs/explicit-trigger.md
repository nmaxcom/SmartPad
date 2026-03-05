---
title: "Explicit Trigger (`=>`)"
description: "Use `=>` when you want deliberate evaluation, explicit errors, or deterministic solve execution."
sidebar_position: 11
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Explicit Trigger (`=>`)</h2>
<p>Use `=>` when you want deliberate evaluation, explicit errors, or deterministic solve execution.</p>
</div>

## What this feature gives you

- Deterministic explicit evaluation intent.
- Explicit error surfacing on the same line.
- Authoritative deterministic solve trigger path (`target =>` and `solve ... =>`).

## Syntax and usage contract

- Expression trigger: `expression =>`
- Assignment + result trigger: `variable = expression =>`
- Implicit solve/value request: `target =>`
- Explicit solve (deterministic): `solve target in equation =>`
- Live-mode explicit solve (setting-dependent): `solve target in equation`

## Runnable examples

<ExamplePlayground title={"Explicit expression output"} description={"Force visible result output on key lines."} code={"hours = 40\nrate = $82/hour\ngross = hours * rate =>"} />

<ExamplePlayground title={"Explicit error surfacing"} description={"Use `=>` to intentionally surface unresolved issues."} code={"unknown_var + 5 =>"} />

<ExamplePlayground title={"Explicit solve trigger"} description={"Keep deterministic solve behavior across settings."} code={"solve qty in total = price * qty =>"} />

## Guardrail examples

<ExamplePlayground title={"Live-mode solve without trigger"} description={"Without `=>`, solve can run as live preview when Live Results is enabled."} code={"y = 40 m\nx = 2 s\nsolve v in y = v * x"} />

<ExamplePlayground title={"Malformed explicit solve"} description={"Invalid solve forms return explicit solve errors."} code={"solve v distance = v * time =>"} />

## Critical behavior rules

- Live result previews do not replace explicit `=>` workflows.
- `solve ... =>` is deterministic and works even when live previews are off.
- `solve ...` without `=>` is currently a live-preview path (setting-dependent).
- Template normalization preserves `=>` on solve and explicit error-demo lines.

## Power-user checklist

- Keep `=>` on final outputs for review clarity.
- Use `=>` when you want errors shown intentionally instead of live suppression.
- Use `=>` for solve lines you need to run regardless of Live Results settings.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ExplicitTrigger.spec.md">docs/Specs/ExplicitTrigger.spec.md</a></p>
