"use strict";
/**
 * @file ErrorValue - Error representation in the semantic type system
 * @description Represents evaluation errors as first-class semantic values,
 * allowing proper error propagation and handling throughout the system
 * with rich context and type information.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorValue = void 0;
const SemanticValue_1 = require("./SemanticValue");
/**
 * Represents an error as a semantic value
 * This allows errors to propagate through the type system consistently
 *
 * Examples:
 * - Parse error: "Invalid syntax in '100 ++ 50'"
 * - Type error: "Cannot add currency and percentage: $100 + 20%"
 * - Runtime error: "Division by zero in expression"
 */
class ErrorValue extends SemanticValue_1.SemanticValue {
    errorType;
    message;
    context;
    constructor(errorType, message, context = {}) {
        super();
        this.errorType = errorType;
        this.message = message || 'Unknown error';
        this.context = context;
    }
    getType() {
        return 'error';
    }
    getNumericValue() {
        // Errors don't have numeric values, but this is required by interface
        throw new Error('Cannot get numeric value from error');
    }
    /**
     * Get the error type
     */
    getErrorType() {
        return this.errorType;
    }
    /**
     * Get the error message
     */
    getMessage() {
        return this.message;
    }
    /**
     * Get error context
     */
    getContext() {
        return this.context;
    }
    isNumeric() {
        return false;
    }
    canConvertTo(targetType) {
        // Errors cannot be converted to other types
        return targetType === 'error';
    }
    toString(options) {
        if (options?.showType) {
            return `Error(${this.errorType}): ${this.message}`;
        }
        // Format with context if available
        let result = `⚠️ ${this.message}`;
        if (this.context.expression) {
            result += ` in "${this.context.expression}"`;
        }
        if (this.context.position) {
            result += ` at line ${this.context.position.line}`;
        }
        if (this.context.suggestion) {
            result += `\nSuggestion: ${this.context.suggestion}`;
        }
        return result;
    }
    equals(other, tolerance) {
        if (other.getType() !== 'error') {
            return false;
        }
        const otherError = other;
        return this.errorType === otherError.errorType &&
            this.message === otherError.message;
    }
    // All arithmetic operations on errors return errors
    add(other) {
        return this.propagateError('add', other);
    }
    subtract(other) {
        return this.propagateError('subtract', other);
    }
    multiply(other) {
        return this.propagateError('multiply', other);
    }
    divide(other) {
        return this.propagateError('divide', other);
    }
    power(exponent) {
        return new ErrorValue('runtime', `Cannot raise error to power: ${this.message}`, { cause: this });
    }
    clone() {
        return new ErrorValue(this.errorType, this.message, { ...this.context });
    }
    /**
     * Propagate error through arithmetic operations
     */
    propagateError(operation, other) {
        if (other.getType() === 'error') {
            // Chain multiple errors
            const otherError = other;
            return new ErrorValue('runtime', `Multiple errors in ${operation}: ${this.message}; ${otherError.message}`, { cause: this });
        }
        return new ErrorValue('runtime', `Cannot ${operation} with error: ${this.message}`, {
            ...this.context,
            actualType: other.getType(),
            cause: this
        });
    }
    /**
     * Create a parse error
     */
    static parseError(message, expression, position) {
        return new ErrorValue('parse', message, { expression, position });
    }
    /**
     * Create a syntax error
     */
    static syntaxError(message, expression, suggestion) {
        return new ErrorValue('syntax', message, { expression, suggestion });
    }
    /**
     * Create a semantic error
     */
    static semanticError(message, context) {
        return new ErrorValue('semantic', message, context);
    }
    /**
     * Create a runtime error
     */
    static runtimeError(message, context) {
        return new ErrorValue('runtime', message, context);
    }
    /**
     * Create a type error
     */
    static typeError(message, expectedType, actualType, expression) {
        return new ErrorValue('type', message, {
            expectedType,
            actualType,
            expression,
            suggestion: expectedType ? `Expected ${expectedType} but got ${actualType}` : undefined
        });
    }
    /**
     * Create a conversion error
     */
    static conversionError(message, fromType, toType) {
        return new ErrorValue('conversion', message, {
            suggestion: fromType && toType ? `Cannot convert from ${fromType} to ${toType}` : undefined
        });
    }
    /**
     * Create error from JavaScript Error
     */
    static fromError(error, errorType = 'runtime', context) {
        return new ErrorValue(errorType, error.message, { ...context, cause: error });
    }
    /**
     * Check if a value is an error
     */
    static isError(value) {
        return value instanceof ErrorValue;
    }
    /**
     * Create a chain of errors (for debugging)
     */
    chain(newMessage, newType) {
        return new ErrorValue(newType || this.errorType, `${newMessage}: ${this.message}`, { ...this.context, cause: this });
    }
    /**
     * Get the root cause of an error chain
     */
    getRootCause() {
        let cause = this.context.cause;
        while (cause instanceof ErrorValue && cause.context.cause) {
            cause = cause.context.cause;
        }
        return cause;
    }
    /**
     * Get a user-friendly error message
     */
    getUserMessage() {
        let message = this.message;
        // Add context information
        if (this.context.expectedType && this.context.actualType) {
            message += ` (expected ${this.context.expectedType}, got ${this.context.actualType})`;
        }
        if (this.context.suggestion) {
            message += `\n💡 ${this.context.suggestion}`;
        }
        return message;
    }
    /**
     * Get detailed error information for debugging
     */
    getDebugInfo() {
        const rootCause = this.getRootCause();
        return {
            type: this.errorType,
            message: this.message,
            context: this.context,
            rootCause: rootCause instanceof Error ? rootCause.message :
                rootCause instanceof ErrorValue ? rootCause.message : undefined,
            stack: rootCause instanceof Error ? rootCause.stack : undefined
        };
    }
    getMetadata() {
        return {
            type: this.getType(),
            errorType: this.errorType,
            message: this.message,
            context: this.context,
            isNumeric: false,
            userMessage: this.getUserMessage()
        };
    }
}
exports.ErrorValue = ErrorValue;
