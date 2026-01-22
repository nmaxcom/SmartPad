# SmartPad Date Math

This document is both a **developer reference** and **user documentation** for SmartPad date/time math.
It captures the current behavior and syntax with examples and results.

---

## Core Decisions
1) **End-of-month carry**
- Adding months carries to end-of-month when needed.
- Adding days is exact (no month carry).

Example:
```
2024-01-31 + 1 month => 2024-02-29
2024-01-31 + 30 days => 2024-03-01
```

2) **Date parsing**
- Natural dates parse using **system locale** (browser/user locale).
- ISO is always accepted.

3) **Business days**
- Business days are **Monday through Friday**.
- No holiday calendars (for now).

4) **Time zones**
- **UTC / GMT / Z** are supported as universal anchors.
- **Local** uses the user's system time zone ("Home").
- **Offsets** are supported: `+05:00`, `-0800`.
- No IANA zones yet (e.g., `America/Los_Angeles`).

---

## Current Syntax (Human)
These are the implemented forms. "Formal" function-style syntax is **not** supported yet.

### Create a Date
```
2024-06-05 => 2024-06-05
5 June 2004 => 2004-06-05
```

### Create a DateTime
```
2024-06-05 17:00 UTC => 2024-06-05 17:00 UTC
2024-06-05 17:00 Z => 2024-06-05 17:00 UTC
2024-06-05 17:00 +05:00 => 2024-06-05 17:00 +05:00
```

### Create a Duration (first-class value)
Duration literals accept compact or spaced units. A leading sign applies to the whole literal.
```
2hours 1min => 2 h 1 min
-2hours 1min => -2 h 1 min
-2hours + 1min => -1 h 59 min
125s => 2 min 5 s
1h 90min => 2 h 30 min
```

### Create a Time (clock time)
```
19:30 => 19:30
07:05:09 => 07:05:09
```

### Time + Duration
```
19:30 + 5h 20min 3s => 00:50:03 (+1 day)
00:10 - 45min => 23:25 (-1 day)
23:59:30 + 90s => 00:01:00 (+1 day)
```

### Time - Time
```
19:30 - 18:00 => 1 h 30 min
18:00 - 19:30 => -1 h 30 min
```

### Time + Time (invalid)
```
19:30 + 18:00 => ⚠️ Cannot add two clock times. Did you mean a duration?
```

### Date + Time (combine into DateTime)
```
2025-04-01 + 19:30 => 2025-04-01 19:30 <local tz>
```

### Add Durations
```
2024-06-05 + 2 months + 1 year => 2025-08-05
2024-01-31 + 1 month => 2024-02-29
2024-01-31 + 30 days => 2024-03-01
```

### Subtract Durations
```
2024-06-05 - 10 days => 2024-05-26
```

### Date Differences
```
2024-06-30 - 2024-06-01 => 29 days
```

### Business Days (Mon-Fri)
```
2024-11-25 + 5 business days => 2024-12-02
```

### Time Zone Conversion
```
2024-06-05 17:00 UTC in local => 2024-06-05 10:00 local
2024-06-05 17:00 +05:00 in UTC => 2024-06-05 12:00 UTC
```

### Convert Date Differences
Date differences return a duration unit (days by default). Conversions use fixed-length time units (1 month = 30 days, 1 year = 365 days); date stepping with `+ 1 month` / `+ 1 year` stays calendar-aware.
```
2024-06-30 - 2024-06-01 in months => 0.966667 months
2024-06-30 - 2024-06-01 in weeks => 4.142857 weeks
```

### Convert Durations
These are treated as **fixed-length** duration units for conversion math.
```
3h 7min 12s to min => 187.2 min
125s to min => 2.083333 min
2 days 3h to h => 51 h
1h to s => 3600 s
21 months to weeks => 90 weeks
1 year in days => 365 days
```

---

## Planned Syntax (Formal API - Not Implemented Yet)
These are proposed for a future version and shown here for design reference only.

```
date("2024-06-05") => 2024-06-05
datetime("2024-06-05 17:00", tz: "UTC") => 2024-06-05 17:00 UTC
add(date("2024-01-31"), months: 1) => 2024-02-29
diff(date("2024-06-30"), date("2024-06-01")) => 29 days
to_timezone(datetime("2024-06-05 17:00", tz: "UTC"), "local") => 2024-06-05 10:00 local
```

---

## Human Syntax Glossary
- `next Monday` => next calendar Monday in local time
- `last Friday` => previous calendar Friday in local time
- `today` / `tomorrow` / `yesterday` => local date
- `now` => current local datetime

Examples:
```
next Monday + 2 weeks => 2024-10-21
now + 3 hours => 2024-10-14 18:00 local
```

---

## Formatting Rules
- Default output uses **ISO** (YYYY-MM-DD).
- Locale output can be enabled via Settings (Date Display Format).

```
// ISO display (default)
2024-06-05 + 2 months => 2024-08-05

// Locale display (example: es-ES)
06/05/2024 + 2 months => 05/08/2024
```

---

## Edge Cases
- **End-of-month carry** when adding months or years.
- **Exact day addition** for `+ N days`.
- **Locale ambiguity**: `06/05/2024` uses system/override locale for parsing.
- **Timezone offsets** are preserved and displayed.
- **Month/year conversions** use fixed-length durations (30d/365d) when converting units.
- **Clock math** rolls over with `(+1 day)` / `(-1 day)` hints.
- **Minutes alias**: `min` is minutes; bare `m` is meters unless in time context.

Examples:
```
2023-01-31 + 1 month => 2023-02-28
2024-02-29 + 1 year => 2025-02-28
```

---

## Developer Reference (Parsing and Evaluation)

### Parsing order
1) ISO and numeric forms (YYYY-MM-DD, YYYY-MM-DD HH:mm)
2) Natural language ("5 June 2004", "next Monday")
3) Time zone suffixes (UTC, GMT, Z, +05:00, -0800, local)

### Data model
- DateValue (date only or date+time+zone; hasTime flag)
- DurationValue (duration parts; fixed-length conversions)
- TimeValue (clock time with optional rollover metadata)

### Operations
- date + duration (years, months, weeks, days, hours, minutes, seconds, business days)
- date - duration
- date - date => duration (days)
- datetime - datetime => duration
- time + duration => time (rollover metadata)
- time - time => duration
- date + time => datetime
- duration in/to unit => converted duration
- date in/to zone => converted date/time zone

### Expected error messages
- `Invalid date: "..."`
- `Expected time zone after 'in'`
- `Cannot add hours to a date-only value`

---

## Testing Checklist
- End-of-month carry for month addition.
- Day-based addition stays exact.
- Locale parsing defaults to system locale.
- UTC/GMT/Z and offsets parse and convert.
- Business day skips weekends.

