---
title: "Ranges"
description: "Defines numeric and date/time range generation, step rules, guardrails, and list interoperability."
---

<div className="guide-masthead">

**What this unlocks:** Defines numeric and date/time range generation, step rules, guardrails, and list interoperability.

**Source spec:** [docs/Specs/Ranges.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Ranges.spec.md)

</div>

## Why this matters

This guide translates the Ranges contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Copy these into a SmartPad sheet and watch live results update as you type.

### Happy path
```smartpad
<start>..<end>
<start>..<end> step <step>
```

### Edge case
```smartpad
0..10 step 0 =>⚠️ step cannot be 0
```

## Common pitfalls

- Use the documented syntax exactly; SmartPad intentionally avoids ambiguous shorthand.
- Watch edge-case behavior and guardrails before assuming spreadsheet-style coercions.
- Keep units and locale context explicit when combining values from different domains.

## Capability map

- Overview: what range-generated lists are and why they matter
- Design decision: use `..` (not `to`) for range generation
- Scope
- Syntax
- Semantics & rules (Numeric ranges)
- Postfix `to` on lists (Unit annotation vs conversion)
- Maximum list size guardrail (Setting)
- Composition with existing features
- Proposed extension: date and time ranges
- Minimal test suite summary (Numeric v1 + unit postfix)
- Notes for implementation order (recommended)

## Deep reference

- Canonical behavior contract: [Ranges.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Ranges.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
