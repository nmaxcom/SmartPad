bug1: 
y = 1 / (x + 2)
x =>⚠️ Cannot subtract unit and number: cannot subtract dimensionless number from physical quantity
  Left operand: 1 1/year (unit)
  Right operand: 2 (number)

bug2:
y = x^(1/2)
x=>⚠️ Cannot solve: exponent must be numeric

To add as tests and examples in the docs, fix or implement if needed:
A = pi * r^2
r => sqrt(A / pi)

y = 4 * exp(0.5 * x)
x => ln(y / 4) / 0.5

y = log10(x^3)
x => 10^(y / 3)

y = 2 * sin(3 * x)
x => asin(y / 2) / 3

y = tan(x / 2) x
=> 2 * atan(y)

y = (x^4 / 4) + c x
=> (4 * (y - c))^(1 / 4)

y = ln(x / (1 - x))
x => exp(y) / (1 + exp(y))

# Logarithmic/Exponential isolation
growth = initial * exp(rate * time)
rate => ln(growth / initial) / time

# Rounding functions
round(PI, 2) => 3.14
floor(4.9) => 4
ceil(4.1) => 5

