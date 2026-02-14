---
title: Examples Gallery
sidebar_position: 3
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Examples Gallery

Feature-packed examples you can paste and adapt.

<ExamplePlayground title="Budget + FX" description="Local budget totals projected into a second currency." code={`rent = USD 1950\nutilities = USD 240\ntotal usd = rent + utilities => $2,190\ntotal eur = total usd in EUR => EUR 2,025`} />

<ExamplePlayground title="Unit-aware planning" description="Travel-style estimate with unit conversion." code={`speed = 62 mi/h\ntime = 45 min\ndistance = speed * time => 46.5 mi\ndistance in km => 74.83 km`} />

<ExamplePlayground title="List analysis" description="Fast analysis of a compact numeric list." code={`scores = [71, 77, 84, 90, 94]\ntop3 = take(sort(scores, desc), 3)\navg(top3) => 89.33`} />
