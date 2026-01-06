"use strict";
/**
 * @file Percentage Expression Evaluator V2 - Semantic Type Version
 * @description Updated percentage evaluator that works with semantic types.
 * No more regex-based type detection! Uses parsed SemanticValues from AST nodes.
 *
 * Supports percentage operations:
 * - "20% of 100" -> 20
 * - "100 + 20%" -> 120
 * - "100 - 20%" -> 80
 * - "20% * 5" -> 100%
 * - "what percent is 20 of 100" -> 20%
 * - "0.2 as %" -> 20%
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PercentageExpressionEvaluatorV2 = void 0;
const ast_1 = require("../parsing/ast");
const types_1 = require("../types");
const mathEvaluator_1 = require("../parsing/mathEvaluator");
/**
 * Expression parser for percentage operations
 */
class PercentageExpressionParser {
    /**
     * Parse "X% of Y" pattern
     */
    static parsePercentOf(expr) {
        const match = expr.match(/^\s*(\d+(?:\.\d+)?)\s*%\s*of\s+(.+)$/i);
        if (!match)
            return null;
        return {
            percent: parseFloat(match[1]),
            baseExpr: match[2].trim()
        };
    }
    /**
     * Parse "X% on/off Y" pattern
     */
    static parsePercentOnOff(expr) {
        const match = expr.match(/^\s*(\d+(?:\.\d+)?)\s*%\s*(on|off)\s+(.+)$/i);
        if (!match)
            return null;
        return {
            percent: parseFloat(match[1]),
            operation: match[2].toLowerCase(),
            baseExpr: match[3].trim()
        };
    }
    /**
     * Parse "A is what % of B" pattern
     */
    static parseWhatPercent(expr) {
        const match = expr.match(/^\s*(.+?)\s+is\s+what\s+%\s+of\s+(.+)$/i);
        if (match) {
            return { partExpr: match[1].trim(), baseExpr: match[2].trim() };
        }
        // Also handle "what % is A of B"
        const match2 = expr.match(/^\s*what\s+%\s+is\s+(.+?)\s+of\s+(.+)$/i);
        if (match2) {
            return { partExpr: match2[1].trim(), baseExpr: match2[2].trim() };
        }
        return null;
    }
    /**
     * Parse "A of B is %" pattern
     */
    static parsePartOfBaseIsPercent(expr) {
        const match = expr.match(/^\s*(.+?)\s+of\s+(.+?)\s+is\s+%\s*$/i);
        if (!match)
            return null;
        return {
            partExpr: match[1].trim(),
            baseExpr: match[2].trim(),
        };
    }
    /**
     * Parse "X as %" pattern
     */
    static parseAsPercent(expr) {
        const match = expr.match(/^(.+?)\s+as\s+%$/i);
        if (!match)
            return null;
        return { valueExpr: match[1].trim() };
    }
}
/**
 * Semantic-aware percentage expression evaluator
 * Uses parsed SemanticValues instead of string parsing
 */
class PercentageExpressionEvaluatorV2 {
    /**
     * Check if this evaluator can handle the node
     * Now much simpler - just look for percentage-related patterns
     */
    canHandle(node) {
        if (!((0, ast_1.isExpressionNode)(node) || (0, ast_1.isCombinedAssignmentNode)(node))) {
            return false;
        }
        const expr = (0, ast_1.isExpressionNode)(node)
            ? node.expression
            : node.expression;
        // Check for percentage operation patterns that need special handling
        if (/\d+(?:\.\d+)?\s*%\s*of\s+/.test(expr))
            return true; // "20% of 100"
        if (/\d+(?:\.\d+)?\s*%\s*(on|off)\s+/.test(expr))
            return true; // "20% on/off 100"
        if (/\bis\s+what\s+%\s+of\b/.test(expr))
            return true; // "A is what % of B"
        if (/^what\s+%\s+is\b/.test(expr))
            return true; // "what % is A of B"
        if (/\bas\s+%\s*$/.test(expr))
            return true; // "0.2 as %"
        if (/\bof\b/.test(expr))
            return true; // Implicit "X of Y" patterns
        if (/\b(on|off)\b/.test(expr))
            return true; // "discount on/off 100"
        if (this.parseTrailingPercentChain(expr))
            return true; // "base + 10% - 5%"
        if (this.maybePercentVariableChain(expr))
            return true; // "base + discount"
        // Let semantic arithmetic handle plain % literals in regular math expressions.
        return false;
    }
    /**
     * Evaluate percentage expressions using semantic types
     */
    evaluate(node, context) {
        try {
            const isExpr = (0, ast_1.isExpressionNode)(node);
            const expression = isExpr
                ? node.expression
                : node.expression;
            if (this.shouldSkipDueToPhraseVariable(expression, context)) {
                return null;
            }
            const directValue = this.resolveDirectVariableReference(expression, context);
            if (directValue) {
                if (types_1.SemanticValueTypes.isError(directValue)) {
                    return this.createErrorNode(directValue.getMessage(), expression, context.lineNumber);
                }
                return isExpr
                    ? this.createMathResultNode(expression, directValue, context.lineNumber, context)
                    : this.createCombinedNode(node, directValue, context);
            }
            const result = this.evaluatePercentageExpression(expression, context);
            if (!result) {
                if (!this.containsPercentageSyntax(expression)) {
                    return null;
                }
                return this.createErrorNode("Could not evaluate percentage expression", expression, context.lineNumber);
            }
            if (types_1.SemanticValueTypes.isError(result)) {
                return this.createErrorNode(result.getMessage(), expression, context.lineNumber);
            }
            // Create render node
            if (isExpr) {
                return this.createMathResultNode(expression, result, context.lineNumber, context);
            }
            else {
                return this.createCombinedNode(node, result, context);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.createErrorNode(message, '', context.lineNumber);
        }
    }
    /**
     * Evaluate a percentage expression string and return a SemanticValue
     */
    evaluatePercentageExpression(expression, context) {
        let result = null;
        // Try "X% of Y" pattern
        const percentOf = PercentageExpressionParser.parsePercentOf(expression);
        if (percentOf) {
            result = this.evaluatePercentOf(percentOf.percent, percentOf.baseExpr, context);
        }
        // Try base +/- percent variable chain (e.g., "price + tax")
        if (!result) {
            result = this.evaluatePercentVariableChain(expression, context);
        }
        // Try "X% on/off Y" pattern
        if (!result) {
            const percentOnOff = PercentageExpressionParser.parsePercentOnOff(expression);
            if (percentOnOff) {
                result = this.evaluatePercentOnOff(percentOnOff.percent, percentOnOff.operation, percentOnOff.baseExpr, context);
            }
        }
        // Try "X on/off Y" where X is a percentage variable/expression
        if (!result) {
            result = this.evaluatePercentVariableOnOff(expression, context);
        }
        // Try "A is what % of B" pattern
        if (!result) {
            const whatPercent = PercentageExpressionParser.parseWhatPercent(expression);
            if (whatPercent) {
                result = this.evaluateWhatPercent(whatPercent.partExpr, whatPercent.baseExpr, context);
            }
        }
        // Try "A of B is %" pattern
        if (!result) {
            const partOfBase = PercentageExpressionParser.parsePartOfBaseIsPercent(expression);
            if (partOfBase) {
                result = this.evaluateWhatPercent(partOfBase.partExpr, partOfBase.baseExpr, context);
            }
        }
        // Try "X as %" pattern
        if (!result) {
            const asPercent = PercentageExpressionParser.parseAsPercent(expression);
            if (asPercent) {
                result = this.evaluateAsPercent(asPercent.valueExpr, context);
            }
        }
        // Try base +/- percent chain (e.g., "500 - 10% - 5%")
        if (!result) {
            result = this.evaluateAdditivePercentageChain(expression, context);
        }
        // Try implicit "X of Y" where X is a percent-like value
        if (!result) {
            result = this.evaluateImplicitPercentOf(expression, context);
        }
        // If no specific pattern matched, try general percentage arithmetic
        if (!result) {
            result = this.evaluateGeneralPercentageExpression(expression, context);
        }
        return result;
    }
    maybePercentVariableChain(expression) {
        return /[+\-]\s*[a-zA-Z_][a-zA-Z0-9_]*\s*$/.test(expression.trim());
    }
    /**
     * Evaluate "20% of 100" -> 20
     */
    evaluatePercentOf(percent, baseExpr, context) {
        const percentValue = new types_1.PercentageValue(percent);
        const baseValue = this.evaluateSubExpression(baseExpr, context);
        if (types_1.SemanticValueTypes.isSymbolic(baseValue)) {
            return types_1.SymbolicValue.from(`${percent}% of ${baseExpr}`);
        }
        if (types_1.SemanticValueTypes.isError(baseValue)) {
            return baseValue;
        }
        return percentValue.of(baseValue);
    }
    /**
     * Evaluate "base +/- percent" chains like "500 - 10% - 5%"
     */
    evaluateAdditivePercentageChain(expression, context) {
        const parsed = this.parseTrailingPercentChain(expression);
        if (!parsed)
            return null;
        const baseValue = this.evaluateSubExpression(parsed.baseExpr, context);
        if (types_1.SemanticValueTypes.isSymbolic(baseValue)) {
            return types_1.SymbolicValue.from(expression);
        }
        if (types_1.SemanticValueTypes.isError(baseValue)) {
            return baseValue;
        }
        let current = baseValue;
        for (const op of parsed.ops) {
            const percentValue = new types_1.PercentageValue(op.percent);
            current = op.sign === "+" ? percentValue.on(current) : percentValue.off(current);
        }
        return current;
    }
    /**
     * Evaluate implicit "X of Y" where X is a percent-like value (number or percentage)
     */
    evaluateImplicitPercentOf(expression, context) {
        const match = expression.match(/^\s*(.+?)\s+of\s+(.+)$/i);
        if (!match)
            return null;
        const leftValue = this.evaluateSubExpression(match[1], context);
        const rightValue = this.evaluateSubExpression(match[2], context);
        if (types_1.SemanticValueTypes.isSymbolic(leftValue) || types_1.SemanticValueTypes.isSymbolic(rightValue)) {
            return types_1.SymbolicValue.from(expression);
        }
        if (types_1.SemanticValueTypes.isError(leftValue))
            return leftValue;
        if (types_1.SemanticValueTypes.isError(rightValue))
            return rightValue;
        if (types_1.SemanticValueTypes.isPercentage(leftValue)) {
            return leftValue.of(rightValue);
        }
        if (leftValue.isNumeric()) {
            const percentValue = new types_1.PercentageValue(leftValue.getNumericValue());
            return percentValue.of(rightValue);
        }
        return types_1.ErrorValue.typeError("Left side of 'of' must be numeric or percentage", undefined, leftValue.getType());
    }
    /**
     * Evaluate "20% on 100" -> 120 or "20% off 100" -> 80
     */
    evaluatePercentOnOff(percent, operation, baseExpr, context) {
        const percentValue = new types_1.PercentageValue(percent);
        const baseValue = this.evaluateSubExpression(baseExpr, context);
        if (types_1.SemanticValueTypes.isSymbolic(baseValue)) {
            return types_1.SymbolicValue.from(`${percent}% ${operation} ${baseExpr}`);
        }
        if (types_1.SemanticValueTypes.isError(baseValue)) {
            return baseValue;
        }
        if (operation === 'on') {
            return percentValue.on(baseValue);
        }
        else {
            return percentValue.off(baseValue);
        }
    }
    /**
     * Evaluate "discount on 80" / "discount off 80" where discount is a percentage value
     */
    evaluatePercentVariableOnOff(expression, context) {
        const match = expression.match(/^\s*(.+?)\s+(on|off)\s+(.+)$/i);
        if (!match)
            return null;
        const leftValue = this.evaluateSubExpression(match[1], context);
        if (types_1.SemanticValueTypes.isSymbolic(leftValue)) {
            return types_1.SymbolicValue.from(expression);
        }
        if (types_1.SemanticValueTypes.isError(leftValue)) {
            return leftValue;
        }
        if (!types_1.SemanticValueTypes.isPercentage(leftValue)) {
            return types_1.ErrorValue.typeError("Left side of on/off must be a percentage", "percentage", leftValue.getType());
        }
        const baseValue = this.evaluateSubExpression(match[3], context);
        if (types_1.SemanticValueTypes.isSymbolic(baseValue)) {
            return types_1.SymbolicValue.from(expression);
        }
        if (types_1.SemanticValueTypes.isError(baseValue)) {
            return baseValue;
        }
        return match[2].toLowerCase() === "on"
            ? leftValue.on(baseValue)
            : leftValue.off(baseValue);
    }
    /**
     * Evaluate "what percent is 20 of 100" -> 20%
     */
    evaluateWhatPercent(partExpr, baseExpr, context) {
        const partValue = this.evaluateSubExpression(partExpr, context);
        const baseValue = this.evaluateSubExpression(baseExpr, context);
        if (types_1.SemanticValueTypes.isSymbolic(partValue) || types_1.SemanticValueTypes.isSymbolic(baseValue)) {
            return types_1.SymbolicValue.from(`${partExpr} is what % of ${baseExpr}`);
        }
        if (types_1.SemanticValueTypes.isError(partValue))
            return partValue;
        if (types_1.SemanticValueTypes.isError(baseValue))
            return baseValue;
        return types_1.PercentageValue.whatPercentOf(partValue, baseValue);
    }
    /**
     * Evaluate "0.2 as %" -> 20%
     */
    evaluateAsPercent(valueExpr, context) {
        const value = this.evaluateSubExpression(valueExpr, context);
        if (types_1.SemanticValueTypes.isSymbolic(value)) {
            return types_1.SymbolicValue.from(`${valueExpr} as %`);
        }
        if (types_1.SemanticValueTypes.isError(value)) {
            return value;
        }
        if (!value.isNumeric()) {
            return types_1.ErrorValue.typeError("Cannot convert non-numeric value to percentage", 'percentage', value.getType());
        }
        return types_1.PercentageValue.fromDecimal(value.getNumericValue());
    }
    /**
     * Handle general percentage expressions that don't match specific patterns
     */
    evaluateGeneralPercentageExpression(expression, context) {
        // This is a simplified version - in a full implementation, 
        // we'd parse the expression tree and handle complex arithmetic
        // For now, just try to evaluate simple cases
        const trimmed = expression.trim();
        // Check if it's just a percentage literal
        if (trimmed.match(/^\d+(?:\.\d+)?%$/)) {
            const match = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
            if (match) {
                return new types_1.PercentageValue(parseFloat(match[1]));
            }
        }
        return null;
    }
    parseTrailingPercentChain(expression) {
        let expr = expression.trim();
        const ops = [];
        const tailRegex = /([+\-])\s*(\d+(?:\.\d+)?)\s*%\s*$/;
        while (true) {
            const match = tailRegex.exec(expr);
            if (!match)
                break;
            ops.push({ sign: match[1], percent: parseFloat(match[2]) });
            expr = expr.slice(0, match.index).trim();
        }
        if (ops.length === 0 || !expr) {
            return null;
        }
        return { baseExpr: expr, ops: ops.reverse() };
    }
    containsPercentageSyntax(expr) {
        return (/%/.test(expr) ||
            /\bof\b/.test(expr) ||
            /\bon\b/.test(expr) ||
            /\boff\b/.test(expr) ||
            /\bis\s+%\b/.test(expr) ||
            /\bas\s+%\b/.test(expr));
    }
    evaluateArithmeticExpression(expr, context) {
        if (/[€$£¥₹₿%]/.test(expr)) {
            return null;
        }
        const variables = this.buildNumericContext(context.variableContext);
        const result = (0, mathEvaluator_1.evaluateMath)(expr, variables);
        if (result.error) {
            if (/Undefined variable|not defined/i.test(result.error)) {
                return types_1.SymbolicValue.from(expr);
            }
            return types_1.ErrorValue.semanticError(result.error);
        }
        return new types_1.NumberValue(result.value);
    }
    buildNumericContext(variableContext) {
        const context = {};
        variableContext.forEach((variable, name) => {
            const value = variable?.value;
            if (value instanceof types_1.SemanticValue) {
                if (value.isNumeric()) {
                    context[name] = value.getNumericValue();
                }
            }
            else if (typeof value === "number") {
                context[name] = value;
            }
        });
        return context;
    }
    /**
     * Evaluate a sub-expression (could be variable, literal, etc.)
     */
    evaluateSubExpression(expr, context, options = {}) {
        const normalized = expr.replace(/\s+/g, " ").trim();
        if (!options.skipPercentVariableChain) {
            const percentVariableResult = this.evaluatePercentVariableChain(normalized, context);
            if (percentVariableResult) {
                return percentVariableResult;
            }
        }
        // Try to get variable first
        const variable = context.variableContext.get(normalized);
        if (variable) {
            const value = variable.value;
            if (value instanceof types_1.SemanticValue) {
                return value;
            }
            if (typeof value === "number") {
                return types_1.NumberValue.from(value);
            }
            if (typeof value === "string") {
                const parsedValue = this.parseLiteral(value.trim());
                if (parsedValue)
                    return parsedValue;
            }
        }
        // Try nested percentage expressions
        if (this.containsPercentageSyntax(normalized)) {
            const percentResult = this.evaluatePercentageExpression(normalized, context);
            if (percentResult) {
                return percentResult;
            }
        }
        // Try to parse as literal
        const parsed = this.parseLiteral(normalized);
        if (parsed) {
            return parsed;
        }
        // Try to evaluate as arithmetic expression
        const arithmetic = this.evaluateArithmeticExpression(normalized, context);
        if (arithmetic) {
            return arithmetic;
        }
        // If we can't resolve it, return an error
        return types_1.ErrorValue.semanticError(`Cannot resolve expression: "${expr}"`);
    }
    evaluatePercentVariableChain(expression, context) {
        let expr = expression.trim();
        const ops = [];
        const tailRegex = /([+\-])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;
        while (true) {
            const match = tailRegex.exec(expr);
            if (!match)
                break;
            const percentInfo = this.getPercentVariableInfo(match[2], context);
            if (!percentInfo)
                break;
            ops.push({ sign: match[1], percent: percentInfo.percent, symbol: percentInfo.symbol });
            expr = expr.slice(0, match.index).trim();
        }
        if (ops.length === 0 || !expr)
            return null;
        const baseValue = this.evaluateSubExpression(expr, context, { skipPercentVariableChain: true });
        if (types_1.SemanticValueTypes.isSymbolic(baseValue)) {
            return types_1.SymbolicValue.from(expression);
        }
        if (types_1.SemanticValueTypes.isError(baseValue)) {
            return baseValue;
        }
        let current = baseValue;
        for (const op of ops.reverse()) {
            if (current instanceof types_1.CurrencyValue && op.symbol && op.symbol !== current.getSymbol()) {
                return types_1.ErrorValue.semanticError("Cannot apply percentage with different currency symbol");
            }
            current = op.sign === "+" ? op.percent.on(current) : op.percent.off(current);
        }
        return current;
    }
    getPercentVariableInfo(variableName, context) {
        const variable = context.variableContext.get(variableName);
        if (!variable)
            return null;
        const value = variable.value;
        const rawValue = variable.rawValue;
        const symbolMatch = rawValue ? String(rawValue).match(/[$€£¥₹₿]/) : null;
        const symbol = symbolMatch ? symbolMatch[0] : undefined;
        if (value instanceof types_1.PercentageValue) {
            return { percent: value, symbol };
        }
        const percentMatch = rawValue ? String(rawValue).match(/(\d+(?:\.\d+)?)\s*%/) : null;
        if (percentMatch) {
            return { percent: new types_1.PercentageValue(parseFloat(percentMatch[1])), symbol };
        }
        return null;
    }
    /**
     * Parse a literal value into a SemanticValue
     */
    parseLiteral(str) {
        const parsed = types_1.SemanticParsers.parse(str);
        return parsed && !types_1.SemanticValueTypes.isError(parsed) ? parsed : null;
    }
    /**
     * Create render nodes
     */
    createMathResultNode(expression, result, lineNumber, context) {
        const resultString = result.toString(this.getDisplayOptions(context));
        const displayText = `${expression} => ${resultString}`;
        return {
            type: "mathResult",
            expression,
            result: resultString,
            displayText,
            line: lineNumber,
            originalRaw: expression,
        };
    }
    createCombinedNode(node, result, context) {
        const resultString = result.toString(this.getDisplayOptions(context));
        const displayText = `${node.variableName} = ${node.expression} => ${resultString}`;
        // Store the result in the variable store
        context.variableStore.setVariableWithSemanticValue(node.variableName, result, node.expression);
        return {
            type: "combined",
            variableName: node.variableName,
            expression: node.expression,
            result: resultString,
            displayText,
            line: context.lineNumber,
            originalRaw: `${node.variableName} = ${node.expression}`,
        };
    }
    createErrorNode(message, expression, lineNumber) {
        return {
            type: "error",
            error: message,
            errorType: "runtime",
            displayText: `${expression} => ⚠️ ${message}`,
            line: lineNumber,
            originalRaw: expression,
        };
    }
    getDisplayOptions(context) {
        return {
            precision: context.decimalPlaces,
            scientificUpperThreshold: context.scientificUpperThreshold,
            scientificLowerThreshold: context.scientificLowerThreshold,
            scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
            dateFormat: context.dateDisplayFormat,
            dateLocale: context.dateLocale,
        };
    }
    resolveDirectVariableReference(expression, context) {
        const trimmed = expression.trim();
        if (!/^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(trimmed)) {
            return null;
        }
        const normalized = trimmed.replace(/\s+/g, " ").trim();
        const variable = context.variableContext.get(normalized);
        if (!variable) {
            return null;
        }
        const value = variable.value;
        if (value instanceof types_1.SemanticValue) {
            return value;
        }
        if (typeof value === "number") {
            return types_1.NumberValue.from(value);
        }
        if (typeof value === "string") {
            const parsed = types_1.SemanticParsers.parse(value.trim());
            if (parsed) {
                return parsed;
            }
        }
        return types_1.ErrorValue.semanticError(`Variable "${normalized}" has unsupported type`);
    }
    shouldSkipDueToPhraseVariable(expression, context) {
        const normalized = expression.replace(/\s+/g, " ").trim();
        if (!normalized.includes(" of ")) {
            return false;
        }
        const hasExplicitPercentSyntax = /%/.test(normalized) ||
            /\b(on|off)\b/.test(normalized) ||
            /\bwhat\s+%\b/.test(normalized) ||
            /\b(as|is)\s+%\b/.test(normalized);
        if (hasExplicitPercentSyntax) {
            return false;
        }
        const variableNames = Array.from(context.variableContext.keys()).map((name) => name.replace(/\s+/g, " ").trim());
        return variableNames.some((name) => name.includes(" of ") && normalized.includes(name));
    }
}
exports.PercentageExpressionEvaluatorV2 = PercentageExpressionEvaluatorV2;
