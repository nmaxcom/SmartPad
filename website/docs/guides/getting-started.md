---
title: "First Sheet"
sidebar_position: 2
description: "Build your first SmartPad sheet from zero, without needing to know any app vocabulary first."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# First Sheet

Start with plain text. If a line looks like something SmartPad can calculate, it shows the result next to the line. You do not need a grid, cell names, or a formula bar.

## Write one useful line

A SmartPad sheet grows one readable line at a time. Give important values names, then build from those names.

<ExamplePlayground title={"A tiny weekly model"} description={"Change any assumption and the rest of the sheet follows."} code={"hours = 40\nrate = $82/hour\ngross = hours * rate\ntax = 22% on gross\nnet = gross - tax"} />

## Results appear as chips

The small pill next to a computed line is a result chip. At first, you can just read it as the answer. Later, you can use the chip controls to copy the value or reuse it in another line.

> GIF/video marker: show a simple line producing its first result chip.

## Explore without rewriting

Numbers highlighted in the editor can be dragged left or right. That is called scrubbing: it lets you feel how a model changes before you decide on the exact value.

<ExamplePlayground title={"Scrub the assumptions"} description={"Try dragging `40`, `82`, or `22` in the app."} code={"hours = 40\nrate = $82/hour\ngross = hours * rate\ntax = 22% on gross\nnet = gross - tax"} />

## Reuse a result

When you hover a result chip, SmartPad shows controls. The first icon is a drag handle. Drag it into another expression to create a reference that stays connected to the original result.

> GIF/video marker: drag the first chip icon from `gross` into a new formula, then change `hours` and show the reference updating.

## Keep going

- Use [Core Interactions](../core-interactions) when you want the chip controls explained in one place.
- Use [Everyday Examples](../everyday-calculations) when you want useful sheets to copy.
