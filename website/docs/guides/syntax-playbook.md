---
title: "Syntax Playbook"
sidebar_position: 3
description: "Write SmartPad sheets that stay readable as they grow."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Syntax Playbook

## Patterns worth remembering

- Put units and currency right next to the value (`$85/hour`, `9 L/min`).
- Use `to` or `in` when you want a conversion.
- Use lists (`a, b, c`) and ranges (`1..10`) instead of hand-writing repeated values.
- Use plain phrases for everyday math (`tax on`, `discount off`, `as %`).

<ExamplePlayground title={"Syntax essentials"} description={"Small patterns that make a sheet easier to read and change."} code={"subtotal = $128\ntax = 8.5%\ntotal = subtotal + subtotal * tax\ndistance = 42 km\ndistance in mi\nscores = 71, 77, 84, 90, 94\navg(scores)"} />

## A few things to watch

- Use `to` or `in` for conversions; `->` is just text to SmartPad.
- When you multiply two lists together, make sure they have matching lengths.
- Give time ranges an explicit `step` so the interval is unambiguous.
- Write `min` for minutes when `m` could be read as meters.

<ExamplePlayground title={"Clear errors are useful"} description={"These examples are intentionally wrong, so you can see how SmartPad responds."} code={"1...5 =>\na = 1, 2, 3\nb = 10, 20\na + b =>\n2026-01-01..2026-01-05 =>"} />

## Units and rates reference

SmartPad treats units and currencies as semantic value types. Conversions and operations stay type-aware instead of string-based: compatible units convert, incompatible additions/subtractions are rejected, and multiplication/division creates derived units.

The tables below are a practical quick reference, not the full boundary of what the engine can parse. The runtime also resolves SI prefixes dynamically for registered unit symbols, so families like `m`, `s`, `Pa`, `W`, `A`, `V`, `J`, `Wh`, `Hz`, `L`, `mol`, and `cd` can be used with metric prefixes where the conversion is dimensionally valid.

### SI prefixes

| Group | Prefixes |
| --- | --- |
| Large | `Y` yotta, `Z` zetta, `E` exa, `P` peta, `T` tera, `G` giga, `M` mega, `k` kilo, `h` hecto, `da` deka |
| Small | `d` deci, `c` centi, `m` milli, `u` micro, `µ` micro, `μ` micro, `n` nano, `p` pico, `f` femto, `a` atto, `z` zepto, `y` yocto |

Prefix examples: `nm`, `mm`, `cm`, `km`, `ms`, `kPa`, `MW`, `mA`, `uA`, `µA`, `kWh`, `MHz`.

### Compound unit algebra

SmartPad understands products, divisions, powers, compact units, and explicit conversion targets:

<ExamplePlayground title={"Compound units and conversions"} description={"Mix prefixes, derived units, compact rates, and conversion targets."} code={"distance = 120 km\ntime = 90 min\nspeed = distance / time\nspeed in m/s\nacceleration = 9.8 m/s^2\nforce = 75 kg * acceleration\nforce in N\nenergy = force * 3 m\nenergy in J\npressure = 101.3 kPa\npressure in psi\nsurface load = 5 kg/m^2\nsurface load in g/cm^2\nbatch volume = 9L/min*18min\nbatch volume in m^3"} />

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

