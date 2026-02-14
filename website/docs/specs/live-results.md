---
title: "Live Results"
description: "Show evaluable results while typing, keep => behavior unchanged, and suppress noisy/error-prone previews."
---

<div className="guide-masthead">

**What this unlocks:** Show evaluable results while typing, keep => behavior unchanged, and suppress noisy/error-prone previews.

**Source spec:** [docs/Specs/LiveResult.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/LiveResult.spec.md)

</div>

## Why this matters

This guide translates the Live Results contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Examples for this feature are being backfilled. Add examples in the linked spec and regenerate docs.

## Common pitfalls

- Use the quick examples first, then verify behavior against your own sheet data.

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
