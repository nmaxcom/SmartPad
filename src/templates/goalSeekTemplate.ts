export const GOAL_SEEK_TEMPLATE = `# Goal Seek Lab: from simple targets to creative "what would it take?"
# Edit any target value after "make" and SmartPad solves the input after "by".

# 1) Start simple: how many items hit a checkout target?
unit price = 18 EUR
shipping = 6 EUR
items = 4
checkout total = unit price * items + shipping =>
make checkout total = 150 EUR by items =>

# 2) Same idea with speed: solve the time, not the formula.
route = 120 km
drive time = 2 h
average speed = route / drive time =>
make average speed = 90 km/h by drive time =>

# 3) Personal finance: what gross pay creates a take-home target?
keep rate = 78%
gross pay = 3000 EUR
take home = gross pay * keep rate =>
make take home = 4000 EUR by gross pay =>

# 4) Runway planning: what monthly burn gives a 12 month runway?
cash = 180000 EUR
monthly burn = 22000 EUR/month
runway = cash / monthly burn =>
make runway = 12 month by monthly burn =>

# 5) Pricing: what unit price reaches a profit target?
price = 42 EUR
unit cost = 19 EUR
orders = 300
gross profit = (price - unit cost) * orders =>
make gross profit = 9000 EUR by price =>

# 6) Campaign planning: how much spend reaches a signup target?
base signups = 400
ad spend = 1200 EUR
signup lift = 0.18 / EUR
projected signups = base signups + ad spend * signup lift =>
make projected signups = 850 by ad spend =>

# 7) Product design: what efficiency makes the range promise true?
battery = 72 kWh
efficiency = 5.2 km/kWh
reserve = 30 km
usable range = battery * efficiency - reserve =>
make usable range = 420 km by efficiency =>

# 8) Recipe tuning: what coffee dose produces the desired brew ratio?
water = 300 g
coffee = 18 g
brew ratio = water / coffee =>
make brew ratio = 16 by coffee =>

# 9) You can goal-seek a source expression directly, without naming it first.
target distance = 250 km
target time = 3 h
make target distance / target time = 100 km/h by target time =>

# 10) Compound investing: monthly deposits, tax on exit, and wealth over time.
starting pot = 8000 EUR
monthly contribution = 450 EUR
annual return = 7%
return multiplier = 1 + annual return
exit tax = 21%
years = 12
growth factor = return multiplier^years
invested total = starting pot + monthly contribution * 12 * years =>
compound wealth = starting pot * growth factor + monthly contribution * 12 * (growth factor - 1) / annual return =>
tax due at exit = compound wealth * exit tax =>
after tax wealth = compound wealth - tax due at exit =>
@view plot x=years y=compound wealth,after tax wealth domain=0..35 size=md
target after tax wealth = 100000 EUR
required pre tax wealth = target after tax wealth / (1 - exit tax) =>
required growth factor = (required pre tax wealth + monthly contribution * 12 / annual return) / (starting pot + monthly contribution * 12 / annual return) =>
make return multiplier^years = required growth factor by years =>

# 11) Sister question: what monthly contribution reaches the same after-tax target in 15 years?
years = 15
growth factor = return multiplier^years
invested total = starting pot + monthly contribution * 12 * years =>
compound wealth = starting pot * growth factor + monthly contribution * 12 * (growth factor - 1) / annual return =>
tax due at exit = compound wealth * exit tax =>
after tax wealth = (starting pot * growth factor + monthly contribution * 12 * (growth factor - 1) / annual return) * (1 - exit tax) =>
make after tax wealth = 100000 EUR by monthly contribution =>

# 12) Sister question: what starting pot would make the 100k plan work with smaller monthly deposits?
years = 12
monthly contribution = 300 EUR
growth factor = return multiplier^years
compound wealth = starting pot * growth factor + monthly contribution * 12 * (growth factor - 1) / annual return =>
after tax wealth = (starting pot * growth factor + monthly contribution * 12 * (growth factor - 1) / annual return) * (1 - exit tax) =>
make after tax wealth = 100000 EUR by starting pot =>

# 13) Guardrail: v1 solves one input at a time.
# Try this manually and it should reject the request instead of inventing one answer:
# make checkout total = 200 EUR by unit price, items =>
`;
