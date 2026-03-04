---
title: "Getting Started"
sidebar_position: 2
description: "Set up your first useful SmartPad sheets and understand the core writing loop."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Getting Started

SmartPad works best when you treat each line like a thought you can compute, not a cell you have to manage.

## Core loop

1. Write a fact or assumption as plain text math.
2. Let live results validate your direction while typing.
3. Add `=>` when you want explicit result intent on a line.
4. Reuse prior results by clicking/dragging chips instead of retyping.

<ExamplePlayground title={"First complete workflow"} description={"A full mini-model using currency, percentages, and conversion."} code={"hours = 40\nrate = $82/hour\ngross = hours * rate =>\ntax = 22% on gross =>\nnet = gross - tax =>\nnet in EUR =>"} />

## Practical defaults

- Use descriptive variable names (`monthly rent`, `fuel cost`) to keep sheets readable.
- Keep one concept per line and chain values with references.
- Use units and currencies directly in the value to avoid hidden assumptions.

<ExamplePlayground title={"Range + list quick analysis"} description={"Generate, transform, and summarize without leaving plain text."} code={"commute mins = 28, 31, 26, 34, 29\navg(commute mins) =>\nlate days = commute mins where > 30 =>\ncount(late days) =>\nweeks = 1..4 =>"} />

## When to use `=>` explicitly

- Final outputs you plan to share or screenshot.
- Lines where explicit trigger improves readability for reviewers.
- Guardrail checks where you want intentional error surfacing.
- Any solve workflow (`target =>` back-solving or `solve ... =>`).

## Continue

- [Syntax Playbook](../syntax-playbook)
- [Everyday Calculations](../everyday-calculations)
