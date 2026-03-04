---
title: "Feature Contracts"
sidebar_position: 7
description: "Deep behavior guarantees for every major SmartPad feature."
---

# Feature Contracts

Each page below translates the authoritative spec into a practical guide with runnable examples and guardrail scenarios.

## Read in order

1. [Live Results](./live-results) - See valid results while typing, without adding `=>` on every line.
2. [Explicit Trigger (`=>`)](./explicit-trigger) - Use `=>` for deliberate evaluation, explicit errors, and solve execution.
3. [Solve and Symbolic Math](./solve-and-symbolic-math) - Back-solve unknowns with implicit and explicit solve flows.
4. [Result Chips and References](./result-chips-and-references) - Reuse results as draggable, copyable chips with stable dependency links.
5. [Plotting and Dependency Views](./plotting-and-dependency-views) - Turn expressions into exploratory views with `@view` directives.
6. [Currency and FX](./currency-and-fx) - Treat currency as first-class units with live FX + manual overrides.
7. [Duration and Time Values](./duration-and-time-values) - Work with duration literals, time-of-day math, and datetime arithmetic.
8. [Lists](./lists) - Model repeated values with aggregation, mapping, filtering, and zip math.
9. [Ranges](./ranges) - Generate numeric/date/time lists with predictable `..` span semantics.
10. [Locale Date and Time](./locale-date-time) - Parse locale-friendly dates and route temporal ranges reliably.
11. [File Management](./file-management) - Local-first sheet durability with autosave, trash, import, and export.

## Source of truth

Canonical spec documents live under `docs/Specs/*.spec.md` in the repository.
