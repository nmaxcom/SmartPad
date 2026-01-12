# Similar apps
parsify.app, figr.app, aybo.app, calca.io, numi.app, Soulver 3, notepadcalculator.com, mathnotepad.com, bbodi.github.io/notecalc3, numbat.dev, hissab.io, numpad.io

---
# UI inspiration
https://dribbble.com/shots/24984990-Deposit-Calculator-UI-Kit-Widgets

# nuevas ideas
Instead of just solve, allow a user to right-click a result and say "Make this result 1000 by changing [variable]." The app then writes the solve syntax for them at the bottom of the document.
mostrar ventanita/prediccion al empezar a escribir variable name
left panel con "my sheets"

percentages:
Value by percent part	5% of what is 6 EUR
Value by percent addition	5% on what is 6 EUR
Value by percent subtraction	5% off what is 6 EUR

# Big ticket items
lists
ranges
true/false statements
time, calendar math
sheets/tabs, remember docs
plots
FX
# bugs/ideas
capital=30000€=>€30000
roi=7%
ganancias brutas=capital*roi=>€2100

hacienda=16%
ganancia limpia = hacienda off ganancias brutas per year=>hacienda off ganancias brutas per year
ganancia limpia=>16% off €2100 per year
porc=ganancia limpia / ganancias brutas as %=>ganancia limpia / ganancias brutas as %
roi real = ganancia limpia / capital as %=>ganancia limpia / capital as %
ganancia mensual = ganancia limpia/12=>ganancia limpia/12


lists should take this speeds = 3, 4, 5, 6 to m/s
- smartpad can't paste correctly:
0.1 + 0.2 = 0.3 =>true
1 = 1.000001 =>false
1 ~= 1.000001 =>true

- Parser confused by 3 digit groupings (frontend also renders them together in groups of 3):
a=2000=>2,000
b=2,000=>2, 0
c=2,1222=>2, 1,222
d=222,2,3=>⚠️ Combined assignment parse error: Unexpected token: comma

- make language more natural with aliases? funcname(var) -> funcname of var;
- add stuff to tour template: trigonometry, 
- comparar escenarios a la vez, rollo tab partida para ver lado vs lado? q otro formato si no? 
- show easily written and read equation/unit when hovering ex: 34m^kg^2/ms^2
- introduce week, month, year?
- functions like sqrt(), sum()... that allow you to click the vars you want to add like sum(hotel, flight, journey) declared up.
- calendar math?:
  5 june 2004 + 2 months + 1 year
  06.08.1995 9:23 pm - 15 feb 1995 3:42 am to days,hours

- solving "backwards" idea. You can freeze a result and somehow play with its inputs, ex:
spending =126€/day=>€126/day
hotel=159€/day=>€159/day
days=7days
total = (spending + hotel) * days =>€1995

Let's say €1995 is the max the group wants to spend: how can you change the days, hotel and other spending optimally without blowing that maximum? Maybe click total freezes it. and then..?

- make smartpad more flexible as a doc? Allow pasting images, embed youtube, links, links to other smartpage "pages" (yeah that'd be a thing to i guess...)
- text formatting tools
- clicking a variable or expression to reference it at cursor? Like clicking a var name copies it where you are so you don't have to type it again

# longterm ideas

Make SmartPad truly multiplatform, including as browsers extension

# cool ideas by o3/gemini2.5
Syntax/UX experiments
a) Inline operator: x = 5 {0-10} renders the braces as a miniature slider.
b) Markdown-style annotation: x = 5 <!-- slider 0-10 step 0.5 -->.
c) Auto-convert: typing 5..10 and hitting ⇥ converts to 5 with a hidden slider range.
Add a collapsible “Controls” side panel listing every slider and its current value for quick bulk tweaking.
1. Live graphs & views:
- Auto-suggest a graph icon next to arrays or expressions returning many points (e.g. sin(x) over a domain). Clicking spawns a lightweight SVG plot that updates as inputs change.
- Support “playhead” animations: any expression referencing a t variable can be auto-animated (user presses ▶️; t ramps and the sheet updates).
1. Constraints and goal seek
Blend light-weight solver capabilities:
User types: profit = revenue - cost and profit = 10_000?
→ SmartPad treats the ? as “solve for the nearest adjustable input to satisfy this”.

1. Real-time data streams
btc = fetch("https://api.coincap.io/v2/rates/bitcoin").priceUsd updates every N seconds; expressions depending on btc recompute live. You already have the reactivity—just add a polling/comet layer.


2. The Temporal Scrubber (Time as a Controllable Dimension)
What it is:
A master timeline slider at the bottom or top of the document that allows the user to scrub forwards and backwards in time. Variables can be defined with time-based functions or linked to historical real-world data, and the entire document updates as you scrub the timeline.

Why it's a game-changer:
This turns a static calculation sheet into a dynamic simulation model. You're not just calculating a single state; you're exploring all possible states over time. It's ideal for financial modeling, scientific simulations, or just understanding how things evolve.

Example in SmartPad:

// Define a starting value at a specific time
initial_investment = 10000 @(2023-01-01)

// Define variables that change over time using 't' (years from start)
// or link to live/historical data feeds.
annual_growth = 8%
investment_value = initial_investment * (1 + annual_growth)^t

// Use live data that is aware of the timeline scrubber's date.
sp500_value = @live("S&P500")

// A dependent calculation
portfolio_vs_market = investment_value - sp500_value

// At the bottom of the screen is a timeline slider:
// [ Timeline: |<-- 2023 ---------- [2025-07-14] ---------- 2030 -->| ]
As the user drags the timeline slider to 2028, t would become 5, investment_value would be recalculated, and sp500_value would show the actual S&P 500 value for that date. The entire document becomes a historical analysis and future projection tool in one.

3. Semantic Scoping & Computational Outlining
What it is:
Using standard markdown-style outlining (headings, indented bullet points) to create computational scopes and relationships. A heading can act as a namespace, and a child item can inherit properties from its parent, allowing for clean, hierarchical models.

Why it's a game-changer:
It allows users to organize complex calculations intuitively without resorting to long, cumbersome variable names (e.g., car_rental_trip1_cost, car_rental_trip2_cost). The structure of the document is the structure of the model. It merges the paradigm of an outliner (like Roam or Logseq) with a calculator.

Example in SmartPad:

## Vacation Budget: Italy

  // Variables defined here are scoped to "Italy"
  flight_cost = 1200
  daily_spend = 150
  number_of_days = 10

  // The total for this section can be implicitly calculated
  * Total => flight_cost + (daily_spend * number_of_days)  // => 2700

## Vacation Budget: Japan

  // These variables don't conflict with the ones for Italy
  flight_cost = 1500
  daily_spend = 10000 JPY  // SmartPad would handle currency conversion
  number_of_days = 8

  * Total => flight_cost + (daily_spend * number_of_days) // => $2050 (hypothetical conversion)

---
// A global variable can access scoped values
total_vacation_cost = Italy.Total + Japan.Total => 4750
Collapsing the "Italy" heading could hide the details but still show its Total. This makes managing complexity effortless and mirrors how people naturally structure plans in a text document.

# Future Feature Ideas

## Core Functionality Enhancements
- **Built-in Functions:** A library of standard functions.
  - **Math:** `sqrt()`, `pow()`, `log()`, `round()`, `abs()`
  - **Trigonometry:** `sin()`, `cos()`, `tan()`
  - **Conditional Logic:** `if(condition, true_val, false_val)`
  - **Aggregates:** `sum()`, `avg()` on lists.
- **Data Structures:** Support for collections.
  - **Lists/Arrays:** `my_list = [a, b, 5, 10]`
  - **Dictionaries/Objects:** `my_obj = { x: a, y: b }`
- **User-Defined Functions:** Allow users to create their own reusable expressions.
  - `circleArea(r) = PI * r^2`

## Advanced/Cool Features
- **Interactive Controls:** Draggable number values/sliders for dynamic "what-if" analysis.
- **Asynchronous Variables:** Fetching data from APIs.
  - `btc_price = fetch("https://api.coindesk.com/...")`
- **Enhanced Unit System:** Aware of conversions and dimensional analysis.
  - `length_m = 10 feet as meters`