# SmartPad List Spec Test Plan

This document breaks `docs/Lists.spec.md` into manageable chunks so the bulk of examples can be turned into deterministic unit tests. Each chunk corresponds to one or more adjacent sections in the source spec and lists the example behaviors that must be asserted.

## Chunk 1 — Basic list creation & detection (Sections 2 + 3)
Examples
- `xs = 10, 20, 30` + `ys = xs[2..2]` → list extraction, `ys =>20`
- `count(ys) => 1`
- `rent = $1250`, `utilities = $185`, `internet = $75`, `expenses = rent, utilities, internet`
- `lengths = 3 m, 25 ft, 48 km`
- `rates = 5%, 8%, 21%`
- `vals = a/2, b/4, (a+b)/10`
- `expenses => $1250, $185, $75`

## Chunk 2 — Display & ambiguity rules (Section 4)
Examples
- `xs = 1, 2, 3`
- `rent = $1,250` should error (`⚠️ Cannot create list: incompatible units`)
- `xs = 1,250`
- `xs = 1, 250`
- Ensure lists render as comma-separated values regardless of spacing

## Chunk 3 — Aggregations (Section 5)
Examples per aggregation: `sum`, `count`, `mean`/`avg`, `min`, `max`, `median`, `range`, `stddev`, etc.
Each example will assert the rendered math result.

## Chunk 4 — Indexing, slicing, sorting, filtering (Sections 6-8)
Examples
- Indexing 1-based, out-of-range errors, negative indices
- Slicing (inclusive)
- Sorting ascending + descending, handling incompatible units
- Filtering by scalar/unit criteria, empty result sets, incompatible comparisons

## Chunk 5 — Mapping (Section 9)
Examples
- Element-wise arithmetic (lists * scalar, `abs` etc)
- Unit conversions inside lists, percent distributions, tax/discount flows

## Chunk 6 — Pairwise & robustness (Sections 10-11 + mini-recipes)
Examples
- Pairwise addition/multiplication (zip behavior), broadcast scalar
- Error cases such as incompatible lengths or units
- Mini-recipes (finance totals, percentages, measurement stats) can be treated as integration tests to safeguard real-world patterns.

Each chunk will produce a focused Jest test suite under `tests/unit/` that evaluates the example expressions and asserts the render-node output (`mathResult`, `combined`, `error`, etc.). The helper utilities from `tests/unit/list.test.ts` (e.g., `evaluateLine`) should be reused to keep the tests concise.
