---
title: Syntax Playbook
sidebar_position: 2
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Syntax Playbook

<div className="doc-hero">
<p className="doc-hero__kicker">Writing Style</p>
<h2>Write formulas that scale with your thinking</h2>
<p>These patterns keep your sheets understandable even as models grow.</p>
</div>

<ExamplePlayground title="Core syntax patterns" description="Reliable defaults for day-to-day SmartPad work." code={`subtotal = $128\ntax = 8.5%\ntotal = subtotal + (subtotal * tax) => $138.88\n\ndistance = 42 km\ndistance in mi => 26.1 mi\n\nplan = [120, 140, 155, 170]\navg(plan) => 146.25`} />

## Rules that prevent surprises

- Prefer explicit conversions with `to` / `in`.
- Keep units and currencies attached to actual values.
- Use named intermediate lines before compacting formulas.
