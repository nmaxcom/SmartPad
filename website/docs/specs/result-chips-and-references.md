---
title: "Result Chips and References"
description: "Defines chip interactions, hidden references, dependency behavior, and result-lane UX in the editor."
---

<div className="guide-masthead">

**What this unlocks:** Defines chip interactions, hidden references, dependency behavior, and result-lane UX in the editor.

**Source spec:** [docs/Specs/ResultChipsAndValueGraph.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ResultChipsAndValueGraph.spec.md)

</div>

## Why this matters

This guide translates the Result Chips and References contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Copy these into a SmartPad sheet and watch live results update as you type.

### Happy path
```smartpad
monthly rent = 2500                              [2,500]
phone bill   = 45                                   [45]
food = 50/day * 30 days                          [1,500]
total cost per month                             [4,045]
```

### Edge case
```smartpad
subtotal = 120                                      [120]
tax = [subtotal] * 0.15                              [18]

# source line later breaks:
subtotal = 12 / 0                                    [⚠ Division by zero]
tax = [subtotal ⚠] * 0.15                            ⚠ source line has error
```

## Common pitfalls

- Watch edge-case behavior and guardrails before assuming spreadsheet-style coercions.

## Capability map

- 0) Product Intent
- 1) Scope
- 2) UX Pillars
- 3) Feature Overview
- 4) Visual System
- 5) Interaction Model
- 6) Broken Dependency UX (Requested "tax" case)
- 7) Internal Data Model
- 8) System Integration
- 9) Interaction Rules and Edge Cases
- 10) Accessibility
- 11) Performance Targets

## Deep reference

- Canonical behavior contract: [ResultChipsAndValueGraph.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/ResultChipsAndValueGraph.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
