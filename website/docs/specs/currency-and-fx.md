---
title: "Currency and FX"
description: "Treat currency as first-class units with live FX + manual overrides."
sidebar_position: 11
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Contract</p>
<h2>Currency and FX</h2>
<p>Treat currency as first-class units with live FX + manual overrides.</p>
</div>

## What this feature gives you

- Currency behaves like unit-aware data, not plain strings
- `to`/`in` conversions use live FX with deterministic fallback
- Manual pair rates override live providers when explicitly defined

## Syntax and usage contract

- Use `to` or `in` for conversion suffixes (`EUR 50 to USD`).
- Manual overrides are normal assignments (`EUR = 1.08 USD`).
- Currency can combine with rates (`$85/hour`, `EUR 1.89/liter`).

## Runnable examples

<ExamplePlayground title={"Travel planning"} description={"Convert spending between currencies while preserving units."} code={"hotel = EUR 240\nmeals = EUR 180\ntrip spend eur = hotel + meals =>\ntrip spend eur in USD =>"} />

<ExamplePlayground title={"Manual FX override"} description={"Pin rates for a fixed-budget scenario."} code={"EUR = 1.10 USD\nmeal = EUR 18\nmeal in USD =>\nbudget = USD 1500\nbudget in EUR =>"} />

<ExamplePlayground title={"Currency with rates"} description={"Convert only currency portion inside compound units."} code={"hourly = $85/hour\nhourly in EUR/hour =>\nmonthly hours = 168 h\npay = hourly * monthly hours =>"} />

## Guardrail examples

<ExamplePlayground title={"Unsupported conversion target"} description={"Invalid or unknown targets should surface clear errors."} code={"budget = $1200\nbudget in ABC =>"} />

<ExamplePlayground title={"Missing FX rate context"} description={"Cross-currency conversion fails when no rate source is available."} code={"amount = GBP 79\namount in BTC =>"} />

## Critical behavior rules

- Use live FX rates by default, with Frankfurter as primary and ECB as backup.
- Symbols remain the default display unless the user explicitly targets a code.
- Cross-currency conversion requires an FX rate.
- If live rates are unavailable, show a clear error (unless manual overrides exist).
- Scope and precedence follow normal SmartPad variable rules (nearest wins).
- Default display uses symbols unless the user targets a code.
- Preserve the user's requested unit target in output.
- Amber status when ECB is active (fallback).
- Unknown currency code => error with suggestion.
- Conversion requested with no live rate and no manual rate => error.

## Power-user checklist

- Define manual rates in-sheet when you need fixed scenario planning.
- Keep target currency explicit in stakeholder-facing outputs.
- Prefer one base reporting currency for long documents.

<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/Currency.spec.md">docs/Specs/Currency.spec.md</a></p>
