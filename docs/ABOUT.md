Smartpad is a lightweight computational notebook designed for thinking with numbers, not just calculating them. It blends calculator-style expressions, unit-aware math, variables, percentages, dates, lists, and light symbolic reasoning into a single plain-text surface. The core idea is that you write things close to the way you’d naturally think about them (including units, currencies, and phrases), and Smartpad continuously interprets them as meaningful computations. It’s closer to a “quantitative scratchpad” than a programming language or a spreadsheet.

Any number, whether assigned to a variable or not, can be scrubbed with the mouse by just hoving over it and draggin to either side make its value go up and down. All calculations update live. This adds a new way to understand the shape of the relationship between different values and a quick way to fiddle with magnitudes to find a more desirable result quicker.

Smartpad emphasizes readability and intent over strict syntax. Units are first-class, conversions are semantic (to, in, on, off, as %), variables can be named with spaces, and results can be previewed live or explicitly committed. The goal is to make everyday quantitative reasoning—finance, planning, science, estimation—fast, expressive, and low-friction.

It's a node web application, written in typescript and react.

These are some examples of its syntax:
# Quick Tour: a guided walkthrough
# Core idea: write a line and add "=> " to evaluate

2 + 3 => 5
sqrt(16) + 2.5 => 6.5
abs(-4.2) => 4.2
max(3, 7) * 2 => 14
PI * 2 => 6.283

price=3
total = price^2 * 5*qty + 1 => 3^2 * 5*qty + 1
qty => (total - 1) / (3 ^ 2 * 5)

# Scientific notation: huge/small values are shown with e-notation (thresholds in Settings)

light speed = 3e8 m/s
light speed => 300,000,000 m/s
tiny mass = 4.2e-9 kg
tiny mass => 4.200e-6 g
edge tiny = 9.99e-5 s
edge tiny => 9.990e-5 s

# Variables: spaces and phrases are ok

monthly rent = $1250
utilities = $185
internet = $75
monthly total = monthly rent + utilities + internet => $1510
yearly total = monthly total * 12 => $18120

# A shared bill split with a phrase variable

number of friends = 6
pizza total cost = $18.99
cost per friend = pizza total cost / number of friends => $3.165

# Percentages: of / on / off / as %

discount = 15%
base price = $120.50
final price = discount off base price => $102.425
tax = 8%
total = tax on final price => $110.619

20 of 80 is % => 25%
20 / 80 as % => 25%
10% of 155 N => 15.5 N

# Units: arithmetic and conversions

trip distance = 12.5 km
trip time = 25 min
speed = trip distance / trip time => 8.333 m/s
speed to m/s => 8.333 m/s
speed to mph => 18.641 mph
height = 1.82 m
height to cm => 182 cm
floor area = 300 ft^2
floor area to m^2 => 27.871 m^2
tank volume = 2 gal
tank volume to L => 7.571 L

# Temperatures (ASCII units)

temp c = 25 C
temp c to F => 77 F
temp c to K => 298.15 K

# Dimensional analysis and derived units

mass = 2 kg
accel = 3 m/s^2
force = mass * accel => 6 N
distance = 4 m
energy = force * distance => 24 J
energy to kWh => 6.667e-6 kWh
raw energy = 1 kg*m^2/s^2 => 1 J
raw energy to J => 1 J
surface load = 5 kg/m^2 => 5 kg/m^2
surface load to g/cm^2 => 0.5 g/cm^2
pressure = force / 0.2 m^2 => 30 Pa
pressure to kPa => 0.03 kPa
pressure to psi => 0.004 psi
pressure to bar => 3.000e-4 bar

# Powers and geometry

radius = 4 m
area = PI * radius^2 => 50.265 m^2
volume = area * 2 m => 100.531 m^3
volume to cm^3 => 100,530,964.915 cm^3

# Rates, density, and frequency

flow = 12 L/min
flow to m^3/s => 2.000e-4 m^3/s
flow2 = 1000 mL/min
flow2 to L/h => 60 L/h
surface mass = 5 kg
surface area = 2.5 m^2
surface density = surface mass / surface area => 2 kg/m^2
surface density to g/cm^2 => 0.2 g/cm^2
spin = 1200 rpm
spin to Hz => 20 Hz
mass flow = 1.5 kg/s
mass flow to lb/min => 198.416 lb/min

# Fuel economy and conversions

fuel economy = 28 mpg
fuel economy to km/L => 11.904 km/L

# Lists and solver tease

costs = $12, $15, $9
sum(costs) => $36
avg(costs) => $12
lengths = 3m, 25m, 48km
lengths => 3 m, 25 m, 48 km
total(lengths) => 48.028 km
stddev(lengths) => 22,620.8191 m
mean(lengths) => 16.0093 km

costs = $12, $15, $9 => $12, $15, $9
goal = total(50, 20, x)
goal => 70
x => 0

price=3
total = price * qty => 3 * qty
qty => total / 3

# Date Math: calendar-aware calculations

# ISO + month carry vs exact days
start date = 2024-01-31
start date + 1 month => 2024-02-29
start date + 30 days => 2024-03-01

# Natural language dates
launch day = 5 June 2004
launch day + 2 months + 1 year => 2005-08-05

# Date/time and zone offsets
meeting = 2024-06-05 17:00 UTC
meeting + 2h => 2024-06-05 19:00 UTC
meeting in +05:00 => 2024-06-05 22:00 +05:00

# Locale numeric dates (uses your system locale)
06/05/2024 => 2024-05-06

# Today/now shortcuts
now => 2026-01-10 23:44 UTC+1
today + 10 days => 2026-01-20

# Business days (Mon-Fri)
2024-11-25 + 5 business days => 2024-12-02
2024-12-02 - 1 business day => 2024-11-29

# Relative weekdays
next Monday => 2026-01-12
next Monday + 2 weeks => 2026-01-26
last Friday => 2026-01-09

# Date differences (in days)
2024-06-30 - 2024-06-01 => 29 days

# Mixed: chain operations
trip = 2024-09-12 08:00 +05:00
trip + 3 days + 4 hours => 2024-09-15 12:00 +05:00
trip in UTC => 2024-09-12 03:00 UTC