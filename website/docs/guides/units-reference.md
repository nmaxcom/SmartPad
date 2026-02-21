---
title: Units Reference
sidebar_position: 3
---

# Units Reference

<div className="doc-hero">
<p className="doc-hero__kicker">Complete Catalog</p>
<h2>All supported unit families from the canonical registry</h2>
<p>This page is generated from runtime unit/currency sources so docs stay aligned with app behavior.</p>
</div>

## Units and rates model

- SmartPad treats canonical units as first-class symbols and supports compound expressions with `*`, `/`, and exponents.
- Rate expressions like `Mbit/s` are compounds (`Mbit` divided by `s`), not special one-off unit types.
- Any compatible unit can be expressed as `/s`, `/day`, `/month`, `/year`, etc.

## Base unit families

Total canonical symbols documented: **48**

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

## Compound units and rate patterns

```smartpad
download = 6 Mbit/s * 2 h =>
download to MB =>
throughput = 250 unit/day
throughput to unit/month =>
```

## Currency as units

SmartPad supports currency symbols/codes as unit-like value types and rate compounds.

Supported symbols/codes: `$`, `€`, `£`, `¥`, `₹`, `₿`, `CHF`, `CAD`, `AUD`, `USD`, `EUR`, `GBP`, `JPY`, `INR`, `BTC`, `ETH`, `USDT`, `USDC`, `BNB`, `XRP`, `SOL`, `ADA`, `DOGE`, `LTC`, `DOT`, `AVAX`, `MATIC`, `TRX`, `LINK`

```smartpad
plan = $95/hour
monthly = plan * 160 h =>
egress = $0.09/GB
traffic = 12 TB/month
cost = egress * (traffic in GB/month) =>
```

