"use strict";
/**
 * Math.js Engine Wrapper
 *
 * This module provides a thin wrapper around Math.js for expression evaluation.
 * It handles configuration, evaluation, and wrapping results in SemanticValue types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MathJsEngine = void 0;
const mathjs_1 = require("mathjs");
const mathEvaluator_1 = require("../parsing/mathEvaluator");
const types_1 = require("../types");
/**
 * Wrapper for Math.js library
 */
class MathJsEngine {
    math;
    constructor() {
        this.math = (0, mathjs_1.create)(mathjs_1.all);
        this.configureMath();
    }
    /**
     * Configure Math.js settings
     */
    configureMath() {
        this.math.config({
            number: 'number', // Use JavaScript numbers for performance
            precision: 14, // Precision for BigNumber mode if needed
            relTol: 1e-12, // Small number comparison threshold
            absTol: 1e-12
        });
    }
    normalizeExpressionAndScope(expression, scope) {
        const tokens = (0, mathEvaluator_1.tokenize)(expression);
        const replacements = new Map();
        const normalizedScope = {};
        const existingKeys = new Set(Object.keys(scope));
        let counter = 0;
        const isValidIdentifier = (name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
        const nextPlaceholder = () => {
            let candidate = `__sp_var_${counter++}`;
            while (existingKeys.has(candidate)) {
                candidate = `__sp_var_${counter++}`;
            }
            existingKeys.add(candidate);
            return candidate;
        };
        Object.keys(scope).forEach(key => {
            if (isValidIdentifier(key)) {
                normalizedScope[key] = scope[key];
                return;
            }
            const placeholder = nextPlaceholder();
            replacements.set(key, placeholder);
            normalizedScope[placeholder] = scope[key];
        });
        tokens.forEach(token => {
            if (token.type !== mathEvaluator_1.TokenType.IDENTIFIER)
                return;
            if (isValidIdentifier(token.value))
                return;
            if (replacements.has(token.value))
                return;
            replacements.set(token.value, nextPlaceholder());
        });
        const rebuiltExpression = tokens
            .filter(token => token.type !== mathEvaluator_1.TokenType.EOF)
            .map(token => {
            if (token.type !== mathEvaluator_1.TokenType.IDENTIFIER) {
                return token.value;
            }
            return replacements.get(token.value) ?? token.value;
        })
            .join(' ');
        return { expression: rebuiltExpression, scope: normalizedScope };
    }
    isMalformedExpression(expression) {
        return /\+\s*\+/.test(expression);
    }
    normalizeErrorMessage(message) {
        const undefinedMatch = message.match(/Undefined symbol\s+([^\s]+)/i);
        if (undefinedMatch) {
            return `undefined variable: ${undefinedMatch[1]}`;
        }
        if (/division by zero/i.test(message)) {
            return 'division by zero';
        }
        return `Math.js error: ${message}`;
    }
    /**
     * Evaluate a Math.js expression with the given scope
     *
     * @param expression The Math.js-compatible expression string
     * @param scope The variable scope for evaluation
     * @returns The evaluated result as a SemanticValue
     */
    evaluate(expression, scope) {
        const trimmedExpression = expression.trim();
        if (!trimmedExpression) {
            return new types_1.ErrorValue('runtime', 'Empty expression');
        }
        if (this.isMalformedExpression(trimmedExpression)) {
            return new types_1.ErrorValue('runtime', 'Malformed expression');
        }
        const normalized = this.normalizeExpressionAndScope(trimmedExpression, scope);
        try {
            const result = this.math.evaluate(normalized.expression, normalized.scope);
            // Convert the result to a SemanticValue
            if (typeof result === 'number') {
                if (!Number.isFinite(result)) {
                    return new types_1.ErrorValue('runtime', 'division by zero');
                }
                return new types_1.NumberValue(result);
            }
            else if (result === undefined) {
                return new types_1.ErrorValue('runtime', 'Expression resulted in undefined');
            }
            else {
                // For other types (matrices, complex numbers, etc.)
                // We'll need to add more conversions as needed
                const numeric = Number(result);
                if (!Number.isFinite(numeric)) {
                    return new types_1.ErrorValue('runtime', 'Invalid number value');
                }
                return new types_1.NumberValue(numeric);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return new types_1.ErrorValue('runtime', this.normalizeErrorMessage(message));
        }
    }
}
exports.MathJsEngine = MathJsEngine;
