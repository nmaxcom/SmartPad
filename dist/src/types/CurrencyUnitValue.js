"use strict";
/**
 * @file CurrencyUnitValue - Currency values combined with units
 * @description Represents values like $/m^2 or $*m^2 while preserving currency formatting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyUnitValue = void 0;
const SemanticValue_1 = require("./SemanticValue");
const CurrencyValue_1 = require("./CurrencyValue");
const NumberValue_1 = require("./NumberValue");
const unitsnetAdapter_1 = require("../units/unitsnetAdapter");
class CurrencyUnitValue extends SemanticValue_1.SemanticValue {
    symbol;
    amount;
    unitString;
    perUnit;
    constructor(symbol, amount, unitString, perUnit) {
        super();
        this.symbol = symbol;
        this.amount = amount;
        this.unitString = unitString;
        this.perUnit = perUnit;
    }
    static fromCurrencyAndUnit(currency, unit, perUnit) {
        const unitValue = unit.getNumericValue();
        const amount = perUnit
            ? currency.getNumericValue() / unitValue
            : currency.getNumericValue() * unitValue;
        return new CurrencyUnitValue(currency.getSymbol(), amount, unit.getUnit(), perUnit);
    }
    getType() {
        return 'currencyUnit';
    }
    getNumericValue() {
        return this.amount;
    }
    isNumeric() {
        return true;
    }
    canConvertTo(targetType) {
        return targetType === 'currencyUnit' || targetType === 'currency' || targetType === 'number';
    }
    toString(options) {
        const formattedAmount = new CurrencyValue_1.CurrencyValue(this.symbol, this.amount).toString(options);
        const joiner = this.perUnit ? '/' : '*';
        return `${formattedAmount}${joiner}${this.unitString}`;
    }
    equals(other, tolerance = 1e-10) {
        if (other.getType() !== 'currencyUnit') {
            return false;
        }
        const otherValue = other;
        return (this.symbol === otherValue.symbol &&
            this.perUnit === otherValue.perUnit &&
            this.unitString === otherValue.unitString &&
            Math.abs(this.amount - otherValue.amount) <= tolerance);
    }
    add(other) {
        if (other.getType() !== 'currencyUnit') {
            throw this.createIncompatibilityError(other, 'add', 'incompatible currency-unit types');
        }
        const otherValue = other;
        if (this.symbol !== otherValue.symbol ||
            this.unitString !== otherValue.unitString ||
            this.perUnit !== otherValue.perUnit) {
            throw this.createIncompatibilityError(other, 'add', 'mismatched currency-unit types');
        }
        return new CurrencyUnitValue(this.symbol, this.amount + otherValue.amount, this.unitString, this.perUnit);
    }
    subtract(other) {
        if (other.getType() !== 'currencyUnit') {
            throw this.createIncompatibilityError(other, 'subtract', 'incompatible currency-unit types');
        }
        const otherValue = other;
        if (this.symbol !== otherValue.symbol ||
            this.unitString !== otherValue.unitString ||
            this.perUnit !== otherValue.perUnit) {
            throw this.createIncompatibilityError(other, 'subtract', 'mismatched currency-unit types');
        }
        return new CurrencyUnitValue(this.symbol, this.amount - otherValue.amount, this.unitString, this.perUnit);
    }
    multiply(other) {
        if (other.getType() === 'number') {
            return new CurrencyUnitValue(this.symbol, this.amount * other.getNumericValue(), this.unitString, this.perUnit);
        }
        if (other.getType() === 'percentage') {
            const percentDecimal = other.getNumericValue();
            return new CurrencyUnitValue(this.symbol, this.amount * percentDecimal, this.unitString, this.perUnit);
        }
        if (other.getType() === 'unit') {
            const unitValue = other;
            if (this.perUnit) {
                const converted = this.convertUnitValue(unitValue, this.unitString);
                if (converted) {
                    return new CurrencyValue_1.CurrencyValue(this.symbol, this.amount * converted);
                }
                const combined = this.combineUnits(unitValue.getUnit(), this.unitString, '/');
                return new CurrencyUnitValue(this.symbol, this.amount * unitValue.getNumericValue(), combined, false);
            }
            const combined = this.combineUnits(this.unitString, unitValue.getUnit(), '*');
            return new CurrencyUnitValue(this.symbol, this.amount * unitValue.getNumericValue(), combined, false);
        }
        throw this.createIncompatibilityError(other, 'multiply', 'invalid currency-unit multiplication');
    }
    divide(other) {
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
            const unitValue = other;
            if (!this.perUnit) {
                const converted = this.convertUnitValue(unitValue, this.unitString);
                if (converted) {
                    return new CurrencyValue_1.CurrencyValue(this.symbol, this.amount / converted);
                }
                const combined = this.combineUnits(this.unitString, unitValue.getUnit(), '/');
                return new CurrencyUnitValue(this.symbol, this.amount / unitValue.getNumericValue(), combined, false);
            }
            const combined = this.combineUnits(this.unitString, unitValue.getUnit(), '*');
            return new CurrencyUnitValue(this.symbol, this.amount / unitValue.getNumericValue(), combined, true);
        }
        throw this.createIncompatibilityError(other, 'divide', 'invalid currency-unit division');
    }
    power(exponent) {
        if (!isFinite(exponent)) {
            throw new Error(`Invalid exponent: ${exponent}`);
        }
        if (exponent === 1) {
            return new CurrencyUnitValue(this.symbol, this.amount, this.unitString, this.perUnit);
        }
        return new NumberValue_1.NumberValue(Math.pow(this.amount, exponent));
    }
    getSymbol() {
        return this.symbol;
    }
    getUnit() {
        return this.unitString;
    }
    isPerUnit() {
        return this.perUnit;
    }
    convertTo(targetUnit) {
        try {
            const baseQuantity = unitsnetAdapter_1.SmartPadQuantity.fromValueAndUnit(1, this.unitString);
            const converted = baseQuantity.convertTo(targetUnit);
            const factor = converted.value;
            if (!isFinite(factor) || factor === 0) {
                throw new Error("Invalid unit conversion factor");
            }
            const amount = this.perUnit ? this.amount / factor : this.amount * factor;
            return new CurrencyUnitValue(this.symbol, amount, converted.unit, this.perUnit);
        }
        catch (error) {
            throw new Error(`Currency-unit conversion failed: ${error.message}`);
        }
    }
    clone() {
        return new CurrencyUnitValue(this.symbol, this.amount, this.unitString, this.perUnit);
    }
    convertUnitValue(unitValue, targetUnit) {
        try {
            const converted = unitValue.getQuantity().convertTo(targetUnit);
            return converted.value;
        }
        catch {
            return null;
        }
    }
    combineUnits(left, right, op) {
        try {
            const leftQuantity = unitsnetAdapter_1.SmartPadQuantity.fromValueAndUnit(1, left);
            const rightQuantity = unitsnetAdapter_1.SmartPadQuantity.fromValueAndUnit(1, right);
            const combined = op === '*' ? leftQuantity.multiply(rightQuantity) : leftQuantity.divide(rightQuantity);
            return combined.unit;
        }
        catch {
            return op === '*' ? `${left}*${right}` : `${left}/${right}`;
        }
    }
}
exports.CurrencyUnitValue = CurrencyUnitValue;
