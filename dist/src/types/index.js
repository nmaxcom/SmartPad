"use strict";
/**
 * @file SmartPad Semantic Type System
 * @description Export all semantic value types and utilities for the new type system.
 * This replaces the fragile string-based approach with proper semantic types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticArithmetic = exports.SemanticParsers = exports.SemanticValues = exports.SemanticValueTypes = exports.SymbolicValue = exports.ErrorValue = exports.DateValue = exports.UnitValue = exports.CurrencyUnitValue = exports.CurrencyValue = exports.PercentageValue = exports.NumberValue = exports.SemanticValue = void 0;
// Base types and interfaces
const SemanticValue_1 = require("./SemanticValue");
Object.defineProperty(exports, "SemanticValue", { enumerable: true, get: function () { return SemanticValue_1.SemanticValue; } });
// Concrete semantic value implementations  
const NumberValue_1 = require("./NumberValue");
Object.defineProperty(exports, "NumberValue", { enumerable: true, get: function () { return NumberValue_1.NumberValue; } });
const PercentageValue_1 = require("./PercentageValue");
Object.defineProperty(exports, "PercentageValue", { enumerable: true, get: function () { return PercentageValue_1.PercentageValue; } });
const CurrencyValue_1 = require("./CurrencyValue");
Object.defineProperty(exports, "CurrencyValue", { enumerable: true, get: function () { return CurrencyValue_1.CurrencyValue; } });
const CurrencyUnitValue_1 = require("./CurrencyUnitValue");
Object.defineProperty(exports, "CurrencyUnitValue", { enumerable: true, get: function () { return CurrencyUnitValue_1.CurrencyUnitValue; } });
const UnitValue_1 = require("./UnitValue");
Object.defineProperty(exports, "UnitValue", { enumerable: true, get: function () { return UnitValue_1.UnitValue; } });
const DateValue_1 = require("./DateValue");
Object.defineProperty(exports, "DateValue", { enumerable: true, get: function () { return DateValue_1.DateValue; } });
const ErrorValue_1 = require("./ErrorValue");
Object.defineProperty(exports, "ErrorValue", { enumerable: true, get: function () { return ErrorValue_1.ErrorValue; } });
const SymbolicValue_1 = require("./SymbolicValue");
Object.defineProperty(exports, "SymbolicValue", { enumerable: true, get: function () { return SymbolicValue_1.SymbolicValue; } });
const unitsnetAdapter_1 = require("../units/unitsnetAdapter");
// Type guards and utilities
exports.SemanticValueTypes = {
    isNumber: (value) => value.getType() === 'number',
    isPercentage: (value) => value.getType() === 'percentage',
    isCurrency: (value) => value.getType() === 'currency',
    isCurrencyUnit: (value) => value.getType() === 'currencyUnit',
    isUnit: (value) => value.getType() === 'unit',
    isDate: (value) => value.getType() === 'date',
    isError: (value) => value.getType() === 'error',
    isSymbolic: (value) => value.getType() === 'symbolic',
};
// Factory functions for creating semantic values
exports.SemanticValues = {
    /**
     * Create a NumberValue from various inputs
     */
    number: (value) => NumberValue_1.NumberValue.from(value),
    /**
     * Create a PercentageValue from display percentage
     */
    percentage: (displayPercent) => new PercentageValue_1.PercentageValue(displayPercent),
    /**
     * Create a CurrencyValue from symbol and amount
     */
    currency: (symbol, amount) => new CurrencyValue_1.CurrencyValue(symbol, amount),
    /**
     * Create a CurrencyUnitValue from currency, unit string, and per-unit flag
     */
    currencyUnit: (symbol, amount, unit, perUnit) => new CurrencyUnitValue_1.CurrencyUnitValue(symbol, amount, unit, perUnit),
    /**
     * Create a UnitValue from value and unit string
     */
    unit: (value, unit) => UnitValue_1.UnitValue.fromValueAndUnit(value, unit),
    /**
     * Create a DateValue from a Date object
     */
    date: (value) => DateValue_1.DateValue.fromDate(value, { type: 'local', label: 'local' }, true),
    /**
     * Create an ErrorValue
     */
    error: (type, message, context) => new ErrorValue_1.ErrorValue(type, message, context),
    /**
     * Zero values for each type
     */
    zero: {
        number: () => NumberValue_1.NumberValue.zero(),
        percentage: () => new PercentageValue_1.PercentageValue(0),
        currency: (symbol) => new CurrencyValue_1.CurrencyValue(symbol, 0),
        unit: (unit) => UnitValue_1.UnitValue.fromValueAndUnit(0, unit),
    },
    /**
     * One/unit values
     */
    one: {
        number: () => NumberValue_1.NumberValue.one(),
        percentage: () => new PercentageValue_1.PercentageValue(100), // 100%
    },
};
// Parser utilities
exports.SemanticParsers = {
    /**
     * Try to parse a string as a semantic value
     */
    parse: (str) => {
        if (!str)
            return null;
        const trimmed = str.trim();
        if (!trimmed)
            return null;
        const parseCurrencyUnit = (input) => {
            const perMatch = input.match(/^(.*?)\bper\b(.+)$/i);
            let left = null;
            let unitPart = null;
            if (perMatch) {
                left = perMatch[1].trim();
                unitPart = perMatch[2].trim();
            }
            else if (input.includes("/")) {
                const slashIndex = input.indexOf("/");
                left = input.slice(0, slashIndex).trim();
                unitPart = input.slice(slashIndex + 1).trim();
            }
            if (!left || !unitPart) {
                return null;
            }
            let currency;
            try {
                currency = CurrencyValue_1.CurrencyValue.fromString(left);
            }
            catch {
                return null;
            }
            const unitString = unitPart.replace(/\s+/g, "");
            if (!unitString || !/[a-zA-Z°µμΩ]/.test(unitString)) {
                return null;
            }
            try {
                unitsnetAdapter_1.SmartPadQuantity.fromValueAndUnit(1, unitString);
            }
            catch {
                return null;
            }
            return new CurrencyUnitValue_1.CurrencyUnitValue(currency.getSymbol(), currency.getNumericValue(), unitString, true);
        };
        // Try currency rate literals ($8/m^2, $8 per m^2)
        const currencyUnit = parseCurrencyUnit(trimmed);
        if (currencyUnit) {
            return currencyUnit;
        }
        const parseUnitRate = (input) => {
            const perMatch = input.match(/^(.*?)\bper\b(.+)$/i);
            let left = null;
            let unitPart = null;
            if (perMatch) {
                left = perMatch[1].trim();
                unitPart = perMatch[2].trim();
            }
            else if (input.includes("/")) {
                const slashIndex = input.indexOf("/");
                left = input.slice(0, slashIndex).trim();
                unitPart = input.slice(slashIndex + 1).trim();
            }
            if (!left || !unitPart) {
                return null;
            }
            if (!left.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/)) {
                return null;
            }
            const unitString = unitPart.replace(/\s+/g, "");
            if (!unitString || !/[a-zA-Z°µμΩ]/.test(unitString)) {
                return null;
            }
            try {
                unitsnetAdapter_1.SmartPadQuantity.fromValueAndUnit(1, `1/${unitString}`);
            }
            catch {
                return null;
            }
            return UnitValue_1.UnitValue.fromValueAndUnit(parseFloat(left), `1/${unitString}`);
        };
        const unitRate = parseUnitRate(trimmed);
        if (unitRate) {
            return unitRate;
        }
        // Try percentage first (20%)
        if (trimmed.match(/^-?\d+(?:\.\d+)?%$/)) {
            try {
                return PercentageValue_1.PercentageValue.fromString(trimmed);
            }
            catch {
                return null;
            }
        }
        // Try currency ($100, €50, $1,000, 100$)
        if (trimmed.match(/^[\$€£¥₹₿]\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/) ||
            trimmed.match(/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*[\$€£¥₹₿]$/) ||
            trimmed.match(/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s+(CHF|CAD|AUD)$/)) {
            try {
                return CurrencyValue_1.CurrencyValue.fromString(trimmed);
            }
            catch {
                return null;
            }
        }
        // Try units (50 m, 100 kg)
        if (UnitValue_1.UnitValue.isUnitString(trimmed)) {
            try {
                return UnitValue_1.UnitValue.fromString(trimmed);
            }
            catch {
                return null;
            }
        }
        // Try dates (2024-06-05, June 5 2004)
        const dateValue = DateValue_1.DateValue.parse(trimmed);
        if (dateValue) {
            return dateValue;
        }
        // Try number (last, as it's most permissive)
        if (trimmed.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/)) {
            try {
                return NumberValue_1.NumberValue.from(trimmed);
            }
            catch {
                return null;
            }
        }
        return null;
    },
    /**
     * Parse with error handling
     */
    parseOrError: (str) => {
        if (!str) {
            return ErrorValue_1.ErrorValue.parseError("Empty value provided for parsing");
        }
        const trimmed = str.trim();
        if (!trimmed) {
            return ErrorValue_1.ErrorValue.parseError("Empty value provided for parsing");
        }
        const result = exports.SemanticParsers.parse(str);
        if (result) {
            return result;
        }
        return ErrorValue_1.ErrorValue.parseError(`Cannot parse "${str}" as any semantic value type`);
    },
};
// Arithmetic utilities
exports.SemanticArithmetic = {
    /**
     * Add two semantic values with proper error handling
     */
    add: (left, right) => {
        try {
            if (exports.SemanticValueTypes.isSymbolic(left) || exports.SemanticValueTypes.isSymbolic(right)) {
                const base = exports.SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue_1.SymbolicValue.from(left.toString());
                return base.add(right);
            }
            return left.add(right);
        }
        catch (error) {
            return ErrorValue_1.ErrorValue.fromError(error, 'runtime');
        }
    },
    /**
     * Subtract two semantic values with proper error handling
     */
    subtract: (left, right) => {
        try {
            if (exports.SemanticValueTypes.isSymbolic(left) || exports.SemanticValueTypes.isSymbolic(right)) {
                const base = exports.SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue_1.SymbolicValue.from(left.toString());
                return base.subtract(right);
            }
            return left.subtract(right);
        }
        catch (error) {
            return ErrorValue_1.ErrorValue.fromError(error, 'runtime');
        }
    },
    /**
     * Multiply two semantic values with proper error handling
     */
    multiply: (left, right) => {
        try {
            if (exports.SemanticValueTypes.isSymbolic(left) || exports.SemanticValueTypes.isSymbolic(right)) {
                const base = exports.SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue_1.SymbolicValue.from(left.toString());
                return base.multiply(right);
            }
            return left.multiply(right);
        }
        catch (error) {
            return ErrorValue_1.ErrorValue.fromError(error, 'runtime');
        }
    },
    /**
     * Divide two semantic values with proper error handling
     */
    divide: (left, right) => {
        try {
            if (exports.SemanticValueTypes.isSymbolic(left) || exports.SemanticValueTypes.isSymbolic(right)) {
                const base = exports.SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue_1.SymbolicValue.from(left.toString());
                return base.divide(right);
            }
            return left.divide(right);
        }
        catch (error) {
            return ErrorValue_1.ErrorValue.fromError(error, 'runtime');
        }
    },
    /**
     * Raise semantic value to power with proper error handling
     */
    power: (base, exponent) => {
        try {
            if (exports.SemanticValueTypes.isSymbolic(base)) {
                return base.power(exponent);
            }
            return base.power(exponent);
        }
        catch (error) {
            return ErrorValue_1.ErrorValue.fromError(error, 'runtime');
        }
    },
};
