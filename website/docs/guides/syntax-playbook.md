---
title: "Syntax Playbook"
sidebar_position: 3
description: "Write SmartPad syntax that remains readable and robust as models grow."
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

# Syntax Playbook

## Reliable expression patterns

- Attach units/currency directly to values (`$85/hour`, `9 L/min`).
- Use `to` / `in` for explicit conversions.
- Use lists (`a, b, c`) and ranges (`1..10`) instead of manual repetition.
- Use phrase operators for business math (`tax on`, `discount off`, `as %`).

<ExamplePlayground title={"Syntax essentials"} description={"Common patterns you will use daily."} code={"subtotal = $128\ntax = 8.5%\ntotal = subtotal + subtotal * tax =>\ndistance = 42 km\ndistance in mi =>\nscores = 71, 77, 84, 90, 94\navg(scores) =>"} />

## Prevent avoidable mistakes

- Do not use `->` for conversions; use `to`/`in`.
- Keep list lengths aligned for pairwise operations.
- Add explicit `step` for temporal ranges.
- Prefer `min` for minutes when `m` could mean meters.

<ExamplePlayground title={"Guardrail sampler"} description={"Examples that should fail clearly."} code={"1...5 =>\na = 1, 2, 3\nb = 10, 20\na + b =>\n2026-01-01..2026-01-05 =>"} />

## Units and rates reference

SmartPad treats units and currencies as semantic value types. Conversions and operations stay type-aware instead of string-based.

### Currency symbols/codes

`$`, `€`, `£`, `¥`, `₹`, `₿`, `CHF`, `CAD`, `AUD`, `USD`, `EUR`, `GBP`, `JPY`, `INR`, `BTC`, `ETH`, `USDT`, `USDC`, `BNB`, `XRP`, `SOL`, `ADA`, `DOGE`, `LTC`, `DOT`, `AVAX`, `MATIC`, `TRX`, `LINK`

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

```smartpad
download = 6 Mbit/s * 2 h =>
download to MB =>
egress = $0.09/GB
traffic = 12 TB/month
cost = egress * (traffic in GB/month) =>
```

