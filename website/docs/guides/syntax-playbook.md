---
title: Syntax Playbook
sidebar_position: 2
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Syntax Playbook

Use these patterns to keep sheets expressive and predictable.

<ExamplePlayground title="Core expression patterns" description="A compact pattern set used across most SmartPad workflows." code={`subtotal = $128\ntax = 8.5%\ntotal = subtotal + (subtotal * tax) => $138.88\n\ndistance = 42 km\ndistance in mi => 26.1 mi\n\nplan = [120, 140, 155, 170]\navg(plan) => 146.25`} />

## Rules of thumb

- Use `to` / `in` for conversions.
- Keep units and currencies on values, not comments.
- Name intermediate values so downstream lines stay readable.
