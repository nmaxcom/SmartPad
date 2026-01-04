# SmartPad Date Math

This document is both a **developer reference** and **user documentation** for SmartPad date/time math.
It captures the current decisions and proposes a clear syntax with examples and results.

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

## Two Syntax Styles (Formal + Human)
Every feature is shown in both forms for clarity.

### Create a Date
**Formal**
```
date("2024-06-05") => 2024-06-05
```

**Human**
```
2024-06-05 => 2024-06-05
5 June 2004 => 2004-06-05
```

### Create a DateTime
**Formal**
```
datetime("2024-06-05 17:00", tz: "UTC") => 2024-06-05 17:00 UTC
```

**Human**
```
2024-06-05 17:00 UTC => 2024-06-05 17:00 UTC
2024-06-05 17:00 Z => 2024-06-05 17:00 UTC
2024-06-05 17:00 +05:00 => 2024-06-05 17:00 +05:00
```

### Add Durations
**Formal**
```
add(date("2024-06-05"), months: 2, years: 1) => 2025-08-05
add(date("2024-01-31"), months: 1) => 2024-02-29
add(date("2024-01-31"), days: 30) => 2024-03-01
```

**Human**
```
2024-06-05 + 2 months + 1 year => 2025-08-05
2024-01-31 + 1 month => 2024-02-29
2024-01-31 + 30 days => 2024-03-01
```

### Subtract Durations
**Formal**
```
add(date("2024-06-05"), days: -10) => 2024-05-26
```

**Human**
```
2024-06-05 - 10 days => 2024-05-26
```

### Date Differences
**Formal**
```
diff(date("2024-06-30"), date("2024-06-01")) => 29 days
```

**Human**
```
2024-06-30 - 2024-06-01 => 29 days
```

### Business Days (Mon-Fri)
**Formal**
```
add_business_days(date("2024-11-25"), 5) => 2024-12-02
```

**Human**
```
2024-11-25 + 5 business days => 2024-12-02
```

### Time Zone Conversion
**Formal**
```
to_timezone(datetime("2024-06-05 17:00", tz: "UTC"), "local") => 2024-06-05 10:00 local
```

**Human**
```
2024-06-05 17:00 UTC in local => 2024-06-05 10:00 local
2024-06-05 17:00 +05:00 in UTC => 2024-06-05 12:00 UTC
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
- Default output uses **system locale**.
- ISO output can be forced with a setting.

```
set date format = ISO
2024-06-05 + 2 months => 2024-08-05

set date format = locale
06/05/2024 + 2 months => Aug 5, 2024
```

---

## Edge Cases
- **End-of-month carry** when adding months or years.
- **Exact day addition** for `+ N days`.
- **Locale ambiguity**: `06/05/2024` uses system locale.
- **Timezone offsets** are preserved and displayed.

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
- DateValue (date only)
- DateTimeValue (date + time + zone)

### Operations
- add(date|datetime, years|months|days|hours|minutes)
- diff(date|datetime, date|datetime)
- add_business_days(date, N)
- to_timezone(datetime, zone)

### Expected error messages
- `Invalid date: "..."`
- `Invalid time zone: "..."`
- `Cannot add hours to a date-only value`

---

## Testing Checklist
- End-of-month carry for month addition.
- Day-based addition stays exact.
- Locale parsing defaults to system locale.
- UTC/GMT/Z and offsets parse and convert.
- Business day skips weekends.

