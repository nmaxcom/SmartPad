import React from "react";
import { useEditorContext } from "../Editor";
import "./TemplatePanel.css";

// Template data with modern variable names (spaces and phrases)
const templates = [
  {
    id: "syntax-tour",
    emoji: "✨",
    name: "Syntax Tour",
    content: `# Welcome to SmartPad: type lines, add "=>" to evaluate

# Variables: spaces and underscores both work
monthly rent = $1250
utilities = $185
internet = $75
monthly total = monthly rent + utilities + internet =>
yearly total = monthly total * 12 =>

# Phrase variables (with "of" inside the name)
pizza total cost = $18.99
number of friends = 6
cost per friend = pizza total cost / number of friends =>

# Currency + percentages
base price = $120.50
discount = 15%
final price = discount off base price =>
tax_rate = 8%
total = tax_rate on final price =>
tip = 10% of total =>

# Percentage operators and queries
20 / 80 as % =>
20 of 80 is % =>
25% off $80 =>
25% on $80 =>
10% of 155 N =>

# Units + conversion
trip distance = 12.5 km
trip time = 25 min
speed = trip distance / trip time =>
speed to m/s =>
height = 1.82 m
height to cm =>

# Temperature conversion (ASCII units)
temp c = 25 C
temp c to F =>
temp c to K =>

# Functions, constants, and powers
sqrt(16) + 2.5 =>
abs(-4.2) =>
max(3, 7) * 2 =>
PI * 2 =>
radius = 4 m
area = PI * radius^2 =>

# Parentheses + decimals
(3.5 + 2.1) * 4 =>`,
  },
  {
    id: "rent",
    emoji: "🏠",
    name: "Rent Calculator",
    content: `base rent = $1250
utilities = $185
internet = $75
monthly total = base rent + utilities + internet =>
yearly total = monthly total * 12 =>`
  },
  {
    id: "pizza",
    emoji: "🍕",
    name: "Pizza Party",
    content: `pizza total cost = $18.99
number of friends = 6
tip percentage = 18%
cost per person = pizza total cost / number of friends =>
tip per person = tip percentage of cost per person =>
total per person = cost per person + tip per person =>`,
  },
  {
    id: "roadtrip",
    emoji: "⛽",
    name: "Road Trip",
    content: `trip distance = 380
car mpg = 28.5
gas price per gallon = $3.45
gallons needed = trip distance / car mpg =>
total fuel cost = gallons needed * gas price per gallon =>
cost per mile = total fuel cost / trip distance =>`,
  },
  {
    id: "phone",
    emoji: "📱",
    name: "Phone Bill",
    content: `# Phone bill, focused on currency behavior
base plan = $45
line access = $10
data overage gb = 1.5
data overage rate = $12.50
data overage fee = data overage rate * data overage gb =>

subtotal = base plan + line access + data overage fee =>
promo discount = 15%
discounted subtotal = promo discount off subtotal =>
tax = 8%
total due = tax on discounted subtotal =>

# Percent of currency + ratio as %
autopay savings = 5% of subtotal =>
discount share = discounted subtotal / subtotal as % =>

# Currency arithmetic with numbers + ratios
per line = subtotal / 2 =>
plan multiple = subtotal / $30 =>
bundle cost = subtotal * 3 =>

# Formatting examples (whole vs fractional, commas)
big charge = $1,000
whole amount = $1000
small fee = $5.5

# Other currency symbols and codes
euro add on = €12
gbp roaming = £9
yen add on = ¥1200
inr fee = ₹350
btc credit = ₿0.0025
swiss fee = 15 CHF
canada fee = 20 CAD
australia fee = 25 AUD`,
  },
  {
    id: "fitness",
    emoji: "🏋️",
    name: "Fitness Goal",
    content: `current weight = 165
height in inches = 68
current age = 28
body mass index = current weight / (height in inches * height in inches) * 703 =>
daily calorie needs = 10 * current weight + 6.25 * height in inches - 5 * current age + 5 =>
weekly calorie deficit = 500 * 7 =>`,
  },
  {
    id: "physics",
    emoji: "⚗️",
    name: "Physics Units",
    content: `# Motion + speed
distance = 150 m
time = 12 s
velocity = distance / time =>
velocity to km/h =>
velocity to mph =>
velocity to m/h =>
velocity to km/s =>

accel time = 6 s
initial speed = 4 m/s
final speed = 28 m/s
acceleration = (final speed - initial speed) / accel time =>
acceleration to ft/s^2 =>

# Forces
mass = 2.5 kg
gravity = 9.8 m/s^2
weight = mass * gravity =>
weight to lbf =>

# Area + pressure
area = 0.4 m^2
pressure = weight / area =>
pressure to kPa =>
pressure to psi =>

# SI prefixes + unit powers
tile area = 2500 cm^2
tile area to m^2 =>
chip volume = 125000 mm^3
chip volume to cm^3 =>
beam length = 250 cm
beam length to m =>
slab area = 3 m^2
slab thickness = 2 m
slab volume = slab area * slab thickness =>

# Work + energy + power
distance pushed = 10 m
work = weight * distance pushed =>
work to kWh =>
power = work / 30 s =>
power to kW =>

# Energy from motion
car mass = 1200 kg
car speed = 22 m/s
kinetic energy = 0.5 * car mass * car speed^2 =>
kinetic energy to kWh =>

# Length, area, volume
length = 5 m
length to ft =>
area square = 12 m^2
area square to ft^2 =>
volume cube = 2 m^3
volume cube to ft^3 =>

# Mass conversion
payload = 25 kg
payload to lb =>

# Temperature conversions
temp celsius = 25 C
temp celsius to F =>
temp celsius to K =>
temp fahrenheit = 77 F
temp fahrenheit to C =>
temp fahrenheit to K =>`,
  },
  {
    id: "units-quick-check",
    emoji: "🧪",
    name: "Units Quick Check",
    content: `length = 10 m
width = 14 m
area = length * width =>
area =>

distance = 10 m
time = 20 s
speed = distance / time =>
speed =>
speed to km/h =>

mass = 3 kg
accel = 9.8 m/s^2
force = mass * accel =>
force to lbf =>

square = 3 m * 3 m =>
volume = 2 m * 2 m * 2 m =>

a = 1 m =>
b = 2 m =>
a + b =>

foo = bar * 2 =>
bar = 5
foo =>
3 m + 2 s =>
5 m / 0 s =>`,
  },
  {
    id: "event-profit",
    emoji: "🎟️",
    name: "Event Profit",
    content: `ticket price = $45
attendees = 180
discount = 15%
discounted ticket = discount off ticket price =>
gross revenue = discounted ticket * attendees =>
platform fee = 3%
net revenue = platform fee off gross revenue =>
venue fee = $250
profit = net revenue - venue fee =>
profit margin = profit / gross revenue as % =>`,
  },
  {
    id: "commute-planner",
    emoji: "🚲",
    name: "Commute Planner",
    content: `commute distance = 18 km
average speed = 45 km/h
travel time = commute distance / average speed =>
travel time to min =>

slowdown = 20%
slow speed = slowdown off average speed =>
slow travel time = commute distance / slow speed =>
slow travel time to min =>`,
  },
  {
    id: "stress-test",
    emoji: "🔥",
    name: "Highlight Stress Test",
    content: `base_value = 10
multiplier = 2
offset = 5

result1 = base_value * multiplier + offset =>
result2 = result1 * base_value - offset =>
result3 = result2 / multiplier + base_value =>
result4 = (result1 + result2 + result3) / offset =>

# References to base_value
ref1 = base_value * 1
ref2 = base_value * 2
ref3 = base_value * 3

# References to multiplier
ref4 = multiplier * 1
ref5 = multiplier * 2
ref6 = multiplier * 3

# References to offset
ref7 = offset + 1
ref8 = offset + 2
ref9 = offset + 3
`
  },
];

function TemplatePanel() {
  const { setSmartPadContent } = useEditorContext();

  const handleTemplateClick = (template: (typeof templates)[0]) => {
    setSmartPadContent(template.content);
    // Ensure evaluation runs after insertion
    try {
      window.dispatchEvent(new Event('forceEvaluation'));
    } catch {}
  };

  return (
    <aside className="template-panel">
      <h2 className="panel-title">Quick Templates</h2>
      <div className="template-buttons">
        {templates.map((template) => (
          <button
            key={template.id}
            className="template-button"
            onClick={() => handleTemplateClick(template)}
            title={template.name}
          >
            <span className="template-emoji">{template.emoji}</span>
            <span className="template-name">{template.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default TemplatePanel;
