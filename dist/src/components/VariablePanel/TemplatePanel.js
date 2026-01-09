"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const Editor_1 = require("../Editor");
require("./TemplatePanel.css");
// Template data with modern variable names (spaces and phrases)
const templates = [
    {
        id: "quick-tour",
        emoji: "✨",
        name: "Quick Tour",
        content: `# Quick Tour: a guided walkthrough
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
fuel economy to km/L =>`,
    },
    {
        id: "list-spec",
        emoji: "🧾",
        name: "List Spec Lab",
        content: `# Lists Spec Lab
# Creation & display
xs = 10, 20, 30
ys = xs[2..2]
ys =>20
count(ys) => 1
costs = $12, $15, $9
costs => $12, $15, $9
lengths = 3 m, 25 ft, 48 km
lengths => 3 m, 25 ft, 48 km
rates = 5%, 8%, 21%
rates => 5%, 8%, 21%
single = $12
single => $12
rent = 1200, 1200
utilities = 200, 200
expenses = rent, utilities
sum(expenses) => ⚠️ Cannot sum: 1200, 1200, 200, 200 contains a nested list
avg(50) => ⚠️ avg() expects a list

# Aggregations
sum(costs) => $36
count(costs) => 3
mean(costs) => $12
avg(costs) => $12
min(costs) => $9
max(costs) => $15
xs = 1, 3, 10
median(xs) => 3
ys = 1, 3, 10, 11
median(ys) => 6.5
range(costs) => $6
xs = 2, 4, 4, 4, 5, 5, 7, 9
stddev(xs) => 2
lengths = 3 m, 25 m, 48 km
sum(lengths) => 48.028 km
mean(lengths) => 16.0093 km

# Indexing & slicing
costs = $12, $15, $9
costs[1] => $12
costs[2] => $15
costs[3] => $9
costs[-1] => $9
costs[1..2] => $12, $15
costs[2..3] => $15, $9
costs[3..3] => $9
costs[2..1] => ⚠️ Range can't go downwards

# Sorting & ordering
sort(costs) => $9, $12, $15
sort(costs, desc) => $15, $12, $9
lengths = 3 m, 25 m, 48 km
sort(lengths) => 3 m, 25 m, 48 km
lengths = 3 m, 5 ft, 48 km
sort(lengths) => 5 ft, 3 m, 48 km
times = 2 min, 30 s, 1 h
sort(times) => 30 s, 2 min, 1 h
weird = 3 m, 2 h => ⚠️ Cannot create list: incompatible dimensions

# Filtering & tolerance
costs = $12, $15, $9, $100
costs where > $10 => $12, $15, $100
lengths where > 10 km => 48 km
costs where > $200 => ()
xs = 0.1 + 0.2, 0.3
xs where = 0.3 => 0.3, 0.3
lengths = 1 m, 100 cm, 2 m
lengths where = 1 m => 1 m, 100 cm
costs = $8, $12, $15, $9, $8, $100
costs where = $8 => $8, $8
costs where = $123 => ()
single where > $10 => ⚠️ where expects a list

# Mapping & conversions
costs = $12, $15, $9
costs * 2 => $24, $30, $18
xs = -1, 4, -9
abs(xs) => 1, 4, 9
lengths to m => 3 m, 25 m, 48000 m
rent = $1250
utilities = $185
internet = $75
subscriptions = $49.99
expenses = rent, utilities, internet, subscriptions
total = sum(expenses) => $1559.99
distribution = expenses / total as % => 80.1287%, 11.8591%, 4.8077%, 3.2045%

# Pairwise & broadcast
prices = $10, $20, $30
qty = 2, 1, 3
line totals = prices * qty => $20, $20, $90
sum(line totals) => $130
a = 1, 2, 3
b = 10, 20, 30
a + b => 11, 22, 33
a = 1, 2, 3
b = 10, 20
a + b => ⚠️ Cannot work with lists of different lengths (3 vs 2)
a = 1, 2, 3
a + 10 => 11, 12, 13

# Robustness & errors
mix = 3 m, 2 s
sum(mix) => ⚠️ Cannot sum incompatible units
mix money = $10, €10
sum(mix money) => ⚠️ Cannot sum different currencies ($ vs €)
xs = 1, 2, 3,
xs => 1, 2, 3

# Mini recipes
sort(expenses, desc) => $1250, $185, $75, $49.99
max(expenses) => $1250
measurements = 9.8 m/s^2, 9.7 m/s^2, 9.81 m/s^2, 9.79 m/s^2
mean(measurements) => 9.775 m/s^2
stddev(measurements) => 0.0430 m/s^2
weights = 80 kg, 85 kg, 90 kg
reps = 5, 5, 3
volume = weights * reps => 400 kg, 425 kg, 270 kg
sum(volume) => 1095 kg
`,
    },
    {
        id: "range-spec",
        emoji: "🔢",
        name: "Range Spec Lab",
        content: `# Range-Generated Lists
1..5 => 1, 2, 3, 4, 5
0..10 step 2 => 0, 2, 4, 6, 8, 10
0..10 step 3 => 0, 3, 6, 9
2..6 => 2, 3, 4, 5, 6
6..2 => 6, 5, 4, 3, 2
5..5 => 5
0..10 step 0 => ⚠️ step cannot be 0
0..10 step -2 => ⚠️ step must be positive for an increasing range
10..0 step 2 => ⚠️ step must be negative for a decreasing range
0.5..3 => ⚠️ range endpoints must be integers (got 0.5)
1..5 step 0.5 => ⚠️ step must be an integer (got 0.5)
a = 1
b = 5
a..b => 1, 2, 3, 4, 5
a = 1 m
b = 5 m
a..b => ⚠️ range endpoints must be unitless integers (got m)
1..100000 => ⚠️ range too large (100000 elements; max 10000)

# Composition & helpers
(1..5) * 2 => 2, 4, 6, 8, 10
sum(1..5) => 15

# Mini recipes
unit price = $3
qty = 1..6
line totals = unit price * qty =>$3, $6, $9, $12, $15, $18
sum(line totals) =>$63

x = 0..10 step 2
y = x^2 => 0, 4, 16, 36, 64, 100

n = 1..10
n * 7 => 7, 14, 21, 28, 35, 42, 49, 56, 63, 70
`,
    },
    {
        id: "functions-showcase",
        emoji: "🧩",
        name: "Functions Showcase",
        content: `# Functions: reusable formulas
# Define recipes (no => on definitions)

// Calculates area of a circle
area(r) = PI * r^2
volume(area, height) = area * height
tip(bill, rate=15%) = bill * rate
with_tip(bill, rate=15%) = bill + tip(bill, rate)

# Call them like normal math

radius = 4 m
circle area = area(radius) =>
cylinder volume = volume(circle area, 2 m) =>
with_tip($80) =>
with_tip(bill: $120, rate: 20%) =>

# Named args make intent obvious

tax(amount, rate=8.5%) = amount * rate
total(amount) = amount + tax(amount)
total($1200) =>

# Dynamic context: functions use current variables

rate = 10%
discount(price) = price * rate
discount($100) =>
rate = 20%
discount($100) =>

# Zero-argument functions

magic() = 42
magic() =>

# Units and conversions inside functions

speed(distance, time) = distance / time
speed(150 m, 12 s) =>
speed(1500 m, 2 min) =>

# Currency stays currency

with_fee(price, fee=5%) = price + price * fee
with_fee($200) =>

# Compose functions for real workflows

paint_area(width, height) = width * height
paint_cost(width, height, price_per_m2) = paint_area(width, height) * price_per_m2
paint_cost(3 m, 2.5 m, $8) =>
paint_cost(width: 4 m, height: 3 m, price_per_m2: $7.5) =>`,
    },
    {
        id: "event-profit",
        emoji: "🎟️",
        name: "Event Profit",
        content: `# You are planning a small event

ticket price = $45
attendees = 180
discount = 15%
discounted ticket = discount off ticket price =>
gross revenue = discounted ticket * attendees =>
platform fee = 3%
net revenue = platform fee off gross revenue =>
venue fee = $250
profit = net revenue - venue fee =>
profit margin = profit / gross revenue as % =>

# Now ask: what price hits a target profit?

target profit = $3000
required revenue = target profit + venue fee =>
required ticket = required revenue / attendees =>
required ticket to USD =>`,
    },
    {
        id: "commute-planner",
        emoji: "🚲",
        name: "Commute Planner",
        content: `# Estimate a typical commute

commute distance = 18 km
average speed = 45 km/h
travel time = commute distance / average speed =>
travel time to min =>

# What if traffic slows you down?

slowdown = 20%
slow speed = slowdown off average speed =>
slow travel time = commute distance / slow speed =>
slow travel time to min =>

# Round trip and weekly totals

round trip distance = commute distance * 2 =>
weekly distance = round trip distance * 5 =>
weekly time = slow travel time * 5 =>
weekly time to h =>`,
    },
    {
        id: "physics-lab",
        emoji: "⚗️",
        name: "Physics Lab",
        content: `# Motion and speed

distance = 150 m
time = 12 s
velocity = distance / time =>
velocity to km/h =>

# Acceleration from a speed change

accel time = 6 s
initial speed = 4 m/s
final speed = 28 m/s
acceleration = (final speed - initial speed) / accel time =>

# Force from mass and acceleration

mass = 2.5 kg
force = mass * acceleration =>
force to lbf =>

# Pressure from force over area

area = 0.4 m^2
pressure = force / area =>
pressure to kPa =>

# Energy and power

work distance = 10 m
work = force * work distance =>
power = work / 30 s =>
power to kW =>`,
    },
    {
        id: "date-math",
        emoji: "📅",
        name: "Date Math",
        content: `# Date Math: calendar-aware calculations

# ISO + month carry vs exact days
start date = 2024-01-31
start date + 1 month =>
start date + 30 days =>

# Natural language dates
launch day = 5 June 2004
launch day + 2 months + 1 year =>

# Date/time and zone offsets
meeting = 2024-06-05 17:00 UTC
meeting + 2h =>
meeting in +05:00 =>

# Locale numeric dates (uses your system locale)
06/05/2024 =>

# Today/now shortcuts
now =>
today + 10 days =>

# Business days (Mon-Fri)
2024-11-25 + 5 business days =>
2024-12-02 - 1 business day =>

# Relative weekdays
next Monday =>
next Monday + 2 weeks =>
last Friday =>

# Date differences (in days)
2024-06-30 - 2024-06-01 =>

# Mixed: chain operations
trip = 2024-09-12 08:00 +05:00
trip + 3 days + 4 hours =>
trip in UTC =>`,
    },
];
function TemplatePanel() {
    const { setSmartPadContent } = (0, Editor_1.useEditorContext)();
    const handleTemplateClick = (template) => {
        setSmartPadContent(template.content);
        // Ensure evaluation runs after insertion
        try {
            window.dispatchEvent(new Event('forceEvaluation'));
        }
        catch { }
    };
    return (react_1.default.createElement("aside", { className: "template-panel" },
        react_1.default.createElement("h2", { className: "panel-title" }, "Quick Templates"),
        react_1.default.createElement("div", { className: "template-buttons" }, templates.map((template) => (react_1.default.createElement("button", { key: template.id, className: "template-button", onClick: () => handleTemplateClick(template), title: template.name },
            react_1.default.createElement("span", { className: "template-emoji" }, template.emoji),
            react_1.default.createElement("span", { className: "template-name" }, template.name)))))));
}
exports.default = TemplatePanel;
