/**
 * @file UnitValue - Physical units wrapping SmartPadQuantity
 * @description Integrates SmartPad's existing units system with the new semantic
 * type system. Wraps SmartPadQuantity to provide consistent SemanticValue interface
 * while preserving all existing unit functionality and UnitsNet integration.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from './SemanticValue';
import { NumberValue } from './NumberValue';
import { PercentageValue } from './PercentageValue';
import { DurationValue } from './DurationValue';
import { SmartPadQuantity } from '../units/unitsnetAdapter';

/**
 * Represents a physical quantity with units
 * Wraps the existing SmartPadQuantity to integrate with semantic type system
 * 
 * Examples:
 * - "50 m" -> UnitValue(SmartPadQuantity(50, "m"))
 * - "100 kg" -> UnitValue(SmartPadQuantity(100, "kg"))  
 * - "25 mph" -> UnitValue(SmartPadQuantity(25, "mph"))
 */
export class UnitValue extends SemanticValue {
  private readonly quantity: SmartPadQuantity;
  private readonly forceUnitDisplay: boolean;

  constructor(quantity: SmartPadQuantity, options?: { forceUnitDisplay?: boolean }) {
    super();
    
    if (!quantity) {
      throw new Error('Quantity cannot be null or undefined');
    }
    
    this.quantity = quantity;
    this.forceUnitDisplay = options?.forceUnitDisplay ?? false;
  }

  getType(): SemanticValueType {
    return 'unit';
  }

  getNumericValue(): number {
    return this.quantity.value;
  }

  /**
   * Get the underlying SmartPadQuantity
   */
  getQuantity(): SmartPadQuantity {
    return this.quantity;
  }

  /**
   * Get the unit string
   */
  getUnit(): string {
    return this.quantity.unit;
  }

  isNumeric(): boolean {
    return true;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    // Units can be converted to numbers (losing unit meaning) or to other compatible units
    return targetType === 'unit' || targetType === 'number';
  }

  toString(options?: DisplayOptions): string {
    const precision = options?.precision ?? 6;
    
    // Use SmartPadQuantity's built-in formatting which handles units intelligently
    const quantityString = this.quantity.toString(precision, {
      ...options,
      forceUnit: options?.forceUnit ?? this.forceUnitDisplay,
    });
    
    if (options?.showType) {
      return `${quantityString} (unit)`;
    }
    
    return quantityString;
  }

  equals(other: SemanticValue, tolerance = 1e-10): boolean {
    if (other.getType() !== 'unit') {
      return false;
    }
    
    const otherUnit = other as UnitValue;
    
    // Use SmartPadQuantity's built-in equality check which handles unit conversion
    return this.quantity.equals(otherUnit.quantity, tolerance);
  }

  add(other: SemanticValue): SemanticValue {
    if (other.getType() === 'unit') {
      const otherUnit = other as UnitValue;
      
      try {
        // Use SmartPadQuantity's add method which handles unit conversion
        const result = this.quantity.add(otherUnit.quantity);
        return new UnitValue(result);
      } catch (error) {
        throw this.createIncompatibilityError(other, 'add', (error as Error).message);
      }
    }
    
    if (other.getType() === 'number') {
      // Adding a dimensionless number to a unit quantity
      if (other.getNumericValue() === 0) {
        // 50 m + 0 = 50 m (zero is special case)
        return this.clone();
      }
      
      // For non-zero numbers, this is typically not physically meaningful
      throw this.createIncompatibilityError(other, 'add', 'cannot add dimensionless number to physical quantity');
    }
    
    if (other.getType() === 'percentage') {
      // 50 m + 20% = 60 m (percentage increase)
      const percentValue = other as PercentageValue;
      return percentValue.on(this);
    }
    
    throw this.createIncompatibilityError(other, 'add', 'incompatible types for unit addition');
  }

  subtract(other: SemanticValue): SemanticValue {
    if (other.getType() === 'unit') {
      const otherUnit = other as UnitValue;
      
      try {
        // Use SmartPadQuantity's subtract method which handles unit conversion
        const result = this.quantity.subtract(otherUnit.quantity);
        return new UnitValue(result);
      } catch (error) {
        throw this.createIncompatibilityError(other, 'subtract', (error as Error).message);
      }
    }
    
    if (other.getType() === 'number') {
      // Subtracting a dimensionless number from a unit quantity
      if (other.getNumericValue() === 0) {
        // 50 m - 0 = 50 m (zero is special case)
        return this.clone();
      }
      
      // For non-zero numbers, this is typically not physically meaningful
      throw this.createIncompatibilityError(other, 'subtract', 'cannot subtract dimensionless number from physical quantity');
    }
    
    if (other.getType() === 'percentage') {
      // 50 m - 20% = 40 m (percentage decrease)
      const percentValue = other as PercentageValue;
      return percentValue.off(this);
    }
    
    throw this.createIncompatibilityError(other, 'subtract', 'incompatible types for unit subtraction');
  }

  multiply(other: SemanticValue): SemanticValue {
    if (other.getType() === 'unit') {
      const otherUnit = other as UnitValue;
      
      try {
        // Use SmartPadQuantity's multiply method which handles derived units
        const result = this.quantity.multiply(otherUnit.quantity);
        if (result.isDimensionless()) {
          return new NumberValue(result.value);
        }
        return new UnitValue(result);
      } catch (error) {
        throw this.createIncompatibilityError(other, 'multiply', (error as Error).message);
      }
    }
    
    if (other.getType() === 'number') {
      // 50 m * 3 = 150 m
      const result = this.quantity.multiply(SmartPadQuantity.dimensionless(other.getNumericValue()));
      return new UnitValue(result);
    }
    
    if (other.getType() === 'percentage') {
      // 50 m * 20% = 10 m (percentage of quantity)
      const percentDecimal = other.getNumericValue();
      const result = this.quantity.multiply(SmartPadQuantity.dimensionless(percentDecimal));
      return new UnitValue(result);
    }

    if (other.getType() === 'currency' || other.getType() === 'currencyUnit') {
      // Let currency types handle unit multiplication
      return other.multiply(this);
    }
    
    throw this.createIncompatibilityError(other, 'multiply', 'invalid unit multiplication');
  }

  divide(other: SemanticValue): SemanticValue {
    if (other.getNumericValue() === 0) {
      throw new Error('Division by zero');
    }
    
    if (other.getType() === 'unit') {
      const otherUnit = other as UnitValue;
      
      try {
        // Use SmartPadQuantity's divide method which handles derived units
        const result = this.quantity.divide(otherUnit.quantity);
        
        // If result is dimensionless, return NumberValue
        if (result.isDimensionless()) {
          return new NumberValue(result.value);
        }
        
        return new UnitValue(result);
      } catch (error) {
        throw this.createIncompatibilityError(other, 'divide', (error as Error).message);
      }
    }
    
    if (other.getType() === 'duration') {
      const otherDuration = other as DurationValue;
      
      try {
        const durationQuantity = SmartPadQuantity.fromValueAndUnit(
          otherDuration.getTotalSeconds(),
          's'
        );
        const result = this.quantity.divide(durationQuantity);
        
        if (result.isDimensionless()) {
          return new NumberValue(result.value);
        }
        
        return new UnitValue(result);
      } catch (error) {
        throw this.createIncompatibilityError(other, 'divide', (error as Error).message);
      }
    }
    
    if (other.getType() === 'number') {
      // 150 m / 3 = 50 m
      const result = this.quantity.divide(SmartPadQuantity.dimensionless(other.getNumericValue()));
      return new UnitValue(result);
    }
    
    if (other.getType() === 'percentage') {
      // 50 m / 20% = 250 m
      const percentDecimal = other.getNumericValue();
      const result = this.quantity.divide(SmartPadQuantity.dimensionless(percentDecimal));
      return new UnitValue(result);
    }
    
    throw this.createIncompatibilityError(other, 'divide', 'invalid unit division');
  }

  power(exponent: number): SemanticValue {
    if (!isFinite(exponent)) {
      throw new Error(`Invalid exponent: ${exponent}`);
    }
    
    try {
      // Use SmartPadQuantity's power method which handles unit exponents
      const result = this.quantity.power(exponent);
      
      // If result becomes dimensionless, return NumberValue
      if (result.isDimensionless()) {
        return new NumberValue(result.value);
      }
      
      return new UnitValue(result);
    } catch (error) {
      throw new Error(`Power operation failed: ${(error as Error).message}`);
    }
  }

  clone(): UnitValue {
    return new UnitValue(this.quantity.clone(), { forceUnitDisplay: this.forceUnitDisplay });
  }

  /**
   * Convert to a different unit
   */
  convertTo(targetUnit: string): UnitValue {
    try {
      const converted = this.quantity.convertTo(targetUnit);
      return new UnitValue(converted, { forceUnitDisplay: this.forceUnitDisplay });
    } catch (error) {
      throw new Error(`Unit conversion failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get the best display unit (using SmartPadQuantity's smart selection)
   */
  getBestDisplayUnit(): UnitValue {
    const bestQuantity = this.quantity.getBestDisplayUnit();
    return new UnitValue(bestQuantity);
  }

  /**
   * Check if this is a dimensionless quantity
   */
  isDimensionless(): boolean {
    return this.quantity.isDimensionless();
  }

  /**
   * Convert to plain number (losing unit meaning)
   */
  toNumber(): NumberValue {
    return new NumberValue(this.quantity.value);
  }

  /**
   * Create UnitValue from value and unit string
   */
  static fromValueAndUnit(
    value: number,
    unit: string,
    options?: { forceUnitDisplay?: boolean }
  ): UnitValue {
    const quantity = SmartPadQuantity.fromValueAndUnit(value, unit);
    return new UnitValue(quantity, options);
  }

  /**
   * Create UnitValue from SmartPadQuantity
   */
  static fromQuantity(quantity: SmartPadQuantity): UnitValue {
    return new UnitValue(quantity);
  }

  /**
   * Create dimensionless UnitValue (will be converted to NumberValue in most operations)
   */
  static dimensionless(value: number): UnitValue {
    const quantity = SmartPadQuantity.dimensionless(value);
    return new UnitValue(quantity);
  }

  private static parseValueAndUnit(str: string): { value: number; unit: string } | null {
    if (!str) return null;

    const trimmed = str.trim();
    if (!trimmed) return null;

    const match = trimmed.match(
      /^([+-]?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?)(.*)$/
    );
    if (!match) return null;

    const value = parseFloat(match[1].replace(/,/g, ""));
    const unit = match[2].trim();

    if (!unit) return null;
    if (!/[a-zA-Z°µμΩ]/.test(unit)) return null;

    return { value, unit };
  }

  /**
   * Parse unit string like "50 m" or "100 kg"
   */
  static fromString(str: string): UnitValue {
    const parsed = UnitValue.parseValueAndUnit(str);
    if (!parsed) {
      throw new Error(`Invalid unit format: "${str}"`);
    }

    try {
      return UnitValue.fromValueAndUnit(parsed.value, parsed.unit);
    } catch (error) {
      throw new Error(`Cannot create unit value: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a string looks like a unit expression
   */
  static isUnitString(str: string): boolean {
    const parsed = UnitValue.parseValueAndUnit(str);
    if (!parsed) {
      return false;
    }

    try {
      SmartPadQuantity.fromValueAndUnit(1, parsed.unit);
      return true;
    } catch {
      return false;
    }
  }

  getMetadata(): Record<string, any> {
    return {
      ...super.getMetadata(),
      unit: this.quantity.unit,
      value: this.quantity.value,
      isDimensionless: this.quantity.isDimensionless(),
      unitsnetType: this.quantity.unitsnetValue?.constructor.name
    };
  }
}
