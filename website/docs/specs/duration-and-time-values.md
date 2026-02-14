---
title: "Duration and Time Values"
description: "Work with durations, time-of-day values, and datetime arithmetic safely."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Math and Units</p>
<h2>Duration and Time Values</h2>
<p>Work with durations, time-of-day values, and datetime arithmetic safely.</p>
</div>

## Why this matters

Time math breaks quickly unless syntax and precedence are consistent.

## Use it when

- You want faster iteration without switching contexts.
- You need readable formulas that teammates can follow.
- You want reliable behavior under real user inputs.

## Try it in SmartPad

Examples for this feature are being backfilled. Add examples in the source spec and regenerate docs.

## What this feature guarantees

- New concept: `Duration` is a first-class value (not just “unit math”)
- Time-of-day values: support `Time` as distinct from `DateTime`
- Conversions: `to` should work for Duration and Time
- DateTime + Duration parsing: accept “duration phrases” without punctuation
- Disambiguation + safety rules (stuff that will bite you later)
- Concrete expected outputs for your 3 failing lines
- Extra examples you probably want tests for (high value)

## Common mistakes

- Use exact SmartPad syntax first, then optimize for brevity.
- Keep context explicit (units, currencies, locale) when composing formulas.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/duration.spec.md">docs/Specs/duration.spec.md</a></p>
