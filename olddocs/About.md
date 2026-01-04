# SmartPad Overview

SmartPad is a text‑first computation pad. You type plain lines, define variables, write expressions, and append the trigger `=>` to see inline results as lightweight widgets next to your text. Your text never changes; results are decorations.

## Key capabilities
- Inline results for any line ending in `=>`
- Variables with immediate reuse across lines
- Units and dimensional analysis with conversions
- Clear inline errors next to the exact trigger
- Variable panel displaying current values
- Templates and example snippets
- Number scrubbing and semantic highlighting
- Save and load functionality for content persistence

## Quick examples
```text
2 + 3 => 5

length = 10 m
time = 20 s
speed = length / time => 0.5 m/s
speed to km/h => 1.8 km/h

width = 14 m
area = length * width => 140 m^2
area => 140 m^2

mass = 3 kg
accel = 9.8 m/s^2
force = mass * accel => 29.4 N
force to lbf => 6.61 lbf
```

Notes
- Results may differ slightly due to rounding and smart display thresholds.
- Widgets appear only when the line ends with `=>` (or a combined assignment with `=>`).

## Where to go next
- Learn all user‑facing features and exact behavior → [Spec.md](./Spec.md)
- See how it works under the hood → [Architecture.md](./Architecture.md)


