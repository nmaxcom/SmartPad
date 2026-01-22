/**
 * @file CurrencyUnitValue - Currency values combined with units
 * @description Represents values like $/m^2 or $*m^2 while preserving currency formatting.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from './SemanticValue';
import { CurrencyValue, CurrencySymbol } from './CurrencyValue';
import { UnitValue } from './UnitValue';
import { NumberValue } from './NumberValue';
import { PercentageValue } from './PercentageValue';
import { SmartPadQuantity } from '../units/unitsnetAdapter';

export class CurrencyUnitValue extends SemanticValue {
  private readonly symbol: CurrencySymbol;
  private readonly amount: number;
  private readonly unitString: string;
  private readonly perUnit: boolean;

  constructor(symbol: CurrencySymbol, amount: number, unitString: string, perUnit: boolean) {
    super();
    this.symbol = symbol;
    this.amount = amount;
    this.unitString = unitString;
    this.perUnit = perUnit;
  }

  static fromCurrencyAndUnit(currency: CurrencyValue, unit: UnitValue, perUnit: boolean): CurrencyUnitValue {
    const unitValue = unit.getNumericValue();
    const amount = perUnit
      ? currency.getNumericValue() / unitValue
      : currency.getNumericValue() * unitValue;
    return new CurrencyUnitValue(currency.getSymbol(), amount, unit.getUnit(), perUnit);
  }

  getType(): SemanticValueType {
    return 'currencyUnit';
  }

  getNumericValue(): number {
    return this.amount;
  }

  isNumeric(): boolean {
    return true;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === 'currencyUnit' || targetType === 'currency' || targetType === 'number';
  }

  toString(options?: DisplayOptions): string {
    const formattedAmount = new CurrencyValue(this.symbol, this.amount).toString(options);
    const joiner = this.perUnit ? '/' : '*';
    return `${formattedAmount}${joiner}${this.unitString}`;
  }

  equals(other: SemanticValue, tolerance = 1e-10): boolean {
    if (other.getType() !== 'currencyUnit') {
      return false;
    }
    const otherValue = other as CurrencyUnitValue;
    return (
      this.symbol === otherValue.symbol &&
      this.perUnit === otherValue.perUnit &&
      this.unitString === otherValue.unitString &&
      Math.abs(this.amount - otherValue.amount) <= tolerance
    );
  }

  add(other: SemanticValue): SemanticValue {
    if (other.getType() !== 'currencyUnit') {
      throw this.createIncompatibilityError(other, 'add', 'incompatible currency-unit types');
    }

    const otherValue = other as CurrencyUnitValue;
    if (
      this.symbol !== otherValue.symbol ||
      this.unitString !== otherValue.unitString ||
      this.perUnit !== otherValue.perUnit
    ) {
      throw this.createIncompatibilityError(other, 'add', 'mismatched currency-unit types');
    }

    return new CurrencyUnitValue(this.symbol, this.amount + otherValue.amount, this.unitString, this.perUnit);
  }

  subtract(other: SemanticValue): SemanticValue {
    if (other.getType() !== 'currencyUnit') {
      throw this.createIncompatibilityError(other, 'subtract', 'incompatible currency-unit types');
    }

    const otherValue = other as CurrencyUnitValue;
    if (
      this.symbol !== otherValue.symbol ||
      this.unitString !== otherValue.unitString ||
      this.perUnit !== otherValue.perUnit
    ) {
      throw this.createIncompatibilityError(other, 'subtract', 'mismatched currency-unit types');
    }

    return new CurrencyUnitValue(this.symbol, this.amount - otherValue.amount, this.unitString, this.perUnit);
  }

  multiply(other: SemanticValue): SemanticValue {
    if (other.getType() === 'number') {
      return new CurrencyUnitValue(this.symbol, this.amount * other.getNumericValue(), this.unitString, this.perUnit);
    }

    if (other.getType() === 'percentage') {
      const percentDecimal = other.getNumericValue();
      return new CurrencyUnitValue(this.symbol, this.amount * percentDecimal, this.unitString, this.perUnit);
    }

    if (other.getType() === 'unit') {
      const unitValue = other as UnitValue;
      if (this.perUnit) {
        const converted = this.convertUnitValue(unitValue, this.unitString);
        if (converted) {
          return new CurrencyValue(this.symbol, this.amount * converted);
        }
        const combined = this.combineUnits(unitValue.getUnit(), this.unitString, '/');
        if (combined === "1") {
          return new CurrencyValue(this.symbol, this.amount * unitValue.getNumericValue());
        }
        if (combined.startsWith("1/")) {
          return new CurrencyUnitValue(
            this.symbol,
            this.amount * unitValue.getNumericValue(),
            combined.slice(2),
            true
          );
        }
        return new CurrencyUnitValue(
          this.symbol,
          this.amount * unitValue.getNumericValue(),
          combined,
          false
        );
      }

      const combined = this.combineUnits(this.unitString, unitValue.getUnit(), '*');
      return new CurrencyUnitValue(this.symbol, this.amount * unitValue.getNumericValue(), combined, false);
    }

    throw this.createIncompatibilityError(other, 'multiply', 'invalid currency-unit multiplication');
  }

  divide(other: SemanticValue): SemanticValue {
    if (other.getNumericValue() === 0) {
      throw new Error('Division by zero');
    }

    if (other.getType() === 'number') {
      return new CurrencyUnitValue(this.symbol, this.amount / other.getNumericValue(), this.unitString, this.perUnit);
    }

    if (other.getType() === 'percentage') {
      const percentDecimal = other.getNumericValue();
      return new CurrencyUnitValue(this.symbol, this.amount / percentDecimal, this.unitString, this.perUnit);
    }

    if (other.getType() === 'unit') {
      const unitValue = other as UnitValue;
      if (!this.perUnit) {
        const converted = this.convertUnitValue(unitValue, this.unitString);
        if (converted) {
          return new CurrencyValue(this.symbol, this.amount / converted);
        }
        const combined = this.combineUnits(this.unitString, unitValue.getUnit(), '/');
        return new CurrencyUnitValue(this.symbol, this.amount / unitValue.getNumericValue(), combined, false);
      }

      const combined = this.combineUnits(this.unitString, unitValue.getUnit(), '*');
      return new CurrencyUnitValue(this.symbol, this.amount / unitValue.getNumericValue(), combined, true);
    }

    throw this.createIncompatibilityError(other, 'divide', 'invalid currency-unit division');
  }

  power(exponent: number): SemanticValue {
    if (!isFinite(exponent)) {
      throw new Error(`Invalid exponent: ${exponent}`);
    }
    if (exponent === 1) {
      return new CurrencyUnitValue(this.symbol, this.amount, this.unitString, this.perUnit);
    }
    return new NumberValue(Math.pow(this.amount, exponent));
  }

  getSymbol(): string {
    return this.symbol;
  }

  getUnit(): string {
    return this.unitString;
  }

  isPerUnit(): boolean {
    return this.perUnit;
  }

  convertTo(targetUnit: string): CurrencyUnitValue {
    try {
      const baseQuantity = SmartPadQuantity.fromValueAndUnit(1, this.unitString);
      const converted = baseQuantity.convertTo(targetUnit);
      const factor = converted.value;
      if (!isFinite(factor) || factor === 0) {
        throw new Error("Invalid unit conversion factor");
      }
      const amount = this.perUnit ? this.amount / factor : this.amount * factor;
      return new CurrencyUnitValue(this.symbol, amount, converted.unit, this.perUnit);
    } catch (error) {
      throw new Error(`Currency-unit conversion failed: ${(error as Error).message}`);
    }
  }

  clone(): CurrencyUnitValue {
    return new CurrencyUnitValue(this.symbol, this.amount, this.unitString, this.perUnit);
  }

  private convertUnitValue(unitValue: UnitValue, targetUnit: string): number | null {
    try {
      const converted = unitValue.getQuantity().convertTo(targetUnit);
      return converted.value;
    } catch {
      return null;
    }
  }

  private combineUnits(left: string, right: string, op: '*' | '/'): string {
    try {
      const leftQuantity = SmartPadQuantity.fromValueAndUnit(1, left);
      const rightQuantity = SmartPadQuantity.fromValueAndUnit(1, right);
      const combined =
        op === '*' ? leftQuantity.multiply(rightQuantity) : leftQuantity.divide(rightQuantity);
      return combined.unit;
    } catch {
      return op === '*' ? `${left}*${right}` : `${left}/${right}`;
    }
  }
}
