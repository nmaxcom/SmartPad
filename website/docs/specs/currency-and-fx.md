---
title: "Currency and FX"
description: "Work with money naturally, including conversions and fallback rates."
sidebar_position: 13
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>Currency and FX</h2>
<p>Work with money naturally, including conversions and fallback rates.</p>
</div>

## What this helps with

- Currency behaves like unit-aware data, not plain strings
- `to`/`in` conversions use live FX with deterministic fallback
- Manual pair rates override live providers when explicitly defined

## How to use it

- Use `to` or `in` for conversion suffixes (`EUR 50 to USD`).
- Manual overrides are normal assignments (`EUR = 1.08 USD`).
- Currency can combine with rates (`$85/hour`, `EUR 1.89/liter`).

## Examples to try

<ExamplePlayground title={"Travel planning"} description={"Convert spending between currencies while preserving units."} code={"hotel = EUR 240\nmeals = EUR 180\ntrip spend eur = hotel + meals\ntrip spend eur in USD"} />

<ExamplePlayground title={"Manual FX override"} description={"Pin rates for a fixed-budget scenario."} code={"EUR = 1.10 USD\nmeal = EUR 18\nmeal in USD\nbudget = USD 1500\nbudget in EUR"} />

<ExamplePlayground title={"Currency with rates"} description={"Convert only currency portion inside compound units."} code={"hourly = $85/hour\nhourly in EUR/hour\nmonthly hours = 168 h\npay = hourly * monthly hours"} />

## When SmartPad should push back

<ExamplePlayground title={"Unsupported conversion target"} description={"Invalid or unknown targets should surface clear errors."} code={"budget = $1200\nbudget in ABC =>"} />

<ExamplePlayground title={"Missing FX rate context"} description={"Cross-currency conversion fails when no rate source is available."} code={"amount = GBP 79\namount in BTC =>"} />

## Good habits

- Define manual rates in-sheet when you need fixed scenario planning.
- Keep target currency explicit in stakeholder-facing outputs.
- Prefer one base reporting currency for long documents.
