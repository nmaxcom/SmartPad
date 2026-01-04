# SmartPad Syntax Cheat Sheet

Quick reference for common operations.

## Percentages

| Operation | Syntax | Example | Result |
|-----------|--------|---------|---------|
| Calculate percentage of a value | `x% of y =>` | `30% of 500 =>` | numeric result |
| Add percentage to a value (increase) | `x% on y =>` | `20% on 80 =>` | numeric result |
| Subtract percentage from a value (decrease) | `x% off y =>` | `20% off $80 =>` | numeric result |
| Convert ratio to percentage | `x / y as % =>` | `20 / 80 as % =>` | percentage with % symbol |
| Calculate percentage from part and base | `part of base is % =>` | `20 of 80 is % =>` | percentage with % symbol |
| Add percentage to base value | `base + x% =>` | `80 + 20% =>` | numeric result |
| Subtract percentage from base value | `base - x% =>` | `500 - 10% =>` | numeric result |
| Chained percentage calculations | `x% of y% of z =>` | `20% of 50% of 1000 =>` | numeric result |

## Variables

| Operation | Syntax | Example |
|-----------|--------|---------|
| Simple variable assignment | `name = value` | `price = 10.5` |
| Variable assignment with evaluation | `name = expression =>` | `total = price * 1.08 =>` |
| Variable with spaces in name | `phrase name = value` | `my password = 2929` |

## Units

| Operation | Syntax | Example |
|-----------|--------|---------|
| Value with units | `value unit` | `100 m` |
| Unit conversion with result | `value unit =>` | `100 m =>` |
| Variable assignment with units | `name = value unit` | `height = 180 cm` |
| Convert quantity to different unit | `quantity to unit =>` | `100 m to km =>` |

### Quick Units Reference

**Length**: m, mm, cm, km, in, ft, mi
**Mass**: kg, g, lb
**Time**: s, min, h
**Temperature**: K, C, F
**Area**: m^2, ft^2
**Volume**: m^3, ft^3
**Speed**: m/s, km/h, mph
**Acceleration**: m/s^2
**Force**: N, lbf
**Pressure**: Pa, kPa, bar, psi
**Energy**: J, cal, kWh
**Power**: W, kW
**Electric**: A, V, Ω

*See UNITS_REFERENCE.md for complete list*
