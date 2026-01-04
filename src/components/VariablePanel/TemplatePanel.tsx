import React from "react";
import { useEditorContext } from "../Editor";
import "./TemplatePanel.css";

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
