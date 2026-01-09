Proposed extension: date and time ranges

This section proposes how to include dates and times into ranges while keeping semantics predictable. It is not part of numeric v1 unless you choose to implement it now.

Goals

Generate sequences of dates (daily/weekly/monthly)

Generate sequences of times (time slots)

Avoid ambiguity with numeric step

Keep guardrails and inclusivity rules consistent

Recommended approach

Use the same .. span operator, but require an explicit time unit step (not a number).

Date range (daily by default, optional)

Option A (default daily step if omitted):

2026-01-01..2026-01-05 =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05


Option B (require step for clarity; safer):

2026-01-01..2026-01-05 step 1 day =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05

Weekly stepping
2026-01-01..2026-02-01 step 1 week =>2026-01-01, 2026-01-08, 2026-01-15, 2026-01-22, 2026-01-29

Monthly stepping (calendar-aware)
2026-01-15..2026-05-15 step 1 month =>2026-01-15, 2026-02-15, 2026-03-15, 2026-04-15, 2026-05-15

Month-end behavior (must be defined)

When stepping monthly from dates that don’t exist in all months (e.g., Jan 31):

Recommended rule: clamp to last valid day of month.

2026-01-31..2026-05-31 step 1 month =>2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31


(Non-leap-year example; leap years should produce Feb 29.)

Time-of-day range (same day)

Require explicit step with a duration:

09:00..11:00 step 30 min =>09:00, 09:30, 10:00, 10:30, 11:00

Datetime range
2026-01-01 09:00..2026-01-01 12:00 step 1 h =>2026-01-01 09:00, 10:00, 11:00, 12:00

Date/time rules (proposed)
Rule D1 — Step must be a duration unit

Allowed: min, h, day, week, month, year (and plural forms if you support them).

2026-01-01..2026-01-05 step 2 =>⚠️ Date ranges require a duration step (e.g., 1 day)

Rule D2 — Inclusive endpoint if aligned

Same as numeric ranges:

09:00..10:00 step 40 min =>09:00, 09:40

Rule D3 — Guardrail applies
09:00..23:59 step 1 min =>⚠️ range too large (...)  (if exceeds setting)

Rule D4 — Timezone behavior (must be explicit)

date is timezone-agnostic (calendar date)

time is local-time by default

datetime uses Smartpad’s configured timezone unless explicitly specified