# SmartPad Type System Reform Plan

## Overview

SmartPad currently has a fundamental type system issue where both variables and literals lack proper semantic information. Values like "20%" are stored as plain strings without context about whether they represent 20% of 100 (0.2) or 20% of 1 (0.2), making evaluation fragile and inconsistent. Similarly, literals like "$100" and "50 m" are treated as generic strings rather than typed values with currency symbols or units.

This reform implements a proper semantic type system that distinguishes between percentages, currencies, units, and dimensionless numbers, with clear metadata about their semantic meaning and base values.

## Goals

- **Reliable Evaluation**: No more guessing value semantics through regex parsing
- **Consistent UI**: Proper formatting for all value types handled by the values themselves
- **Better Errors**: Type-aware error messages with context
- **Extensibility**: Easy to add new value types (dates, complex numbers, etc.)
- **Performance**: Reduced runtime type detection overhead

## Implementation Strategy

**No Backward Compatibility**: Since we can pause usage during upgrade, we'll focus all energy on making a clean, well-architected system without maintaining legacy compatibility.

---

## Phase 1: Core Type System Infrastructure

### Task 1: Create SemanticValue Base Class ✅
- [x] Create `src/types/SemanticValue.ts` with abstract base class
- [x] Define common operations: `add()`, `subtract()`, `multiply()`, `divide()`, `power()`, `equals()`, `toString()`
- [x] Add type identification methods: `getType()`, `isNumeric()`, `canConvertTo()`
- [x] Include error handling for incompatible operations

### Task 2: Implement NumberValue Class ✅
- [x] Create `src/types/NumberValue.ts` for plain dimensionless numbers
- [x] Handle integer vs decimal formatting
- [x] Implement all arithmetic operations
- [x] Add scientific notation support for very large/small values

### Task 3: Implement PercentageValue Class ✅
- [x] Create `src/types/PercentageValue.ts` with proper semantic meaning
- [x] Store both display percentage (20) and decimal value (0.2)
- [x] Handle percentage arithmetic: `20% of 100`, `100 + 20%`, etc.
- [x] Implement base value context for operations

### Task 4: Implement CurrencyValue Class ✅
- [x] Create `src/types/CurrencyValue.ts` with symbol and numeric amount
- [x] Support major currency symbols: $, €, £, ¥
- [x] Implement currency arithmetic with same-symbol validation
- [x] Handle currency formatting with proper decimal places

### Task 5: Implement UnitValue Class ✅
- [x] Create `src/types/UnitValue.ts` wrapping existing SmartPadQuantity
- [x] Bridge to existing UnitsNet integration
- [x] Preserve all current unit functionality
- [x] Add unit-aware arithmetic operations

### Task 6: Implement ErrorValue Class ✅
- [x] Create `src/types/ErrorValue.ts` for evaluation errors
- [x] Include error type, message, and context
- [x] Support error chaining and nested errors
- [x] Implement proper error display formatting

---

## Phase 2: AST & Parsing Updates

### Task 7: Add SemanticValue to AST Nodes ✅
- [x] Update `src/parsing/ast.ts` BaseASTNode with `parsedValue?: SemanticValue`
- [x] Ensure all AST node types can carry semantic information
- [x] Maintain original raw text for error reporting
- [x] Add type guards for semantic value presence

### Task 8: Update VariableAssignmentNode ✅
- [x] Replace `value: string | number` with semantic parsing
- [x] Update type definitions and validation
- [x] Ensure proper parsing of all value types
- [x] Update AST node creation logic

### Task 9: Update ExpressionNode ✅
- [x] Parse expressions into semantic component trees
- [x] Handle mixed-type expressions (e.g., `$100 + 20%`)
- [x] Maintain expression structure for evaluation
- [x] Add expression type validation

### Task 10: Update Variable Type Definition ✅
- [x] Update `src/state/types.ts` Variable interface
- [x] Replace `value: number | string` with `value: SemanticValue`
- [x] Remove redundant `displayValue`, `units`, `quantity` fields
- [x] Update all Variable-related type definitions

### Task 11: Parse Currency Literals ✅
- [x] Extend `src/parsing/astParser.ts` to detect currency patterns
- [x] Parse `$100`, `€50.25`, `£75` into CurrencyValue instances
- [x] Handle currency symbols before and after numbers
- [x] Validate currency format and create proper SemanticValue

### Task 12: Parse Percentage Literals ✅
- [x] Detect percentage patterns: `20%`, `15.5%`, `100%`
- [x] Create PercentageValue with proper decimal conversion
- [x] Handle percentage in expressions and assignments
- [x] Distinguish between percentage values and percentage operations

### Task 13: Parse Unit Literals ✅
- [x] Detect unit patterns: `50 m`, `100kg`, `25 mph`
- [x] Create UnitValue wrapping SmartPadQuantity
- [x] Integrate with existing UnitsNet parsing
- [x] Handle compound units and complex expressions

### Task 14: Expression Type Resolution ✅
- [x] Implement type resolution for complex expressions
- [x] Handle operator precedence with typed operands
- [x] Validate type compatibility before evaluation
- [x] Support mixed-type expressions where appropriate

### Task 15: Early Type Validation ✅
- [x] Add type validation during parsing phase
- [x] Generate meaningful error messages with context
- [x] Prevent invalid operations before evaluation
- [x] Provide suggestions for type corrections

---

## Phase 3: Evaluator Refactoring

### Task 16: Refactor PercentageExpressionEvaluator ✅
- [x] Update `src/eval/percentageEvaluator.ts` to work with SemanticValue
- [x] Remove regex type detection logic
- [x] Use typed arithmetic operations
- [x] Simplify evaluation logic with proper types

### Task 17: Refactor UnitsNetExpressionEvaluator ✅
- [x] Update units evaluator to work with UnitValue types
- [x] Remove string parsing for unit detection
- [x] Use SemanticValue operations for unit arithmetic
- [x] Maintain all current unit functionality

### Task 18: Refactor VariableEvaluator ✅
- [x] Update `src/eval/variableEvaluator.ts` for SemanticValue storage
- [x] Handle typed variable assignments
- [x] Remove string/number value handling
- [x] Use proper semantic operations

### Task 19: Refactor ExpressionEvaluator ✅
- [x] Update `src/eval/expressionEvaluator.ts` for typed expressions
- [x] Work with pre-parsed semantic component trees
- [x] Remove type guessing and string parsing
- [x] Implement clean typed evaluation

### Task 20: Remove Type Detection Logic ✅
- [x] Remove all regex-based type detection from evaluators
- [x] Clean up string parsing utilities
- [x] Remove redundant type checking code
- [x] Simplify evaluator logic

### Task 21: Type-Safe Arithmetic Operations ✅
- [x] Implement proper arithmetic in SemanticValue classes
- [x] Add type checking for all operations
- [x] Handle unit conversions and currency matching
- [x] Support percentage operations with base values

### Task 22: Enhanced Error Messages ✅
- [x] Add type context to all error messages
- [x] Show expected vs actual types in errors
- [x] Provide helpful suggestions for fixes
- [x] Include operation context in error reporting

---

## Phase 4: Formatting & Storage

### Task 23: Consistent Value Formatting ✅
- [x] Implement `toString()` and `toDisplayString()` in each SemanticValue
- [x] Remove formatting logic from evaluators
- [x] Handle precision and display preferences
- [x] Support different output formats (scientific, engineering, etc.)

### Task 24: Remove Evaluator Formatting ✅
- [x] Clean up formatting logic from all evaluators
- [x] Remove display string generation from evaluation
- [x] Use SemanticValue formatting methods
- [x] Simplify render node creation

### Task 25: Configurable Display Preferences ✅
- [x] Add precision settings to SemanticValue classes
- [x] Support user preferences for number formatting
- [x] Handle currency decimal places by symbol
- [x] Add unit display preferences (metric vs imperial)

### Task 26: Update ReactiveVariableStore ✅
- [x] Update `src/state/variableStore.ts` for SemanticValue storage
- [x] Handle typed variable operations
- [x] Update variable dependency tracking
- [x] Maintain reactive updates with typed values

### Task 27: Update Dependency Graph ✅
- [x] Update `src/state/dependencyGraph.ts` for SemanticValue
- [x] Handle typed variable references
- [x] Support type-aware dependency resolution
- [x] Maintain circular dependency detection

### Task 28: Update RenderNode Interfaces ✅
- [x] Update `src/eval/renderNodes.ts` for SemanticValue display
- [x] Use typed value formatting methods
- [x] Simplify display text generation
- [x] Remove redundant formatting fields

---

## Phase 5: UI Integration

### Task 29: Update React Components ✅
- [x] Update variable panel components for typed values
- [x] Update editor components for semantic value display
- [x] Use SemanticValue formatting in UI
- [x] Handle type-specific display requirements

### Task 30: Enhanced Variable Panel ✅
- [x] Add type information display in variable panel
- [x] Show semantic type alongside value
- [x] Add type-specific icons or indicators
- [x] Support type-aware variable operations

### Task 31: Improved Error Reporting ✅
- [x] Update error display in UI components
- [x] Show type context in error messages
- [x] Add inline validation feedback
- [x] Provide helpful error resolution suggestions

---

## Phase 6: Testing & Validation

### Task 32: Unit Tests for SemanticValue Classes
- [ ] Write comprehensive tests for all SemanticValue types
- [ ] Test arithmetic operations and type checking
- [ ] Test formatting and display methods
- [ ] Test error conditions and edge cases

### Task 33: Integration Tests
- [ ] Test type interactions and mixed arithmetic
- [ ] Test parsing of all literal types
- [ ] Test evaluator integration with typed values
- [ ] Test variable storage and retrieval

### Task 34: Edge Case Validation
- [ ] Test invalid operations and error handling
- [ ] Test boundary conditions for all types
- [ ] Test complex expressions with multiple types
- [ ] Test error propagation and recovery

### Task 35: Performance Testing
- [ ] Test performance with large variable sets
- [ ] Test complex expression evaluation performance
- [ ] Compare performance with current system
- [ ] Optimize critical paths identified in testing

### Task 36: Update Existing Tests
- [ ] Update existing BDD/E2E tests for new type system
- [ ] Update unit tests for modified components
- [ ] Ensure all test scenarios still work
- [ ] Add new test scenarios for type functionality

---

## Success Criteria

- [ ] All literal values are properly typed during parsing
- [ ] No regex-based type detection in evaluators
- [ ] Consistent formatting handled by value types
- [ ] Clear, type-aware error messages
- [ ] All existing functionality preserved
- [ ] Performance equal to or better than current system
- [ ] Comprehensive test coverage for new type system
- [ ] Clean, maintainable code architecture

## File Impact Summary

**New Files (~15)**
- `src/types/SemanticValue.ts` - Base class
- `src/types/NumberValue.ts` - Numbers  
- `src/types/PercentageValue.ts` - Percentages
- `src/types/CurrencyValue.ts` - Currencies
- `src/types/UnitValue.ts` - Units
- `src/types/ErrorValue.ts` - Errors
- `src/types/index.ts` - Exports

**Modified Files (~25-30)**
- All AST files (`src/parsing/*`)
- All evaluator files (`src/eval/*`) 
- Variable storage (`src/state/*`)
- React components (`src/components/*`)
- Type definitions (`src/state/types.ts`)

This reform addresses the fundamental architectural issue while building a robust, extensible foundation for future development.