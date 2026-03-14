# Tables and Structured Collections

Status: proposed

This document defines a first-class table value type for SmartPad.

The feature must let users paste or type multi-row structured data, compute with it, and receive strong plot suggestions such as scatter plots and histograms.

## 1. Purpose

Tables exist for cases where lists stop being enough:

- expense logs
- repeated measurements
- orders and inventory
- study data
- operational metrics

SmartPad should support this without becoming a spreadsheet clone.

## 2. Core principles

1. Tables remain text-first.
2. Pasted CSV, TSV, and pipe tables must normalize to one readable canonical form.
3. Columns are typed semantically just like normal SmartPad values.
4. Tables feed calculations, summaries, and plot suggestions.

## 3. Canonical text form

```smartpad
Orders:
  item | qty | price
  A | 12 | EUR 9
  B | 5 | EUR 14
  C | 8 | EUR 11
```

Rules:

- table name ends with `:`
- next indented row is header
- following indented rows are data
- pipe `|` is canonical display form

## 4. Paste normalization

Accepted pasted inputs:

- CSV
- TSV
- spreadsheet clipboard rows
- pipe tables

On paste, SmartPad should:

1. detect tabular structure
2. infer header row if present
3. normalize to canonical pipe form
4. preserve typed values such as units, dates, and currency

## 5. Column access

Use dot access:

```smartpad
Orders.qty
Orders.price
```

Column operations are element-wise.

Example:

```smartpad
Orders.total = Orders.qty * Orders.price
sum(Orders.total) => EUR 266
```

## 6. Human-like examples

### 6.1 Deliveries

```smartpad
Deliveries:
  day | km | stops | fuel L | revenue
  Mon | 84 km | 17 | 9.4 L | EUR 218
  Tue | 91 km | 19 | 10.1 L | EUR 236
  Wed | 73 km | 14 | 8.2 L | EUR 201
  Thu | 98 km | 21 | 10.8 L | EUR 249

sum(Deliveries.revenue) => EUR 904
mean(Deliveries.km) => 86.5 km
Deliveries.revenue / Deliveries.km =>
```

Expected result shape:

```smartpad
EUR 2.595/km, EUR 2.593/km, EUR 2.753/km, EUR 2.541/km
```

### 6.2 Body measurements

```smartpad
Body Data:
  height cm | weight kg | resting bpm
  168 | 62 | 58
  171 | 66 | 60
  174 | 68 | 61
  178 | 74 | 64
  182 | 81 | 67
```

Expected suggestions:

- scatter: `height cm` vs `weight kg`
- histogram: `height cm`
- histogram: `resting bpm`

### 6.3 Pasted business sheet

```smartpad
Campaigns:
  week | spend | clicks | sales
  1 | EUR 220 | 410 | EUR 1830
  2 | EUR 260 | 450 | EUR 2050
  3 | EUR 310 | 490 | EUR 2280
  4 | EUR 390 | 560 | EUR 2670
```

Useful calculations:

```smartpad
Campaigns.sales / Campaigns.spend =>
mean(Campaigns.clicks) =>
```

Useful suggestions:

- scatter: `spend` vs `sales`
- scatter: `clicks` vs `sales`

## 7. Derived columns

Users may define columns after the table:

```smartpad
Orders.total = Orders.qty * Orders.price
Orders.discounted = Orders.total * 0.9
```

Rules:

- derived column length must match table row count
- derived columns remain attached to the table

## 8. Guardrails

1. Mixed-row width is invalid.
2. Duplicate column names are invalid unless normalized explicitly.
3. Tables cannot silently coerce wildly incompatible cell types in one column.
4. Large-paste normalization must fail clearly if shape detection is uncertain.
5. V1 may cap row count for interactive performance, but the cap must be explicit and documented.

## 9. Plot suggestions from tables

When a table is present, SmartPad may suggest:

- histogram for one numeric column
- scatter for two numeric columns
- time series for date/time plus numeric

These suggestions should surface through result-chip or table-summary menus using the same visual cue system defined in the plot-suggestion spec.

## 10. Acceptance examples

### 10.1 Pipe-form table

```smartpad
Sales:
  item | qty | price
  A | 10 | EUR 12
  B | 6 | EUR 9
  C | 12 | EUR 15

Sales.total = Sales.qty * Sales.price
sum(Sales.total) => EUR 354
```

### 10.2 Spreadsheet paste normalization

Pasted TSV should normalize into canonical pipe form without losing semantic values.

## 11. Implementation gate

Promotion requires:

1. targeted Jest coverage for parsing, normalization, typing, column access, and derived columns
2. targeted Playwright coverage for paste flows, editing, plot suggestions, and rendering
3. full Jest suite
4. full Playwright suite
5. all general regression checks green
6. iteration on failures until the feature behaves exactly as documented here
