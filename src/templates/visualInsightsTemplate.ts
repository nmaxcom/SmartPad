export const NEW_STUFF_TEMPLATE = `# New stuff: visual insights and goal seek
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

# Function-backed plot: named results and direct function expressions both sample correctly
radius = 30
circle_area(r) = PI * r^2
area now = circle_area(radius) =>
@view plot x=radius y=area now domain=0..40 size=md

# Direct polynomial plot: quote expressions when y is not a named result
x = 0
curve = x^3 + 4 =>
@view plot x=x y="x^3 + 4" domain=-10..10 size=md

# Direct function plot: no throwaway x assignment needed
f(x) = 56*x + 7
f(10) =>
@view plot y=f domain=-10..10 size=md

# Function-backed expression plot: ff stays linked to f(x), and x can be virtual
ff = f(x)
@view plot x=x y=ff domain=-10..10 size=md

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

# 6) Goal seek from a trusted result: set a desired output and solve the input
keep rate = 78%
gross = 3000 EUR
take home = gross * keep rate =>
make take home = 4000 EUR by gross =>

# Another one-variable goal: how much monthly saving hits the fund?
current savings = 3200 EUR
periods = 18
monthly saving = 900 EUR
goal fund = current savings + monthly saving * periods =>
make goal fund = 20000 EUR by monthly saving =>

# Source-expression goal seek also works without naming the result.
target distance = 120 km
target time = 2 h
make target distance / target time = 80 km/h by target time =>

# Scientific duration literals stay durations, not generic units
edge tiny = 9.99e-5 s
edge tiny + 9 s =>

# Guardrail to try manually:
# If you make one scatter list shorter, the scatter suggestion should disappear or the view should disconnect clearly.
# If you try "make distance = 300 km by speed, time =>", v1 should reject it instead of pretending there is one answer.
`;
