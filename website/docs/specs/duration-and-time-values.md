---
title: "Duration and Time Values"
description: "Work with duration literals, time-of-day math, and datetime arithmetic."
sidebar_position: 12
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Duration and Time Values</h2>
<p>Work with duration literals, time-of-day math, and datetime arithmetic.</p>
</div>

## What this feature gives you

- Duration is a first-class value with flexible literal forms
- Time-of-day arithmetic supports rollovers with clear hints
- DateTime +/- duration expressions accept natural duration phrases

## Syntax and usage contract

- Accept `2hours 1min`, `2 h 1 min`, and mixed spacing.
- Duration conversions use `to`/`in` (`3h 7min 12s to min`).
- `Time + Time` is invalid; use `Time - Time` for durations.

## Runnable examples

<ExamplePlayground title={"Duration conversion"} description={"Convert composite durations into scalar target units."} code={"prep = 3h 7min 12s\nprep to min =>\nprep to s =>"} />

<ExamplePlayground title={"Time-of-day rollover"} description={"Time plus duration wraps with day context."} code={"start = 19:30\nduration = 5h 20min 3s\nfinish = start + duration =>"} />

<ExamplePlayground title={"Datetime with natural duration"} description={"Subtract duration phrases directly from datetime literals."} code={"meeting = 01/04/2025 19:30\ntravel back = meeting - 2hours 1min =>"} />

## Guardrail examples

<ExamplePlayground title={"Invalid unit target"} description={"Duration cannot convert to incompatible dimensions."} code={"elapsed = 3h 7min 12s\nelapsed to kg =>"} />

<ExamplePlayground title={"Invalid time math"} description={"Adding two clock times is intentionally rejected."} code={"first = 19:30\nsecond = 18:00\nfirst + second =>"} />

## Critical behavior rules

- durations should still be their own “time duration” unit family, so they can convert to `s/min/h/d` etc reliably.
- Optional seconds with `s` suffix should remain duration, not time-of-day.
- Result is a `Time`, but computation must be done modulo 24h.
- Default display: show time only **plus** a rollover hint when non-zero.
- `19:30 + 18:00 => error: cannot add two clock times; did you mean a duration?`
- `01/04/2025 19:30` must parse as `2025-04-01 19:30` (local timezone unless specified)
- DateTime arithmetic must accept any `Duration` form (spaced or unspaced).
- Crossing DST: if you support timezone-aware DateTimes, the difference must reflect the actual elapsed seconds in that zone.
- `19:30 * 2 =>` **error** (multiplying a clock time is nonsense)
- Error: “Cannot add two clock times. Did you mean `19:30 - 18:00` or `19:30 + 18h`?”

## Power-user checklist

- Prefer `min` over bare `m` when you mean minutes.
- Use explicit timezone-aware datetime literals for cross-region planning.
- Keep mixed-sign duration math explicit with `+`/`-` operators.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/duration.spec.md">docs/Specs/duration.spec.md</a></p>
