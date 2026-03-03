---
title: "Everyday Calculations"
sidebar_position: 4
description: "Runnable SmartPad examples for real life budgeting, planning, and analysis."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Everyday Calculations

These examples are spec-grounded and use valid SmartPad syntax so you can copy, run, and adapt immediately.

## Personal finance

<ExamplePlayground title={"Monthly budget with category shares"} description={"Compute totals and contribution percentages."} code={"rent = $1250\nutilities = $185\ninternet = $75\ngroceries = $420\nexpenses = rent, utilities, internet, groceries\ntotal = sum(expenses) =>\nexpenses / total as % =>"} />

## Travel

<ExamplePlayground title={"Trip cost with FX"} description={"Mix local costs and convert to your reporting currency."} code={"hotel = EUR 240\nfood = EUR 180\ntransport = EUR 90\ntrip eur = hotel + food + transport =>\ntrip eur in USD =>"} />

## Work planning

<ExamplePlayground title={"Hourly rate planning"} description={"Project weekly/monthly scenarios from one base rate."} code={"hourly = $85/hour\nweekly hours = 38\nmonthly hours = weekly hours * 4.33 =>\nweekly pay = hourly * weekly hours =>\nmonthly pay = hourly * monthly hours =>"} />

## Scheduling

<ExamplePlayground title={"Time slots and date ranges"} description={"Generate planning windows with explicit temporal steps."} code={"slots = 09:00..11:00 step 30 min =>\nsprint days = 2026-01-01..2026-01-14 step 1 day =>\nreview cadence = 2026-01-31..2026-05-31 step 1 month =>"} />

## Engineering/data

<ExamplePlayground title={"Bandwidth and storage"} description={"Use compound units and convert cleanly."} code={"download = 6 Mbit/s * 2 h =>\ndownload to GB =>\negress = $0.09/GB\ntraffic = 12 TB/month\nmonthly egress = egress * (traffic in GB/month) =>"} />
