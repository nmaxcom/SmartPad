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
- **You can poke at assumptions**: chips, references, and views make a sheet easier to explore without rewriting it.

## First 90-second win

<ExamplePlayground title={"Personal weekly plan"} description={"Type naturally, then nudge values to explore options."} code={"hours = 38\nrate = $95/hour\nweekly pay = hours * rate\ntax = 8.5% on weekly pay\ntake home = weekly pay - tax\ntake home in EUR"} />

## A good path through the docs

1. **[Getting Started](./guides/getting-started)**: core mental model + first useful workflows.
2. **[Syntax Playbook](./guides/syntax-playbook)**: write robust expressions and avoid common pitfalls.
3. **[Everyday Calculations](./guides/everyday-calculations)**: practical examples for budgeting, planning, and analysis.
4. **[Privacy and Portability](./guides/privacy-and-portability)**: understand durability, export, and local ownership.
5. **[Known Limitations](./guides/known-limitations)**: know where SmartPad is careful, unfinished, or intentionally quiet.
6. **[Support](./guides/support)**: report bugs, request features, and share examples safely.
7. **[Feature Guides](./specs)**: go deeper on each major capability when you need the details.

## What SmartPad is not

- It is not a brittle formula grid where meaning is hidden in cell addresses.
- It is not cloud-only lock-in requiring proprietary exports.
- It is not a throwaway calculator where context gets lost.

## Next

Continue with [Getting Started](./guides/getting-started).

