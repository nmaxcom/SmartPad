/**
 * @file PercentageValue - Percentage values with proper semantic meaning
 * @description Solves the fundamental issue where "20%" was ambiguous - this class
 * clearly distinguishes between display percentage (20) and decimal value (0.2),
 * and properly handles percentage arithmetic with base value context.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from './SemanticValue';
import { NumberValue } from './NumberValue';

export type PercentageContext = 'standalone' | 'of' | 'on' | 'off';

/**
 * Represents a percentage value with clear semantic meaning
 * Stores both display form (20) and decimal form (0.2) to eliminate ambiguity
 * 
 * Examples:
 * - "20%" -> PercentageValue(20, 0.2) 
 * - "150%" -> PercentageValue(150, 1.5)
 * - "0.5%" -> PercentageValue(0.5, 0.005)
 */
export class PercentageValue extends SemanticValue {
  private readonly displayPercentage: number; // What user sees (20 for 20%)
  private readonly decimalValue: number;      // Calculation value (0.2 for 20%)
  private readonly context: PercentageContext;

  constructor(displayPercentage: number, context: PercentageContext = 'standalone') {
    super();
    
    if (!isFinite(displayPercentage)) {
      throw new Error(`Invalid percentage value: ${displayPercentage}`);
    }
    
    this.displayPercentage = displayPercentage;
    this.decimalValue = displayPercentage / 100;
    this.context = context;
  }

  getType(): SemanticValueType {
    return 'percentage';
  }

  getNumericValue(): number {
    // Always return decimal form for calculations (0.2 for 20%)
    return this.decimalValue;
  }

  /**
   * Get the display percentage value (20 for 20%)
   */
  getDisplayPercentage(): number {
    return this.displayPercentage;
  }

  /**
   * Get the context for this percentage
   */
  getContext(): PercentageContext {
    return this.context;
  }

  isNumeric(): boolean {
    return true;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === 'percentage' || targetType === 'number';
  }

  toString(options?: DisplayOptions): string {
    const precision = options?.precision ?? 6;
    const formattedPercent = this.formatNumber(this.displayPercentage, precision);
    
    if (options?.showType) {
      return `${formattedPercent}% (${this.context})`;
    }
    
    return `${formattedPercent}%`;
  }

  equals(other: SemanticValue, tolerance = 1e-10): boolean {
    if (other.getType() !== 'percentage') {
      return false;
    }
    return Math.abs(this.decimalValue - other.getNumericValue()) <= tolerance;
  }

  add(other: SemanticValue): SemanticValue {
    if (other.getType() === 'percentage') {
      // 20% + 30% = 50%
      const otherPercent = (other as PercentageValue).getDisplayPercentage();
      return new PercentageValue(this.displayPercentage + otherPercent);
    }
    
    if (other.getType() === 'number') {
      // This is tricky - what does 20% + 5 mean?
      // We interpret this as: apply 20% to base 100, then add 5
      // So: 20% + 5 = 20 + 5 = 25, but result is still a number
      const percentAsNumber = this.displayPercentage;
      return new NumberValue(percentAsNumber + other.getNumericValue());
    }
    
    throw this.createIncompatibilityError(other, 'add', 'percentage addition requires another percentage or number context');
  }

  subtract(other: SemanticValue): SemanticValue {
    if (other.getType() === 'percentage') {
      // 50% - 20% = 30%
      const otherPercent = (other as PercentageValue).getDisplayPercentage();
      return new PercentageValue(this.displayPercentage - otherPercent);
    }
    
    if (other.getType() === 'number') {
      // 25% - 5 = 20 (as number, losing percentage meaning)
      const percentAsNumber = this.displayPercentage;
      return new NumberValue(percentAsNumber - other.getNumericValue());
    }
    
    throw this.createIncompatibilityError(other, 'subtract', 'percentage subtraction requires another percentage or number context');
  }

  multiply(other: SemanticValue): SemanticValue {
    if (other.getType() === 'number') {
      // 20% * 3 = 60%
      const newDisplayPercent = this.displayPercentage * other.getNumericValue();
      return new PercentageValue(newDisplayPercent);
    }
    
    if (other.getType() === 'percentage') {
      // 20% * 50% = 10% (0.2 * 0.5 = 0.1 = 10%)
      const resultDecimal = this.decimalValue * other.getNumericValue();
      return new PercentageValue(resultDecimal * 100);
    }
    
    if (other.getType() === 'currency' || other.getType() === 'unit') {
      // Let the other type handle this - e.g., $100 * 20% should be handled by CurrencyValue
      return other.multiply(this);
    }
    
    throw this.createIncompatibilityError(other, 'multiply', 'invalid percentage multiplication');
  }

  divide(other: SemanticValue): SemanticValue {
    if (other.getNumericValue() === 0) {
      throw new Error('Division by zero');
    }
    
    if (other.getType() === 'number') {
      // 60% / 3 = 20%
      const newDisplayPercent = this.displayPercentage / other.getNumericValue();
      return new PercentageValue(newDisplayPercent);
    }
    
    if (other.getType() === 'percentage') {
      // 60% / 20% = 3 (dimensionless ratio)
      const result = this.decimalValue / other.getNumericValue();
      return new NumberValue(result);
    }
    
    throw this.createIncompatibilityError(other, 'divide', 'invalid percentage division');
  }

  power(exponent: number): SemanticValue {
    if (!isFinite(exponent)) {
      throw new Error(`Invalid exponent: ${exponent}`);
    }
    
    // (20%)^2 = (0.2)^2 = 0.04 = 4%
    const resultDecimal = Math.pow(this.decimalValue, exponent);
    const resultDisplayPercent = resultDecimal * 100;
    
    if (!isFinite(resultDisplayPercent)) {
      throw new Error(`Power operation resulted in invalid percentage: ${this.displayPercentage}%^${exponent}`);
    }
    
    return new PercentageValue(resultDisplayPercent);
  }

  clone(): PercentageValue {
    return new PercentageValue(this.displayPercentage, this.context);
  }

  /**
   * Apply this percentage to a base value (percentage "of" operation)
   * This is the core semantic operation that resolves the ambiguity
   */
  of(baseValue: SemanticValue): SemanticValue {
    if (baseValue.getType() === 'number') {
      // 20% of 100 = 20
      const result = baseValue.getNumericValue() * this.decimalValue;
      return new NumberValue(result);
    }
    
    if (baseValue.getType() === 'currency') {
      // 20% of $100 = $20 - let currency handle this
      return baseValue.multiply(this);
    }
    
    if (baseValue.getType() === 'unit') {
      // 20% of 50m = 10m - let unit handle this  
      return baseValue.multiply(this);
    }
    
    throw this.createIncompatibilityError(baseValue, 'of', 'cannot apply percentage to this type');
  }

  /**
   * Apply this percentage as an increase to a base value (percentage "on" operation)
   * Example: 20% on $100 = $120
   */
  on(baseValue: SemanticValue): SemanticValue {
    if (baseValue.getType() === 'number') {
      // 20% on 100 = 100 + (20% of 100) = 120
      const increase = baseValue.getNumericValue() * this.decimalValue;
      return new NumberValue(baseValue.getNumericValue() + increase);
    }
    
    if (baseValue.getType() === 'currency' || baseValue.getType() === 'unit') {
      // Let the base value handle the addition
      const increase = baseValue.multiply(this);
      return baseValue.add(increase);
    }
    
    throw this.createIncompatibilityError(baseValue, 'on', 'cannot apply percentage increase to this type');
  }

  /**
   * Apply this percentage as a decrease to a base value (percentage "off" operation)
   * Example: 20% off $100 = $80
   */
  off(baseValue: SemanticValue): SemanticValue {
    if (baseValue.getType() === 'number') {
      // 20% off 100 = 100 - (20% of 100) = 80
      const decrease = baseValue.getNumericValue() * this.decimalValue;
      return new NumberValue(baseValue.getNumericValue() - decrease);
    }
    
    if (baseValue.getType() === 'currency' || baseValue.getType() === 'unit') {
      // Let the base value handle the subtraction
      const decrease = baseValue.multiply(this);
      return baseValue.subtract(decrease);
    }
    
    throw this.createIncompatibilityError(baseValue, 'off', 'cannot apply percentage decrease to this type');
  }

  /**
   * Convert this percentage to a decimal number
   */
  toDecimal(): NumberValue {
    return new NumberValue(this.decimalValue);
  }

  /**
   * Convert a decimal to a percentage
   */
  static fromDecimal(decimal: number): PercentageValue {
    return new PercentageValue(decimal * 100);
  }

  /**
   * Create percentage from display string "20%"
   */
  static fromString(str: string): PercentageValue {
    const match = str.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
    if (!match) {
      throw new Error(`Invalid percentage format: "${str}"`);
    }
    
    const displayPercent = parseFloat(match[1]);
    return new PercentageValue(displayPercent);
  }

  /**
   * Create percentage with specific context
   */
  static withContext(displayPercentage: number, context: PercentageContext): PercentageValue {
    return new PercentageValue(displayPercentage, context);
  }

  /**
   * Calculate what percentage one value is of another
   * Example: PercentageValue.whatPercentOf(20, 100) = 20%
   */
  static whatPercentOf(part: SemanticValue, whole: SemanticValue): PercentageValue {
    if (whole.getNumericValue() === 0) {
      throw new Error('Cannot calculate percentage of zero');
    }
    
    const ratio = part.getNumericValue() / whole.getNumericValue();
    return new PercentageValue(ratio * 100);
  }

  getMetadata(): Record<string, any> {
    return {
      ...super.getMetadata(),
      displayPercentage: this.displayPercentage,
      decimalValue: this.decimalValue,
      context: this.context
    };
  }
}