"use strict";
/**
 * Percentage Helpers - Pure functions for percentage operations
 *
 * These helpers are extracted from percentageEvaluatorV2.ts to provide
 * reusable, pure functions for percentage operations that can be used
 * by both the evaluator and the lowerer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PercentageHelpers = void 0;
const types_1 = require("../types");
/**
 * Helper functions for percentage operations
 */
class PercentageHelpers {
    /**
     * Calculate "X% of Y"
     *
     * @param percentValue The percentage value
     * @param baseValue The base value
     * @returns The result of applying the percentage to the base
     */
    static of(percentValue, baseValue) {
        return percentValue.of(baseValue);
    }
    /**
     * Calculate "X% on Y" (add percentage to base)
     *
     * @param percentValue The percentage value
     * @param baseValue The base value
     * @returns The result of adding the percentage to the base
     */
    static on(percentValue, baseValue) {
        return percentValue.on(baseValue);
    }
    /**
     * Calculate "X% off Y" (subtract percentage from base)
     *
     * @param percentValue The percentage value
     * @param baseValue The base value
     * @returns The result of subtracting the percentage from the base
     */
    static off(percentValue, baseValue) {
        return percentValue.off(baseValue);
    }
    /**
     * Calculate "what percent is X of Y"
     *
     * @param partValue The part value
     * @param baseValue The base value
     * @returns The percentage value
     */
    static whatPercent(partValue, baseValue) {
        if (types_1.SemanticValueTypes.isNumber(partValue) && types_1.SemanticValueTypes.isNumber(baseValue)) {
            const part = partValue.getNumericValue();
            const base = baseValue.getNumericValue();
            if (base === 0) {
                throw new Error("Cannot calculate percentage with zero base value");
            }
            const percentage = (part / base) * 100;
            return new types_1.PercentageValue(percentage);
        }
        throw new Error("Cannot calculate percentage with non-numeric values");
    }
    /**
     * Format a number as a percentage string
     *
     * @param value The numeric value (0.2 for 20%)
     * @returns The formatted percentage string (e.g., "20%")
     */
    static formatAsPercentage(value) {
        return `${value * 100}%`;
    }
    /**
     * Generate a Math.js expression for "X% of Y"
     *
     * @param percent The percentage value (e.g., 20 for 20%)
     * @param baseExpr The base expression
     * @returns The Math.js expression
     */
    static ofExpression(percent, baseExpr) {
        return `((${percent}/100) * ${baseExpr})`;
    }
    /**
     * Generate a Math.js expression for "X% on Y"
     *
     * @param percent The percentage value (e.g., 20 for 20%)
     * @param baseExpr The base expression
     * @returns The Math.js expression
     */
    static onExpression(percent, baseExpr) {
        return `${baseExpr} + ((${percent}/100) * ${baseExpr})`;
    }
    /**
     * Generate a Math.js expression for "X% off Y"
     *
     * @param percent The percentage value (e.g., 20 for 20%)
     * @param baseExpr The base expression
     * @returns The Math.js expression
     */
    static offExpression(percent, baseExpr) {
        return `${baseExpr} - ((${percent}/100) * ${baseExpr})`;
    }
}
exports.PercentageHelpers = PercentageHelpers;
