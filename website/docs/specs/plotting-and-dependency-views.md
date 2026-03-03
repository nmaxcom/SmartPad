---
title: "Plotting and Dependency Views"
description: "Turn expressions into exploratory views with `@view` directives."
sidebar_position: 10
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Plotting and Dependency Views</h2>
<p>Turn expressions into exploratory views with `@view` directives.</p>
</div>

## What this feature gives you

- Explore how results depend on chosen inputs
- Persist key insights as detached `@view` blocks
- Keep text as source-of-truth while visuals stay synchronized

## Syntax and usage contract

- `@view` lines bind to the expression directly above.
- Use `x=...` to define the independent variable.
- Optional params include `domain`, `view`, `ydomain`, `yview`, and `size`.

## Runnable examples

<ExamplePlayground title={"Investment growth exploration"} description={"Track growth sensitivity by varying years."} code={"principal = $12000\nannual return = 9%\nyears = 18\nestimated value = principal * (1 + annual return)^years =>\n@view plot x=years domain=0..40"} />

<ExamplePlayground title={"Two-series comparison"} description={"Compare linear and quadratic behavior in one view."} code={"x = 4\nf = 2*x + 1\ng = x^2\n@view plot x=x y=f,g"} />

<ExamplePlayground title={"Viewport control"} description={"Persist exploration zoom and y-axis intent."} code={"principal = $8000\nrate = 6%\nyears = 30\nfuture = principal * (1 + rate)^years =>\n@view plot x=years domain=0..40 view=5..25 ydomain=0..50000"} />

## Guardrail examples

<ExamplePlayground title={"Malformed directive"} description={"Keep `@view` syntax strict and explicit."} code={"revenue = 12000\ncost = 9000\nprofit = revenue - cost =>\n@view plot years"} />

<ExamplePlayground title={"Disconnected source"} description={"View should enter recoverable disconnected state if source disappears."} code={"f = 2*x + 1\n@view plot x=x\nf = unknownVar + 1"} />

## Critical behavior rules

- Recover gracefully from document edits, errors, and re-wiring
- must offer explicit recovery paths
- Plots never become the primary control surface
- `<kind>` defaults to `plot` if omitted
- edits preserve intent when possible
- Percentages: clamped to sensible bounds (never cross invalid zones silently)

## Power-user checklist

- Keep the plotted expression directly above the `@view` line.
- Use explicit `domain` when automatic inference hides useful regions.
- Quote multi-series `y=` values if you include spaces.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Plotting.spec.md">docs/Specs/Plotting.spec.md</a></p>
