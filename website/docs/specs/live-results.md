---
title: "Live Results"
description: "Show evaluable results while typing, keep => behavior unchanged, and suppress noisy/error-prone previews."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Live Results</h3>
<p><strong>What this unlocks:</strong> Show evaluable results while typing, keep => behavior unchanged, and suppress noisy/error-prone previews.</p>
<p><strong>Why teams care:</strong> Keep cognitive flow intact by seeing outcomes the moment an expression becomes valid.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/LiveResult.spec.md">docs/Specs/LiveResult.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade live results behavior in real SmartPad sheets.

## Live playground

Examples for this feature are being backfilled. Add examples to the source spec and regenerate docs.

## Design notes

- Keep formulas legible by splitting intent into named lines before collapsing math.
- Prefer explicit conversions and target units instead of inferring context from nearby lines.
- Validate expected output with at least one positive and one guardrail-oriented example.

## Common pitfalls

- Build from small named steps first, then collapse into concise formulas.

## Capability map

- 0) Goals
- 1) Setting
- 2) Core Behavior
- 3) Line Eligibility (What Live Result Should Ignore)
- 4) State and Side-Effect Safety
- 5) Debounce and Timing
- 6) Visual Treatment
- 7) Unknown Variables and Incomplete Input
- 8) Counters / Observability
- 9) Acceptance Criteria
- 10) Test Plan
- 11) Out of Scope (V1)

## Deep reference

- Canonical behavior contract: [LiveResult.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/LiveResult.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
