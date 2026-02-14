---
title: "Duration and Time Values"
description: "Defines duration literals, time-of-day values, datetime arithmetic, and parsing disambiguation rules."
---

<div className="guide-masthead">

**What this unlocks:** Defines duration literals, time-of-day values, datetime arithmetic, and parsing disambiguation rules.

**Source spec:** [docs/Specs/duration.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/duration.spec.md)

</div>

## Why this matters

This guide translates the Duration and Time Values contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Examples for this feature are being backfilled. Add examples in the linked spec and regenerate docs.

## Common pitfalls

- Use the documented syntax exactly; SmartPad intentionally avoids ambiguous shorthand.
- Keep units and locale context explicit when combining values from different domains.

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
