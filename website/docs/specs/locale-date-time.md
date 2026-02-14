---
title: "Locale Date and Time"
description: "Defines locale-aware date parsing, date/time ranges, output formatting, and error normalization."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="spotlight-panel">
<h3>Locale Date and Time</h3>
<p><strong>What this unlocks:</strong> Defines locale-aware date parsing, date/time ranges, output formatting, and error normalization.</p>
<p><strong>Why teams care:</strong> Collaborate across regions while keeping date/time behavior deterministic.</p>
<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Locale.spec.md">docs/Specs/Locale.spec.md</a></p>
</div>

## What you can ship with this

Use this guide to move from isolated formulas to production-grade locale date and time behavior in real SmartPad sheets.

## Live playground

<ExamplePlayground title={"Locale Date and Time quick win"} description={"Copy, run, and adapt this baseline to your own sheet."} code={"slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>"} />

<ExamplePlayground title={"Locale Date and Time guardrail check"} description={"Use this to understand expected behavior around edge conditions."} code={"period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)"} />

## Design notes

- Keep formulas legible by splitting intent into named lines before collapsing math.
- Prefer explicit conversions and target units instead of inferring context from nearby lines.
- Validate expected output with at least one positive and one guardrail-oriented example.

## Common pitfalls

- Use the documented syntax exactly; SmartPad avoids ambiguous shorthand on purpose.
- Check guardrails before assuming spreadsheet-style coercion rules.
- Display strings are not always canonical values; verify the target unit/currency explicitly.

## Capability map

- 1) Range Expression Routing (must happen before date-math and solver)
- 2) Range Grammar (natural “step” suffix, not named args)
- 3) Locale-Aware Date/Datetime Input Parsing (es-ES)
- 4) Date/Time/Datetime Range Semantics
- 5) Guardrails (must be a user setting)
- 6) Error Normalization (no raw parser leaks for `..`)
- 7) Output Formatting (Timezone label + compact display)
- 8) Reference Test Set (focused on the reported failures)

## Deep reference

- Canonical behavior contract: [Locale.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Locale.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
