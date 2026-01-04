# SmartPad Units Reference

Complete reference of all supported units in SmartPad.

## Summary

Total supported units: **38**
Categories: **13**

## Length

7 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `m` | meter | meter, meters |
| `mm` | millimeter | millimeter, millimeters |
| `cm` | centimeter | centimeter, centimeters |
| `km` | kilometer | kilometer, kilometers |
| `in` | inch | inch, inches |
| `ft` | foot | foot, feet |
| `mi` | mile | mile, miles |

## Mass

3 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `kg` | kilogram | kilogram, kilograms |
| `g` | gram | gram, grams |
| `lb` | pound | pound, pounds, lbs |

## Time

3 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `s` | second | second, seconds |
| `min` | minute | minute, minutes |
| `h` | hour | hour, hours |

## Temperature

3 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `K` | kelvin | kelvin, kelvins |
| `C` | celsius | celsius, °C |
| `F` | fahrenheit | fahrenheit, °F |

## Area

2 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `m^2` | square meter | sqm, square meter, square meters |
| `ft^2` | square foot | sqft, square foot, square feet |

## Volume

2 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `m^3` | cubic meter | cubic meter, cubic meters |
| `ft^3` | cubic foot | cubic foot, cubic feet |

## Speed

3 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `m/s` | meters per second | meters per second |
| `km/h` | kilometers per hour | kph, kilometers per hour |
| `mph` | miles per hour | miles per hour |

## Acceleration

1 unit available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `m/s^2` | meters per second squared |  |

## Force

2 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `N` | newton | newton, newtons |
| `lbf` | pound force | pound force, pounds force |

## Pressure

4 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `Pa` | pascal | pascal, pascals |
| `kPa` | kilopascal | kilopascal, kilopascals |
| `bar` | bar | bar |
| `psi` | pounds per square inch | pounds per square inch |

## Energy

3 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `J` | joule | joule, joules |
| `cal` | calorie | calorie, calories |
| `kWh` | kilowatt hour | kilowatt hour, kilowatt hours |

## Power

2 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `W` | watt | watt, watts |
| `kW` | kilowatt | kilowatt, kilowatts |

## Electric

3 units available.

| Symbol | Name | Aliases |
|--------|------|--------|
| `A` | ampere | ampere, amperes |
| `V` | volt | volt, volts |
| `Ω` | ohm | ohm, ohms |

## Usage Examples

### Basic Unit Operations
```
100 m =>                    # Display with units
25 kg =>                    # Display with units
98.6 °F =>                  # Temperature with units
```

### Unit Conversions
```
100 m to km =>              # Convert meters to kilometers
25 kg to lb =>              # Convert kilograms to pounds
98.6 °F to C =>             # Convert Fahrenheit to Celsius
```

### Variable Assignment with Units
```
height = 180 cm             # Store height with units
weight = 70 kg              # Store weight with units
temp = 37 °C                # Store temperature with units
```

### Mathematical Operations
```
10 m + 50 cm =>             # Add compatible units
100 m / 10 s =>             # Divide to get speed
2 kg * 9.8 m/s^2 =>         # Calculate force
```

## Unit Compatibility Rules

- **Addition/Subtraction**: Units must have identical dimensions
- **Multiplication/Division**: Dimensions combine (e.g., Length/Time = Speed)
- **Powers**: Raise both value and dimension
- **Functions**: Only meaningful operations (e.g., sqrt(m^2) = m)

## Temperature Handling

- **Temperature + Difference**: Results in temperature
- **Temperature - Temperature**: Results in temperature difference
- **Conversions**: Use `to` for explicit conversions

Examples:
```
100 C + 50 K =>             # 150 C (temperature + difference)
100 C - 50 C =>             # 50 K (difference)
25 C to K =>                # 298.15 K (conversion)
```

---

*Last generated: 2025-12-27T00:23:47.120Z*
