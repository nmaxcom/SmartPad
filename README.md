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

## Complete Feature Reference

### 📝 Variables & Expressions

Define variables once, use them everywhere. Results update automatically when dependencies change.

```text
radius = 5 m
height = 10 m
volume = PI * radius^2 * height => 785.4 m^3

// Variables update automatically
radius = 10 m
// volume now => 3141.59 m^3
```

### 🔢 Mathematical Constants

SmartPad includes built-in mathematical constants:

```text
PI => 3.141592653589793
E => 2.718281828459045

// Use in calculations
circle_area = PI * 5^2 => 78.54
compound_growth = 1000 * E^(0.05 * 10) => 1648.72
```

**Available Constants:**
- `PI` - The mathematical constant π (3.14159...)
- `E` - Euler's number (2.71828...)

### 💰 Supported Currencies

SmartPad supports multiple currencies with proper formatting:

```text
// US Dollar
price_usd = $100 => $100.00

// Euro
price_eur = €50.25 => €50.25

// British Pound
price_gbp = £75.50 => £75.50

// Japanese Yen (no decimals)
price_jpy = ¥1000 => ¥1,000

// Indian Rupee
price_inr = ₹500 => ₹500.00

// Bitcoin (8 decimal places)
price_btc = ₿0.001 => ₿0.00100000

// Swiss Franc (symbol after)
price_chf = 100 CHF => 100.00 CHF

// Canadian Dollar
price_cad = 150 CAD => 150.00 CAD

// Australian Dollar
price_aud = 200 AUD => 200.00 AUD
```

**Supported Currencies:**
- `$` - USD (US Dollar)
- `€` - EUR (Euro)
- `£` - GBP (British Pound)
- `¥` - JPY (Japanese Yen)
- `₹` - INR (Indian Rupee)
- `₿` - BTC (Bitcoin)
- `CHF` - Swiss Franc
- `CAD` - Canadian Dollar
- `AUD` - Australian Dollar

### 📏 Complete Units Reference

SmartPad supports a comprehensive set of units with automatic conversions and dimensional analysis.

#### Length Units

```text
distance = 100 m
distance to km => 0.1 km
distance to cm => 10000 cm
distance to mm => 100000 mm
distance to in => 3937.01 in
distance to ft => 328.08 ft
distance to mi => 0.0621 mi
```

**Supported:** `m`, `mm`, `cm`, `km`, `in`, `ft`, `mi` (and their full names: meter, millimeter, centimeter, kilometer, inch, foot, mile)

#### Mass Units

```text
weight = 70 kg
weight to g => 70000 g
weight to lb => 154.32 lb
```

**Supported:** `kg`, `g`, `lb` (and their full names: kilogram, gram, pound, pounds, lbs)

#### Time Units

```text
duration = 3600 s
duration to min => 60 min
duration to h => 1 h
duration to days => 0.0417 days
```

**Supported:** `s`, `min`, `h`, `day`, `days` (and their full names: second, seconds, minute, minutes, hour, hours)

#### Temperature Units

```text
temp = 25 C
temp to F => 77 F
temp to K => 298.15 K

freezing = 0 C
freezing to F => 32 F
freezing to K => 273.15 K
```

**Supported:** `K` (Kelvin), `C` or `°C` (Celsius), `F` or `°F` (Fahrenheit)

#### Area Units

```text
room = 25 m^2
room to ft^2 => 269.1 ft^2
room to sqm => 25 sqm
```

**Supported:** `m^2`, `sqm`, `ft^2`, `sqft` (and their full names: square meter, square meters, square foot, square feet)

#### Volume Units

```text
tank = 10 m^3
tank to ft^3 => 353.15 ft^3
```

**Supported:** `m^3`, `ft^3` (and their full names: cubic meter, cubic meters, cubic foot, cubic feet)

#### Speed Units

```text
velocity = 100 km/h
velocity to m/s => 27.78 m/s
velocity to mph => 62.14 mph
velocity to ft/s => 91.13 ft/s
```

**Supported:** `m/s`, `km/h`, `kph`, `mph`, `ft/s` (and their full names: meters per second, kilometers per hour, miles per hour, feet per second)

#### Acceleration Units

```text
gravity = 9.8 m/s^2
gravity to ft/s^2 => 32.15 ft/s^2
```

**Supported:** `m/s^2`, `ft/s^2` (and their full names: meters per second squared, feet per second squared)

#### Force Units

```text
force = 100 N
force to lbf => 22.48 lbf
```

**Supported:** `N`, `lbf` (and their full names: newton, newtons, pound force, pounds force)

#### Pressure Units

```text
pressure = 101325 Pa
pressure to kPa => 101.325 kPa
pressure to MPa => 0.101325 MPa
pressure to bar => 1.01325 bar
pressure to psi => 14.7 psi
```

**Supported:** `Pa`, `kPa`, `MPa`, `bar`, `psi` (and their full names: pascal, pascals, kilopascal, megapascal, bar, bars, pounds force per square inch)

#### Energy Units

```text
energy = 1000 J
energy to kJ => 1 kJ
energy to MJ => 0.001 MJ
energy to cal => 239 cal
energy to kcal => 0.239 kcal
energy to Wh => 0.278 Wh
energy to kWh => 0.000278 kWh
```

**Supported:** `J`, `mJ`, `kJ`, `MJ`, `cal`, `kcal`, `Wh`, `kWh` (and their full names: joule, joules, millijoule, kilojoule, megajoule, calorie, calories, kilocalorie, watt hour, kilowatt hour)

#### Power Units

```text
power = 1000 W
power to kW => 1 kW
power to MW => 0.001 MW
power to hp => 1.34 hp
```

**Supported:** `W`, `kW`, `MW`, `hp` (and their full names: watt, watts, kilowatt, megawatt, mechanical horsepower)

#### Electric Units

```text
// Current
current = 1 A
current to mA => 1000 mA
current to uA => 1000000 uA

// Voltage
voltage = 120 V
voltage to mV => 120000 mV
voltage to kV => 0.12 kV

// Resistance
resistance = 1000 ohm
resistance to kohm => 1 kohm
resistance to Mohm => 0.001 Mohm
// Also supports: Ω, kΩ, MΩ
```

**Supported:**
- **Current:** `A`, `mA`, `uA`, `μA` (and their full names: ampere, amperes, milliampere, microampere)
- **Voltage:** `V`, `mV`, `kV` (and their full names: volt, volts, millivolt, kilovolt)
- **Resistance:** `ohm`, `Ω`, `kohm`, `kΩ`, `Mohm`, `MΩ` (and their full names: ohm, ohms, kiloohm, megaohm)

#### Frequency Units

```text
freq = 1000 Hz
freq to kHz => 1 kHz
freq to MHz => 0.001 MHz
```

**Supported:** `Hz`, `kHz`, `MHz` (and their full names: hertz, kilohertz, megahertz)

#### Angle Units

```text
angle = 90 deg
angle to rad => 1.571 rad
```

**Supported:** `rad`, `deg` (and their full names: radian, radians, degree, degrees)

#### Information Units

```text
data = 1024 B
data to KB => 1 KB
data to MB => 0.001 MB
data to GB => 0.000001 GB
```

**Supported:** `B`, `KB`, `MB`, `GB` (and their full names: byte, bytes, kilobyte, megabyte, gigabyte)

#### Rotational Speed Units

```text
rpm = 1200 rpm
rpm to rad/s => 125.66 rad/s
rpm to rev/s => 20 rev/s
rpm to Hz => 20 Hz
```

**Supported:** `rpm`, `rad/s`, `rev/s` (and their full names: revolutions per minute, radians per second, revolutions per second)

### 🧮 Mathematical Operations

SmartPad supports all standard arithmetic operations:

```text
// Basic arithmetic
2 + 3 => 5
10 - 4 => 6
5 * 6 => 30
20 / 4 => 5
2^3 => 8
(2 + 3) * 4 => 20

// With units
10 m + 5 m => 15 m
100 km / 2 h => 50 km/h
5 kg * 9.8 m/s^2 => 49 N
```

**Operators:**
- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `^` - Exponentiation (power)

### 📐 Mathematical Functions

SmartPad includes a comprehensive set of mathematical functions:

#### Square Root & Powers

```text
sqrt(16) => 4
sqrt(25 m^2) => 5 m
pow(2, 3) => 8
pow(5 m, 2) => 25 m^2
```

#### Rounding Functions

```text
round(3.7) => 4
floor(3.7) => 3
ceil(3.2) => 4
abs(-5) => 5
abs(-10 m) => 10 m
```

#### Min/Max Functions

```text
min(3, 5, 1, 9) => 1
max(3, 5, 1, 9) => 9
min(10 m, 5 m, 15 m) => 5 m
max(10 kg, 5 kg, 15 kg) => 15 kg
```

#### Trigonometric Functions

```text
sin(PI/2) => 1
cos(0) => 1
tan(PI/4) => 1
asin(1) => 1.571
acos(0) => 1.571
atan(1) => 0.785
```

**Note:** Trigonometric functions work with dimensionless values (radians).

#### Logarithmic Functions

```text
log(100) => 2        // Base 10 logarithm
ln(E) => 1           // Natural logarithm
exp(1) => 2.718      // e^x
```

**Available Functions:**
- `sqrt(x)` - Square root
- `pow(x, y)` - x raised to the power of y
- `abs(x)` - Absolute value
- `round(x)` - Round to nearest integer
- `floor(x)` - Round down
- `ceil(x)` - Round up
- `min(x, y, ...)` - Minimum value
- `max(x, y, ...)` - Maximum value
- `sin(x)` - Sine (x in radians)
- `cos(x)` - Cosine (x in radians)
- `tan(x)` - Tangent (x in radians)
- `asin(x)` - Arc sine
- `acos(x)` - Arc cosine
- `atan(x)` - Arc tangent
- `log(x)` - Base 10 logarithm
- `ln(x)` - Natural logarithm
- `exp(x)` - e raised to the power of x

### 📊 Percentages

Percentages work intuitively—no need to convert to decimals.

```text
// Basic percentage calculations
100 * 20% => 20
$100 * 15% => $15.00
$100 + 8% => $108.00
$100 - 10% => $90.00

// Percentage of percentage
base = $100
tax = 8%
tip = 15%
total = base + base * tax + base * tip => $123.00

// Growth calculations
initial = 1000
growth_rate = 7%
after_5_years = initial * (1 + growth_rate)^5 => 1402.55
```

### 📅 Date & Time Math

Calculate with dates naturally. Add months, days, business days, and convert time zones.

#### Date Creation

```text
// ISO format
2024-06-05 => 2024-06-05

// Natural language
5 June 2004 => 2004-06-05
June 5, 2024 => 2024-06-05

// Locale format (uses system locale)
06/05/2024 => 2024-06-05

// DateTime with time
2024-06-05 17:00 UTC => 2024-06-05 17:00 UTC
2024-06-05 17:00 Z => 2024-06-05 17:00 UTC
2024-06-05 17:00 +05:00 => 2024-06-05 17:00 +05:00
```

#### Date Arithmetic

```text
// Adding durations
2024-06-05 + 2 months => 2024-08-05
2024-06-05 + 1 year => 2025-06-05
2024-06-05 + 10 days => 2024-06-15
2024-01-31 + 1 month => 2024-02-29  // End-of-month carry
2024-01-31 + 30 days => 2024-03-01  // Exact day addition

// Subtracting durations
2024-06-05 - 10 days => 2024-05-26

// Date differences
2024-06-30 - 2024-06-01 => 29 days
(2024-06-30 - 2024-06-01) in months => 0.966667 months
(2024-06-30 - 2024-06-01) in weeks => 4.142857 weeks
```

#### Business Days

```text
// Business days (Monday-Friday)
2024-11-25 + 5 business days => 2024-12-02
2024-12-02 - 1 business day => 2024-11-29
```

#### Time Zone Conversions

```text
// Convert time zones
2024-06-05 17:00 UTC in local => 2024-06-05 10:00 local
2024-06-05 17:00 +05:00 in UTC => 2024-06-05 12:00 UTC
2024-06-05 17:00 UTC in +05:00 => 2024-06-05 22:00 +05:00
```

#### Relative Dates

```text
// Today, tomorrow, yesterday
today => 2024-10-14
tomorrow => 2024-10-15
yesterday => 2024-10-13

// Now
now => 2024-10-14 15:30:00 local

// Relative weekdays
next Monday => 2024-10-21
last Friday => 2024-10-11
next Monday + 2 weeks => 2024-11-04
```

#### Duration Conversions

```text
// Convert calendar units
21 months to weeks => 90 weeks
1 year in days => 365 days
2 weeks in days => 14 days
```

### ⚙️ User-Defined Functions

Define reusable functions to keep your calculations clean and organized.

```text
// Basic function
area(r) = PI * r^2
area(5 m) => 78.54 m^2

// Function with default values
tip(bill, rate=15%) = bill * rate
tip($100) => $15.00
tip($100, rate: 20%) => $20.00

// Named arguments
calculate_total(price, tax_rate=8%, discount=0%) = 
  price * (1 - discount) * (1 + tax_rate)
calculate_total(price: $100, discount: 10%) => $97.20

// Unit-aware functions
speed(distance, time) = distance / time
speed(150 km, 2 hours) => 75 km/h
speed(1500 m, 2 min) => 12.5 m/s

// Functions using other functions
circumference(r) = 2 * PI * r
circle_area(r) = PI * r^2
total_circle(r) = circumference(r) + circle_area(r)
```

**Function Features:**
- Default parameter values
- Named arguments in function calls
- Unit-aware calculations
- Functions can call other functions
- Dynamic scope (uses current variable values)

### 🔬 Scientific Notation

Work with very large or very small numbers naturally.

```text
// Large numbers
avogadro = 6.022e23
molecules = 2 * avogadro => 1.204e+24
speed_of_light = 299792458 m/s => 2.998e+8 m/s

// Small numbers
planck = 6.626e-34
electron_charge = 1.602e-19
wavelength = 500e-9 m => 5e-7 m

// In calculations
energy = planck * 1e15 Hz => 6.626e-19 J
```

### 🔗 Dependent Variables & Live Updates

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

### 🎯 Dimensional Analysis

SmartPad automatically handles unit conversions and dimensional analysis:

```text
// Automatic unit derivation
distance = 100 m
time = 10 s
speed = distance / time => 10 m/s

// Force from mass and acceleration
mass = 10 kg
acceleration = 9.8 m/s^2
force = mass * acceleration => 98 N

// Energy from force and distance
work = force * 5 m => 490 J

// Power from energy and time
power = work / 2 s => 245 W

// Pressure from force and area
area = 2 m^2
pressure = force / area => 49 Pa
```

---

## Comprehensive Examples

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

### 🔬 Physics Calculations

```text
// Kinetic energy
mass = 0.1 kg
velocity = 50 m/s
kinetic_energy = 0.5 * mass * velocity^2 => 125 J

// Potential energy
height = 10 m
gravity = 9.8 m/s^2
potential_energy = mass * gravity * height => 9.8 J

// Wave properties
wavelength = 500 nm
speed_of_light = 299792458 m/s
frequency = speed_of_light / wavelength => 5.996e+14 Hz

// Electric power
voltage = 120 V
current = 5 A
power = voltage * current => 600 W
energy = power * 2 h => 1.2 kWh

// Pressure calculations
force = 1000 N
area = 0.5 m^2
pressure = force / area => 2000 Pa
pressure to kPa => 2 kPa
pressure to psi => 0.29 psi
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

### ⚡ Electrical Engineering

```text
// Ohm's Law
voltage = 12 V
resistance = 4 ohm
current = voltage / resistance => 3 A
power = voltage * current => 36 W

// Power calculations
power_kw = 5 kW
time_hours = 8 h
energy = power_kw * time_hours => 40 kWh
cost = energy * $0.12 per kWh => $4.80

// Circuit analysis
r1 = 10 ohm
r2 = 20 ohm
r_parallel = (r1 * r2) / (r1 + r2) => 6.67 ohm
r_series = r1 + r2 => 30 ohm
```

### 🌡️ Temperature Conversions

```text
// Weather
room_temp = 22 C
room_temp to F => 71.6 F
room_temp to K => 295.15 K

// Cooking
oven_temp = 350 F
oven_temp to C => 176.67 C

// Scientific
absolute_zero = 0 K
absolute_zero to C => -273.15 C
absolute_zero to F => -459.67 F
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

5. **Work with dates**:
   ```text
   today + 30 days => 2024-11-13
   ```

6. **Use percentages**:
   ```text
   $100 + 8% => $108.00
   ```

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

See [docs/Specs/proposed/feature-vision.md](docs/Specs/proposed/feature-vision.md) for the complete feature roadmap.

---

**Made with ❤️ for people who think in numbers, units, and relationships.**
