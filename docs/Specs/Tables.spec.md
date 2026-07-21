# Tables and Structured Collections

Status: implemented

Implemented in: `1.0.0-rc.14`

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
2. Pasted CSV, TSV, spreadsheet, HTML, and pipe tables normalize to one readable canonical form.
3. Columns are typed semantically just like normal SmartPad values.
4. Tables feed calculations and the existing plot views without introducing a second interaction model.
5. The visible sheet remains the primary interface; internal column variables do not clutter the Variables panel.
6. Numeric values inside table cells use the same horizontal scrubber as numeric values elsewhere in the sheet.

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
- HTML tables copied from web pages
- pipe tables

On paste, SmartPad should:

1. detect tabular structure only when at least two equally wide rows and two columns are present
2. infer header row if present
3. normalize to canonical pipe form
4. preserve typed values such as units, dates, and currency
5. generate `column 1`, `column 2`, and so on for headerless data
6. disambiguate duplicate pasted headers with a numeric suffix

The inserted result is ordinary editable SmartPad text named `Pasted data`, `Pasted data 2`, and so on. Ambiguous or oversized clipboard content falls back to the normal paste behavior instead of being silently reinterpreted.

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

Direct column references return normal list values, so the existing list functions apply. The supported aggregate set is `sum`, `total`, `mean`, `avg`, `median`, `count`, `stddev`, `min`, `max`, and `range`. `count` also accepts text columns.

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

Useful views:

- `@view scatter x=Body Data.height cm y=Body Data.weight kg`
- `@view hist y=Body Data.height cm`
- `@view hist y=Body Data.resting bpm`

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

Useful views:

- `@view scatter x=Campaigns.spend y=Campaigns.sales`
- `@view scatter x=Campaigns.clicks y=Campaigns.sales`

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
5. Tables are capped at 500 data rows and 40 columns for interactive performance.
6. Empty cells, multiline CSV cells, sorting, filtering, spreadsheet-style cell coordinates, screenshot OCR, and external-file import are not part of this version.
7. A derived expression must reference at least one table column, and every referenced column must have the same row count.

## 9. Plot integration

Table columns participate in the existing visual language as list values:

- `@view hist y=Table.column` for one numeric column
- `@view scatter x=Table.x y=Table.y` for two numeric columns
- autocomplete exposes table columns in the `x=` and `y=` positions

No persistent slider, detached table widget, or required Variables-panel action is added. A subtle title/header treatment and one live `rows × columns` result are enough to make the structure legible while every source value remains directly editable.

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
2. targeted Playwright coverage for paste, editing, explicit plotting, and rendering
3. documentation/spec-map/trust checks
4. production build
5. related regression tests
