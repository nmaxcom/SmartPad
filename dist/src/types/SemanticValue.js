"use strict";
/**
 * @file SemanticValue - Base class for typed values in SmartPad
 * @description This module provides the foundation for SmartPad's semantic type system.
 * Instead of treating all values as generic strings or numbers, SemanticValue and its
 * subclasses provide proper semantic meaning to values like percentages, currencies,
 * units, and plain numbers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticValue = void 0;
/**
 * Abstract base class for all semantic values in SmartPad.
 * Provides common operations and type-safe arithmetic with proper error handling.
 */
class SemanticValue {
    /**
     * Get a user-friendly display string (used in UI)
     */
    toDisplayString(options) {
        return this.toString(options);
    }
    /**
     * Get metadata about this semantic value for debugging/introspection
     */
    getMetadata() {
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
    validateCompatibility(other, operation) {
        if (!other.isNumeric() && !this.isNumeric()) {
            throw new Error(`Cannot ${operation} non-numeric values: ${this.getType()} ${operation} ${other.getType()}`);
        }
    }
    /**
     * Create a type-aware error message for incompatible operations
     */
    createIncompatibilityError(other, operation, reason) {
        const baseMessage = `Cannot ${operation} ${this.getType()} and ${other.getType()}`;
        const fullMessage = reason ? `${baseMessage}: ${reason}` : baseMessage;
        // Include helpful context
        const context = `\n  Left operand: ${this.toString()} (${this.getType()})\n  Right operand: ${other.toString()} (${other.getType()})`;
        return new Error(fullMessage + context);
    }
    /**
     * Helper method to format numbers consistently across all semantic values
     */
    formatNumber(value, precision = 6, options) {
        if (!isFinite(value))
            return "Infinity";
        if (value === 0)
            return "0";
        // Handle very large or very small numbers with scientific notation
        const abs = Math.abs(value);
        const upperThreshold = options?.scientificUpperThreshold ?? 1e12;
        const lowerThreshold = options?.scientificLowerThreshold ?? 1e-4;
        const formatScientific = (num, fracDigits) => {
            const s = num.toExponential(Math.max(0, fracDigits));
            const [mantissa, exp] = s.split("e");
            const shouldTrim = options?.scientificTrimTrailingZeros ?? true;
            const outputMantissa = shouldTrim
                ? mantissa.replace(/(?:\.0+|(\.\d+?)0+)$/, "$1")
                : mantissa;
            return `${outputMantissa}e${exp}`;
        };
        if (abs >= upperThreshold ||
            (abs > 0 && lowerThreshold > 0 && abs < lowerThreshold)) {
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
    static isSemanticValue(value) {
        return value && typeof value === 'object' && typeof value.getType === 'function';
    }
    /**
     * Helper to safely get numeric value from any value
     */
    static getNumericValue(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (SemanticValue.isSemanticValue(value)) {
            return value.getNumericValue();
        }
        throw new Error(`Cannot get numeric value from: ${typeof value}`);
    }
}
exports.SemanticValue = SemanticValue;
