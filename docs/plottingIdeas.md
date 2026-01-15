## Here are some ideas and concepts for the plotting aspect.

**Key idea: “Explore dependency”, not “plot a function”.**

*   Plotting is a _rendering mode of a result_, not a separate feature.
*   Users think: _“How does this depend on X?”_, not _“Let me build a chart.”_
*   Interaction should start from the **result value**, not from syntax.

**Design principles**

*   Zero setup: selecting a variable instantly shows a plot.
*   Text remains the source of truth; plots are feedback.
*   Variables are controlled by dragging their values in the document.
*   Graphs respond live; they are never the primary control surface.
*   Units, dates, and domains are inferred, constrained, and never lied about.

**Why it’s valuable**

*   Builds intuition (slope, curvature, sensitivity).
*   Makes compounding, growth, and tradeoffs visually obvious.
*   Turns “what if?” thinking into playful, fast exploration.
*   Allows committing insights back into the document as text.

**Success criteria**

*   No chart builders, no config panels, no sliders detached from text.
*   Exploration feels instantaneous and reversible.
*   The feature answers real questions, not just “looks cool”.