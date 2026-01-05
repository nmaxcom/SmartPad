/**
 * @file SemanticValue - Base class for typed values in SmartPad
 * @description This module provides the foundation for SmartPad's semantic type system.
 * Instead of treating all values as generic strings or numbers, SemanticValue and its
 * subclasses provide proper semantic meaning to values like percentages, currencies,
 * units, and plain numbers.
 */

export type SemanticValueType =
  | 'number'
  | 'percentage'
  | 'currency'
  | 'unit'
  | 'currencyUnit'
  | 'date'
  | 'error'
  | 'symbolic';

export interface DisplayOptions {
  precision?: number;
  notation?: 'standard' | 'scientific' | 'engineering';
  scientificUpperThreshold?: number;
  scientificLowerThreshold?: number;
  scientificTrimTrailingZeros?: boolean;
  dateFormat?: 'iso' | 'locale';
  dateLocale?: string;
  preferBaseUnit?: boolean;
  showType?: boolean;
}

/**
 * Abstract base class for all semantic values in SmartPad.
 * Provides common operations and type-safe arithmetic with proper error handling.
 */
export abstract class SemanticValue {
  /**
   * Get the semantic type of this value
   */
  abstract getType(): SemanticValueType;

  /**
   * Get the raw numeric value for calculations
   * For dimensionless numbers, this is the value itself
   * For percentages, this is the decimal form (0.2 for 20%)
   * For currencies, this is the numeric amount
   * For units, this is the base unit value
   */
  abstract getNumericValue(): number;

  /**
   * Check if this value represents a numeric quantity that can be used in arithmetic
   */
  abstract isNumeric(): boolean;

  /**
   * Check if this value can be converted to another semantic type
   */
  abstract canConvertTo(targetType: SemanticValueType): boolean;

  /**
   * Get display string for this value with formatting options
   */
  abstract toString(options?: DisplayOptions): string;

  /**
   * Get a user-friendly display string (used in UI)
   */
  toDisplayString(options?: DisplayOptions): string {
    return this.toString(options);
  }

  /**
   * Check equality with another semantic value
   */
  abstract equals(other: SemanticValue, tolerance?: number): boolean;

  /**
   * Add another semantic value to this one
   * Throws error if types are incompatible
   */
  abstract add(other: SemanticValue): SemanticValue;

  /**
   * Subtract another semantic value from this one
   * Throws error if types are incompatible
   */
  abstract subtract(other: SemanticValue): SemanticValue;

  /**
   * Multiply this semantic value by another
   * Type conversion rules apply (e.g., number * percentage = number)
   */
  abstract multiply(other: SemanticValue): SemanticValue;

  /**
   * Divide this semantic value by another
   * Type conversion rules apply
   */
  abstract divide(other: SemanticValue): SemanticValue;

  /**
   * Raise this semantic value to a power
   * Exponent must be dimensionless
   */
  abstract power(exponent: number): SemanticValue;

  /**
   * Create a copy of this semantic value
   */
  abstract clone(): SemanticValue;

  /**
   * Get metadata about this semantic value for debugging/introspection
   */
  getMetadata(): Record<string, any> {
    return {
      type: this.getType(),
      numericValue: this.getNumericValue(),
      isNumeric: this.isNumeric(),
      displayString: this.toString()
    };
  }

  /**
   * Validate that another value is compatible for arithmetic operations
   * Throws detailed error if incompatible
   */
  protected validateCompatibility(other: SemanticValue, operation: string): void {
    if (!other.isNumeric() && !this.isNumeric()) {
      throw new Error(
        `Cannot ${operation} non-numeric values: ${this.getType()} ${operation} ${other.getType()}`
      );
    }
  }

  /**
   * Create a type-aware error message for incompatible operations
   */
  protected createIncompatibilityError(other: SemanticValue, operation: string, reason?: string): Error {
    const baseMessage = `Cannot ${operation} ${this.getType()} and ${other.getType()}`;
    const fullMessage = reason ? `${baseMessage}: ${reason}` : baseMessage;
    
    // Include helpful context
    const context = `\n  Left operand: ${this.toString()} (${this.getType()})\n  Right operand: ${other.toString()} (${other.getType()})`;
    
    return new Error(fullMessage + context);
  }

  /**
   * Helper method to format numbers consistently across all semantic values
   */
  protected formatNumber(value: number, precision = 6, options?: DisplayOptions): string {
    if (!isFinite(value)) return "Infinity";
    if (value === 0) return "0";
    
    // Handle very large or very small numbers with scientific notation
    const abs = Math.abs(value);
    const upperThreshold = options?.scientificUpperThreshold ?? 1e12;
    const lowerThreshold = options?.scientificLowerThreshold ?? 1e-4;
    const formatScientific = (num: number, fracDigits: number) => {
      const s = num.toExponential(Math.max(0, fracDigits));
      const [mantissa, exp] = s.split("e");
      const shouldTrim = options?.scientificTrimTrailingZeros ?? true;
      const outputMantissa = shouldTrim
        ? mantissa.replace(/(?:\.0+|(\.\d+?)0+)$/, "$1")
        : mantissa;
      return `${outputMantissa}e${exp}`;
    };
    if (
      abs >= upperThreshold ||
      (abs > 0 && lowerThreshold > 0 && abs < lowerThreshold)
    ) {
      return formatScientific(value, precision);
    }
    
    // For regular numbers, remove trailing zeros
    if (Number.isInteger(value)) {
      return value.toString();
    }

    const fixed = value.toFixed(precision);
    const fixedNumber = parseFloat(fixed);
    if (fixedNumber === 0) {
      return formatScientific(value, precision);
    }

    return fixedNumber.toString();
  }

  /**
   * Type guard to check if a value is a SemanticValue
   */
  static isSemanticValue(value: any): value is SemanticValue {
    return value && typeof value === 'object' && typeof value.getType === 'function';
  }

  /**
   * Helper to safely get numeric value from any value
   */
  static getNumericValue(value: SemanticValue | number): number {
    if (typeof value === 'number') {
      return value;
    }
    if (SemanticValue.isSemanticValue(value)) {
      return value.getNumericValue();
    }
    throw new Error(`Cannot get numeric value from: ${typeof value}`);
  }
}
