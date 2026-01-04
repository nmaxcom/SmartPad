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

# bugs/ideas
- comparar escenarios a la vez, rollo tab partida para ver lado vs lado? q otro formato si no?
- introduce week, month, year?
- calendar math?:
  5 june 2004 + 2 months + 1 year
  06.08.1995 9:23 pm - 15 feb 1995 3:42 am to days,hours
- make smartpad more flexible as a doc? Allow pasting images, embed youtube, links, links to other smartpage "pages" (yeah that'd be a thing to i guess...)

- allow **text content after an expression** as a separated thing like:
var2= 69 // (or smth other symbols) blabla
As of now makes var2 undefined.
 
speed = 30kmh + 2kmh to m/s
speed = 9 m/s


- automatically solve for one variable like:
    f = (9/5)*c + 32
    c => 0.5556 f - 17.7778

- text formatting tools

- clear style in pasted content 
- add a text style toolbar

- clicking a variable or expression to reference it at cursor? Like clicking a var name copies it where you are so you don't have to type it again

# cool syntax uses for future docs/templates
sqrt(9 m^2) to m =>3 m
(100 kg + 30 lb) in kg =>114 kg
paint cost(width, height, price per m2) = width * height * price per m2
paint cost(3m, 5m, $8 per m^2)=>$120

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
1. Sensitivity / range exploration
After a variable is assigned a number, allow “sweep mode”: hold Option and drag further to reveal a shaded confidence interval or envelope in dependent graphs. Under the hood, compute results for value ± ε and render bands.
1. Constraints and goal seek
Blend light-weight solver capabilities:
User types: profit = revenue - cost and profit = 10_000?
→ SmartPad treats the ? as “solve for the nearest adjustable input to satisfy this”.
1. Units & dimensional analysis
Accept distance = 5 km, time = 30 min, resolve units in arithmetic automatically, and flag mismatches. Greatly improves real-world modelling and complements number scrubbing (dragging keeps unit).

Parallel track – Units & solvers (experimental)
Evaluate libraries like mathjs with unit support or integrate Tiny-Solver for **goal seek**.

Narrative mode / collapsible sections
Markdown-style ### Heading folds multiple lines under a title, so you can turn a scratch pad into a polished report without exporting elsewhere.

Named functions & parameter lists
f(a, b) = a^2 + b^2, used later as f(x, y). Stored in the dependency graph like variables, unlocks DRY modelling and reuse across sheets.

7. Real-time data streams
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