export const QUICK_TOUR_TEMPLATE = `# Quick Tour: a guided walkthrough
# Core idea: write a line and add "=>" to evaluate

2 + 3 =>
sqrt(16) + 2.5 =>
abs(-4.2) =>
max(3, 7) * 2 =>
PI * 2 =>

# Scientific notation: huge/small values are shown with e-notation (thresholds in Settings)

light speed = 3e8 m/s
light speed =>
tiny mass = 4.2e-9 kg
tiny mass =>
edge tiny = 9.99e-5 s
edge tiny =>

# Variables: spaces and phrases are ok

monthly rent = $1250
utilities = $185
internet = $75
monthly total = monthly rent + utilities + internet =>
yearly total = monthly total * 12 =>

# A shared bill split with a phrase variable

number of friends = 6
pizza total cost = $18.99
cost per friend = pizza total cost / number of friends =>

# Percentages: of / on / off / as %

discount = 15%
base price = $120.50
final price = discount off base price =>
tax = 8%
total = tax on final price =>

20 of 80 is % =>
20 / 80 as % =>
10% of 155 N =>

# Units: arithmetic and conversions

trip distance = 12.5 km
trip time = 25 min
speed = trip distance / trip time =>
speed to m/s =>
speed to mph =>
height = 1.82 m
height to cm =>
floor area = 300 ft^2
floor area to m^2 =>
tank volume = 2 gal
tank volume to L =>

# Temperatures (ASCII units)

temp c = 25 C
temp c to F =>
temp c to K =>

# Dimensional analysis and derived units

mass = 2 kg
accel = 3 m/s^2
force = mass * accel =>
distance = 4 m
energy = force * distance =>
energy to kWh =>
raw energy = 1 kg*m^2/s^2 =>
raw energy to J =>
surface load = 5 kg/m^2 =>
surface load to g/cm^2 =>
pressure = force / 0.2 m^2 =>
pressure to kPa =>
pressure to psi =>
pressure to bar =>

# Powers and geometry

radius = 4 m
area = PI * radius^2 =>
volume = area * 2 m =>
volume to cm^3 =>

# Rates, density, and frequency

flow = 12 L/min
flow to m^3/s =>
flow2 = 1000 mL/min
flow2 to L/h =>
surface mass = 5 kg
surface area = 2.5 m^2
surface density = surface mass / surface area =>
surface density to g/cm^2 =>
spin = 1200 rpm
spin to Hz =>
mass flow = 1.5 kg/s
mass flow to lb/min =>

# Fuel economy and conversions

fuel economy = 28 mpg
fuel economy to km/L =>

# Lists and solver tease

costs = $12, $15, $9
sum(costs) => $36
avg(costs) => $12

expenses = $1250, $185, $50
sum(expenses) => $1485

lengths = 3m, 25m, 48km
lengths =>3 m, 25 m, 48 km
total(lengths) =>48.028 km
stddev(lengths) =>18.3727
mean(lengths) =>16.0093 km

costs = $12, $15, $9 =>
goal = total(50, 20, x)
goal => 100
x => 30

price=3
total = price * qty =>
qty => total / 3
`;
