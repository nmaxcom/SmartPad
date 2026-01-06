"use strict";
/**
 * @file Combined Assignment Evaluator V2 - Semantic Type Version
 * @description Handles combined assignment expressions like "x = 100 =>"
 * where a variable is assigned and its result is shown immediately.
 *
 * This evaluator works with semantic types and processes both the assignment
 * and the evaluation display in one operation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCombinedAssignmentEvaluatorV2 = exports.CombinedAssignmentEvaluatorV2 = void 0;
const ast_1 = require("../parsing/ast");
const types_1 = require("../types");
const expressionParser_1 = require("../parsing/expressionParser");
const expressionComponents_1 = require("../parsing/expressionComponents");
const expressionEvaluatorV2_1 = require("./expressionEvaluatorV2");
/**
 * Evaluator for combined assignment operations with semantic types
 * Handles expressions like "speed = 100 m/s =>"
 */
class CombinedAssignmentEvaluatorV2 {
    /**
     * Check if this evaluator can handle the node
     */
    canHandle(node) {
        return (0, ast_1.isCombinedAssignmentNode)(node);
    }
    /**
     * Evaluate combined assignment and display
     * This does both: store the variable AND show the result
     */
    evaluate(node, context) {
        if (!(0, ast_1.isCombinedAssignmentNode)(node)) {
            return null;
        }
        const combNode = node;
        const conversion = this.extractConversionSuffix(combNode.expression);
        const expression = conversion ? conversion.baseExpression : combNode.expression;
        const components = conversion ? this.parseComponents(expression) : combNode.components;
        try {
            // Debug logging
            console.log('CombinedAssignmentEvaluatorV2: Processing combined assignment:', {
                variableName: combNode.variableName,
                expression,
                raw: combNode.raw
            });
            // Parse the expression as a semantic value when it's a literal,
            // otherwise evaluate via semantic component parsing.
            let semanticValue = types_1.SemanticParsers.parse(expression) ||
                this.resolveVariableReference(expression, context);
            if (!semanticValue && components.length > 0) {
                semanticValue = expressionEvaluatorV2_1.SimpleExpressionParser.parseComponents(components, context);
            }
            if (!semanticValue) {
                semanticValue = expressionEvaluatorV2_1.SimpleExpressionParser.parseArithmetic(expression, context);
            }
            if (!semanticValue) {
                const evalResult = (0, expressionParser_1.parseAndEvaluateExpression)(expression, context.variableContext);
                if (evalResult.error) {
                    if (/Undefined variable|not defined/i.test(evalResult.error)) {
                        semanticValue = types_1.SymbolicValue.from(expression);
                    }
                    else {
                        console.warn("CombinedAssignmentEvaluatorV2: Expression evaluation error:", evalResult.error);
                        return this.createErrorNode(evalResult.error, combNode.variableName, combNode.expression, context.lineNumber);
                    }
                }
                if (!semanticValue) {
                    semanticValue = types_1.NumberValue.from(evalResult.value);
                }
            }
            if (conversion) {
                semanticValue = this.applyUnitConversion(semanticValue, conversion.target, conversion.keyword);
            }
            if (types_1.SemanticValueTypes.isError(semanticValue)) {
                const errorMessage = semanticValue.getMessage();
                return this.createErrorNode(errorMessage, combNode.variableName, combNode.expression, context.lineNumber);
            }
            // Store the variable with its semantic value
            const result = context.variableStore.setVariableWithSemanticValue(combNode.variableName, semanticValue, combNode.expression // Use expression as raw value
            );
            if (!result.success) {
                return this.createErrorNode(result.error || "Failed to set variable", combNode.variableName, combNode.expression, context.lineNumber);
            }
            // Create combined render node that shows both assignment and result
            const displayOptions = this.getDisplayOptions(context);
            const displayValue = types_1.SemanticValueTypes.isSymbolic(semanticValue)
                ? this.substituteKnownValues(expression, context, displayOptions)
                : semanticValue.toString(displayOptions);
            return this.createCombinedRenderNode(combNode.variableName, combNode.expression, semanticValue, displayValue, context.lineNumber, combNode.raw);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.createErrorNode(message, combNode.variableName, combNode.expression, context.lineNumber);
        }
    }
    /**
     * Create a combined render node showing assignment and result
     */
    createCombinedRenderNode(variableName, expression, value, displayValue, lineNumber, originalRaw) {
        const displayText = `${variableName} = ${expression} => ${displayValue}`;
        return {
            type: "combined",
            variableName,
            expression,
            result: displayValue,
            displayText,
            line: lineNumber,
            originalRaw,
        };
    }
    /**
     * Create an error render node
     */
    createErrorNode(message, variableName, expression, lineNumber) {
        return {
            type: "error",
            error: message,
            errorType: "runtime",
            displayText: `${variableName} = ${expression} => ⚠️ ${message}`,
            line: lineNumber,
            originalRaw: `${variableName} = ${expression} =>`,
        };
    }
    resolveVariableReference(expression, context) {
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
    extractConversionSuffix(expression) {
        const match = expression.match(/\b(to|in)\b\s+(.+)$/i);
        if (!match || match.index === undefined) {
            return null;
        }
        const baseExpression = expression.slice(0, match.index).trim();
        if (!baseExpression) {
            return null;
        }
        const target = match[2].trim();
        if (!target) {
            return null;
        }
        return { baseExpression, target, keyword: match[1].toLowerCase() };
    }
    applyUnitConversion(value, target, keyword) {
        const parsed = this.parseConversionTarget(target);
        if (!parsed) {
            return types_1.ErrorValue.semanticError(`Expected unit after '${keyword}'`);
        }
        if (value.getType() === "unit") {
            try {
                return value.convertTo(parsed.unit);
            }
            catch (error) {
                return types_1.ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
            }
        }
        if (value.getType() === "currencyUnit") {
            const currencyValue = value;
            if (parsed.symbol && parsed.symbol !== currencyValue.getSymbol()) {
                return types_1.ErrorValue.semanticError("Cannot convert between different currencies");
            }
            try {
                return currencyValue.convertTo(parsed.unit);
            }
            catch (error) {
                return types_1.ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
            }
        }
        return types_1.ErrorValue.semanticError("Cannot convert non-unit value");
    }
    parseComponents(expression) {
        try {
            return (0, expressionComponents_1.parseExpressionComponents)(expression);
        }
        catch {
            return [];
        }
    }
    parseConversionTarget(target) {
        let raw = target.trim();
        if (!raw) {
            return null;
        }
        let symbol;
        const symbolMatch = raw.match(/^([$€£¥₹₿])\s*(.*)$/);
        if (symbolMatch) {
            symbol = symbolMatch[1];
            raw = symbolMatch[2].trim();
        }
        raw = raw.replace(/^per\b/i, "").trim();
        raw = raw.replace(/^[/*]+/, "").trim();
        const unit = raw.replace(/\s+/g, "");
        if (!unit) {
            return null;
        }
        return { unit, symbol };
    }
    substituteKnownValues(expression, context, displayOptions) {
        const substitutions = new Map();
        const formatValue = (value) => {
            const formatted = value.toString(displayOptions);
            if (/[+\-*/^]/.test(formatted)) {
                return `(${formatted})`;
            }
            return formatted;
        };
        context.variableContext.forEach((variable, name) => {
            const value = variable.value;
            if (!value || types_1.SemanticValueTypes.isSymbolic(value) || types_1.SemanticValueTypes.isError(value)) {
                return;
            }
            substitutions.set(name.replace(/\s+/g, " ").trim(), formatValue(value));
        });
        context.variableStore.getAllVariables().forEach((variable) => {
            const value = variable.value;
            if (!value || types_1.SemanticValueTypes.isSymbolic(value) || types_1.SemanticValueTypes.isError(value)) {
                return;
            }
            const normalized = variable.name.replace(/\s+/g, " ").trim();
            if (!substitutions.has(normalized)) {
                substitutions.set(normalized, formatValue(value));
            }
        });
        if (substitutions.size === 0) {
            return expression;
        }
        const names = Array.from(substitutions.keys()).sort((a, b) => b.length - a.length);
        const isBoundary = (char) => !char || /[\s+\-*/^%()=<>!,]/.test(char);
        let result = "";
        let pos = 0;
        while (pos < expression.length) {
            let replaced = false;
            for (const name of names) {
                if (!expression.startsWith(name, pos)) {
                    continue;
                }
                const before = pos > 0 ? expression[pos - 1] : undefined;
                const after = pos + name.length < expression.length ? expression[pos + name.length] : undefined;
                if (isBoundary(before) && isBoundary(after)) {
                    result += substitutions.get(name);
                    pos += name.length;
                    replaced = true;
                    break;
                }
            }
            if (!replaced) {
                result += expression[pos];
                pos += 1;
            }
        }
        return result;
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
}
exports.CombinedAssignmentEvaluatorV2 = CombinedAssignmentEvaluatorV2;
exports.defaultCombinedAssignmentEvaluatorV2 = new CombinedAssignmentEvaluatorV2();
