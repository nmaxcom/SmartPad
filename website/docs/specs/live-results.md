---
title: "Live Results"
description: "See useful results while you type, without adding `=>` to every line."
sidebar_position: 10
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>Live Results</h2>
<p>See useful results while you type, without adding `=>` to every line.</p>
</div>

## What this helps with

- Fast feedback while you type
- Success-only live rendering (no noisy live errors)
- Keeps explicit `=>` behavior unchanged

## How to use it

- Live previews only apply to lines without `=>`.
- Incomplete or unresolved lines stay quiet until they become valid.
- Turning `liveResultEnabled` off restores explicit-only behavior.

## Examples to try

<ExamplePlayground title={"Quick arithmetic while drafting"} description={"Live chips appear for valid lines even before adding `=>`."} code={"hours = 38\nrate = $95/hour\nweekly pay = hours * rate\nweekly pay in EUR"} />

<ExamplePlayground title={"Conversion while typing"} description={"Unit-aware preview appears as soon as the expression is complete."} code={"distance = 42 km\ndistance in mi\npace = 10 km / 52 min\npace in min/km"} />

<ExamplePlayground title={"Compact syntax still resolves"} description={"Live mode supports implicit multiplication and compact unit forms."} code={"run rate = 9L/min*18min\ncarry = 2(3+4)\ncombined = (2+3)(4+5)"} />

## When SmartPad should push back

<ExamplePlayground title={"Incomplete lines are intentionally silent"} description={"These lines should show no preview until they are complete."} code={"draft = 3*\nconversion = 4lb to\nunknown = missingVar + 2"} />

<ExamplePlayground title={"Explicit trigger still wins"} description={"Using `=>` keeps the classic explicit-result workflow."} code={"base = 120\ntax = 8%\ntotal = base + base * tax =>"} />

## Good habits

- Use explicit `=>` only when you want SmartPad to show a deliberate result or a deliberate error.
- Keep assignment lines readable so live feedback highlights intent quickly.
- Expect no preview for notes/comments/plain text lines.
