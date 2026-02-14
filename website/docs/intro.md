---
sidebar_position: 1
slug: /
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# SmartPad Documentation

<div className="cinema-hero">
<p className="cinema-kicker">SmartPad Docs</p>
<h2>Write plain text. Ship analytical clarity.</h2>
<p>SmartPad combines note-like writing with live evaluation, unit math, FX conversion, ranges, lists, and plotting so teams can reason faster without spreadsheet drag.</p>
<div className="cinema-tags"><span>Live evaluation</span><span>Human-readable formulas</span><span>Unit + FX aware</span><span>Built for iteration</span></div>
</div>

## Try SmartPad in 20 seconds

<ExamplePlayground title="Quick wow moment" description="Run this in SmartPad and then tweak values to feel how fast the feedback loop is." code={`team size = 8
velocity = 27 points/sprint
capacity = team size * velocity => 216

feature load = [34, 55, 89, 21]
needed = sum(feature load) => 199
buffer = capacity - needed => 17`} />

## Pick your path

- New to SmartPad: [Getting Started](/docs/guides/getting-started)
- Want syntax confidence: [Syntax Playbook](/docs/guides/syntax-playbook)
- Need practical blueprints: [Examples Gallery](/docs/guides/examples-gallery)
- Need full behavior contracts: [Feature Guides](/docs/specs)

## Local docs workflow

1. Regenerate docs from specs:

```bash
npm run docs:docusaurus:generate
```

2. Build + sync docs into app public assets:

```bash
npm run docs:docusaurus:publish-local
```

3. Run SmartPad app (includes docs route):

```bash
npm run dev
```
