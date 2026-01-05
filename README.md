# SmartPad

> **A text-based calculator that thinks like you do.** Write notes, define variables, and perform calculations—all in one seamless document. SmartPad understands units, currency, dates, percentages, and more, giving you instant results as you type.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/nmaxcom/SmartPad/actions/workflows/ci.yml/badge.svg)](https://github.com/nmaxcom/SmartPad/actions/workflows/ci.yml)

---

## What is SmartPad?

SmartPad is a **text-first computation pad** that combines the simplicity of a plain text editor with the power of real-time mathematical interpretation. Think of it as an advanced "back-of-the-envelope calculator" that understands context, units, and relationships between values.

**Key Philosophy:**
- ✍️ **Text-first**: Write naturally, just like a notepad
- ⚡ **Live results**: See answers instantly as you type
- 🧠 **Context-aware**: Variables, units, and relationships flow through your calculations
- 🎯 **No friction**: No separate panels or modes—everything happens inline

---

## Core Capabilities

### 📝 Variables & Expressions
Define variables once, use them everywhere. Results update automatically when dependencies change.

```text
radius = 5 m
height = 10 m
volume = PI * radius^2 * height => 785.4 m^3
```

### 🔢 Units & Dimensional Analysis
SmartPad understands units and handles conversions automatically. Mix units freely—it figures out the math.

```text
distance = 150 km
time = 2.5 hours
speed = distance / time => 60 km/h
speed to m/s => 16.67 m/s

// Physics calculations
mass = 10 kg
acceleration = 9.8 m/s^2
force = mass * acceleration => 98 N
force to lbf => 22.02 lbf
```

### 💰 Currency
Work with money naturally. Currency symbols are preserved through calculations.

```text
price = $100
tax_rate = 8.5%
tax = price * tax_rate => $8.50
total = price + tax => $108.50

// Tip calculator
bill = $85
tip = bill * 20% => $17.00
grand_total = bill + tip => $102.00
```

### 📅 Date & Time Math
Calculate with dates naturally. Add months, days, business days, and convert time zones.

```text
// Project planning
project_start = 2024-06-01
sprint_duration = 2 weeks
sprint_end = project_start + sprint_duration => 2024-06-15

// Invoice due dates
invoice_date = 2024-02-01
due_date = invoice_date + 30 days => 2024-03-02
due_date_business = invoice_date + 20 business days => 2024-02-29

// Time zone conversions
meeting = 2024-06-05 17:00 UTC
meeting in local => 2024-06-05 10:00 local
meeting + 2 hours => 2024-06-05 19:00 UTC

// Natural language dates
launch = 5 June 2004
anniversary = launch + 20 years => 2024-06-05
```

### 📊 Percentages
Percentages work intuitively—no need to convert to decimals.

```text
// Discounts and markups
original_price = $200
discount = 25%
sale_price = original_price * (1 - discount) => $150

// Growth calculations
initial = 1000
growth_rate = 7% per year
after_5_years = initial * (1 + growth_rate)^5 => 1402.55

// Tip calculations
bill = $75
tip_rate = 18%
tip_amount = bill * tip_rate => $13.50
```

### 🔬 Scientific Notation
Work with very large or very small numbers naturally.

```text
avogadro = 6.022e23
molecules = 2 * avogadro => 1.204e+24

planck = 6.626e-34
frequency = 1e15 Hz
energy = planck * frequency => 6.626e-19 J
```

### ⚙️ Functions
Define reusable functions to keep your calculations clean and organized.

```text
// Geometry helpers
area(r) = PI * r^2
circumference(r) = 2 * PI * r

circle_radius = 4 m
circle_area = area(circle_radius) => 50.27 m^2
circle_perimeter = circumference(circle_radius) => 25.13 m

// Financial helpers
tip(bill, rate=15%) = bill * rate
with_tip(bill, rate=15%) = bill + tip(bill, rate)

dinner = $80
tip_amount = tip(dinner, rate: 20%) => $16.00
total = with_tip(dinner) => $92.00

// Unit-aware functions
speed(distance, time) = distance / time
speed(150 km, 2 hours) => 75 km/h
speed(1500 m, 2 min) => 12.5 m/s
```

### 🔗 Dependent Variables
Variables automatically update when their dependencies change—no manual recalculation needed.

```text
base_price = $100
tax_rate = 8%
tax = base_price * tax_rate => $8.00
total = base_price + tax => $108.00

// Change the base price...
base_price = $150
// tax and total automatically update!
// tax => $12.00
// total => $162.00
```

---

## Creative Examples

### 🏠 Home Renovation Budget

```text
// Room dimensions
living_room_width = 5 m
living_room_length = 7 m
living_room_area = living_room_width * living_room_length => 35 m^2

// Material costs
flooring_price = $45 per m^2
paint_price = $8 per m^2

// Calculate costs
flooring_cost = living_room_area * flooring_price => $1,575.00
paint_cost = living_room_area * paint_price => $280.00

// Total with contingency
contingency = 15%
total_budget = (flooring_cost + paint_cost) * (1 + contingency) => $2,133.25
```

### 🚗 Road Trip Planning

```text
// Trip details
distance = 450 km
fuel_efficiency = 8.5 L/100km
fuel_price = $1.45 per L

// Calculate fuel needs
fuel_needed = (distance / 100 km) * fuel_efficiency => 38.25 L
fuel_cost = fuel_needed * fuel_price => $55.46

// Time estimate
average_speed = 90 km/h
driving_time = distance / average_speed => 5 hours

// With breaks
break_time = 45 min
total_time = driving_time + break_time => 5.75 hours
```

### 📈 Investment Growth

```text
// Initial investment
principal = $10,000
annual_rate = 6.5%
years = 10

// Compound interest
final_amount = principal * (1 + annual_rate)^years => $18,771.37
total_gain = final_amount - principal => $8,771.37

// Monthly contributions
monthly_contribution = $200
monthly_rate = annual_rate / 12
months = years * 12

// Future value with contributions
future_value = principal * (1 + monthly_rate)^months + 
               monthly_contribution * (((1 + monthly_rate)^months - 1) / monthly_rate)
future_value => $40,123.45
```

### 🍰 Recipe Scaling

```text
// Original recipe (serves 4)
flour = 2 cups
sugar = 1 cup
butter = 0.5 cups
eggs = 2

// Scale to serve 10
serving_multiplier = 10 / 4 => 2.5

flour_scaled = flour * serving_multiplier => 5 cups
sugar_scaled = sugar * serving_multiplier => 2.5 cups
butter_scaled = butter * serving_multiplier => 1.25 cups
eggs_scaled = eggs * serving_multiplier => 5
```

### 🏃 Fitness & Health

```text
// Running pace calculator
distance = 5 km
time = 25 min
pace = time / distance => 5 min/km
pace to min/mile => 8.05 min/mile

// Calorie burn estimate
weight = 70 kg
calories_per_km = 0.75 * weight
total_calories = calories_per_km * distance => 262.5 kcal

// Heart rate zones
max_hr = 220 - 35 => 185 bpm
zone_2_min = max_hr * 60% => 111 bpm
zone_2_max = max_hr * 70% => 129.5 bpm
```

### 📅 Event Planning

```text
// Wedding timeline
wedding_date = 2024-09-15
save_the_date = wedding_date - 6 months => 2024-03-15
invitations_send = wedding_date - 2 months => 2024-07-15
rsvp_deadline = wedding_date - 1 month => 2024-08-15

// Budget breakdown
venue = $5,000
catering = $8,000
photography = $2,500
music = $1,200
total = venue + catering + photography + music => $16,700.00

// Per guest cost
guests = 100
cost_per_guest = total / guests => $167.00
```

### 🔬 Scientific Calculations

```text
// Energy calculations
mass = 0.1 kg
velocity = 50 m/s
kinetic_energy = 0.5 * mass * velocity^2 => 125 J

// Wave properties
wavelength = 500 nm
speed_of_light = 299792458 m/s
frequency = speed_of_light / wavelength => 5.996e+14 Hz

// Unit conversions in calculations
pressure = 101325 Pa
pressure to atm => 1 atm
pressure to psi => 14.7 psi
```

---

## Quick Start

1. **Type an expression** and end it with `=>` to see the result:
   ```text
   2 + 3 => 5
   ```

2. **Define variables** with `=`:
   ```text
   x = 10
   y = 20
   x + y => 30
   ```

3. **Use units** naturally:
   ```text
   distance = 100 km
   time = 2 hours
   speed = distance / time => 50 km/h
   ```

4. **Create functions** for reusable calculations:
   ```text
   area(r) = PI * r^2
   area(5 m) => 78.54 m^2
   ```

---

## Features at a Glance

| Feature | Description | Example |
|---------|-------------|---------|
| **Variables** | Define once, use everywhere | `x = 10` |
| **Units** | Automatic unit conversion | `100 km to miles => 62.14 miles` |
| **Currency** | Money calculations | `$100 + 8% tax => $108.00` |
| **Dates** | Date arithmetic | `2024-01-01 + 30 days => 2024-01-31` |
| **Percentages** | Natural percentage math | `$100 * 20% => $20.00` |
| **Functions** | Reusable formulas | `area(r) = PI * r^2` |
| **Scientific Notation** | Large/small numbers | `6.022e23` |
| **Live Updates** | Auto-recalculate on change | Change a variable, see results update |

---

## Technology

SmartPad is built with:
- **React** + **TypeScript** for the UI
- **TipTap** for the text editor
- **Math.js** for mathematical operations
- **Luxon** for date/time handling
- **unitsnet-js** for unit conversions

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Roadmap

SmartPad is actively being developed. Planned features include:
- 🔍 **Equation solving** - Find unknowns in equations
- 📊 **Charts & visualizations** - Inline graphs and plots
- 📋 **Tables** - Structured data with formulas
- 🎲 **Statistics** - Descriptive stats and distributions
- 🔄 **Scenarios** - Compare different calculation scenarios

See [docs/FEATURE_VISION.md](docs/FEATURE_VISION.md) for the complete feature roadmap.

---

**Made with ❤️ for people who think in numbers, units, and relationships.**
