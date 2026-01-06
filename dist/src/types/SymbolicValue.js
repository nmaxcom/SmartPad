"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolicValue = void 0;
const SemanticValue_1 = require("./SemanticValue");
class SymbolicValue extends SemanticValue_1.SemanticValue {
    expression;
    constructor(expression) {
        super();
        this.expression = expression.trim();
    }
    static from(expression) {
        return new SymbolicValue(expression);
    }
    getType() {
        return "symbolic";
    }
    getNumericValue() {
        return Number.NaN;
    }
    isNumeric() {
        return false;
    }
    canConvertTo(_targetType) {
        return false;
    }
    toString(_options) {
        return this.expression;
    }
    equals(other) {
        return other.getType() === "symbolic" && other.toString() === this.expression;
    }
    add(other) {
        return SymbolicValue.combine(this.expression, "+", other.toString());
    }
    subtract(other) {
        return SymbolicValue.combine(this.expression, "-", other.toString());
    }
    multiply(other) {
        return SymbolicValue.combine(this.expression, "*", other.toString());
    }
    divide(other) {
        return SymbolicValue.combine(this.expression, "/", other.toString());
    }
    power(exponent) {
        return SymbolicValue.combine(this.expression, "^", exponent.toString());
    }
    clone() {
        return new SymbolicValue(this.expression);
    }
    static combine(left, op, right) {
        const leftExpr = SymbolicValue.wrapIfNeeded(left);
        const rightExpr = SymbolicValue.wrapIfNeeded(right);
        return new SymbolicValue(`${leftExpr} ${op} ${rightExpr}`);
    }
    static wrapIfNeeded(expr) {
        const trimmed = expr.trim();
        if (!trimmed)
            return trimmed;
        if (!/\s|[+\-*/^]/.test(trimmed)) {
            return trimmed;
        }
        return `(${trimmed})`;
    }
}
exports.SymbolicValue = SymbolicValue;
