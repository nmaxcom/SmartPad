---
title: "Start Here"
description: "A gentle first pass through SmartPad: what it is, why it is local-first, and where to begin."
sidebar_position: 1
slug: /
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Start Here

<div className="doc-hero doc-hero--wide">
<p className="doc-hero__kicker">SmartPad in one minute</p>
<h2>Plain-text thinking with live, trustworthy math</h2>
<p>SmartPad is a plain-text place for working things out. You write the thought, SmartPad keeps the math honest, and the sheet stays readable tomorrow.</p>
</div>

## Why it feels different

- **Your work stays close**: sheets live in browser storage on your machine by default.
- **The file still makes sense outside the app**: exports are human-readable Markdown (`.md`).
- **Numbers carry meaning**: units, currencies, durations, lists, ranges, and dates behave like values, not decoration.
- **You can poke at assumptions**: result chips, references, and views make a sheet easier to explore without rewriting it.

## First 90-second win

<ExamplePlayground title={"Personal weekly plan"} description={"Type naturally, then nudge values to explore options."} code={"hours = 38\nrate = $95/hour\nweekly pay = hours * rate\ntax = 8.5% on weekly pay\ntake home = weekly pay - tax"} />

## A good path through the docs

1. **[First Sheet](./guides/getting-started)**: make one useful sheet without learning app vocabulary first.
2. **[Core Interactions](./guides/core-interactions)**: understand chips, copy, references, menus, and scrubbing.
3. **[Everyday Examples](./guides/everyday-calculations)**: copy practical sheets and adjust them.
4. **[Syntax Reference](./guides/syntax-reference)**: look up units, conversions, lists, ranges, dates, `where`, `as`, `make`, and common patterns.
5. **[Files & Privacy](./guides/files-and-privacy)**: understand local storage, exports, backups, and current limits.
6. **[Troubleshooting](./guides/troubleshooting)**: narrow down syntax, conversion, and range issues.
7. **[Support](./guides/support)**: report bugs, request features, and share examples safely.

## What SmartPad is not

- It is not a brittle formula grid where meaning is hidden in cell addresses.
- It is not cloud-only lock-in requiring proprietary exports.
- It is not a throwaway calculator where context gets lost.

## Next

Continue with [First Sheet](./guides/getting-started).

