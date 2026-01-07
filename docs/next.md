# Lists: collections of values separated by commas

## Feature mission
Create a human-friendly list syntax that feels like ordinary writing (comma separated values, no bracket noise), works with both inline expressions and stored phrase variables, keeps units when possible, and lets statistical helpers and even solving logic understand collections.  

## Step-by-step plan
1. **List semantics and parsing**  
   - Extend the AST/evaluator pipeline so expressions like `10, 20, 30` or `prices = 10, 15, 22` produce a new `ListValue` semantic type.  
   - Allow phrase variables to reference lists without requiring brackets.  
   - Ensure lists flatten when nested (e.g., `sum( (10, 20), (30, 40) )` becomes `[10,20,30,40]`) and ignore non-value noise gracefully.  

2. **Statistical functions**  
   - Implement `sum`/`total`, `avg`/`mean`, `median`, `min`, `max`, `count`, and `stddev` in the expression evaluator so they accept lists or arrays of arguments, maintain compatible units (e.g., normalizing units to the first entry before summing), and skip non-numeric strings.  
   - Support direct and variable-based invocation (`avg(10,20,30)` and `total(costs)`).  

3. **Solve/list integration**  
   - Teach the solve evaluator to reason about lists, including symbolic placeholders inside a list (`100 = total(50, 20, x)` ⇒ `x => 30`).  
   - Ensure the solver handles unit-aware lists and can fall back to symbolic expressions when data is missing.  

4. **Edge-case coverage & docs**  
   - Add regression tests covering single item lists, mixed units, nested lists, empty args, non-numeric noise, unit conversions, phrase variables, and solving unknowns in lists.  
   - Update documentation/templates to showcase the new list/statistics syntax and expected results (median, stddev, unit-aware sum, etc.).  

## Example snippet (for reference)
scores = 85, 92, 78, 95, 88
count(scores) => 5
total(scores) => 438
avg(scores) => 87.6
median(scores) => 88
expenses = rent, utilities, 50
sum(expenses) => 1450
stddev(expenses) => 452.148

weights = 1.2 kg, 800 g, 2.5 kg
total(weights) => 4.5 kg
mean(weights) to g => 1500 g

goal = total(50, 20, x)
goal => 100
x => 30
