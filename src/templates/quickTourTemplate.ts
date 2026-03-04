export const QUICK_TOUR_TEMPLATE = `# Quick Tour: SmartPad in 3 minutes
# Scrubbing: hover any number and drag left/right to change it.
# Start by scrubbing attendees base or ticket list and watch the whole sheet react.

# 1) Workshop launch: currency + percentages + conversion + chart
attendees base = 140
walk ins = 18
attendees total = attendees base + walk ins =>
ticket list = $32
promo = 12%
service fee = 3.5%
ticket after promo = promo off ticket list =>
ticket net = service fee on ticket after promo =>
gross sales = attendees total * ticket net =>
drink per attendee = 0.4 L
drink total = attendees total * drink per attendee =>
drink total to gal =>
x = 0
bump = 4
@view plot x=x y=ticket net + bump*x domain=0..10 size=md

# 2) Cost planning: lists + aggregates
vendor quotes = $1800, $2100, $1950, $2050
best quote = min(vendor quotes) =>
average quote = avg(vendor quotes) =>
staff hours = 6, 5.5, 7, 6
total staff hours = sum(staff hours) =>

# 3) Schedule and dates: ranges + date math
setup slots = 16:00..19:00 step 30 min =>
launch date = 2026-05-14
launch date + 21 days =>
launch date - 2026-05-01 =>

# 4) Back-solve a gap
revenue goal = total(6500, 4200, gap)
revenue goal => 15000
gap =>

# Tip: click or drag any result chip into a new line to reuse it as a live dependency.
`;
