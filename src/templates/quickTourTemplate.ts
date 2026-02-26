export const QUICK_TOUR_TEMPLATE = `# Quick Tour: run a pop-up night in 3 minutes
# This sheet is a compact 360: variables, live sync, percentages, units, lists, ranges, chips, and plot.

guests base = 120
walk ins = 18
show up rate = 78%
guests total = guests base * show up rate + walk ins =>

# Try this first: scrub guests base or show up rate and watch guests total react.

ticket list = $24
promo = 12%
service fee = 3.5%
ticket after promo = promo off ticket list =>
ticket net = service fee on ticket after promo =>
gross sales = guests total * ticket net =>

drink per guest = 0.55 L
drink total = guests total * drink per guest =>
drink total to gal =>
ice blocks = 7
ice per block = 5 kg
ice total = ice blocks * ice per block =>
ice total to lb =>

staff count = 6
shift hours = 4
staff rate = $22
labor cost = staff count * shift hours * staff rate =>
snacks = $45, $32, $28, $30
snacks total = sum(snacks) =>
snack avg = avg(snacks) =>
ops cost = labor cost + snacks total =>
profit = gross sales - ops cost =>

checkpoints = 18:00..21:00 step 30 min =>

# Chip moves: click or drag any result chip into a new line to reuse it as a live reference.

base = 120
bump = 18
@view plot x=x y=base + bump*x domain=0..8

target total = total(500, 300, delta)
target total => 1200
delta =>

# Quick loop:
# 1) scrub a number
# 2) drop a chip into a new formula
# 3) change guests base and watch everything stay in sync
`;
