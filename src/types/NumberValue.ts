/**
 * @file NumberValue - Plain dimensionless numbers in SmartPad's type system
 * @description Represents pure numeric values without units, currencies, or percentages.
 * These are the foundation for all arithmetic and serve as the result of many operations.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from './SemanticValue';

/**
 * Represents a plain dimensionless number (integer or decimal)
 * Examples: 42, 3.14159, -17.5, 1e6
 */
export class NumberValue extends SemanticValue {
  private readonly value: number;

  constructor(value: number) {
    super();
    if (!isFinite(value)) {
      throw new Error(`Invalid number value: ${value}`);
    }
    this.value = value;
  }

  getType(): SemanticValueType {
    return 'number';
  }

  getNumericValue(): number {
    return this.value;
  }

  isNumeric(): boolean {
    return true;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    // Numbers can be converted to percentages and used in unit calculations
    return targetType === 'number' || targetType === 'percentage';
  }

  toString(options?: DisplayOptions): string {
    const precision = options?.precision ?? 6;
    const notation = options?.notation ?? 'standard';
    
    if (notation === 'scientific') {
      return this.value.toExponential(precision);
    }
    
    if (notation === 'engineering') {
      // Engineering notation (powers of 3)
      const exp = Math.floor(Math.log10(Math.abs(this.value)) / 3) * 3;
      const mantissa = this.value / Math.pow(10, exp);
      return `${this.formatNumber(mantissa, precision)}e${exp}`;
    }
    
    // Standard notation with smart formatting
    return this.formatNumber(this.value, precision);
  }

  equals(other: SemanticValue, tolerance = 1e-10): boolean {
    if (other.getType() !== 'number') {
      return false;
    }
    return Math.abs(this.value - other.getNumericValue()) <= tolerance;
  }

  add(other: SemanticValue): SemanticValue {
    if (other.getType() === 'number') {
      return new NumberValue(this.value + other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // Adding percentage to number: 100 + 20% = 120
      const percentValue = other.getNumericValue(); // This should be decimal form (0.2)
      return new NumberValue(this.value * (1 + percentValue));
    }
    
    if (other.getType() === 'currency' || other.getType() === 'unit') {
      // Let the other type handle this case (currency/unit + number)
      return other.add(this);
    }
    
    throw this.createIncompatibilityError(other, 'add', 'incompatible types');
  }

  subtract(other: SemanticValue): SemanticValue {
    if (other.getType() === 'number') {
      return new NumberValue(this.value - other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // Subtracting percentage from number: 100 - 20% = 80
      const percentValue = other.getNumericValue(); // Decimal form (0.2)
      return new NumberValue(this.value * (1 - percentValue));
    }
    
    // For currency and units, we can't subtract them from a plain number
    if (other.getType() === 'currency') {
      throw this.createIncompatibilityError(other, 'subtract', 'cannot subtract currency from number');
    }
    
    if (other.getType() === 'unit') {
      throw this.createIncompatibilityError(other, 'subtract', 'cannot subtract unit from dimensionless number');
    }
    
    throw this.createIncompatibilityError(other, 'subtract', 'incompatible types');
  }

  multiply(other: SemanticValue): SemanticValue {
    if (other.getType() === 'number') {
      return new NumberValue(this.value * other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // Number * percentage: 100 * 20% = 20 (not 120!)
      const percentValue = other.getNumericValue(); // Decimal form (0.2)
      return new NumberValue(this.value * percentValue);
    }
    
    if (other.getType() === 'currency' || other.getType() === 'unit') {
      // Let the other type handle this (currency/unit * number)
      return other.multiply(this);
    }
    
    throw this.createIncompatibilityError(other, 'multiply', 'incompatible types');
  }

  divide(other: SemanticValue): SemanticValue {
    if (other.getNumericValue() === 0) {
      throw new Error('Division by zero');
    }
    
    if (other.getType() === 'number') {
      return new NumberValue(this.value / other.getNumericValue());
    }
    
    if (other.getType() === 'percentage') {
      // Number / percentage: 100 / 20% = 500
      const percentValue = other.getNumericValue(); // Decimal form (0.2)
      return new NumberValue(this.value / percentValue);
    }
    
    if (other.getType() === 'currency') {
      throw this.createIncompatibilityError(other, 'divide', 'cannot divide number by currency');
    }
    
    if (other.getType() === 'unit') {
      throw this.createIncompatibilityError(other, 'divide', 'cannot divide dimensionless number by unit');
    }
    
    throw this.createIncompatibilityError(other, 'divide', 'incompatible types');
  }

  power(exponent: number): SemanticValue {
    if (!isFinite(exponent)) {
      throw new Error(`Invalid exponent: ${exponent}`);
    }
    
    const result = Math.pow(this.value, exponent);
    
    if (!isFinite(result)) {
      throw new Error(`Power operation resulted in invalid value: ${this.value}^${exponent}`);
    }
    
    return new NumberValue(result);
  }

  clone(): NumberValue {
    return new NumberValue(this.value);
  }

  /**
   * Create a NumberValue from various input types
   */
  static from(value: number | string): NumberValue {
    if (typeof value === 'number') {
      return new NumberValue(value);
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        throw new Error(`Cannot parse number from: "${value}"`);
      }
      return new NumberValue(parsed);
    }
    
    throw new Error(`Cannot create NumberValue from: ${typeof value}`);
  }

  /**
   * Create zero value
   */
  static zero(): NumberValue {
    return new NumberValue(0);
  }

  /**
   * Create one value
   */
  static one(): NumberValue {
    return new NumberValue(1);
  }

  /**
   * Check if this number is zero
   */
  isZero(tolerance = 1e-10): boolean {
    return Math.abs(this.value) <= tolerance;
  }

  /**
   * Check if this number is an integer
   */
  isInteger(): boolean {
    return Number.isInteger(this.value);
  }

  /**
   * Get the absolute value
   */
  abs(): NumberValue {
    return new NumberValue(Math.abs(this.value));
  }

  /**
   * Get the sign of the number (-1, 0, or 1)
   */
  sign(): NumberValue {
    return new NumberValue(Math.sign(this.value));
  }

  /**
   * Round to specified decimal places
   */
  round(decimalPlaces = 0): NumberValue {
    const factor = Math.pow(10, decimalPlaces);
    return new NumberValue(Math.round(this.value * factor) / factor);
  }
}