---
title: "Plotting and Dependency Views"
description: "Specifies exploratory plotting, detached views, and dependency-driven visualization flows."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Plotting and Dependency Views</h3>
<p><strong>What this unlocks:</strong> Specifies exploratory plotting, detached views, and dependency-driven visualization flows.</p>
<p><strong>Why teams care:</strong> Move from raw values to visual intuition with near-zero setup.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Plotting.spec.md">docs/Specs/Plotting.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade plotting and dependency views behavior in real SmartPad sheets.

## Live playground

<ExamplePlayground title={"Plotting and Dependency Views quick win"} description={"Copy, run, and adapt this baseline to your own sheet."} code={"a + b => 20%"} />

## Design notes

- Keep formulas legible by splitting intent into named lines before collapsing math.
- Prefer explicit conversions and target units instead of inferring context from nearby lines.
- Validate expected output with at least one positive and one guardrail-oriented example.

## Common pitfalls

- Build from small named steps first, then collapse into concise formulas.

## Capability map

- 0. Purpose
- 1. Core Philosophy & Non-Negotiables
- 2. Mental Model
- 3. High-Level UX Flow
- 4. Persistent Views (Detached Views)
- 5. Mini-Grammar for `@view`
- 6. Binding Rules
- 7. View Lifecycle States
- 8. Domain Inference Rules
- 9. Pan & Zoom
- 10. Chart Size
- 11. Multiple Series & Lists

## Deep reference

- Canonical behavior contract: [Plotting.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Plotting.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
