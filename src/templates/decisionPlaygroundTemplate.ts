export const DECISION_PLAYGROUND_TEMPLATE = `# Decision Playground: Workshop Go / No-Go
# First move: open profit's result menu (⋯), choose Set baseline, then drag 32.
# Shift = fine · Alt/Option = fast · Esc = cancel.
# Watch profit, margin, the target answer, and the chart react together.
# Keep a useful variant with profit ⋯ > Save current scenario…

# Assumptions
attendees = 140
ticket price = 32 EUR
discount = 12%
venue cost = 1800 EUR
cost per attendee = 8 EUR

# Live model
net ticket = ticket price * (1 - discount)
revenue = attendees * net ticket
variable cost = attendees * cost per attendee
profit = attendees * ticket price * (1 - discount) - venue cost - variable cost =>
margin = profit / revenue as % =>

# See the decision surface for one assumption
@view plot x=ticket price y=profit domain=20..65 size=md

# Work backwards: what ticket price reaches the target?
make profit = 2500 EUR by ticket price =>

# Try next
# - scrub attendees and compare its effect with ticket price
# - save another named scenario, then compare it beside margin
# - open the profit chip menu to explore another plot or target
# - drag the profit chip into a new line to reuse it as a live dependency
`;
