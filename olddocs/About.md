New possible version of About.md (older is down to the end)

# Killer demo notebook (markdown)

Goal: show, in ~10 minutes, why this is not a fancy calculator, but a thinking pad that makes real-life reasoning faster than Excel, phone calc, or Wolfram.

0) Warm-up: “natural” math that stays readable
PI * 2 =>6.2832
sqrt(16) + 2.5 =>6.5
max(3, 7) * 2 =>14

1) Personal finance: budget, scenarios, and “what changed?”

Track a monthly budget, then change one knob and see everything update.

rent = $1250
utilities = $185
internet = $75
subscriptions = $49.99
monthly total = rent + utilities + internet + subscriptions =>$1559.99
yearly total = monthly total * 12 =>$18719.88


What if rent increases 6% next renewal?

next rent = 6% on rent =>$1325
next monthly = next rent + utilities + internet + subscriptions =>$1634.99
delta = next monthly - monthly total =>$75
delta as % of monthly total =>4.8074%

2) Split a bill, but with real human inputs
people = 6
pizza = $18.99
drinks = $9.50
tip = 10%
subtotal = pizza + drinks =>$28.49
total = tip on subtotal =>$31.339
each = total / people =>$5.2232


Round per person, then reconcile rounding remainder

each rounded = round(each, 2) =>$5.22
paid total = each rounded * people =>$31.32
remainder = total - paid total =>$0.019

3) Units + reasoning: make “dimension mistakes” hard to miss
trip distance = 12.5 km
trip time = 25 min
speed = trip distance / trip time =>8.3333 m/s
speed to km/h =>30 km/h


Energy example (derived units + conversion)

mass = 2 kg
accel = 3 m/s^2
force = mass * accel =>6 N
distance = 4 m
energy = force * distance =>24 J
energy to kWh =>6.6667e-6 kWh

4) Lists: real-world “many numbers” reasoning in one line

(This foreshadows the list spec you asked for.)

expenses = $1250, $185, $75, $49.99
sum(expenses) =>$1559.99
distribution = expenses / sum(expenses) as % =>80.1295%, 11.8597%, 4.8080%, 3.2028%


Turn “many speeds” into a min/mean/max summary

speeds = 8.2 m/s, 8.4 m/s, 8.1 m/s, 8.6 m/s
min(speeds) =>8.1 m/s
mean(speeds) =>8.325 m/s
max(speeds) =>8.6 m/s

5) Solver: “I know relationships, not the unknown”

Classic “I know the formula, I want the missing variable.”

solve qty:
  total = $90
  price = $3
  total = price * qty
=>qty = 30


Units-aware solve

solve time:
  distance = 120 km
  speed = 80 km/h
  distance = speed * time
=>time = 1.5 h

6) Time: deadlines and planning without spreadsheets
today =>2026-01-07
deadline = today + 3 weeks =>2026-01-28


Work time

start = 09:15
end = 17:45
worked = end - start =>8.5 h

7) Uncertainty: the “thinking aid” superpower
length = 10 ± 0.2 cm =>[9.8, 10.2] cm
area = length^2 =>[96.04, 104.04] cm^2


A decision example: can it fit?

door = 80 ± 1 cm =>[79, 81] cm
box = 80 ± 0.2 cm =>[79.8, 80.2] cm
clearance = door - box =>[-1.2, 1.2] cm


Interpretation: might fit, might not. That’s honest reasoning.

8) Explanation mode: trust-building
explain energy


Expected output (example):

energy = force × distance
force = mass × accel = 2 kg × 3 m/s^2 = 6 N
distance = 4 m
energy = 6 N × 4 m = 24 J


If you implement plotting later, this notebook becomes even more killer by adding:

histogram of speeds

pie chart of distribution

time-series “budget by month”

uncertainty intervals as bands










============================





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


