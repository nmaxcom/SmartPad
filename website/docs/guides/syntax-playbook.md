---
title: Syntax Playbook
sidebar_position: 2
---

# Syntax Playbook

Use these patterns to keep sheets expressive and predictable.

## Core patterns

```smartpad
subtotal = $128
tax = 8.5%
total = subtotal + (subtotal * tax) => $138.88

distance = 42 km
distance in mi => 26.1 mi

plan = [120, 140, 155, 170]
avg(plan) => 146.25
```

## Rules of thumb

- Use `to` / `in` for conversions.
- Keep units and currencies on values, not comments.
- Name intermediate values so downstream lines stay readable.
