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
- **Actions menu**: opens actions such as `Copy value`, `Go to source line`, plot suggestions, and `Find <input> for a target…` when available.

Clicking the chip value itself does not insert anything. Drag the chip when you want to reuse it in the sheet.

> GIF/video marker: drag a result chip into another line, then hover a chip and point out the copy icon and menu.

## Use results without a mouse

Press `Tab` until a result value receives a teal focus ring. From there:

- Press `Enter`, `Space`, or `ArrowDown` to open its actions.
- Use `ArrowDown` / `ArrowUp` to move through enabled actions; `Home` and `End` jump to the first and last.
- Press `Enter` or `Space` to run the focused action.
- Press `Escape` to close the menu and return to the result.
- Choose **Go to source line** to move the caret to the calculation that produced the result.

References are keyboard links too. Focus one with `Tab`, then press `Enter` or `Space` to return to and briefly highlight its source.

Goal Seek uses direct language in this menu. For example, **Find gross for a target…** inserts an editable `make ... by gross =>` line; it never overwrites `gross` automatically.

> GIF/video marker: tab to a result, open its menu with Enter, move to a Goal Seek action with arrows, close with Escape, then jump from a reference to its source.

## References

A copied value is just text. A reference stays connected to the result it came from. Use a reference when the relationship matters.

<ExamplePlayground title={"Reference-friendly model"} description={"Use chips in the app to reuse `base cost` without retyping it."} code={"seats = 12\nprice = $19/seat\nbase cost = seats * price\ntax = 8.5% on base cost\ntotal = base cost + tax"} />

> GIF/video marker: drag the first chip icon into `total`, then change `seats` and show the dependent result updating.

## Scrubbing numbers

Highlighted numbers can be dragged left or right. Scrubbing edits the number in the sheet, so downstream results and plots update while you explore.

- Hold `Shift` for fine control.
- Hold `Alt` or `Option` for coarse control.
- Press `Escape` before releasing to cancel and restore the exact starting text.

<ExamplePlayground title={"Scrub a planning variable"} description={"Drag `18` or `9` to explore the model."} code={"principal = $12000\nannual return = 9%\nyears = 18\nestimated value = principal * (1 + annual return)^years"} />

> GIF/video marker: scrub `years` and show the result changing live.

## Compare with a baseline

Open the `⋯` actions menu on any result chip and choose **Set baseline** before changing a model. SmartPad captures the current numeric variables for this sheet, then compares them with every edit or scrub in real time.

- A changed direct input shows `Base <captured value> · <delta>` beside its editable line.
- A propagated change shows a compact delta beside its result chip.
- A tiny dot on result-menu controls indicates that comparison is active.
- **Update baseline** accepts the current model as the new reference; **Clear baseline** stops comparing.

The baseline persists locally for that sheet across reloads. It never changes the sheet or creates hidden formulas.

> GIF/video marker: open a result menu, set a baseline, scrub one input, and show its captured value plus dependent result deltas in the sheet.

## Keep named scenarios

After setting a baseline, change the model and choose **Save current scenario…** from the `⋯` menu of the result you care about. Give the snapshot a short name such as `Higher ticket` or `Extra worker`.

SmartPad adds a compact strip beside that result:

- **Base** is the fixed baseline value.
- Each named scenario is a fixed snapshot and includes its delta from Base.
- **Live** keeps reacting while you edit or scrub.
- Open another named result's menu and choose **Compare this result** to move the strip there.
- Remove one scenario with its discreet `×`, or choose **Clear scenarios** from the result menu.

A sheet keeps up to six named scenarios locally across reloads. The snapshots never alter the sheet, add hidden formulas, or put controls in the Variables panel.

> GIF/video marker: set a baseline, scrub one input, save `Higher ticket`, continue scrubbing so only Live changes, then move the strip from profit to margin.

## See what matters most

Open the `⋯` menu on a named numeric result and choose **See what matters most**. SmartPad follows derived variables back to their numeric root assumptions, changes each one by −10% and +10% one at a time, and recalculates the model through that result.

The inline tornado keeps the method visible:

- Rows are ordered by the largest output change in the tested range.
- Teal is the −10% input case; pink is the +10% input case.
- Both recalculated result values appear beside every bar.
- Editing or scrubbing the model updates the center, ranking, bars, and values live.
- The discreet `×` hides the analysis; **Move sensitivity here** moves it to another result.

This is local sensitivity, not a forecast: the range is fixed at ±10%, inputs move one at a time, and SmartPad never edits the sheet or saves hidden assumptions.

> GIF/video marker: open profit's result menu, choose **See what matters most**, scrub ticket price, watch the ranking update, then move the tornado to margin.
