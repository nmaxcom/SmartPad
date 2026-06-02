export const INVESTMENT_TEMPLATE = `# Investment Lab: ROI, compound interest, fees, and Spain savings tax
# Figures are examples. Tax brackets are editable; check your real filing year and situation.

# 1) Portfolio setup
start = 20000 EUR
monthly = 500 EUR
horizon = 20
market = 0.07
fundfee = 0.0035
platformfee = 0.0015
annual = market - fundfee - platformfee
annual return = annual as % =>

# 2) Compound wealth after investor costs
mult = 1 + annual
paid(x) = start + monthly * 12 * x
wealth(x) = start * mult^x + monthly * 12 * (mult^x - 1) / annual
gain(x) = wealth(x) - paid(x)
roi(x) = gain(x) / paid(x)

paid total = paid(horizon) =>
value before tax = wealth(horizon) =>
gain before tax = gain(horizon) =>
gross roi now = roi(horizon) as % =>

# 3) Spain savings-tax estimate
# Brackets are simplified for clarity: 19% to 6k, 21% to 50k, 23% to 200k.
first bracket = 6000 EUR
second bracket = 50000 EUR
taxlow = 0.19
taxmid = 0.21
taxhigh = 0.23
charttax = 0.21
chart tax = charttax as % =>

lowgain = min(gain(horizon), first bracket)
midgain = min(gain(horizon) - first bracket, second bracket - first bracket)
highgain = gain(horizon) - second bracket

tax low due = lowgain * taxlow =>
tax mid due = midgain * taxmid =>
tax high due = highgain * taxhigh =>
tax due = tax low due + tax mid due + tax high due =>
net value = value before tax - tax due =>
net profit = net value - paid total =>
after tax roi = net profit / paid total as % =>

# 4) See the curve: before tax vs after a simple effective tax
efftax = tax due / gain before tax
effective tax = efftax as % =>
netwealth(x) = wealth(x) - gain(x) * charttax
@view plot y=wealth,netwealth domain=0..35 size=md

# 5) What monthly amount reaches a 250k net target in 20 years?
target net = 250000 EUR
horizon = 20
growth = mult^horizon
annuity = 12 * (growth - 1) / annual
targetgross = target net / (1 - charttax)
target gross = targetgross =>
make start * growth + monthly * annuity = targetgross by monthly =>

# 6) Sensitivity: compare low/base/high annual market returns
horizon = 20
low = 0.04 - fundfee - platformfee
base = 0.07 - fundfee - platformfee
high = 0.09 - fundfee - platformfee
value low = start * (1 + low)^horizon + monthly * 12 * ((1 + low)^horizon - 1) / low =>
value base = start * (1 + base)^horizon + monthly * 12 * ((1 + base)^horizon - 1) / base =>
value high = start * (1 + high)^horizon + monthly * 12 * ((1 + high)^horizon - 1) / high =>
`;
