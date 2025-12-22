# Figuring out future syntax

## Solving equations and such# SmartPad Core Operations: Fundamental Building Blocks

## Current Operations

```typescript
z = a + 4 => 8                    // Variable math
20 kg * 9.8 m/s^2 => 96 N        // Dimensional analysis  
20kg in lbs => 44.1 lbs          // Unit conversion
price = $350,000                 // Currency support
down payment = 20% * price => $70,000  // Percentage calculation
20 weeks in months => 4.6 months // Time conversion
india population ?> 1.4B         // API knowledge lookup
```

## Potential future operations/features

### Knowledge Queries (`?>`)

```typescript
// Population data
usa population ?> 331M
china gdp ?> $17.7T
bitcoin price ?> $43,250

// Physical constants  
speed of light ?> 299,792,458 m/s
earth gravity ?> 9.81 m/s^2
avogadro number ?> 6.022e23 /mol

// Geographic data
mount everest height ?> 8,849 m
pacific ocean depth ?> 4,280 m  
amazon river length ?> 6,400 km

// Current events (with timestamps)
inflation rate usa ?> 3.2% (as of Dec 2024)
unemployment rate ?> 3.7% (Dec 2024)
```

### Date & Time Operations

```typescript
// Date arithmetic
today = 2024-12-25
christmas = 2024-12-25
days until = christmas - today => 0 days

// Age calculations
birthday = 1990-05-15
age = today - birthday => 34 years 7 months

// Working day calculations
project start = 2024-01-15
project end = 2024-03-20
business days = WORKDAYS(project start, project end) => 46 days

// Time zone conversions
meeting time pst = 2:00 PM
meeting time est = meeting time pst + 3 hours => 5:00 PM
meeting time utc = meeting time pst + 8 hours => 10:00 PM
```

### Statistical Operations

```typescript
// Basic stats
data = [23, 45, 67, 89, 12, 34, 56]
mean(data) => 46.6
median(data) => 45
mode(data) => undefined // no mode
std(data) => 24.8

// Range operations
min(data) => 12
max(data) => 89  
range(data) => 77

// Percentiles
percentile(data, 25) => 28.5
percentile(data, 75) => 61.5
```

### Financial Functions

```typescript
// Loan calculations
principal = $250,000
rate = 4.5%
years = 30
payment = PMT(principal, rate/12, years*12) => $1,267

// Investment growth
pv = $10,000
rate = 7%
years = 20
fv = FV(pv, rate, years) => $38,697

// Present value
future amount = $50,000
discount rate = 5%
years = 10
present value = PV(future amount, discount rate, years) => $30,696
```

### Probability & Randomness

```typescript
// Random generation
random() => 0.742 // random float 0-1
random(1, 100) => 47 // random integer 1-100
random(10) => [3, 8, 1, 9, 5, 2, 7, 4, 6, 0] // 10 random numbers

// Probability calculations  
coin flip = 50%
dice roll = 1/6 => 16.67%
lottery odds = 1/292201338 => 0.000000342%

// Combinations and permutations
combinations(52, 5) => 2,598,960 // poker hands
permutations(10, 3) => 720
```

### Advanced Unit Operations

```typescript
// Compound units
fuel efficiency = 30 mpg
fuel efficiency in l/100km => 7.84 L/100km

// Area/volume with mixed units
room = 12 ft × 15 ft => 180 ft^2 => 16.7 m^2
pool = 25 ft × 12 ft × 6 ft => 1,800 ft^3 => 50.9 m^3

// Pressure conversions
tire pressure = 32 psi
tire pressure in bar => 2.21 bar
tire pressure in kPa => 220.6 kPa

// Speed conversions
highway speed = 70 mph  
highway speed in km/h => 112.7 km/h
highway speed in m/s => 31.3 m/s
```

### String & Text Operations

```typescript
// Text manipulation
text = "Hello World"
length(text) => 11
upper(text) => "HELLO WORLD"
lower(text) => "hello world"
reverse(text) => "dlroW olleH"

// String concatenation with units
first name = "John"
last name = "Smith"  
full name = first name + " " + last name => "John Smith"

// Pattern matching
phone = "555-123-4567"
area code = LEFT(phone, 3) => "555"
is valid phone = REGEX(phone, "\d{3}-\d{3}-\d{4}") => true
```

### List & Array Operations

```typescript
// List creation and manipulation
numbers = [1, 2, 3, 4, 5]
doubled = MAP(numbers, x * 2) => [2, 4, 6, 8, 10]
filtered = FILTER(numbers, x > 3) => [4, 5]
sum(numbers) => 15

// List with units
distances = [100m, 250m, 180m]
total distance = sum(distances) => 530m
average distance = mean(distances) => 176.7m

// Sorting
unsorted = [5, 2, 8, 1, 9]
ascending = SORT(unsorted) => [1, 2, 5, 8, 9]
descending = SORT(unsorted, DESC) => [9, 8, 5, 2, 1]
```

### Conditional Logic

```typescript
// Basic conditionals
age = 25
can drink = IF(age >= 21, "yes", "no") => "yes"

// Conditional calculations
temperature = 75°F
clothing = IF(temperature > 70°F, "shorts", "pants") => "shorts"

// Multiple conditions
grade = 87
letter grade = IF(grade >= 90, "A", 
                IF(grade >= 80, "B",
                IF(grade >= 70, "C", "F"))) => "B"

// Conditional units
speed = 45 mph
legal = IF(speed <= 55 mph, "legal", "speeding") => "legal"
```

### Scientific Constants & Formulas

```typescript
// Physics constants (built-in)
c = speed of light => 299,792,458 m/s
h = planck constant => 6.626e-34 J⋅s  
e = elementary charge => 1.602e-19 C
k = boltzmann constant => 1.381e-23 J/K

// Chemistry
avogadro = 6.022e23 /mol
gas constant = 8.314 J/(mol⋅K)
atmospheric pressure = 101.325 kPa

// Mathematical constants
π = 3.14159...
e = 2.71828...
φ = 1.61803... // golden ratio
```

### Conversion Shortcuts

```typescript
// Temperature shortcuts
100°C to °F => 212°F
32°F to K => 273.15K
room temp = 72°F => 22.2°C

// Cooking conversions  
1 cup to ml => 237ml
1 tbsp to ml => 14.8ml
1 tsp to ml => 4.9ml
350°F to °C => 176.7°C

// Body measurements
height = 6'2" => 188cm
weight = 180 lbs => 81.6 kg
```

### Rate & Ratio Calculations

```typescript
// Speed/rate calculations
distance = 120 miles
time = 2.5 hours  
speed = distance / time => 48 mph

// Efficiency ratios
miles driven = 300
gas used = 12 gallons
mpg = miles driven / gas used => 25 mpg

// Price per unit
total cost = $24.99
quantity = 16 oz
unit price = total cost / quantity => $1.56/oz

// Productivity rates
tasks completed = 15
hours worked = 8  
tasks per hour = tasks completed / hours worked => 1.875 tasks/h
```

### Logarithmic & Exponential

```typescript
// Basic log functions
log(100) => 2 // base 10
ln(2.718) => 1 // natural log
log2(8) => 3 // base 2

// Exponential growth/decay
initial = 100
growth rate = 5%
years = 10
final = initial * (1 + growth rate)^years => 162.89

// Half-life calculations
initial amount = 1000g
half life = 10 years
time = 30 years
remaining = initial amount * (0.5)^(time/half life) => 125g
```

### Geometry & Trigonometry

```typescript
// Basic geometry
radius = 5m
circumference = 2 * π * radius => 31.42m
area = π * radius^2 => 78.54m^2

// Triangle calculations
side a = 3
side b = 4  
hypotenuse = sqrt(side a^2 + side b^2) => 5

// Angle conversions
angle degrees = 45°
angle radians = angle degrees * π/180 => 0.785 rad
sin(angle degrees) => 0.707
```

### Estimation Operations (`~`)

```typescript
// Quick estimates (fuzzy matching)
π ~ 3.14 => true
e ~ 2.72 => true  
sqrt(10) ~ 3.16 => true

// Tolerance-based equality
a = 1.0001
b = 1.0002
a ~= b => true (within 0.1% tolerance)

// Order of magnitude
million ~ 1e6 => true
billion ~ 1e9 => true
```

### Reference Values (`ref`)

```typescript
// Common reference points
human body temp = ref("body temperature") => 98.6°F
freezing point = ref("water freezing") => 32°F => 0°C
boiling point = ref("water boiling") => 212°F => 100°C

// Standard measurements
standard gravity = ref("earth gravity") => 9.81 m/s^2
atmospheric pressure = ref("standard atmosphere") => 14.7 psi

// Common speeds
walking speed = ref("walking") => 3 mph
running speed = ref("running") => 6 mph
highway speed = ref("highway") => 65 mph
```

### Compound Interest & Growth

```typescript
// Compound interest shorthand
$1000 at 5% for 10 years => $1,628.89
$500/month at 7% for 20 years => $244,692

// Population growth
current pop = 1.4B
growth rate = 1.2%/year
future pop = current pop * (1 + growth rate)^10 => 1.58B
```

### Unit Validation & Suggestions

```typescript
// Smart error catching
force = 50 kg // Error: Did you mean 50 N?
distance = 100 miles/hour // Error: Did you mean 100 mph?

// Unit suggestions
energy calculation = mass * velocity^2 // Suggests: "Missing factor of 0.5 for kinetic energy?"
pressure = force * area // Suggests: "Did you mean force / area?"
```

### Measurement Precision

```typescript
// Significant figures
measurement = 12.34 ± 0.05
precise value = measurement => 12.34 ± 0.05

// Precision propagation  
a = 10.0 ± 0.1
b = 5.0 ± 0.2  
sum = a + b => 15.0 ± 0.22

// Rounding to precision
rough = 12.3456789
rounded = ROUND(rough, 2) => 12.35
```

### Smart Defaults & Context

```typescript
// Context-aware defaults
temperature = 72 // Assumes °F in US, °C elsewhere
distance = 100 // Assumes miles in US, km elsewhere  
weight = 150 // Assumes lbs in US, kg elsewhere

// Smart unit inference
gas mileage = 30 // Automatically MPG in US, L/100km elsewhere
apartment size = 800 // Automatically sq ft in US, m^2 elsewhere
```

### User-Defined Functions

```typescript
// Define custom functions
square(x) = x^2
area_circle(r) = π * r^2  
compound_interest(p, r, t) = p * (1 + r)^t
velocity(x, t) = dx/dt  // Calculus notation

// Use functions anywhere
square(5) => 25
area_circle(10 m) => 314.16 m^2
my_savings = compound_interest($1000, 5%, 10 years) => $1,628.89

// Functions with units
fuel_cost(distance, mpg, price_per_gallon) = distance / mpg * price_per_gallon
trip_cost = fuel_cost(500 miles, 25 mpg, $3.50/gal) => $70
```

### Interactive Plotting (`plot()`)

```typescript
// Plot functions over ranges
plot(square, 1..10) => [Interactive JS chart appears]
plot(sin(x), 0..2π) => [Sine wave visualization]
plot(compound_interest($1000, x, 10), 1%..15%) => [Interest rate sensitivity]

// Plot data sets
temperatures = [72°F, 75°F, 68°F, 71°F, 77°F]
plot(temperatures) => [Line chart of temperature over time]

// Multi-variable plots
fuel_efficiency(speed) = 30 - 0.1 * (speed - 55)^2
plot(fuel_efficiency, 20..80 mph) => [MPG vs Speed curve]

// Scatter plots with units
heights = [5.5 ft, 6.1 ft, 5.8 ft, 6.3 ft]
weights = [140 lbs, 180 lbs, 160 lbs, 200 lbs]
plot(heights, weights) => [Height vs Weight scatter plot]
```

### Symbolic Solving (`solve()`)

```typescript
// Solve for unknown variables
apart - 7 = 4 * oport
solve(oport) => 0.25 * apart - 1.75

// Quadratic equations
ax^2 + bx + c = 0
solve(x) => (-b ± √(b^2 - 4ac)) / 2a

// Financial equations
loan_payment = principal * r * (1 + r)^n / ((1 + r)^n - 1)
solve(principal) => loan_payment * ((1 + r)^n - 1) / (r * (1 + r)^n)

// Physics equations
F = ma
solve(a) => F/m
```

### Equation Manipulation

```typescript
// Rearrange equations automatically
v = u + at
solve(t) => (v - u) / a
solve(u) => v - at
solve(a) => (v - u) / t

// System of equations
x + y = 10
2x - y = 5
solve(x, y) => x = 5, y = 5

// Calculus operations
f(x) = x^3 + 2x^2 - x + 1
derive(f) => 3x^2 + 4x - 1
integrate(f) => x^4/4 + 2x^3/3 - x^2/2 + x + C
```

### Data Analysis Functions

```typescript
// Statistical operations
data = [12, 15, 18, 21, 24, 18, 16]
mean(data) => 17.71
median(data) => 18
std_dev(data) => 4.23
percentile(data, 75%) => 20.25

// Linear regression
x_values = [1, 2, 3, 4, 5]
y_values = [2.1, 3.9, 6.2, 7.8, 10.1]
linear_fit = regression(x_values, y_values) => y = 1.96x + 0.12 (R^2 = 0.998)
predict(linear_fit, 6) => 11.88
```

### Programming-Like Control Flow

```typescript
// Conditional logic
tax_rate = if income < $50000 then 12% else 22%
final_tax = income * tax_rate

// Loops and sequences
fibonacci(n) = if n <= 1 then n else fibonacci(n-1) + fibonacci(n-2)
fibonacci(10) => 55

// Generate sequences
primes = generate_primes(1..100) => [2, 3, 5, 7, 11, 13, ...]
squares = map(square, 1..10) => [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
```

### Matrix Operations

```typescript
// Matrix math
A = [[1, 2], [3, 4]]
B = [[5, 6], [7, 8]]
A * B => [[19, 22], [43, 50]]
inverse(A) => [[-2, 1], [1.5, -0.5]]
determinant(A) => -2

// Solving systems with matrices
coefficients = [[2, 1], [1, 3]]
constants = [7, 8]
solve_system(coefficients, constants) => x = 2.6, y = 1.8
```

### Financial Functions

```typescript
// Built-in financial operations
pmt(principal, rate, periods) = principal * r * (1+r)^n / ((1+r)^n - 1)
pv(payment, rate, periods) = payment * (1 - (1+r)^-n) / r
fv(payment, rate, periods) = payment * ((1+r)^n - 1) / r
irr(cash_flows) => internal_rate_of_return

// Usage
monthly_payment = pmt($200000, 4.5%/12, 30*12) => $1,013.37
present_value = pv($1000, 5%, 10) => $7,721.73
```

### Advanced Unit Operations

```typescript
// Unit conversion with context
body_temp = 98.6°F in °C => 37°C
room_temp = 20°C in K => 293.15 K

// Dimensional analysis validation
energy_per_mass = 500 J / 2 kg => 250 J/kg
check_units(energy_per_mass, "specific_energy") => ✓ Valid

// Custom unit definitions
my_unit = 5.5 meters
distance_in_my_units = 100 m in my_unit => 18.18 my_unit
```

### Text and String Operations

```typescript
// String manipulation with calculations
text = "Hello World"
length(text) => 11
word_count = count_words(text) => 2
char_frequency = analyze_chars(text) => {"l": 3, "o": 2, "H": 1, ...}

// Text-based math
expression = "2 + 3 * 4"
evaluate(expression) => 14
variables_in = extract_vars("a + b * c") => ["a", "b", "c"]
```

### Optimization Functions

```typescript
// Find optimal values
cost_function(x) = x^2 - 4x + 10
minimize(cost_function) => x = 2, min_value = 6
maximize(profit_function, 0..100) => x = 75, max_profit = $12,500

// Find parameters for best outcome
optimize(profit = price * demand, 
         demand = 1000 - 20*price, 
         constraints = price > $20)
=> optimal price = $35, max profit = $12,250

// Engineering design
optimize(bridge_strength / material_cost)
// Constraint optimization
production_cost(workers, machines) = 50*workers + 200*machines
constraint = workers + 2*machines <= 100
optimize(production_cost, constraint) => workers = 50, machines = 25
```

### Probability & Randomization

```typescript
// Basic randomness
random() => 0.137
randint(1, 6) => 4
choice(["red", "green", "blue"]) => "green"

// Distributions
normal_dist = normal(μ = 0, σ = 1)
pdf(normal_dist, 1.96) => 0.058
cdf(normal_dist, 0) => 0.5
sample(normal_dist, 5) => [-0.4, 0.3, 1.2, -1.1, 0.0]
```

### Monte-Carlo Simulation

```typescript
// Simulate uncertain scenarios
stock_return = normal(8%, 15%)
portfolio_value(initial, years) = initial * (1 + stock_return)^years
simulate(portfolio_value($10_000, 30), 10_000) => [Histogram + statistics]

// Estimate π via simulation
estimate_pi() = 4 * mean(sample(uniform(0,1), 1e6) \<= x^2 + y^2 \<= 1)
estimate_pi() => 3.1417
```

### Time-Series & Forecasting

```typescript
// Import financial time-series
aapl = time_series("AAPL", 2023-01-01..2024-01-01)
plot(aapl) => [Price chart]

// Moving averages & indicators
ma_30 = moving_average(aapl, 30 days)
plot(aapl, ma_30)

// Forecasting
forecast_90 = forecast(aapl, 90 days)  // e.g., ARIMA automatically chosen
plot(forecast_90)
```

### Geospatial Operations

```typescript
// Distance & bearing
sf = (37.7749°N, 122.4194°W)
la = (34.0522°N, 118.2437°W)
trip_distance = distance(sf, la) => 559 km
bearing(sf, la) => 140°

// Geofencing
point = (40.7128°N, 74.0060°W)
inside = within_radius(point, center = sf, 10 km) => false
```

### Data Import / Export

```typescript
// Bring in external data
expenses = csv("expenses_2024.csv")  // Auto-creates a table variable
sum(column(expenses, "Amount")) => $3,742

// Export any table or plot
auto_budget = group_by(expenses, Category, sum(Amount))
export(auto_budget, pdf, "budget_summary.pdf") => [download link]
```

### Table & List Operations (Map-Filter-Reduce)

```typescript
// Functional data wrangling
big_expenses = filter(expenses, Amount > $100)
annual_total = reduce(expenses, 0, (acc, row) => acc + row.Amount)
projected = map(expenses, row => row.Amount * 1.05)
```

### Interactive Controls & What-If Analysis

```typescript
// Sliders / pickers
slider(discount_rate, 0%..10%, 5%)
npv = pv($1000, discount_rate, 5 years)  // Re-computes live as slider moves

// Dropdowns
select(currency, ["USD", "EUR", "JPY"], "USD")
amount_in_currency = convert($1000, currency)
```

### Goal-Seek & Constraint Solver

```typescript
// Find the interest rate that hits a target payment
loan_payment(principal, rate, periods) = principal * rate * (1+rate)^periods / ((1+rate)^periods - 1)
goal_seek(loan_payment($300_000, x/12, 30*12) = $1,600, x) => 3.25%

// Multi-variable constraint solving
maximize(profit = 5x + 8y, constraints = [2x + y <= 100, x + 2y <= 80]) => x = 40, y = 20, profit = 360
```

## Pattern Summary

These core operations follow key patterns:

*   `**?>**` **for knowledge queries** - tap into real-world data
*   **Smart unit conversion** - seamless between measurement systems
*   **Context awareness** - defaults based on location/usage
*   **Error prevention** - catch common unit mistakes
*   **Precision handling** - maintain accuracy through calculations
*   **Reference values** - quick access to common constants
*   **Fuzzy matching** - approximate equality and estimates
*   **List operations** - work with collections of data
*   **Conditional logic** - IF/THEN reasoning
*   **Time intelligence** - dates, durations, and scheduling

These building blocks would make SmartPad incredibly powerful while keeping each operation simple and intuitive.