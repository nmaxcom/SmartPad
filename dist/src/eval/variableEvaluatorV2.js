"use strict";
/**
 * @file Variable Evaluator V2 - Semantic Type Version
 * @description Updated variable evaluator that works with semantic types.
 * Much simpler than the original - no type detection needed since values
 * are already parsed into SemanticValues during AST creation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultVariableEvaluatorV2 = exports.VariableEvaluatorV2 = void 0;
const ast_1 = require("../parsing/ast");
const types_1 = require("../types");
const expressionParser_1 = require("../parsing/expressionParser");
const expressionComponents_1 = require("../parsing/expressionComponents");
const expressionEvaluatorV2_1 = require("./expressionEvaluatorV2");
/**
 * Semantic-aware variable evaluator
 * Handles variable assignments where values are already parsed into SemanticValues
 */
class VariableEvaluatorV2 {
    /**
     * Check if this evaluator can handle the node
     * Simply checks for variable assignment nodes
     */
    canHandle(node) {
        return (0, ast_1.isVariableAssignmentNode)(node);
    }
    /**
     * Evaluate variable assignment
     * Much simpler now - just store the pre-parsed semantic value
     */
    evaluate(node, context) {
        if (!(0, ast_1.isVariableAssignmentNode)(node)) {
            return null;
        }
        const varNode = node;
        try {
            // Debug logging
            console.log('VariableEvaluatorV2: Processing variable assignment:', {
                variableName: varNode.variableName,
                rawValue: varNode.rawValue,
                parsedValue: varNode.parsedValue,
                parsedValueType: varNode.parsedValue?.getType()
            });
            // The value is already parsed as a SemanticValue!
            let semanticValue = varNode.parsedValue;
            // Check if parsing resulted in an error
            if (types_1.SemanticValueTypes.isError(semanticValue)) {
                const errorValue = semanticValue;
                // If this looks like a non-literal expression, try evaluating it numerically
                if (errorValue.getErrorType() === "parse" && varNode.rawValue) {
                    let resolvedValue;
                    try {
                        resolvedValue = expressionEvaluatorV2_1.SimpleExpressionParser.parseComponents((0, expressionComponents_1.parseExpressionComponents)(varNode.rawValue), context);
                    }
                    catch (parseError) {
                        resolvedValue = types_1.ErrorValue.parseError(parseError instanceof Error ? parseError.message : String(parseError));
                    }
                    if (!resolvedValue || types_1.SemanticValueTypes.isError(resolvedValue)) {
                        const evalResult = (0, expressionParser_1.parseAndEvaluateExpression)(varNode.rawValue, context.variableContext);
                        if (evalResult.error) {
                            if (/Undefined variable|not defined/i.test(evalResult.error)) {
                                resolvedValue = types_1.SymbolicValue.from(varNode.rawValue);
                            }
                            else {
                                console.warn("VariableEvaluatorV2: Expression evaluation error:", evalResult.error);
                                return this.createErrorNode(`Invalid variable value: ${evalResult.error}`, varNode.variableName, context.lineNumber);
                            }
                        }
                        if (!resolvedValue || types_1.SemanticValueTypes.isError(resolvedValue)) {
                            resolvedValue = types_1.NumberValue.from(evalResult.value);
                        }
                    }
                    if (resolvedValue) {
                        semanticValue = resolvedValue;
                    }
                }
                else {
                    console.warn("VariableEvaluatorV2: Semantic value is an error:", errorValue.getMessage());
                    return this.createErrorNode(`Invalid variable value: ${errorValue.getMessage()}`, varNode.variableName, context.lineNumber);
                }
            }
            // Store the variable with its semantic value
            const result = context.variableStore.setVariableWithSemanticValue(varNode.variableName, semanticValue, varNode.rawValue);
            if (!result.success) {
                return this.createErrorNode(result.error || "Failed to set variable", varNode.variableName, context.lineNumber);
            }
            // Create render node showing the assignment
            return this.createVariableRenderNode(varNode.variableName, semanticValue, context.lineNumber, varNode.raw, this.getDisplayOptions(context));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.createErrorNode(message, varNode.variableName, context.lineNumber);
        }
    }
    /**
     * Create a variable render node
     */
    createVariableRenderNode(variableName, value, lineNumber, originalRaw, displayOptions) {
        const valueString = value.toString(displayOptions);
        const displayText = `${variableName} = ${valueString}`;
        return {
            type: "variable",
            variableName,
            value: valueString,
            displayText,
            line: lineNumber,
            originalRaw,
        };
    }
    /**
     * Create an error render node
     */
    createErrorNode(message, variableName, lineNumber) {
        return {
            type: "error",
            error: message,
            errorType: "runtime",
            displayText: `${variableName} => ⚠️ ${message}`,
            line: lineNumber,
            originalRaw: variableName,
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
exports.VariableEvaluatorV2 = VariableEvaluatorV2;
exports.defaultVariableEvaluatorV2 = new VariableEvaluatorV2();
