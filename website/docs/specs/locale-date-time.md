---
title: "Locale Date and Time"
description: "Parse and format dates predictably across locale-specific inputs and outputs."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Data and Collections</p>
<h2>Locale Date and Time</h2>
<p>Parse and format dates predictably across locale-specific inputs and outputs.</p>
</div>

## Why this matters

Cross-region workflows fail unless date interpretation is deterministic.

## Use it when

- You want faster iteration without switching contexts.
- You need readable formulas that teammates can follow.
- You want reliable behavior under real user inputs.

## Try it in SmartPad

<ExamplePlayground title={"Locale Date and Time: quick win"} description={"Run this interactive example and tweak values immediately."} code={"slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>"} />

<ExamplePlayground title={"Locale Date and Time: edge behavior"} description={"Use this to understand guardrails and failure modes."} code={"period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)"} />

## What this feature guarantees

- Range Expression Routing (must happen before date-math and solver)
- Range Grammar (natural “step” suffix, not named args)
- Locale-Aware Date/Datetime Input Parsing (es-ES)
- Date/Time/Datetime Range Semantics
- Guardrails (must be a user setting)
- Error Normalization (no raw parser leaks for `..`)
- Output Formatting (Timezone label + compact display)
- Reference Test Set (focused on the reported failures)

## Common mistakes

- Use exact SmartPad syntax first, then optimize for brevity.
- Check edge and guardrail behavior before scaling your sheet.
- Treat formatted display as presentation, not implicit conversion logic.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Locale.spec.md">docs/Specs/Locale.spec.md</a></p>
