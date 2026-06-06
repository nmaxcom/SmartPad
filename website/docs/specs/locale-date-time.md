---
title: "Locale Date and Time"
description: "Write dates in familiar formats and keep date ranges predictable."
sidebar_position: 17
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>Locale Date and Time</h2>
<p>Write dates in familiar formats and keep date ranges predictable.</p>
</div>

## What this helps with

- Locale-aware parsing handles real-world date input
- Range routing prevents parser misclassification
- Errors normalize to clear, range-specific user messages

## How to use it

- In `es-ES`, `DD-MM-YYYY` and `DD/MM/YYYY` are accepted date literals.
- Temporal ranges require `step` duration (`step 30 min`, `step 1 day`).
- Month stepping uses anchored day-of-month with clamp semantics.

## Examples to try

<ExamplePlayground title={"Locale-aware literal parsing"} description={"es-ES style date inputs resolve deterministically."} code={"d = 01-02-2023\nd\ndt = 01-02-2023 09:30\ndt"} />

<ExamplePlayground title={"Time slot generation"} description={"Temporal ranges with explicit duration step."} code={"09:00..11:00 step 30 min\n2026-01-01..2026-01-05 step 1 day"} />

<ExamplePlayground title={"Month-end anchored stepping"} description={"Anchor day is preserved with clamp-to-month-end behavior."} code={"2026-01-31..2026-05-31 step 1 month"} />

## When SmartPad should push back

<ExamplePlayground title={"Missing temporal step"} description={"Date/time ranges require explicit duration steps."} code={"2026-01-01..2026-01-05\n09:00..11:00"} />

<ExamplePlayground title={"Invalid locale date"} description={"Bad literals should produce targeted date errors."} code={"d = 32-02-2023 =>"} />

## Good habits

- Set locale intentionally before entering slash/dash-heavy dates.
- Add explicit temporal steps to avoid hidden assumptions.
- Treat timezone labels as part of result interpretation.
