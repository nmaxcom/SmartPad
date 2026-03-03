---
title: "Live Results"
description: "See valid results while typing, without adding `=>` on every line."
sidebar_position: 8
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Live Results</h2>
<p>See valid results while typing, without adding `=>` on every line.</p>
</div>

## What this feature gives you

- Fast feedback while you type
- Success-only live rendering (no noisy live errors)
- Keeps explicit `=>` behavior unchanged

## Syntax and usage contract

- Live previews only apply to lines without `=>`.
- Incomplete or unresolved lines stay quiet until they become valid.
- Turning `liveResultEnabled` off restores explicit-only behavior.

## Runnable examples

<ExamplePlayground title={"Quick arithmetic while drafting"} description={"Live chips appear for valid lines even before adding `=>`."} code={"hours = 38\nrate = $95/hour\nweekly pay = hours * rate\nweekly pay in EUR"} />

<ExamplePlayground title={"Conversion while typing"} description={"Unit-aware preview appears as soon as the expression is complete."} code={"distance = 42 km\ndistance in mi\npace = 10 km / 52 min\npace in min/km"} />

<ExamplePlayground title={"Compact syntax still resolves"} description={"Live mode supports implicit multiplication and compact unit forms."} code={"run rate = 9L/min*18min\ncarry = 2(3+4)\ncombined = (2+3)(4+5)"} />

## Guardrail examples

<ExamplePlayground title={"Incomplete lines are intentionally silent"} description={"These lines should show no preview until they are complete."} code={"draft = 3*\nconversion = 4lb to\nunknown = missingVar + 2"} />

<ExamplePlayground title={"Explicit trigger still wins"} description={"Using `=>` keeps the classic explicit-result workflow."} code={"base = 120\ntax = 8%\ntotal = base + base * tax =>"} />

## Critical behavior rules

- Avoid noisy UX while typing by suppressing live errors.
- Scope: user/app setting (same level as other evaluation display settings).
- Explicit trigger path remains unchanged (including current error/solve behaviors).
- `=>` still behaves exactly like today and still shows errors when explicitly requested.
- Exclude lines that are clearly non-expression content (plain text/comments/directives).
- Exclude lines where adding live output would create duplicate rendering on the same line.
- Live result evaluation must not introduce new state mutations outside existing behavior.
- Preserve current assignment semantics exactly; do not change write timing because of live preview.
- If assignment behavior already exists in current pipeline, keep it as-is; Live result must not make it earlier/later/different.
- Typing `2+3` should only show `5`, not create/update variables.

## Power-user checklist

- Use explicit `=>` on lines where you want deliberate, explicit result intent.
- Keep assignment lines readable so live feedback highlights intent quickly.
- Expect no preview for notes/comments/plain text lines.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/LiveResult.spec.md">docs/Specs/LiveResult.spec.md</a></p>
