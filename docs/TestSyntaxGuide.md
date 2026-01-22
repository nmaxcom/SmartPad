# SmartPad Syntax Guide (Test Examples)

This reference collects SmartPad syntax snippets drawn from the unit/spec documents so you can see the expressions that pass/fail in tests.

## docs/Specs/Locale.spec.md

### Range routing (makes sure `..` is treated as range before other parsers)
```text
period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>
```

### Range grammar (keywords within range expressions)
```text
1..5 =>1, 2, 3, 4, 5
0..10 step 2 =>0, 2, 4, 6, 8, 10
09:00..11:00 step 30 min =>09:00, 09:30, 10:00, 10:30, 11:00
2026-01-01..2026-01-05 step 1 day =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05
```

### Locale-aware parsing (assuming locale = `es-ES`)
```text
d = 01-02-2023
d =>2023-02-01

 t = 09:30
t =>09:30

 dt = 01-02-2023 09:30
dt =>2023-02-01 09:30 Europe/Madrid (UTC+1)

slots = 01-02-2023 09:00..14-02-2023 11:00 step 64 min =>
```

### Guardrail errors
```text
d = 32-02-2023 =>⚠️ Invalid date literal "32-02-2023"
d = 01-02-2023 =>⚠️ Unsupported date format "01-02-2023". Use ISO "2023-02-01".
```

### Date/time range requirements
```text
period = 2026-01-01..2026-01-05 =>⚠️ Date/time ranges require a duration step (e.g., step 1 day)
slots = 09:00..11:00 =>⚠️ Date/time ranges require a duration step (e.g., step 30 min)
period = 2026-01-01..2026-01-05 step 2 =>⚠️ Invalid range step: expected duration, got number
xs = 1..10 step 1 day =>⚠️ Invalid range step: expected integer, got duration
09:00..10:00 step 30 min =>09:00, 09:30, 10:00
09:00..10:00 step 40 min =>09:00, 09:40
```

## docs/Specs/Ranges.spec.md

### Basic numeric ranges
```text
1..5 =>1, 2, 3, 4, 5
0..10 step 2 =>0, 2, 4, 6, 8, 10
0..10 step 3 =>0, 3, 6, 9
```

### Default stepping logic
```text
2..6 =>2, 3, 4, 5, 6
6..2 =>6, 5, 4, 3, 2
5..5 =>5
```

### Invalid steps
```text
0..10 step 0 =>⚠️ step cannot be 0
0..10 step -2 =>⚠️ step must be positive for an increasing range
10..0 step 2 =>⚠️ step must be negative for a decreasing range
```

### Integer-only enforcement and unit hints
```text
0.5..3 =>⚠️ range endpoints must be integers (got 0.5)
1..5 step 0.5 =>⚠️ step must be an integer (got 0.5)
a = 1
b = 5
a..b =>1, 2, 3, 4, 5
```

### `to` postfix for annotation/conversion
```text
1..5 to kg =>1 kg, 2 kg, 3 kg, 4 kg, 5 kg
0..10 step 2 to m/s =>0 m/s, 2 m/s, 4 m/s, 6 m/s, 8 m/s, 10 m/s
xs = 3, 4, 5
xs to m =>3 m, 4 m, 5 m
```

### Converting existing unit-bearing lists
```text
a = 2 m, 7 cm, 2 km, 1 ft
a to m =>2 m, 0.07 m, 2000 m, 0.3048 m
b = 1200 rpm, 20 Hz
b to Hz =>20 Hz, 20 Hz
mix = 2 m, 3 s
mix to m =>⚠️ Cannot convert s to m (incompatible dimensions)
x = 1, 2 m, 3
x to m =>⚠️ Cannot convert unitless value to m when converting a unit-bearing list
```

## docs/Specs/datetimeranges.spec.md

### Date sequences
```text
2026-01-01..2026-01-05 =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05
2026-01-01..2026-01-05 step 1 day =>2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05
2026-01-01..2026-02-01 step 1 week =>2026-01-01, 2026-01-08, 2026-01-15, 2026-01-22, 2026-01-29
```

### Monthly stepping with month-end clamping
```text
2026-01-15..2026-05-15 step 1 month =>2026-01-15, 2026-02-15, 2026-03-15, 2026-04-15, 2026-05-15
2026-01-31..2026-05-31 step 1 month =>2026-01-31, 2026-02-28, 2026-03-31, 2026-04-30, 2026-05-31
```

### Time and datetime ranges
```text
09:00..11:00 step 30 min =>09:00, 09:30, 10:00, 10:30, 11:00
2026-01-01 09:00..2026-01-01 12:00 step 1 h =>2026-01-01 09:00, 10:00, 11:00, 12:00
2026-01-01..2026-01-05 step 2 =>⚠️ Date ranges require a duration step (e.g., 1 day)
09:00..10:00 step 40 min =>09:00, 09:40
09:00..23:59 step 1 min =>⚠️ range too large (…)
```

### Timezone guidance
```text
date is timezone-agnostic (calendar date)
time is local-time by default
datetime uses SmartPad’s configured timezone unless specified
```

## docs/Specs/duration.spec.md

### Duration literal forms
```text
2hours 1min => 2 h 1 min
-2hours 1min => -2 h 1 min
-2hours + 1min => -1 h 59 min
125s => 2 min 5 s
-90min => -1 h 30 min
1h 90min => 2 h 30 min
```

### Time arithmetic with durations
```text
19:30 + 5h 20min 3s => 00:50:03 (+1 day)
00:10 - 45min => 23:25 (-1 day)
23:59:30 + 90s => 00:01:00 (+1 day)
19:30 - 18:00 => 1 h 30 min
18:00 - 19:30 => -1 h 30 min
19:30 + 18:00 => error: cannot add two clock times; did you mean a duration?
```

### Duration conversions
```text
3h 7min 12s to min => 187.2 min
125s to min => 2.083333 min
2 days 3h to h => 51 h
1h to s => 3600 s
21 months to weeks => 90 weeks
1 year in days => 365 days
```

### DateTime ± Duration
```text
01/04/2025 19:30 - 2hours 1min => 2025-04-01 17:29
2025-04-01 00:10 - 45min => 2025-03-31 23:25
2025-04-01 19:30 + 1h 90min => 2025-04-01 23:00
2025-04-01 19:30 + 24h => 2025-04-02 19:30
2025-04-01 19:30 - 2025-04-01 17:29 => 2 h 1 min
```

### Disambiguation notes
```text
19:30 + 5m => 19:35 (context hints minutes)
height = 5m => 5 m (meters)
```
