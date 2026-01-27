# Similar apps
antinote, parsify.app, figr.app, aybo.app, calca.io, numi.app, Soulver 3, notepadcalculator.com, mathnotepad.com, bbodi.github.io/notecalc3, numbat.dev, hissab.io, numpad.io

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
add glow to graphs

flow2 = 1000 mL/min
flow2 to L/h => ⚠️ Unexpected token: 2 to

- figure out / unify all the as, in, to, etc keywords

- Parser confused by 3 digit groupings (frontend also renders them together in groups of 3):
a=2000=>2,000
b=2,000=>2, 0
c=2,1222=>2, 1,222
d=222,2,3=>⚠️ Combined assignment parse error: Unexpected token: comma

- make language more natural with aliases? funcname(var) -> funcname of var;
- comparar escenarios a la vez, rollo tab partida para ver lado vs lado? q otro formato si no? 
- show easily written and read equation/unit when hovering ex: 34m^kg^2/ms^2
- introduce week, month, year?
- functions like sqrt(), sum()... that allow you to click the vars you want to add like sum(hotel, flight, journey) declared up.

- solving "backwards" idea. You can freeze a result and somehow play with its inputs, ex:
spending =126€/day=>€126/day
hotel=159€/day=>€159/day
days=7days
total = (spending + hotel) * days =>€1995

Let's say €1995 is the max the group wants to spend: how can you change the days, hotel and other spending optimally without blowing that maximum? Maybe click total freezes it. and then..?

- make smartpad more flexible as a doc? Allow pasting images, embed youtube, links, links to other smartpage "pages" (yeah that'd be a thing to i guess...)
- text formatting tools

# cool ideas by o3/gemini2.5
Syntax/UX experiments
a) Inline operator: x = 5 {0-10} renders the braces as a miniature slider.
b) Markdown-style annotation: x = 5 <!-- slider 0-10 step 0.5 -->.
c) Auto-convert: typing 5..10 and hitting ⇥ converts to 5 with a hidden slider range.
Add a collapsible “Controls” side panel listing every slider and its current value for quick bulk tweaking.
1. Live graphs & views:
- Auto-suggest a graph icon next to arrays or expressions returning many points (e.g. sin(x) over a domain). Clicking spawns a lightweight SVG plot that updates as inputs change.
- Support “playhead” animations: any expression referencing a t variable can be auto-animated (user presses ▶️; t ramps and the sheet updates).
