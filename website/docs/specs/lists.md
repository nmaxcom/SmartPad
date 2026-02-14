---
title: "Lists"
description: "Defines list creation, aggregations, filtering, mapping, sorting, indexing, and unit-safe list operations."
---

<div className="guide-masthead">

**What this unlocks:** Defines list creation, aggregations, filtering, mapping, sorting, indexing, and unit-safe list operations.

**Source spec:** [docs/Specs/Lists.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Lists.spec.md)

</div>

## Why this matters

This guide translates the Lists contract into practical workflow patterns so teams can build confidently in SmartPad.

## Try it now

Copy these into a SmartPad sheet and watch live results update as you type.

### Happy path
```smartpad
xs = 10, 20, 30
ys = xs[2..2]
ys =>20
count(ys) => 1
```

### Edge case
```smartpad
x = 20
count(x) => ⚠️ Expected list
```

## Common pitfalls

- Display formatting can differ from internal values; verify conversion targets explicitly.
- Keep units and locale context explicit when combining values from different domains.

## Capability map

- Overview: what a “list” is and why it matters
- What counts as a list
- Limits
- Creating lists
- Display, formatting, and ambiguity rules
- Applying units/currency to whole lists
- Aggregations (reduce list → scalar)
- Indexing and slicing
- Sorting and ordering
- Filtering
- Mapping (element-wise transforms)
- Pairwise operations (zip behavior)

## Deep reference

- Canonical behavior contract: [Lists.spec.md](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Lists.spec.md)
- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`
