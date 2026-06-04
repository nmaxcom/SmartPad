export const INVESTMENT_TEMPLATE = `# Investment Lab: ROI, compound interest, fees, and Spain savings tax
# Figures are examples. Tax brackets are editable; check your real filing year and situation.

# 1) Portfolio setup
start = 20000 EUR
monthly = 500 EUR
horizon = 20
market = 7%
fundfee = 0.35%
platformfee = 0.15%
annual = market - fundfee - platformfee

# 2) Compound wealth after investor costs
mult = 1 + annual
paid(year) = start + monthly * 12 * year
wealth(year) = start * mult^year + monthly * 12 * (mult^year - 1) / annual
gain(year) = wealth(year) - paid(year)
roi(year) = gain(year) / paid(year)

paid total = paid(horizon) =>
value before tax = wealth(horizon) =>
gain before tax = gain(horizon) =>
gross roi now = roi(horizon) as % =>

# 3) Spain savings-tax estimate
# Brackets are simplified for clarity: 19% to 6k, 21% to 50k, 23% to 200k.
first bracket = 6000 EUR
second bracket = 50000 EUR
taxlow = 19%
taxmid = 21%
taxhigh = 23%
charttax = 21%
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
netwealth(year) = wealth(year) - gain(year) * charttax
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
low = 4% - fundfee - platformfee
base = 7% - fundfee - platformfee
high = 9% - fundfee - platformfee
value low = start * (1 + low)^horizon + monthly * 12 * ((1 + low)^horizon - 1) / low =>
value base = start * (1 + base)^horizon + monthly * 12 * ((1 + base)^horizon - 1) / base =>
value high = start * (1 + high)^horizon + monthly * 12 * ((1 + high)^horizon - 1) / high =>
`;
