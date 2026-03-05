---
title: "Functions and User-Defined Formulas"
description: "Define reusable formulas with positional, named, and default arguments."
sidebar_position: 12
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Functions and User-Defined Formulas</h2>
<p>Define reusable formulas with positional, named, and default arguments.</p>
</div>

## What this feature gives you

- Reusable single-line formula definitions.
- Named/default argument support for clearer calls.
- Semantic typing across units, currency, percentages, and conversions.

## Syntax and usage contract

- Define: `name(param, optional=default) = expression`
- Call positional: `name(value1, value2) =>`
- Call named: `name(param: value) =>`
- Zero-arg functions are supported: `magic() = 42`

## Runnable examples

<ExamplePlayground title={"Named + default args"} description={"Override only what you need."} code={"tip(bill, rate=15%) = bill * rate\ntip(50) =>\ntip(rate: 20%, bill: 50) =>"} />

<ExamplePlayground title={"Dynamic outer scope"} description={"Functions read current variable values at call time."} code={"rate = 10%\ntax(amount) = amount * rate\ntax(100) =>\nrate = 20%\ntax(100) =>"} />

<ExamplePlayground title={"Unit-aware function"} description={"Units and conversions flow through function results."} code={"speed(distance, time) = distance / time\nspeed(150 m, 12 s) =>\nspeed(150 m, 12 s) to km/h =>"} />

## Guardrail examples

<ExamplePlayground title={"Missing arguments"} description={"Calls with missing required params fail explicitly."} code={"square(x) = x * x\nsquare() =>"} />

<ExamplePlayground title={"Unknown named arg"} description={"Named arguments must match declared parameter names."} code={"add(a, b) = a + b\nadd(c: 1, a: 2) =>"} />

## Critical behavior rules

- Function definitions do not use `=>`.
- Redefinition is allowed; latest definition wins.
- Default values are evaluated in current call context.
- Recursive depth is guarded.

## Power-user checklist

- Keep helper functions near the section where they are used.
- Use named args in shared sheets for readability.
- Prefer explicit conversions (`to`/`in`) at call sites for review clarity.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Functions.spec.md">docs/Specs/Functions.spec.md</a></p>
