"use strict";
/**
 * Quantity - Values with Units for SmartPad
 *
 * This module provides the Quantity class which represents a numeric value
 * combined with a unit, supporting dimensional analysis and unit conversions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitParser = exports.Quantity = exports.CompositeUnit = void 0;
const definitions_1 = require("./definitions");
/**
 * A composite unit that can represent complex units like "kg*m/s^2"
 */
class CompositeUnit {
    components;
    constructor(components) {
        this.components = components;
    }
    /**
     * Create a simple unit from a single unit definition
     */
    static fromUnit(unit, power = 1) {
        return new CompositeUnit([{ unit, power }]);
    }
    /**
     * Create a dimensionless unit
     */
    static dimensionless() {
        return new CompositeUnit([]);
    }
    /**
     * Get the overall dimension of this composite unit
     */
    getDimension() {
        return this.components.reduce((dimension, component) => {
            const componentDimension = (0, definitions_1.powerDimension)(component.unit.dimension, component.power);
            return (0, definitions_1.multiplyDimensions)(dimension, componentDimension);
        }, { length: 0, mass: 0, time: 0, current: 0, temperature: 0, amount: 0, luminosity: 0 });
    }
    /**
     * Check if this unit is compatible (same dimension) with another
     */
    isCompatibleWith(other) {
        return (0, definitions_1.dimensionsEqual)(this.getDimension(), other.getDimension());
    }
    /**
     * Check if this is a dimensionless unit
     */
    isDimensionless() {
        const dimension = this.getDimension();
        return (0, definitions_1.dimensionsEqual)(dimension, {
            length: 0,
            mass: 0,
            time: 0,
            current: 0,
            temperature: 0,
            amount: 0,
            luminosity: 0,
        });
    }
    /**
     * Multiply this unit with another unit
     */
    multiply(other) {
        const newComponents = [...this.components, ...other.components];
        return new CompositeUnit(newComponents).simplify();
    }
    /**
     * Divide this unit by another unit
     */
    divide(other) {
        const invertedComponents = other.components.map((component) => ({
            unit: component.unit,
            power: -component.power,
        }));
        const newComponents = [...this.components, ...invertedComponents];
        return new CompositeUnit(newComponents).simplify();
    }
    /**
     * Raise this unit to a power
     */
    power(exponent) {
        const newComponents = this.components.map((component) => ({
            unit: component.unit,
            power: component.power * exponent,
        }));
        return new CompositeUnit(newComponents).simplify();
    }
    /**
     * Simplify the unit by combining components with the same unit
     */
    simplify() {
        const unitMap = new Map();
        // Combine powers for the same unit
        for (const component of this.components) {
            const symbol = component.unit.symbol;
            const currentPower = unitMap.get(symbol) || 0;
            unitMap.set(symbol, currentPower + component.power);
        }
        // Filter out units with zero power
        const newComponents = [];
        unitMap.forEach((power, symbol) => {
            if (power !== 0) {
                const unit = definitions_1.defaultUnitRegistry.get(symbol);
                if (unit) {
                    newComponents.push({ unit, power });
                }
            }
        });
        return new CompositeUnit(newComponents);
    }
    /**
     * Get the conversion factor to convert to base SI units
     */
    getBaseConversionFactor() {
        return this.components.reduce((factor, component) => {
            return factor * Math.pow(component.unit.baseMultiplier, component.power);
        }, 1);
    }
    /**
     * Format the unit for display (e.g., "kg*m/s^2")
     */
    toString() {
        if (this.components.length === 0) {
            return "1"; // dimensionless
        }
        if (this.components.length === 1) {
            const component = this.components[0];
            const unitStr = Math.abs(component.power) === 1
                ? component.unit.symbol
                : `${component.unit.symbol}^${Math.abs(component.power)}`;
            return component.power < 0 ? `1/${unitStr}` : unitStr;
        }
        // Try to find a derived unit that matches this dimension
        const derivedUnit = this.findDerivedUnit();
        if (derivedUnit) {
            return derivedUnit;
        }
        const positiveComponents = [];
        const negativeComponents = [];
        for (const component of this.components) {
            const unitStr = Math.abs(component.power) === 1
                ? component.unit.symbol
                : `${component.unit.symbol}^${Math.abs(component.power)}`;
            if (component.power > 0) {
                positiveComponents.push(unitStr);
            }
            else {
                negativeComponents.push(unitStr);
            }
        }
        if (negativeComponents.length === 0) {
            return positiveComponents.join("*");
        }
        if (positiveComponents.length === 0) {
            return `1/${negativeComponents.join("*")}`;
        }
        // Group negative components with parentheses when there are multiple
        const denominatorStr = negativeComponents.length > 1
            ? `(${negativeComponents.join("*")})`
            : negativeComponents.join("*");
        return `${positiveComponents.join("*")}/${denominatorStr}`;
    }
    /**
     * Try to find a derived SI unit that matches this composite unit's dimension
     */
    findDerivedUnit() {
        const dimension = this.getDimension();
        // Check common derived units
        const derivedUnits = [
            { symbol: "Hz", dimension: (0, definitions_1.createDimension)(0, 0, -1) }, // Frequency: 1/s
            { symbol: "N", dimension: (0, definitions_1.createDimension)(1, 1, -2) }, // Force: kg*m/s^2
            { symbol: "Pa", dimension: (0, definitions_1.createDimension)(-1, 1, -2) }, // Pressure: kg/(m*s^2)
            { symbol: "J", dimension: (0, definitions_1.createDimension)(2, 1, -2) }, // Energy: kg*m^2/s^2
            { symbol: "W", dimension: (0, definitions_1.createDimension)(2, 1, -3) }, // Power: kg*m^2/s^3
            { symbol: "V", dimension: (0, definitions_1.createDimension)(2, 1, -3, -1) }, // Voltage: kg*m^2/(A*s^3)
            { symbol: "ohm", dimension: (0, definitions_1.createDimension)(2, 1, -3, -2) }, // Resistance: kg*m^2/(A^2*s^3)
        ];
        for (const unit of derivedUnits) {
            if ((0, definitions_1.dimensionsEqual)(dimension, unit.dimension)) {
                return unit.symbol;
            }
        }
        return null;
    }
}
exports.CompositeUnit = CompositeUnit;
/**
 * A physical quantity with a numeric value and unit
 */
class Quantity {
    value;
    unit;
    constructor(value, unit) {
        this.value = value;
        this.unit = unit;
    }
    /**
     * Create a quantity from a value and unit symbol
     */
    static fromUnit(value, unitSymbol) {
        const unitDef = definitions_1.defaultUnitRegistry.get(unitSymbol);
        if (!unitDef) {
            throw new Error(`Unknown unit: ${unitSymbol}`);
        }
        return new Quantity(value, CompositeUnit.fromUnit(unitDef));
    }
    /**
     * Create a dimensionless quantity
     */
    static dimensionless(value) {
        return new Quantity(value, CompositeUnit.dimensionless());
    }
    /**
     * Check if this quantity is dimensionless
     */
    isDimensionless() {
        return this.unit.isDimensionless();
    }
    /**
     * Add two quantities (must have compatible units)
     */
    add(other) {
        if (!this.unit.isCompatibleWith(other.unit)) {
            const thisDim = (0, definitions_1.formatDimension)(this.unit.getDimension());
            const otherDim = (0, definitions_1.formatDimension)(other.unit.getDimension());
            throw new Error(`Cannot add ${thisDim} and ${otherDim}: incompatible dimensions`);
        }
        // Convert other quantity to this unit's system
        const otherConverted = other.convertToUnit(this.unit);
        return new Quantity(this.value + otherConverted.value, this.unit);
    }
    /**
     * Subtract two quantities (must have compatible units)
     */
    subtract(other) {
        if (!this.unit.isCompatibleWith(other.unit)) {
            const thisDim = (0, definitions_1.formatDimension)(this.unit.getDimension());
            const otherDim = (0, definitions_1.formatDimension)(other.unit.getDimension());
            throw new Error(`Cannot subtract ${thisDim} and ${otherDim}: incompatible dimensions`);
        }
        // Convert other quantity to this unit's system
        const otherConverted = other.convertToUnit(this.unit);
        return new Quantity(this.value - otherConverted.value, this.unit);
    }
    /**
     * Multiply two quantities
     */
    multiply(other) {
        const newValue = this.value * other.value;
        const newUnit = this.unit.multiply(other.unit);
        return new Quantity(newValue, newUnit);
    }
    /**
     * Divide two quantities
     */
    divide(other) {
        if (other.value === 0) {
            throw new Error("Division by zero");
        }
        const newValue = this.value / other.value;
        const newUnit = this.unit.divide(other.unit);
        return new Quantity(newValue, newUnit);
    }
    /**
     * Raise quantity to a power
     */
    power(exponent) {
        const newValue = Math.pow(this.value, exponent);
        const newUnit = this.unit.power(exponent);
        return new Quantity(newValue, newUnit);
    }
    /**
     * Convert to a different compatible unit
     */
    convertTo(targetUnitSymbol) {
        const targetUnit = definitions_1.defaultUnitRegistry.get(targetUnitSymbol);
        if (!targetUnit) {
            throw new Error(`Unknown unit: ${targetUnitSymbol}`);
        }
        const targetCompositeUnit = CompositeUnit.fromUnit(targetUnit);
        return this.convertToUnit(targetCompositeUnit);
    }
    /**
     * Convert to a different compatible composite unit
     */
    convertToUnit(targetUnit) {
        if (!this.unit.isCompatibleWith(targetUnit)) {
            const thisDim = (0, definitions_1.formatDimension)(this.unit.getDimension());
            const targetDim = (0, definitions_1.formatDimension)(targetUnit.getDimension());
            throw new Error(`Cannot convert ${thisDim} to ${targetDim}: incompatible dimensions`);
        }
        // Convert to base units, then to target units
        const thisBaseFactor = this.unit.getBaseConversionFactor();
        const targetBaseFactor = targetUnit.getBaseConversionFactor();
        const baseValue = this.value * thisBaseFactor;
        const targetValue = baseValue / targetBaseFactor;
        return new Quantity(targetValue, targetUnit);
    }
    /**
     * Get the best unit for display (prefer simpler, more common units)
     */
    getBestDisplayUnit() {
        // For now, just return the quantity as-is
        // Future enhancement: implement smart unit selection
        return this;
    }
    /**
     * Format the quantity for display
     */
    toString(precision = 6) {
        // Format the value
        const formattedValue = parseFloat(this.value.toPrecision(precision));
        // Format the unit
        let unitStr = this.unit.toString();
        const absValue = Math.abs(formattedValue);
        const pluralizableUnits = new Set(["day", "week", "month", "year"]);
        if (pluralizableUnits.has(unitStr) &&
            absValue !== 1 &&
            !unitStr.includes("/") &&
            !unitStr.includes("^") &&
            !unitStr.includes("*")) {
            unitStr = `${unitStr}s`;
        }
        if (unitStr === "1") {
            return formattedValue.toString();
        }
        return `${formattedValue} ${unitStr}`;
    }
    /**
     * Check if two quantities are equal (same value and compatible units)
     */
    equals(other, tolerance = 1e-10) {
        if (!this.unit.isCompatibleWith(other.unit)) {
            return false;
        }
        const otherConverted = other.convertToUnit(this.unit);
        return Math.abs(this.value - otherConverted.value) < tolerance;
    }
}
exports.Quantity = Quantity;
/**
 * Parser for unit expressions like "m/s^2" or "kg*m/s^2"
 */
class UnitParser {
    /**
     * Parse a unit string into a CompositeUnit
     */
    static parse(unitString) {
        // Handle dimensionless case
        if (!unitString || unitString === "1") {
            return CompositeUnit.dimensionless();
        }
        try {
            return this.parseUnitExpression(unitString);
        }
        catch (error) {
            throw new Error(`Cannot parse unit: ${unitString}`);
        }
    }
    /**
     * Parse a complex unit expression
     */
    static parseUnitExpression(expr) {
        const tokens = this.tokenize(expr);
        let index = 0;
        const current = () => tokens[index];
        const consume = (expectedType, expectedValue) => {
            const token = current();
            if (!token) {
                throw new Error("Unexpected end of unit expression");
            }
            if (expectedType && token.type !== expectedType) {
                throw new Error(`Expected ${expectedType}, got ${token.type}`);
            }
            if (expectedValue && token.value !== expectedValue) {
                throw new Error(`Expected ${expectedValue}, got ${token.value}`);
            }
            index++;
            return token;
        };
        const matchOp = (value) => current()?.type === "op" && current()?.value === value;
        const parseSignedNumber = () => {
            let sign = 1;
            if (matchOp("+") || matchOp("-")) {
                sign = current()?.value === "-" ? -1 : 1;
                consume("op");
            }
            const token = consume("number");
            const value = parseFloat(token.value);
            if (Number.isNaN(value)) {
                throw new Error(`Invalid exponent: ${token.value}`);
            }
            return sign * value;
        };
        const parsePrimary = () => {
            const token = current();
            if (!token) {
                throw new Error("Unexpected end of unit expression");
            }
            if (token.type === "unit") {
                const unitDef = definitions_1.defaultUnitRegistry.get(token.value);
                if (!unitDef) {
                    throw new Error(`Unknown unit factor: ${token.value}`);
                }
                consume("unit");
                return CompositeUnit.fromUnit(unitDef);
            }
            if (token.type === "number") {
                if (token.value !== "1") {
                    throw new Error(`Unexpected number in unit expression: ${token.value}`);
                }
                consume("number");
                return CompositeUnit.dimensionless();
            }
            if (token.type === "lparen") {
                consume("lparen");
                const inner = parseExpression();
                consume("rparen");
                return inner;
            }
            throw new Error(`Unexpected token: ${token.value}`);
        };
        const parseFactor = () => {
            let base = parsePrimary();
            if (matchOp("^")) {
                consume("op", "^");
                const exponent = parseSignedNumber();
                base = base.power(exponent);
            }
            return base;
        };
        const parseExpression = () => {
            let left = parseFactor();
            while (matchOp("*") || matchOp("/")) {
                const op = consume("op").value;
                const right = parseFactor();
                left = op === "*" ? left.multiply(right) : left.divide(right);
            }
            return left;
        };
        const result = parseExpression();
        if (index < tokens.length) {
            throw new Error(`Unexpected token: ${tokens[index].value}`);
        }
        return result.simplify();
    }
    static tokenize(expr) {
        const tokens = [];
        let pos = 0;
        const isUnitChar = (ch) => /[A-Za-z°µμΩ]/.test(ch);
        const isNumberChar = (ch) => /[\d.]/.test(ch);
        while (pos < expr.length) {
            const ch = expr[pos];
            if (/\s/.test(ch)) {
                pos++;
                continue;
            }
            if (ch === "(") {
                tokens.push({ type: "lparen", value: ch });
                pos++;
                continue;
            }
            if (ch === ")") {
                tokens.push({ type: "rparen", value: ch });
                pos++;
                continue;
            }
            if ("*/^+-".includes(ch)) {
                tokens.push({ type: "op", value: ch });
                pos++;
                continue;
            }
            if (isNumberChar(ch)) {
                let value = "";
                while (pos < expr.length && isNumberChar(expr[pos])) {
                    value += expr[pos];
                    pos++;
                }
                tokens.push({ type: "number", value });
                continue;
            }
            if (isUnitChar(ch)) {
                let value = "";
                while (pos < expr.length && isUnitChar(expr[pos])) {
                    value += expr[pos];
                    pos++;
                }
                tokens.push({ type: "unit", value });
                continue;
            }
            throw new Error(`Unexpected character in unit expression: ${ch}`);
        }
        return tokens;
    }
}
exports.UnitParser = UnitParser;
