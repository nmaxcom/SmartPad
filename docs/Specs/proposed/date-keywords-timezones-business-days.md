# Date Keywords, Timezone Tokens, and Business-Day Rules (Legacy Delta)

Status: proposed
Source: extracted from legacy `docs/DATE_MATH.md` and cross-checked against current source specs.

This card preserves behavior details that are useful but not explicitly locked as canonical contracts in current implemented spec pages.

## Relative date/time keywords

Proposed explicit contract:
- Support `today`, `tomorrow`, `yesterday`, `now` as local-time keywords.
- Support relative weekday phrases: `next <weekday>`, `last <weekday>`.
- Keyword evaluation uses configured locale/timezone context.

Examples:
```text
today + 10 days => <local-date + 10d>
next Monday + 2 weeks => <resolved date>
last Friday => <resolved date>
now + 3 hours => <local datetime + 3h>
```

## Timezone token grammar for datetime literals/conversions

Proposed explicit contract:
- Accept timezone anchors/tokens: `UTC`, `GMT`, `Z`, `local`, and numeric offsets (`+05:00`, `-0800`).
- `in` / `to` conversion keeps instant semantics and changes display zone.

Examples:
```text
2024-06-05 17:00 UTC in local => <localized datetime>
2024-06-05 17:00 +05:00 in UTC => 2024-06-05 12:00 UTC
```

## Business-day semantics

Proposed explicit contract:
- `business day` / `business days` means Monday-Friday stepping.
- No holiday profile/calendar support in this baseline behavior.

Examples:
```text
2024-11-25 + 5 business days => 2024-12-02
2024-12-02 - 1 business day => 2024-11-29
```

## Future formal API syntax (not implemented)

Preserved design direction from legacy doc:
```text
date("2024-06-05")
datetime("2024-06-05 17:00", tz: "UTC")
add(date("2024-01-31"), months: 1)
diff(date("2024-06-30"), date("2024-06-01"))
to_timezone(datetime("2024-06-05 17:00", tz: "UTC"), "local")
```

## Why this exists

Most date/time arithmetic rules are already covered by:
- `docs/Specs/Locale.spec.md`
- `docs/Specs/duration.spec.md`

This card only keeps the remaining high-signal feature details that would otherwise be lost when removing `docs/DATE_MATH.md`.
