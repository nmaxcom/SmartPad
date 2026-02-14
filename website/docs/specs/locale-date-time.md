---
title: "Locale Date and Time"
description: "Defines locale-aware date parsing, date/time ranges, output formatting, and error normalization."
---

<div className="guide-masthead">

**What this unlocks:** Defines locale-aware date parsing, date/time ranges, output formatting, and error normalization.

**Source spec:** [docs/Specs/Locale.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Locale.spec.md)

</div>

## Why this matters

This guide translates the Locale Date and Time contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Copy these into a SmartPad sheet and watch live results update as you type.

### Happy path
```smartpad
slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>
```

### Edge case
```smartpad
period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
```

## Common pitfalls

- Use the documented syntax exactly; SmartPad intentionally avoids ambiguous shorthand.
- Watch edge-case behavior and guardrails before assuming spreadsheet-style coercions.
- Display formatting can differ from internal values; verify conversion targets explicitly.

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
