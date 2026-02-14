---
title: "Plotting and Dependency Views"
description: "Specifies exploratory plotting, detached views, and dependency-driven visualization flows."
---

<div className="guide-masthead">

**What this unlocks:** Specifies exploratory plotting, detached views, and dependency-driven visualization flows.

**Source spec:** [docs/Specs/Plotting.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Plotting.spec.md)

</div>

## Why this matters

This guide translates the Plotting and Dependency Views contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Copy these into a SmartPad sheet and watch live results update as you type.

### Happy path
```smartpad
a + b => 20%
```

## Common pitfalls

- Use the quick examples first, then verify behavior against your own sheet data.

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
