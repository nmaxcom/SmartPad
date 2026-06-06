---
title: "Duration and Time Values"
description: "Add, compare, and plan with durations, times, and dates."
sidebar_position: 14
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>Duration and Time Values</h2>
<p>Add, compare, and plan with durations, times, and dates.</p>
</div>

## What this helps with

- Duration is a first-class value with flexible literal forms
- Time-of-day arithmetic supports rollovers with clear hints
- DateTime +/- duration expressions accept natural duration phrases

## How to use it

- Accept `2hours 1min`, `2 h 1 min`, and mixed spacing.
- Duration conversions use `to`/`in` (`3h 7min 12s to min`).
- `Time + Time` is invalid; use `Time - Time` for durations.

## Examples to try

<ExamplePlayground title={"Duration conversion"} description={"Convert composite durations into scalar target units."} code={"prep = 3h 7min 12s\nprep to min\nprep to s"} />

<ExamplePlayground title={"Time-of-day rollover"} description={"Time plus duration wraps with day context."} code={"start = 19:30\nduration = 5h 20min 3s\nfinish = start + duration"} />

<ExamplePlayground title={"Datetime with natural duration"} description={"Subtract duration phrases directly from datetime literals."} code={"meeting = 01/04/2025 19:30\ntravel back = meeting - 2hours 1min"} />

## When SmartPad should push back

<ExamplePlayground title={"Invalid unit target"} description={"Duration cannot convert to incompatible dimensions."} code={"elapsed = 3h 7min 12s\nelapsed to kg =>"} />

<ExamplePlayground title={"Invalid time math"} description={"Adding two clock times is intentionally rejected."} code={"first = 19:30\nsecond = 18:00\nfirst + second =>"} />

## Good habits

- Prefer `min` over bare `m` when you mean minutes.
- Use explicit timezone-aware datetime literals for cross-region planning.
- Keep mixed-sign duration math explicit with `+`/`-` operators.
