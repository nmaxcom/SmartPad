---
title: "Getting Started"
sidebar_position: 2
description: "Set up your first useful SmartPad sheets and understand the core writing loop."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Getting Started

SmartPad works best when you treat each line like a thought you can compute, not a cell you have to babysit.

## The basic rhythm

1. Write a fact or assumption in plain text.
2. Let the live result tell you whether the line makes sense.
3. Reuse prior results by clicking or dragging chips instead of retyping values.
4. Add `=>` when you want to force a result, run a command, or show an intentional error.

<ExamplePlayground title={"First complete workflow"} description={"A full mini-model using currency, percentages, and conversion."} code={"hours = 40\nrate = $82/hour\ngross = hours * rate\ntax = 22% on gross\nnet = gross - tax\nnet in EUR"} />

## Habits that age well

- Use names you would understand next month (`monthly rent`, `fuel cost`).
- Keep one idea per line, then build from previous lines.
- Put units and currencies directly on the value so assumptions are visible.

<ExamplePlayground title={"Range + list quick analysis"} description={"Generate, transform, and summarize without leaving plain text."} code={"commute mins = 28, 31, 26, 34, 29\navg(commute mins)\nlate days = commute mins where > 30\ncount(late days)\nweeks = 1..4"} />

## When `=>` is still worth using

- Commands and workflows that need an explicit run.
- Examples where you want to show the exact error SmartPad gives.
- Notes you are sharing with someone else, where an explicit result makes the sheet easier to read.

## Continue

- [Syntax Playbook](../syntax-playbook)
- [Everyday Calculations](../everyday-calculations)
