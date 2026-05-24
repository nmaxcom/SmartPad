export const VISUAL_INSIGHTS_TEMPLATE = `# Visual Insights Lab: live plots, histograms, scatter
# Use the result-chip menu on the marked result lines to recreate each view.
# These examples are intentionally practical and editable.

# 1) Live-bound named plot: speed follows the named result
distance = 120 km
time = 2 h
speed = distance / time =>
@view plot x=time y=speed domain=0.25..6 size=md

# Edit distance or time above: the plot stays bound to speed, not a copied formula.
stops = 0.25 h
trip speed = distance / (time + stops) =>
@view plot x=time y=trip speed domain=0.25..6 size=md

# 2) Multi-variable result: menu should offer Plot vs promo spend and Plot vs price delta
base revenue = $3000
promo spend = $400
ad multiplier = 4
price delta = 0
price penalty = $160
forecast revenue = base revenue + promo spend * ad multiplier - price delta * price penalty =>
@view plot x=promo spend y=forecast revenue domain=0..1000 size=md
@view plot x=price delta y=forecast revenue domain=0..15 size=md

# 3) Numeric-list histogram: distribution, not a fake line chart
wait times = 3 min, 4 min, 4 min, 5 min, 8 min, 12 min =>
@view hist y=wait times size=md

# Edge case: identical values should still connect as one clear bucket
same wait = 5 min, 5 min, 5 min, 5 min =>
@view hist y=same wait size=sm

# 4) Scatter: two equal-length numeric lists become point data
study hours = 2, 3, 4, 5, 6, 8, 9 =>
test score = 58, 61, 68, 73, 79, 88, 92 =>
@view scatter x=study hours y=test score size=md

# 5) Scatter with currency on x: units/currency still plot numerically
daily spend = $120, $160, $210, $260, $310, $390
ticket sales = 68, 77, 89, 96, 108, 121 =>
@view scatter x=daily spend y=ticket sales size=md

# Guardrail to try manually:
# If you make one scatter list shorter, the scatter suggestion should disappear or the view should disconnect clearly.
`;
