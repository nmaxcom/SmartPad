---
title: "Locale Date and Time"
description: "Parse locale-friendly dates and route temporal ranges reliably."
sidebar_position: 15
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Locale Date and Time</h2>
<p>Parse locale-friendly dates and route temporal ranges reliably.</p>
</div>

## What this feature gives you

- Locale-aware parsing handles real-world date input
- Range routing prevents parser misclassification
- Errors normalize to clear, range-specific user messages

## Syntax and usage contract

- In `es-ES`, `DD-MM-YYYY` and `DD/MM/YYYY` are accepted date literals.
- Temporal ranges require `step` duration (`step 30 min`, `step 1 day`).
- Month stepping uses anchored day-of-month with clamp semantics.

## Runnable examples

<ExamplePlayground title={"Locale-aware literal parsing"} description={"es-ES style date inputs resolve deterministically."} code={"d = 01-02-2023\nd =>\ndt = 01-02-2023 09:30\ndt =>"} />

<ExamplePlayground title={"Time slot generation"} description={"Temporal ranges with explicit duration step."} code={"09:00..11:00 step 30 min =>\n2026-01-01..2026-01-05 step 1 day =>"} />

<ExamplePlayground title={"Month-end anchored stepping"} description={"Anchor day is preserved with clamp-to-month-end behavior."} code={"2026-01-31..2026-05-31 step 1 month =>"} />

## Guardrail examples

<ExamplePlayground title={"Missing temporal step"} description={"Date/time ranges require explicit duration steps."} code={"2026-01-01..2026-01-05 =>\n09:00..11:00 =>"} />

<ExamplePlayground title={"Invalid locale date"} description={"Bad literals should produce targeted date errors."} code={"d = 32-02-2023 =>"} />

## Critical behavior rules

- guardrails and user-facing error normalization
- If range parsing fails → surface a **range-specific error**, not a date-math or solver error.
- Numeric ranges: step must be an integer number (unitless)
- Date/Time/Datetime ranges: step must be a duration (e.g., `30 min`, `1 day`, `2 weeks`, `1 month`)
- any unrelated internal parse errors
- the computed list (if within guardrail)

## Power-user checklist

- Set locale intentionally before entering slash/dash-heavy dates.
- Add explicit temporal steps to avoid hidden assumptions.
- Treat timezone labels as part of result interpretation.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Locale.spec.md">docs/Specs/Locale.spec.md</a></p>
