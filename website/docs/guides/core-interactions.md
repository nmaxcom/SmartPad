---
title: "Core Interactions"
sidebar_position: 3
description: "Understand result chips, references, copy, menus, and number scrubbing."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Core Interactions

This page explains the small interactions that make SmartPad feel different from a calculator.

## Result chips

A chip is the small result pill SmartPad shows next to a line it can calculate. The chip shows the answer, but it also gives you controls when you hover it.

- **Drag reuse**: drag the chip itself into another line to create a live reference.
- **Copy value**: copies the visible value as plain text.
- **Actions menu**: opens actions such as `Copy value` and plot or goal-seek suggestions when available.

Clicking the chip value itself does not insert anything. Drag the chip when you want to reuse it in the sheet.

> GIF/video marker: drag a result chip into another line, then hover a chip and point out the copy icon and menu.

## References

A copied value is just text. A reference stays connected to the result it came from. Use a reference when the relationship matters.

<ExamplePlayground title={"Reference-friendly model"} description={"Use chips in the app to reuse `base cost` without retyping it."} code={"seats = 12\nprice = $19/seat\nbase cost = seats * price\ntax = 8.5% on base cost\ntotal = base cost + tax"} />

> GIF/video marker: drag the first chip icon into `total`, then change `seats` and show the dependent result updating.

## Scrubbing numbers

Highlighted numbers can be dragged left or right. Scrubbing edits the number in the sheet, so downstream results and plots update while you explore.

<ExamplePlayground title={"Scrub a planning variable"} description={"Drag `18` or `9` to explore the model."} code={"principal = $12000\nannual return = 9%\nyears = 18\nestimated value = principal * (1 + annual return)^years"} />

> GIF/video marker: scrub `years` and show the result changing live.
