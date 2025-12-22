# SmartPad Syntax Reference

This document is automatically generated from the syntax registry. 
It serves as a comprehensive reference for all supported syntax patterns in SmartPad.

## Table of Contents

- [Percentages](#percentages) (8 patterns)
- [Variables](#variables) (3 patterns)
- [Expressions](#expressions) (1 patterns)
- [Units](#units) (4 patterns)
- [Currency](#currency) (3 patterns)

---

## Percentages

8 syntax patterns available.

### 1. `x% of y =>`

**Description:** Calculate percentage of a value

**Output:** numeric result

**Examples:**

```
30% of 500 =>
```

```
15% of 200 =>
```

---

### 2. `x% on y =>`

**Description:** Add percentage to a value (increase)

**Output:** numeric result

**Examples:**

```
20% on 80 =>
```

```
10% on 100 =>
```

---

### 3. `x% off y =>`

**Description:** Subtract percentage from a value (decrease)

**Output:** numeric result

**Examples:**

```
20% off $80 =>
```

```
15% off 200 =>
```

---

### 4. `x / y as % =>`

**Description:** Convert ratio to percentage

**Output:** percentage with % symbol

**Examples:**

```
20 / 80 as % =>
```

```
3 / 10 as % =>
```

---

### 5. `part of base is % =>`

**Description:** Calculate percentage from part and base

**Output:** percentage with % symbol

**Examples:**

```
20 of 80 is % =>
```

```
15 of 60 is % =>
```

---

### 6. `base + x% =>`

**Description:** Add percentage to base value

**Output:** numeric result

**Examples:**

```
80 + 20% =>
```

```
100 + 15% =>
```

---

### 7. `base - x% =>`

**Description:** Subtract percentage from base value

**Output:** numeric result

**Examples:**

```
500 - 10% =>
```

```
200 - 25% =>
```

---

### 8. `x% of y% of z =>`

**Description:** Chained percentage calculations

**Output:** numeric result

**Examples:**

```
20% of 50% of 1000 =>
```

---

## Variables

3 syntax patterns available.

### 1. `name = value`

**Description:** Simple variable assignment

**Output:** variable stored

**Examples:**

```
price = 10.5
```

```
discount = 20%
```

```
tax_rate = 0.15
```

---

### 2. `name = expression =>`

**Description:** Variable assignment with evaluation

**Output:** variable stored + result displayed

**Examples:**

```
total = price * 1.08 =>
```

```
area = length * width =>
```

---

### 3. `phrase name = value`

**Description:** Variable with spaces in name

**Output:** variable stored

**Examples:**

```
my password = 2929
```

```
tax rate = 0.08
```

---

## Expressions

1 syntax pattern available.

### 1. `expression =>`

**Description:** Evaluate expression and show result

**Output:** result displayed

**Examples:**

```
2 + 3 =>
```

```
sqrt(16) + 2 =>
```

```
price * 1.08 =>
```

---

## Units

4 syntax patterns available.

### 1. `value unit`

**Description:** Value with units

**Output:** value with units

**Examples:**

```
100 m
```

```
25 kg
```

```
98.6 °F
```

---

### 2. `value unit =>`

**Description:** Unit conversion with result

**Output:** converted value with units

**Examples:**

```
100 m =>
```

```
25 kg =>
```

```
98.6 °F =>
```

---

### 3. `name = value unit`

**Description:** Variable assignment with units

**Output:** variable stored with units

**Examples:**

```
height = 180 cm
```

```
weight = 70 kg
```

```
temp = 37 °C
```

---

### 4. `quantity to unit =>`

**Description:** Convert quantity to different unit

**Output:** converted value in target unit

**Examples:**

```
100 m to km =>
```

```
25 kg to lb =>
```

```
98.6 °F to C =>
```

---

## Currency

3 syntax patterns available.

### 1. `$value`

**Description:** US Dollar amount

**Output:** currency with $ symbol

**Examples:**

```
$100
```

```
$25.50
```

```
$1,000
```

---

### 2. `€value`

**Description:** Euro amount

**Output:** currency with € symbol

**Examples:**

```
€100
```

```
€25.50
```

```
€1,000
```

---

### 3. `£value`

**Description:** British Pound amount

**Output:** currency with £ symbol

**Examples:**

```
£100
```

```
£25.50
```

```
£1,000
```

---

## Usage Examples

### Basic Percentage Calculations
```
30% of 500 =>     # Calculate 30% of 500
20% on 80 =>      # Add 20% to 80
20% off $80 =>    # Subtract 20% from $80
```

### Variable Assignments
```
price = 10.5                    # Simple assignment
discount = 20%                  # Percentage assignment
total = price * 1.08 =>         # Assignment with evaluation
my password = 2929              # Phrase-based variable name
```

### Unit Operations
```
100 m =>                        # Unit conversion
height = 180 cm                 # Variable with units
weight = 70 kg                  # Variable with units
```

### Currency Operations
```
$100 + 20% =>                   # Currency with percentage
€200 - 15% =>                   # Euro with percentage
£50 * 1.1 =>                    # Pound calculations
```

## Development Notes

- This documentation is automatically generated from the syntax registry
- All syntax patterns are tested to ensure they work correctly
- To add new syntax, update the registry and add corresponding tests
- Run tests to verify syntax patterns: `npm test -- tests/syntax-reference/`

## Testing

To test all syntax patterns:

```bash
# Test all syntax reference tests
npm test -- tests/syntax-reference/

# Test specific category
npm test -- tests/syntax-reference/percentages.spec.ts

# Test with pattern matching
npm test -- --testNamePattern="x% of y"
```

---

*Last generated: 2025-08-18T01:56:04.146Z*
