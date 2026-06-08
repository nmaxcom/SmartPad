---
title: "Troubleshooting"
sidebar_position: 7
description: "Simple ways to narrow down syntax, conversion, and range issues."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Troubleshooting

## If a conversion does not work

- Check that you used `to` or `in`, and that the unit or currency is spelled the way SmartPad expects.
- Make sure the units are the same kind of thing. `km` can become `m`; `kg` cannot become `s`.
- For currency conversion, rates need either a live source or cached data.

## If a range fails

- Use `..` to generate a range.
- For dates and times, include a duration step such as `step 1 day` or `step 30 min`.
- Make sure the step moves in the same direction as the range.

## If list math fails

- Pairwise list math works best when both lists have the same length.
- Start with flat lists before trying nested ones.
- Keep units compatible inside the same list operation.

<ExamplePlayground title={"Debug by simplification"} description={"Split a failing expression into explicit intermediate lines."} code={"prices = $10, $20, $30\nqty = 2, 1, 3\nline totals = prices * qty\nsum(line totals)\nshort qty = 2, 1\nsum(short qty)"} />

## Report a reproducible problem

If the issue still happens after simplification, open [Support](../support) and include the smallest sheet text that demonstrates the behavior.

For wrong calculations, data loss, storage/import/export problems, settings issues, or docs errors, use the linked bug report form from the support page.
