"use strict";
/**
 * @file Date Math Evaluator
 * @description Handles date/time expressions and combined assignments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultDateMathEvaluator = exports.DateMathEvaluator = void 0;
const ast_1 = require("../parsing/ast");
const types_1 = require("../types");
const dateMath_1 = require("../date/dateMath");
class DateMathEvaluator {
    canHandle(node) {
        if ((0, ast_1.isVariableAssignmentNode)(node)) {
            const raw = (node.rawValue || '').trim();
            return !!(0, dateMath_1.parseDateLiteral)(raw);
        }
        if ((0, ast_1.isCombinedAssignmentNode)(node) || (0, ast_1.isExpressionNode)(node)) {
            const expr = (0, ast_1.isExpressionNode)(node) ? node.expression : node.expression;
            return (0, dateMath_1.looksLikeDateExpression)(expr);
        }
        return false;
    }
    evaluate(node, context) {
        if ((0, ast_1.isVariableAssignmentNode)(node)) {
            return this.evaluateVariableAssignment(node, context);
        }
        if ((0, ast_1.isCombinedAssignmentNode)(node)) {
            return this.evaluateCombinedAssignment(node, context);
        }
        if ((0, ast_1.isExpressionNode)(node)) {
            return this.evaluateExpression(node, context);
        }
        return null;
    }
    evaluateVariableAssignment(node, context) {
        const raw = (node.rawValue || '').trim();
        const parsed = (0, dateMath_1.parseDateLiteral)(raw);
        if (!parsed) {
            return null;
        }
        const result = context.variableStore.setVariableWithSemanticValue(node.variableName, parsed, node.rawValue);
        if (!result.success) {
            return this.createErrorNode(result.error || 'Failed to set variable', node.variableName, context.lineNumber);
        }
        return this.createVariableRenderNode(node.variableName, parsed, context.lineNumber, node.raw, this.getDisplayOptions(context));
    }
    evaluateCombinedAssignment(node, context) {
        const result = (0, dateMath_1.evaluateDateExpression)(node.expression, context.variableContext);
        if (!result) {
            return null;
        }
        if (types_1.SemanticValueTypes.isError(result)) {
            return this.createErrorNode(result.getMessage(), node.variableName, context.lineNumber, node.expression);
        }
        const stored = context.variableStore.setVariableWithSemanticValue(node.variableName, result, node.expression);
        if (!stored.success) {
            return this.createErrorNode(stored.error || 'Failed to set variable', node.variableName, context.lineNumber, node.expression);
        }
        return this.createCombinedRenderNode(node.variableName, node.expression, result, context.lineNumber, node.raw, this.getDisplayOptions(context));
    }
    evaluateExpression(node, context) {
        const result = (0, dateMath_1.evaluateDateExpression)(node.expression, context.variableContext);
        if (!result) {
            return null;
        }
        if (types_1.SemanticValueTypes.isError(result)) {
            return this.createErrorNode(result.getMessage(), node.expression, context.lineNumber);
        }
        return this.createMathResultNode(node.expression, result, context.lineNumber, this.getDisplayOptions(context));
    }
    createMathResultNode(expression, value, lineNumber, displayOptions) {
        const valueString = value.toString(displayOptions);
        return {
            type: 'mathResult',
            expression,
            result: valueString,
            displayText: `${expression} => ${valueString}`,
            line: lineNumber,
            originalRaw: expression,
        };
    }
    createCombinedRenderNode(variableName, expression, value, lineNumber, originalRaw, displayOptions) {
        const valueString = value.toString(displayOptions);
        return {
            type: 'combined',
            variableName,
            expression,
            result: valueString,
            displayText: `${variableName} = ${expression} => ${valueString}`,
            line: lineNumber,
            originalRaw,
        };
    }
    createVariableRenderNode(variableName, value, lineNumber, originalRaw, displayOptions) {
        const valueString = value.toString(displayOptions);
        return {
            type: 'variable',
            variableName,
            value: valueString,
            displayText: `${variableName} = ${valueString}`,
            line: lineNumber,
            originalRaw,
        };
    }
    createErrorNode(message, expression, lineNumber, rawExpression) {
        const raw = rawExpression || expression;
        return {
            type: 'error',
            error: message,
            errorType: 'runtime',
            displayText: `${raw} => ⚠️ ${message}`,
            line: lineNumber,
            originalRaw: raw,
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
}
exports.DateMathEvaluator = DateMathEvaluator;
exports.defaultDateMathEvaluator = new DateMathEvaluator();
