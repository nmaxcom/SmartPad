"use strict";
/**
 * @file UnitValue - Physical units wrapping SmartPadQuantity
 * @description Integrates SmartPad's existing units system with the new semantic
 * type system. Wraps SmartPadQuantity to provide consistent SemanticValue interface
 * while preserving all existing unit functionality and UnitsNet integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitValue = void 0;
const SemanticValue_1 = require("./SemanticValue");
const NumberValue_1 = require("./NumberValue");
const unitsnetAdapter_1 = require("../units/unitsnetAdapter");
/**
 * Represents a physical quantity with units
 * Wraps the existing SmartPadQuantity to integrate with semantic type system
 *
 * Examples:
 * - "50 m" -> UnitValue(SmartPadQuantity(50, "m"))
 * - "100 kg" -> UnitValue(SmartPadQuantity(100, "kg"))
 * - "25 mph" -> UnitValue(SmartPadQuantity(25, "mph"))
 */
class UnitValue extends SemanticValue_1.SemanticValue {
    quantity;
    constructor(quantity) {
        super();
        if (!quantity) {
            throw new Error('Quantity cannot be null or undefined');
        }
        this.quantity = quantity;
    }
    getType() {
        return 'unit';
    }
    getNumericValue() {
        return this.quantity.value;
    }
    /**
     * Get the underlying SmartPadQuantity
     */
    getQuantity() {
        return this.quantity;
    }
    /**
     * Get the unit string
     */
    getUnit() {
        return this.quantity.unit;
    }
    isNumeric() {
        return true;
    }
    canConvertTo(targetType) {
        // Units can be converted to numbers (losing unit meaning) or to other compatible units
        return targetType === 'unit' || targetType === 'number';
    }
    toString(options) {
        const precision = options?.precision ?? 6;
        // Use SmartPadQuantity's built-in formatting which handles units intelligently
        const quantityString = this.quantity.toString(precision, options);
        if (options?.showType) {
            return `${quantityString} (unit)`;
        }
        return quantityString;
    }
    equals(other, tolerance = 1e-10) {
        if (other.getType() !== 'unit') {
            return false;
        }
        const otherUnit = other;
        // Use SmartPadQuantity's built-in equality check which handles unit conversion
        return this.quantity.equals(otherUnit.quantity, tolerance);
    }
    add(other) {
        if (other.getType() === 'unit') {
            const otherUnit = other;
            try {
                // Use SmartPadQuantity's add method which handles unit conversion
                const result = this.quantity.add(otherUnit.quantity);
                return new UnitValue(result);
            }
            catch (error) {
                throw this.createIncompatibilityError(other, 'add', error.message);
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
            const percentValue = other;
            return percentValue.on(this);
        }
        throw this.createIncompatibilityError(other, 'add', 'incompatible types for unit addition');
    }
    subtract(other) {
        if (other.getType() === 'unit') {
            const otherUnit = other;
            try {
                // Use SmartPadQuantity's subtract method which handles unit conversion
                const result = this.quantity.subtract(otherUnit.quantity);
                return new UnitValue(result);
            }
            catch (error) {
                throw this.createIncompatibilityError(other, 'subtract', error.message);
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
            const percentValue = other;
            return percentValue.off(this);
        }
        throw this.createIncompatibilityError(other, 'subtract', 'incompatible types for unit subtraction');
    }
    multiply(other) {
        if (other.getType() === 'unit') {
            const otherUnit = other;
            try {
                // Use SmartPadQuantity's multiply method which handles derived units
                const result = this.quantity.multiply(otherUnit.quantity);
                if (result.isDimensionless()) {
                    return new NumberValue_1.NumberValue(result.value);
                }
                return new UnitValue(result);
            }
            catch (error) {
                throw this.createIncompatibilityError(other, 'multiply', error.message);
            }
        }
        if (other.getType() === 'number') {
            // 50 m * 3 = 150 m
            const result = this.quantity.multiply(unitsnetAdapter_1.SmartPadQuantity.dimensionless(other.getNumericValue()));
            return new UnitValue(result);
        }
        if (other.getType() === 'percentage') {
            // 50 m * 20% = 10 m (percentage of quantity)
            const percentDecimal = other.getNumericValue();
            const result = this.quantity.multiply(unitsnetAdapter_1.SmartPadQuantity.dimensionless(percentDecimal));
            return new UnitValue(result);
        }
        if (other.getType() === 'currency' || other.getType() === 'currencyUnit') {
            // Let currency types handle unit multiplication
            return other.multiply(this);
        }
        throw this.createIncompatibilityError(other, 'multiply', 'invalid unit multiplication');
    }
    divide(other) {
        if (other.getNumericValue() === 0) {
            throw new Error('Division by zero');
        }
        if (other.getType() === 'unit') {
            const otherUnit = other;
            try {
                // Use SmartPadQuantity's divide method which handles derived units
                const result = this.quantity.divide(otherUnit.quantity);
                // If result is dimensionless, return NumberValue
                if (result.isDimensionless()) {
                    return new NumberValue_1.NumberValue(result.value);
                }
                return new UnitValue(result);
            }
            catch (error) {
                throw this.createIncompatibilityError(other, 'divide', error.message);
            }
        }
        if (other.getType() === 'number') {
            // 150 m / 3 = 50 m
            const result = this.quantity.divide(unitsnetAdapter_1.SmartPadQuantity.dimensionless(other.getNumericValue()));
            return new UnitValue(result);
        }
        if (other.getType() === 'percentage') {
            // 50 m / 20% = 250 m
            const percentDecimal = other.getNumericValue();
            const result = this.quantity.divide(unitsnetAdapter_1.SmartPadQuantity.dimensionless(percentDecimal));
            return new UnitValue(result);
        }
        throw this.createIncompatibilityError(other, 'divide', 'invalid unit division');
    }
    power(exponent) {
        if (!isFinite(exponent)) {
            throw new Error(`Invalid exponent: ${exponent}`);
        }
        try {
            // Use SmartPadQuantity's power method which handles unit exponents
            const result = this.quantity.power(exponent);
            // If result becomes dimensionless, return NumberValue
            if (result.isDimensionless()) {
                return new NumberValue_1.NumberValue(result.value);
            }
            return new UnitValue(result);
        }
        catch (error) {
            throw new Error(`Power operation failed: ${error.message}`);
        }
    }
    clone() {
        return new UnitValue(this.quantity.clone());
    }
    /**
     * Convert to a different unit
     */
    convertTo(targetUnit) {
        try {
            const converted = this.quantity.convertTo(targetUnit);
            return new UnitValue(converted);
        }
        catch (error) {
            throw new Error(`Unit conversion failed: ${error.message}`);
        }
    }
    /**
     * Get the best display unit (using SmartPadQuantity's smart selection)
     */
    getBestDisplayUnit() {
        const bestQuantity = this.quantity.getBestDisplayUnit();
        return new UnitValue(bestQuantity);
    }
    /**
     * Check if this is a dimensionless quantity
     */
    isDimensionless() {
        return this.quantity.isDimensionless();
    }
    /**
     * Convert to plain number (losing unit meaning)
     */
    toNumber() {
        return new NumberValue_1.NumberValue(this.quantity.value);
    }
    /**
     * Create UnitValue from value and unit string
     */
    static fromValueAndUnit(value, unit) {
        const quantity = unitsnetAdapter_1.SmartPadQuantity.fromValueAndUnit(value, unit);
        return new UnitValue(quantity);
    }
    /**
     * Create UnitValue from SmartPadQuantity
     */
    static fromQuantity(quantity) {
        return new UnitValue(quantity);
    }
    /**
     * Create dimensionless UnitValue (will be converted to NumberValue in most operations)
     */
    static dimensionless(value) {
        const quantity = unitsnetAdapter_1.SmartPadQuantity.dimensionless(value);
        return new UnitValue(quantity);
    }
    /**
     * Parse unit string like "50 m" or "100 kg"
     */
    static fromString(str) {
        // Match patterns like "50 m", "100.5 kg", "25 mph"
        const match = str.match(/^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*([a-zA-Z°]+(?:\/[a-zA-Z°]+)?(?:\^?\d+)?)$/);
        if (!match) {
            throw new Error(`Invalid unit format: "${str}"`);
        }
        const value = parseFloat(match[1]);
        const unit = match[2];
        try {
            return UnitValue.fromValueAndUnit(value, unit);
        }
        catch (error) {
            throw new Error(`Cannot create unit value: ${error.message}`);
        }
    }
    /**
     * Check if a string looks like a unit expression
     */
    static isUnitString(str) {
        const trimmed = str.trim();
        // Avoid misclassifying pure scientific notation as a unit (e.g., "1e6").
        if (/^-?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(trimmed)) {
            return false;
        }
        // Basic pattern matching for unit expressions
        return /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*[a-zA-Z°]+(?:\/[a-zA-Z°]+)?(?:\^?\d+)?$/.test(trimmed);
    }
    getMetadata() {
        return {
            ...super.getMetadata(),
            unit: this.quantity.unit,
            value: this.quantity.value,
            isDimensionless: this.quantity.isDimensionless(),
            unitsnetType: this.quantity.unitsnetValue?.constructor.name
        };
    }
}
exports.UnitValue = UnitValue;
