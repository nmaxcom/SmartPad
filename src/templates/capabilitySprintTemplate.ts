export const CAPABILITY_SPRINT_TEMPLATE = `# Capability Sprint: SmartPad in one compact sheet
# Scrubbing: hover a number and drag left/right to change it live.
# This tour samples currency, percentages, units, lists, ranges, dates, solve, and plotting.

# 1) Launch-night budget (currency + percentages + conversions)
attendees base = 120
walk ins = 26
attendees total = attendees base + walk ins
ticket list = $28
promo = 10%
service fee = 3%
ticket net = service fee on (promo off ticket list)
gross revenue = attendees total * ticket net
drink per attendee = 0.42 L
drink total = attendees total * drink per attendee
drink total to gal
avg spend per attendee = gross revenue / attendees total

# 2) Ops planning (lists + aggregates + filtering + ranges)
crew hours = 6, 5.5, 7, 6.5
crew total = sum(crew hours)
crew average = avg(crew hours)
supply quotes = $1700, $2100, $1950, $1825
best quote = min(supply quotes)
quotes over 1900 = supply quotes where > $1900
checkpoints = 17:30..21:00 step 30 min
ticket tiers = 24..36 step 4
ticket tiers * 1.03

# 3) Date/time math
event date = 2026-06-14
event date + 21 days
event date - 2026-06-01
prep start = 2026-06-10 09:00 UTC
prep start + 5 h
prep start in +02:00

# 4) Units and rates
shift = 8 h
line speed = 14 km/h
weekly hours = 5 * shift
weekly distance = line speed * weekly hours
daily distance = weekly distance / 5
line speed to km/day
delivery pace = 42 km/week
delivery pace to km/day

# 5) Plotting dependency view
x = 0
base demand = 90
demand bump = 12
@view plot x=x y=base demand + demand bump*x domain=0..10 size=lg

# 6) Solve one unknown
fixed costs = $4200
target profit = $3000
solve ticket needed in gross revenue = attendees total * ticket needed, gross revenue = fixed costs + target profit =>
`;
