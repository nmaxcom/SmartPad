---
title: Examples Gallery
sidebar_position: 4
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Examples Gallery

<div className="doc-hero">
<p className="doc-hero__kicker">Production Patterns</p>
<h2>Copy, run, and adapt these real workflows</h2>
<p>Each example is interactive and opens directly into SmartPad.</p>
</div>

<ExamplePlayground title="Budget + FX" description="Project local totals into another currency." code={`rent = USD 1950\nutilities = USD 240\ntotal usd = rent + utilities => $2,190\ntotal eur = total usd in EUR => EUR 2,025`} />

<ExamplePlayground title="Unit-aware planning" description="Estimate travel-like scenarios with conversion safety." code={`speed = 62 mi/h\ntime = 45 min\ndistance = speed * time => 46.5 mi\ndistance in km => 74.83 km`} />

<ExamplePlayground title="List analysis" description="Extract signal from a compact list quickly." code={`scores = [71, 77, 84, 90, 94]\ntop3 = take(sort(scores, desc), 3)\navg(top3) => 89.33`} />
