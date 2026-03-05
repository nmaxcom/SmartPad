---
title: "Modulo Operator"
description: "Use `mod` or `%` for remainder math with predictable precedence."
sidebar_position: 13
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Modulo Operator</h2>
<p>Use <code>mod</code> or <code>%</code> for remainder math with predictable precedence.</p>
</div>

## What this feature gives you

- Readable remainder arithmetic (`a mod b`).
- `%` parity for users who prefer symbolic notation.
- Stable precedence with multiplication/division.

## Syntax and usage contract

- `a mod b`
- `a % b`
- Works in mixed expressions and with variables.

## Runnable examples

<ExamplePlayground title={"Basic modulo"} description={"Remainder of integer division."} code={"10 mod 3 =>\n10 % 3 =>"} />

<ExamplePlayground title={"Precedence with multiply"} description={"Modulo shares precedence with `*` and `/`."} code={"10 mod 3 * 2 =>\n(10 mod 3) * 2 =>"} />

<ExamplePlayground title={"Variable-based modulo"} description={"Use modulo in formula lines."} code={"cycle = 39\ncycle mod 4 =>"} />

## Guardrail examples

<ExamplePlayground title={"Negative dividend behavior"} description={"Negative inputs preserve SmartPad arithmetic semantics."} code={"-10 mod 3 =>"} />

## Critical behavior rules

- `mod` and `%` are equivalent.
- Left-to-right evaluation applies at the same precedence level.
- Works with parenthesized expressions.

## Power-user checklist

- Use `mod` when readability matters for non-technical readers.
- Use parentheses when reviewing complex mixed arithmetic.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Modulo.spec.md">docs/Specs/Modulo.spec.md</a></p>
