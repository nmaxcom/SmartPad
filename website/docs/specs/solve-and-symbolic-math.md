---
title: "Solve and Symbolic Math"
description: "Back-solve unknowns from nearby equations with implicit and explicit solve flows."
sidebar_position: 10
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Solve and Symbolic Math</h2>
<p>Back-solve unknowns from nearby equations with implicit and explicit solve flows.</p>
</div>

## What this feature gives you

- Solve unknowns from equations above the current line.
- Return symbolic expressions when data is missing.
- Return numeric values when assumptions or known values are available.

## Syntax and usage contract

- Implicit solve: `target =>` (example: `qty =>`).
- Explicit solve: `solve target in equation =>`.
- Explicit solve can include inline assumptions: `solve v in distance = v * time, time = 2 s =>`.
- `where` clauses are accepted syntax in explicit solve lines.

## Runnable examples

<ExamplePlayground title={"Implicit symbolic to numeric solve"} description={"Start symbolic, then resolve after adding known values."} code={"distance = v * time\nv =>\ndistance = 40 m\ntime = 2 s\nv =>"} />

<ExamplePlayground title={"Explicit solve with inline assumptions"} description={"Compute directly in one line."} code={"solve v in distance = v * time, time = 2 s, distance = 40 m =>"} />

<ExamplePlayground title={"Standalone equation solve"} description={"Use plain equations without assignment syntax."} code={"3 * x + 2 = 0\nx =>"} />

## Guardrail examples

<ExamplePlayground title={"No equation found"} description={"Solve target must exist in a valid equation above or inline."} code={"missing_target =>"} />

<ExamplePlayground title={"Variable on both sides"} description={"Unsupported algebra forms return explicit solve errors."} code={"v = v + 1\nv =>"} />

## Critical behavior rules

- Solve only looks upward in the sheet (no equations below the current solve line).
- The closest compatible equation above is preferred.
- Explicit solve must include `=>`.
- Unsupported inversions return explicit `Cannot solve: ...` errors.

## Power-user checklist

- Use inline assumptions in explicit solve for reproducible one-line calculations.
- Use implicit `target =>` for quick back-solving while drafting.
- Prefer explicit `solve ... =>` when sharing or reviewing models.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Solve.spec.md">docs/Specs/Solve.spec.md</a></p>
