---
title: "Plotting and Dependency Views"
description: "Visualize behavior from expressions, dependencies, and exploratory model changes."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Core Experience</p>
<h2>Plotting and Dependency Views</h2>
<p>Visualize behavior from expressions, dependencies, and exploratory model changes.</p>
</div>

## Why this matters

Great docs should help users jump from numbers to insight immediately.

## Use it when

- You want faster iteration without switching contexts.
- You need readable formulas that teammates can follow.
- You want reliable behavior under real user inputs.

## Try it in SmartPad

<ExamplePlayground title={"Plotting and Dependency Views: quick win"} description={"Run this interactive example and tweak values immediately."} code={"a + b => 20%"} />

## What this feature guarantees

- Purpose
- Core Philosophy & Non-Negotiables
- Mental Model
- High-Level UX Flow
- Persistent Views (Detached Views)
- Mini-Grammar for `@view`
- Binding Rules
- View Lifecycle States
- Domain Inference Rules
- Pan & Zoom

## Common mistakes

- Build complex formulas from named intermediate lines for reliability.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Plotting.spec.md">docs/Specs/Plotting.spec.md</a></p>
