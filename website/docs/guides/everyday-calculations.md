---
title: "Everyday Calculations"
sidebar_position: 4
description: "Practical SmartPad examples for budgeting, planning, travel, work, and data."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Everyday Calculations

The fastest way to learn SmartPad is to start from a real little sheet and change the assumptions. Every example here is meant to be copied, opened, and edited.

## Personal finance

<ExamplePlayground title={"Monthly budget with category shares"} description={"A small budget you can adjust without building a spreadsheet."} code={"rent = $1250\nutilities = $185\ninternet = $75\ngroceries = $420\nexpenses = rent, utilities, internet, groceries\ntotal = sum(expenses)\nexpenses / total as %"} />

## Travel

<ExamplePlayground title={"Trip cost with FX"} description={"Add costs in one currency, then view the trip in another."} code={"hotel = EUR 240\nfood = EUR 180\ntransport = EUR 90\ntrip eur = hotel + food + transport\ntrip eur in USD"} />

## Work planning

<ExamplePlayground title={"Hourly rate planning"} description={"Turn one hourly rate into weekly and monthly planning numbers."} code={"hourly = $85/hour\nweekly hours = 38\nmonthly hours = weekly hours * 4.33\nweekly pay = hourly * weekly hours\nmonthly pay = hourly * monthly hours"} />

## Scheduling

<ExamplePlayground title={"Time slots and date ranges"} description={"Generate planning windows without hand-writing every date or time."} code={"slots = 09:00..11:00 step 30 min\nsprint days = 2026-01-01..2026-01-14 step 1 day\nreview cadence = 2026-01-31..2026-05-31 step 1 month"} />

## Engineering/data

<ExamplePlayground title={"Bandwidth and storage"} description={"Let rates, storage units, and billing units do the bookkeeping."} code={"download = 6 Mbit/s * 2 h\ndownload to GB\negress = $0.09/GB\ntraffic = 12 TB/month\nmonthly egress = egress * (traffic in GB/month)"} />
