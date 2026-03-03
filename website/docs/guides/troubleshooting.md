---
title: "Troubleshooting"
sidebar_position: 6
description: "Fast diagnosis patterns for SmartPad syntax, conversion, and range issues."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Troubleshooting

## If a conversion fails

- Check target syntax (`to`/`in`) and unit/currency spelling.
- Ensure source and target dimensions are compatible.
- For FX conversions, confirm rate source or manual override availability.

## If a range fails

- Use `..` (not `to`) for generation.
- For temporal ranges, include explicit duration step.
- Verify step sign matches direction.

## If list math fails

- Validate list lengths for pairwise operations.
- Avoid nested lists in aggregators unless operation supports them.
- Keep unit dimensions compatible inside one list operation.

<ExamplePlayground title={"Debug by simplification"} description={"Split a failing expression into explicit intermediate lines."} code={"prices = $10, $20, $30\nqty = 2, 1, 3\nline totals = prices * qty =>\nsum(line totals) =>\nbad qty = 2, 1\nprices * bad qty =>"} />

## If behavior still feels off

Open the precise behavior contract for that feature:

- [Live Results](../../specs/live-results)
- [Result Chips and References](../../specs/result-chips-and-references)
- [Plotting and Dependency Views](../../specs/plotting-and-dependency-views)
- [Currency and FX](../../specs/currency-and-fx)
- [Duration and Time Values](../../specs/duration-and-time-values)
- [Lists](../../specs/lists)
- [Ranges](../../specs/ranges)
- [Locale Date and Time](../../specs/locale-date-time)
- [File Management](../../specs/file-management)
