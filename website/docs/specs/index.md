---
sidebar_position: 2
title: Feature Guides
---

# Feature Guides

This section turns raw SmartPad specs into ordered, user-readable guides.

## Core Experience

- [Live Results](./live-results)
  - Show evaluable results while typing, keep => behavior unchanged, and suppress noisy/error-prone previews.
- [Result Chips and References](./result-chips-and-references)
  - Defines chip interactions, hidden references, dependency behavior, and result-lane UX in the editor.
- [Plotting and Dependency Views](./plotting-and-dependency-views)
  - Specifies exploratory plotting, detached views, and dependency-driven visualization flows.

## Math and Units

- [Currency and FX](./currency-and-fx)
  - Covers currency units, FX conversion, manual overrides, and formatting rules for money calculations.
- [Duration and Time Values](./duration-and-time-values)
  - Defines duration literals, time-of-day values, datetime arithmetic, and parsing disambiguation rules.

## Data and Collections

- [Lists](./lists)
  - Defines list creation, aggregations, filtering, mapping, sorting, indexing, and unit-safe list operations.
- [Ranges](./ranges)
  - Defines numeric and date/time range generation, step rules, guardrails, and list interoperability.
- [Locale Date and Time](./locale-date-time)
  - Defines locale-aware date parsing, date/time ranges, output formatting, and error normalization.

## Workspace

- [File Management](./file-management)
  - Defines sheet storage, autosave, import/export behavior, trash lifecycle, and multi-tab synchronization.

Regenerate this section after spec updates:

```bash
npm run docs:docusaurus:generate
```

