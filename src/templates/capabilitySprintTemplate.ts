export const CAPABILITY_SPRINT_TEMPLATE = `# Capability Sprint: 4 real-life problems in one compact sheet
# Scrubbing: hover a number and drag left/right to change it live.
# Tip: you usually do not need => unless you want an explicit output chip.

# 1) Pop-up coffee stand margin check (currency + percentages + lists)
cups sold = 180
bean cost = $0.42
milk cost = $0.18
labor cost = $95
cup price = $4.5
card fee = 2.9%
net cup price = card fee off cup price
net sales = cups sold * net cup price
variable costs = cups sold * (bean cost + milk cost)
daily profit = net sales - variable costs - labor cost
alt prices = $4.2, $4.5, $4.8, $5.1
revenue by price = alt prices * cups sold
max(revenue by price)

# 2) EV road-trip planning (units + ranges + date/time math)
trip distance = 320 km
efficiency = 16.5 kWh/(100 km)
energy needed = efficiency * trip distance / 100
energy needed to Wh
charger power = 120 kW
charge time = energy needed / charger power
charge time to min
depart = 2026-07-02 07:45 UTC
arrival estimate = depart + 4 h + charge time
arrival estimate in +02:00
break slots = 09:00..12:00 step 30 min

# 3) Taxi vs rideshare crossover (multi-line plot + break-even unknown)
x = 0
taxi base = 6
taxi rate = 0.85
rideshare base = 2
rideshare rate = 1.45
taxi total = taxi base + taxi rate*x
rideshare total = rideshare base + rideshare rate*x
@view plot x=x y=taxi total,rideshare total domain=0..12 size=xl
crossover balance = taxi base - rideshare base - (rideshare rate - taxi rate)*break_even_km
crossover balance => 0
solve break_even_km in crossover balance = taxi base - rideshare base - (rideshare rate - taxi rate)*break_even_km, crossover balance = 0 =>
break_even_km =>
short trip = 4
taxi at short = taxi base + taxi rate*short trip
rideshare at short = rideshare base + rideshare rate*short trip
long trip = 9
taxi at long = taxi base + taxi rate*long trip
rideshare at long = rideshare base + rideshare rate*long trip

# 4) Lab dilution and dosing (scientific unknown + SI to generic units)
stock molarity = 2.5 mol/L
target molarity = 0.08 mol/L
reactor volume = 750 L
moles target = target molarity * reactor volume
stock volume direct = moles target / stock molarity
stock volume direct to m^3
carboy = 20 L
stock volume direct in carboy
NaCl molar mass = 58.44 g/mol
salt mass = moles target * NaCl molar mass
salt mass to kg
moles target = stock molarity * required stock volume
solve required stock volume in moles target = stock molarity * required stock volume =>
required stock volume =>
required stock volume in carboy
`;
