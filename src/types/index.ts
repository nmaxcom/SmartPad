/**
 * @file SmartPad Semantic Type System
 * @description Export all semantic value types and utilities for the new type system.
 * This replaces the fragile string-based approach with proper semantic types.
 */

// Base types and interfaces
import { SemanticValue, type SemanticValueType, type DisplayOptions } from './SemanticValue';

// Concrete semantic value implementations  
import { NumberValue } from './NumberValue';
import { PercentageValue, type PercentageContext } from './PercentageValue';
import { CurrencyValue, type CurrencySymbol } from './CurrencyValue';
import { UnitValue } from './UnitValue';
import { ErrorValue, type ErrorType, type ErrorContext } from './ErrorValue';

// Re-export base types
export { SemanticValue, type SemanticValueType, type DisplayOptions };

// Re-export all types
export { NumberValue };
export { PercentageValue, type PercentageContext };
export { CurrencyValue, type CurrencySymbol };
export { UnitValue };
export { ErrorValue, type ErrorType, type ErrorContext };

// Type guards and utilities
export const SemanticValueTypes = {
  isNumber: (value: SemanticValue): value is NumberValue => value.getType() === 'number',
  isPercentage: (value: SemanticValue): value is PercentageValue => value.getType() === 'percentage',
  isCurrency: (value: SemanticValue): value is CurrencyValue => value.getType() === 'currency',
  isUnit: (value: SemanticValue): value is UnitValue => value.getType() === 'unit',
  isError: (value: SemanticValue): value is ErrorValue => value.getType() === 'error',
} as const;

// Factory functions for creating semantic values
export const SemanticValues = {
  /**
   * Create a NumberValue from various inputs
   */
  number: (value: number | string): NumberValue => NumberValue.from(value),
  
  /**
   * Create a PercentageValue from display percentage
   */
  percentage: (displayPercent: number): PercentageValue => new PercentageValue(displayPercent),
  
  /**
   * Create a CurrencyValue from symbol and amount
   */
  currency: (symbol: CurrencySymbol, amount: number): CurrencyValue => new CurrencyValue(symbol, amount),
  
  /**
   * Create a UnitValue from value and unit string
   */
  unit: (value: number, unit: string): UnitValue => UnitValue.fromValueAndUnit(value, unit),
  
  /**
   * Create an ErrorValue
   */
  error: (type: ErrorType, message: string, context?: ErrorContext): ErrorValue => 
    new ErrorValue(type, message, context),
    
  /**
   * Zero values for each type
   */
  zero: {
    number: (): NumberValue => NumberValue.zero(),
    percentage: (): PercentageValue => new PercentageValue(0),
    currency: (symbol: CurrencySymbol): CurrencyValue => new CurrencyValue(symbol, 0),
    unit: (unit: string): UnitValue => UnitValue.fromValueAndUnit(0, unit),
  },
  
  /**
   * One/unit values
   */
  one: {
    number: (): NumberValue => NumberValue.one(),
    percentage: (): PercentageValue => new PercentageValue(100), // 100%
  },
} as const;

// Parser utilities
export const SemanticParsers = {
  /**
   * Try to parse a string as a semantic value
   */
  parse: (str: string): SemanticValue | null => {
    if (!str) return null;
    
    const trimmed = str.trim();
    if (!trimmed) return null;
    
    // Try percentage first (20%)
    if (trimmed.match(/^-?\d+(?:\.\d+)?%$/)) {
      try {
        return PercentageValue.fromString(trimmed);
      } catch {
        return null;
      }
    }
    
    // Try currency ($100, €50, $1,000, 100$)
    if (
      trimmed.match(/^[\$€£¥₹₿]\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/) ||
      trimmed.match(/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*[\$€£¥₹₿]$/) ||
      trimmed.match(/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s+(CHF|CAD|AUD)$/)
    ) {
      try {
        return CurrencyValue.fromString(trimmed);
      } catch {
        return null;
      }
    }
    
    // Try units (50 m, 100 kg)
    if (UnitValue.isUnitString(trimmed)) {
      try {
        return UnitValue.fromString(trimmed);
      } catch {
        return null;
      }
    }
    
    // Try number (last, as it's most permissive)
    if (trimmed.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/)) {
      try {
        return NumberValue.from(trimmed);
      } catch {
        return null;
      }
    }
    
    return null;
  },
  
  /**
   * Parse with error handling
   */
  parseOrError: (str: string): SemanticValue => {
    if (!str) {
      return ErrorValue.parseError("Empty value provided for parsing");
    }
    
    const trimmed = str.trim();
    if (!trimmed) {
      return ErrorValue.parseError("Empty value provided for parsing");
    }
    
    const result = SemanticParsers.parse(str);
    if (result) {
      return result;
    }
    
    return ErrorValue.parseError(`Cannot parse "${str}" as any semantic value type`);
  },
} as const;

// Arithmetic utilities
export const SemanticArithmetic = {
  /**
   * Add two semantic values with proper error handling
   */
  add: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      return left.add(right);
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Subtract two semantic values with proper error handling
   */
  subtract: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      return left.subtract(right);
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Multiply two semantic values with proper error handling
   */
  multiply: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      return left.multiply(right);
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Divide two semantic values with proper error handling
   */
  divide: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      return left.divide(right);
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Raise semantic value to power with proper error handling
   */
  power: (base: SemanticValue, exponent: number): SemanticValue => {
    try {
      return base.power(exponent);
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
} as const;
