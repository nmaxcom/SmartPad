---
title: "Syntax Reference"
sidebar_position: 5
description: "A compact reference for SmartPad syntax once you know the basics."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Syntax Reference

Use this page as a lookup table after you have made your first sheet.

## Core patterns

- Assign values with `name = value`.
- Convert with `to` or `in`.
- Put units and currency directly on values.
- Use lists with commas and ranges with `..`.
- Add `=>` only for lines that need an explicit command/result, such as `make`, `solve`, or deliberate error examples.

<ExamplePlayground title={"Syntax essentials"} description={"Small patterns that cover most day-to-day sheets."} code={"subtotal = $128\ntax = 8.5% on subtotal\ntotal = subtotal + tax\ndistance = 42 km\ndistance in mi\nscores = 71, 77, 84, 90, 94\navg(scores)"} />

## Lists and aggregation

Lists use commas. Aggregators such as `sum`, `avg`, `min`, `max`, `median`, `count`, `range`, and `stddev` work on list values. Pairwise math works when the lists line up.

<ExamplePlayground title={"Lists and aggregation"} description={"Use the List Spec Lab template for the longer tour."} code={"prices = $12, $15, $9\nqty = 2, 1, 3\nline totals = prices * qty\nsum(line totals)\navg(prices)"} />

## Filtering with `where`

`where` filters a list by comparing each item with a condition. It works with compatible units and currencies, and empty results display as `()`.

<ExamplePlayground title={"Filtering lists"} description={"Use `where` when you want the values that pass a condition."} code={"quotes = $1800, $2100, $1950, $2050\nquotes where < $2000\nlengths = 1 m, 100 cm, 3 m, 25 ft\nlengths where = 1 m\nlengths where > 2 m"} />

## Showing shares with `as`

`as %` is useful when a ratio should be displayed as a percentage. It is especially handy with lists because you can turn parts into shares of a total.

<ExamplePlayground title={"Shares as percentages"} description={"Turn category values into readable shares."} code={"rent = $1250\nutilities = $185\ninternet = $75\ngroceries = $420\nexpenses = rent, utilities, internet, groceries\ntotal = sum(expenses)\nexpenses / total as %"} />

## Ranges

Ranges use `start..end`. Numeric ranges can use numeric steps. Time and date ranges need duration steps so SmartPad knows how to move through the calendar.

<ExamplePlayground title={"Numeric, time, and date ranges"} description={"Use the Range Spec Lab and Date Math templates for longer examples."} code={"numbers = 1..10 step 2\nslots = 09:00..11:00 step 30 min\nsprint days = 2026-01-01..2026-01-05 step 1 day\nreview dates = 2026-01-31..2026-05-31 step 1 month"} />

## Dates and time

Dates and times can be used directly in calculations. Use ISO-style dates when you want the least ambiguity. Timezone conversions use `in` with an offset.

<ExamplePlayground title={"Date and time math"} description={"Calendar-aware lines stay readable in plain text."} code={"launch = 2026-05-14\nlaunch + 21 days\nlaunch - 2026-05-01\nmeeting = 2026-05-14 15:00 UTC\nmeeting in +02:00"} />

## Goal seek with `make`

`make ... by ...` asks SmartPad to find the input value that would make a target true. This is one of the places where the explicit `=>` trigger is still useful because the line is a command, not just a passive expression.

<ExamplePlayground title={"Goal seek command"} description={"Use the Goal Seek template when you want several real examples."} code={"items = 12\nunit price = 9 EUR\ncheckout total = items * unit price\nmake checkout total = 150 EUR by items =>"} />

## Views

`@view` lines create visual views from values already in the sheet. They are best learned from templates because views are more useful when there is a real model around them.

<ExamplePlayground title={"Simple plot view"} description={"The New stuff and Capability Sprint templates go deeper."} code={"x = 0\ngrowth(x) = 2*x + 5\n@view plot y=growth domain=0..10 size=md"} />

## Units and rates reference

SmartPad treats units and currencies as semantic value types. Conversions and operations stay type-aware instead of string-based: compatible units convert, incompatible additions/subtractions are rejected, and multiplication/division creates derived units.

The tables below are a practical quick reference, not the full boundary of what the engine can parse. SmartPad understands base units such as meters, seconds, kilograms, amperes, kelvin, moles, and candela; common derived units such as newtons, pascals, watts, volts, joules, watt-hours, hertz, liters, and bytes; and compound units made from them.

That means units such as `V`, `J`, `N`, `Pa`, `W`, `Wh`, `Hz`, `L`, `mol`, `A`, `cd`, `kg`, `m`, and `s` are not just labels. They participate in dimensional math. If the dimensions match, SmartPad can convert; if they do not, it should push back instead of silently mixing unrelated quantities.

The runtime also resolves SI prefixes dynamically for registered unit symbols. You can write `mm`, `km`, `ms`, `kPa`, `MW`, `mA`, `uA`, `µA`, `kJ`, `MWh`, `MHz`, `mL`, and similar prefixed forms where the conversion is dimensionally valid.

### SI prefixes

| Group | Prefixes |
| --- | --- |
| Large | `Y` yotta, `Z` zetta, `E` exa, `P` peta, `T` tera, `G` giga, `M` mega, `k` kilo, `h` hecto, `da` deka |
| Small | `d` deci, `c` centi, `m` milli, `u` micro, `µ` micro, `μ` micro, `n` nano, `p` pico, `f` femto, `a` atto, `z` zepto, `y` yocto |

Prefix examples: `nm`, `mm`, `cm`, `km`, `ms`, `kPa`, `MW`, `mA`, `uA`, `µA`, `kWh`, `MHz`.

### Compound unit algebra

SmartPad understands products, divisions, powers, compact units, and explicit conversion targets:

<ExamplePlayground title={"Compound units and conversions"} description={"Mix prefixes, derived units, compact rates, and conversion targets."} code={"distance = 120 km\ntime = 90 min\nspeed = distance / time\nspeed in m/s\nacceleration = 9.8 m/s^2\nforce = 75 kg * acceleration\nforce in N\nenergy = force * 3 m\nenergy in J\nvoltage = 12 V\ncurrent = 2 A\npower = voltage * current\npower in W\nstored = power * 3 h\nstored in Wh\nstored in J\npressure = 101.3 kPa\npressure in psi\nsurface load = 5 kg/m^2\nsurface load in g/cm^2\nbatch volume = 9L/min*18min\nbatch volume in m^3"} />

Composite units can also be converted across prefixes when the dimensions match, for example `kg/m^2` to `g/cm^2`, `m^3` to `L`, `kWh/month` to `Wh/day`, or `$0.09/GB * 12 TB/month` after converting the traffic side to a compatible rate.

Unknown plain-word labels are treated as count-style units when they are safe to interpret that way, which lets domain examples such as `task`, `ticket`, or `user/month` behave like unit-bearing values. Use explicit aliases when a project needs a stable business meaning.

### Currency symbols/codes

`$`, `€`, `£`, `¥`, `₹`, `₿`, `CHF`, `CAD`, `AUD`, `USD`, `EUR`, `GBP`, `JPY`, `INR`, `BTC`, `ETH`, `USDT`, `USDC`, `BNB`, `XRP`, `SOL`, `ADA`, `DOGE`, `LTC`, `DOT`, `AVAX`, `MATIC`, `TRX`, `LINK`

### Named-unit quick reference

### Length

| Symbol | Name | Aliases |
| --- | --- | --- |
| `m` | meter | meter, meters |
| `mm` | millimeter | millimeter, millimeters |
| `cm` | centimeter | centimeter, centimeters |
| `km` | kilometer | kilometer, kilometers |
| `in` | inch | inch, inches |
| `ft` | foot | foot, feet |
| `mi` | mile | mile, miles |

### Mass

| Symbol | Name | Aliases |
| --- | --- | --- |
| `kg` | kilogram | kilogram, kilograms |
| `g` | gram | gram, grams |
| `lb` | pound | pound, pounds, lbs |

### Time

| Symbol | Name | Aliases |
| --- | --- | --- |
| `s` | second | second, seconds |
| `min` | minute | minute, minutes |
| `h` | hour | hour, hours |

### Temperature

| Symbol | Name | Aliases |
| --- | --- | --- |
| `K` | kelvin | kelvin, kelvins |
| `C` | celsius | celsius, °C |
| `F` | fahrenheit | fahrenheit, °F |

### Area

| Symbol | Name | Aliases |
| --- | --- | --- |
| `m^2` | square meter | sqm, square meter, square meters |
| `ft^2` | square foot | sqft, square foot, square feet |

### Volume

| Symbol | Name | Aliases |
| --- | --- | --- |
| `m^3` | cubic meter | cubic meter, cubic meters |
| `ft^3` | cubic foot | cubic foot, cubic feet |

### Speed

| Symbol | Name | Aliases |
| --- | --- | --- |
| `m/s` | meters per second | meters per second |
| `km/h` | kilometers per hour | kph, kilometers per hour |
| `mph` | miles per hour | miles per hour |

### Acceleration

| Symbol | Name | Aliases |
| --- | --- | --- |
| `m/s^2` | meters per second squared |  |

### Force

| Symbol | Name | Aliases |
| --- | --- | --- |
| `N` | newton | newton, newtons |
| `lbf` | pound force | pound force, pounds force |

### Pressure

| Symbol | Name | Aliases |
| --- | --- | --- |
| `Pa` | pascal | pascal, pascals |
| `kPa` | kilopascal | kilopascal, kilopascals |
| `bar` | bar | bar |
| `psi` | pounds per square inch | pounds per square inch |

### Energy

| Symbol | Name | Aliases |
| --- | --- | --- |
| `J` | joule | joule, joules |
| `cal` | calorie | calorie, calories |
| `kWh` | kilowatt hour | kilowatt hour, kilowatt hours |

### Power

| Symbol | Name | Aliases |
| --- | --- | --- |
| `W` | watt | watt, watts |
| `kW` | kilowatt | kilowatt, kilowatts |

### Electric

| Symbol | Name | Aliases |
| --- | --- | --- |
| `A` | ampere | ampere, amperes |
| `V` | volt | volt, volts |
| `Ω` | ohm | ohm, ohms |

### Computer

| Symbol | Name | Aliases |
| --- | --- | --- |
| `bit` | bit | bits |
| `B` | byte | byte, bytes |
| `KB` | kilobyte | kB, kilobyte, kilobytes |
| `MB` | megabyte | megabyte, megabytes |
| `GB` | gigabyte | gigabyte, gigabytes |
| `TB` | terabyte | terabyte, terabytes |
| `KiB` | kibibyte | kibibyte, kibibytes |
| `MiB` | mebibyte | mebibyte, mebibytes |
| `GiB` | gibibyte | gibibyte, gibibytes |
| `TiB` | tebibyte | tebibyte, tebibytes |

### Information Rate

| Symbol | Name | Aliases |
| --- | --- | --- |
| `bit/s` | bits per second | bps |
| `kbit/s` | kilobits per second | kbps, Kb/s |
| `Mbit/s` | megabits per second | Mbps, Mb/s |
| `Gbit/s` | gigabits per second | Gbps, Gb/s |
| `Tbit/s` | terabits per second | Tbps, Tb/s |
| `B/s` | bytes per second | Bps |
| `KB/s` | kilobytes per second | KBps |
| `MB/s` | megabytes per second | MBps |
| `GB/s` | gigabytes per second | GBps |
| `TB/s` | terabytes per second | TBps |

### Rate patterns

<ExamplePlayground title={"Rates across units"} description={"Use rates as first-class values, then normalize the unit side before multiplying."} code={"download = 6 Mbit/s * 2 h\ndownload in MB\negress = $0.09/GB\ntraffic = 12 TB/month\nbillable traffic = traffic in GB/month\nmonthly cost = egress * billable traffic"} />

