---
title: "Plotting and Dependency Views"
description: "Turn a sheet into something you can explore, not just read."
sidebar_position: 12
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>Plotting and Dependency Views</h2>
<p>Turn a sheet into something you can explore, not just read.</p>
</div>

## What this helps with

- Explore how results depend on chosen inputs
- Persist key insights as detached `@view` blocks
- Keep text as source-of-truth while visuals stay synchronized

## How to use it

- `@view` lines bind to the expression directly above.
- Use `x=...` to define the independent variable.
- Optional params include `domain`, `view`, `ydomain`, `yview`, and `size`.

## Examples to try

<ExamplePlayground title={"Investment growth exploration"} description={"Track growth sensitivity by varying years."} code={"principal = $12000\nannual return = 9%\nyears = 18\nestimated value = principal * (1 + annual return)^years\n@view plot x=years domain=0..40"} />

<ExamplePlayground title={"Two-series comparison"} description={"Compare linear and quadratic behavior in one view."} code={"x = 4\nf = 2*x + 1\ng = x^2\n@view plot x=x y=f,g"} />

<ExamplePlayground title={"Viewport control"} description={"Persist exploration zoom and y-axis intent."} code={"principal = $8000\nrate = 6%\nyears = 30\nfuture = principal * (1 + rate)^years\n@view plot x=years domain=0..40 view=5..25 ydomain=0..50000"} />

## When SmartPad should push back

<ExamplePlayground title={"Malformed directive"} description={"Keep `@view` syntax strict and explicit."} code={"revenue = 12000\ncost = 9000\nprofit = revenue - cost =>\n@view plot years"} />

<ExamplePlayground title={"Disconnected source"} description={"View should enter recoverable disconnected state if source disappears."} code={"f = 2*x + 1\n@view plot x=x\nf = unknownVar + 1"} />

## Good habits

- Keep the plotted expression directly above the `@view` line.
- Use explicit `domain` when automatic inference hides useful regions.
- Quote multi-series `y=` values if you include spaces.
