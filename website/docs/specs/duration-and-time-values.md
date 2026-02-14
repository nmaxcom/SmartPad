---
title: "Duration and Time Values"
description: "Defines duration literals, time-of-day values, datetime arithmetic, and parsing disambiguation rules."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Duration and Time Values</h3>
<p><strong>What this unlocks:</strong> Defines duration literals, time-of-day values, datetime arithmetic, and parsing disambiguation rules.</p>
<p><strong>Why teams care:</strong> Handle schedules, lead times, and elapsed calculations with reliable unit math.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/duration.spec.md">docs/Specs/duration.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade duration and time values behavior in real SmartPad sheets.

## Live playground

Examples for this feature are being backfilled. Add examples to the source spec and regenerate docs.

## Design notes

- Keep formulas legible by splitting intent into named lines before collapsing math.
- Prefer explicit conversions and target units instead of inferring context from nearby lines.
- Validate expected output with at least one positive and one guardrail-oriented example.

## Common pitfalls

- Use the documented syntax exactly; SmartPad avoids ambiguous shorthand on purpose.
- Keep context (unit, locale, currency) explicit when composing lines across domains.

## Capability map

- 1) New concept: `Duration` is a first-class value (not just “unit math”)
- 2) Time-of-day values: support `Time` as distinct from `DateTime`
- 3) Conversions: `to` should work for Duration and Time
- 4) DateTime + Duration parsing: accept “duration phrases” without punctuation
- 5) Disambiguation + safety rules (stuff that will bite you later)
- 6) Concrete expected outputs for your 3 failing lines
- 7) Extra examples you probably want tests for (high value)

## Deep reference

- Canonical behavior contract: [duration.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/duration.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
