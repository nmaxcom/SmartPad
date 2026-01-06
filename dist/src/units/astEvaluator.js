"use strict";
/**
 * Units Expression Evaluator for SmartPad AST Pipeline
 *
 * Integrates units support with SmartPad's existing AST pipeline,
 * handling expressions that contain quantities with units.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitsExpressionEvaluator = void 0;
const ast_1 = require("../parsing/ast");
const unitsEvaluator_1 = require("./unitsEvaluator");
const quantity_1 = require("./quantity");
const types_1 = require("../types");
/**
 * Convert SmartPad variables to units-aware quantities
 */
function convertVariablesToQuantities(variableContext) {
    const quantities = {};
    variableContext.forEach((variable, name) => {
        if (typeof variable.value === "number" || variable.value instanceof types_1.NumberValue) {
            // CRITICAL FIX: Check if the variable has a stored Quantity object
            if (variable.quantity) {
                // Use the stored Quantity object to preserve dimensional information
                quantities[name] = variable.quantity;
            }
            else {
                // Fallback: treat as dimensionless quantity for backward compatibility
                const numericValue = typeof variable.value === "number" ? variable.value : variable.value.getNumericValue();
                quantities[name] = quantity_1.Quantity.dimensionless(numericValue);
            }
        }
    });
    return quantities;
}
/**
 * AST Evaluator for expressions with units
 */
class UnitsExpressionEvaluator {
    canHandle(node) {
        if (!(0, ast_1.isExpressionNode)(node) &&
            !(0, ast_1.isCombinedAssignmentNode)(node) &&
            !(0, ast_1.isVariableAssignmentNode)(node)) {
            return false;
        }
        // For variable assignments, check if the value contains units
        if ((0, ast_1.isVariableAssignmentNode)(node)) {
            const valueStr = node.rawValue || node.parsedValue.toString();
            return (0, unitsEvaluator_1.expressionContainsUnits)(valueStr);
        }
        // For expression and combined assignment nodes, check the expression
        const expression = (0, ast_1.isExpressionNode)(node) ? node.expression : node.expression;
        return (0, unitsEvaluator_1.expressionContainsUnits)(expression);
    }
    evaluate(node, context) {
        if ((0, ast_1.isExpressionNode)(node)) {
            return this.evaluateUnitsExpression(node, context);
        }
        else if ((0, ast_1.isCombinedAssignmentNode)(node)) {
            return this.evaluateUnitsCombinedAssignment(node, context);
        }
        else if ((0, ast_1.isVariableAssignmentNode)(node)) {
            return this.evaluateUnitsVariableAssignment(node, context);
        }
        return null;
    }
    evaluateUnitsExpression(node, context) {
        const { variableContext } = context;
        const displayOptions = this.getDisplayOptions(context);
        try {
            // Convert SmartPad variables to quantities
            const quantities = convertVariablesToQuantities(variableContext);
            // Evaluate the expression with units
            const result = (0, unitsEvaluator_1.evaluateUnitsExpression)(node.expression, quantities);
            if (result.error) {
                return {
                    type: "error",
                    line: node.line,
                    originalRaw: node.raw,
                    error: result.error,
                    errorType: "runtime",
                    displayText: `${node.expression} => ⚠️ ${result.error}`,
                };
            }
            // Format the result with units
            const resultText = this.formatQuantity(result.quantity, displayOptions);
            const displayText = `${node.expression} => ${resultText}`;
            return {
                type: "mathResult",
                line: node.line,
                originalRaw: node.raw,
                expression: node.expression,
                result: resultText,
                displayText,
                units: result.quantity.unit.toString(),
                isUnitsAware: true,
            };
        }
        catch (error) {
            return {
                type: "error",
                line: node.line,
                originalRaw: node.raw,
                error: `Units evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
                errorType: "runtime",
                displayText: `${node.raw} ⚠️ Units evaluation error`,
            };
        }
    }
    evaluateUnitsCombinedAssignment(node, context) {
        const { variableStore, variableContext } = context;
        const displayOptions = this.getDisplayOptions(context);
        try {
            // Convert SmartPad variables to quantities
            const quantities = convertVariablesToQuantities(variableContext);
            // Evaluate the expression with units
            const result = (0, unitsEvaluator_1.evaluateUnitsExpression)(node.expression, quantities);
            if (result.error) {
                return {
                    type: "error",
                    line: node.line,
                    originalRaw: node.raw,
                    error: result.error,
                    errorType: "runtime",
                    displayText: `${node.variableName} = ${node.expression} => ⚠️ ${result.error}`,
                };
            }
            // Store the result as a variable with complete units information
            const now = new Date();
            const existingVariable = variableStore.getVariable(node.variableName);
            const resultText = this.formatQuantity(result.quantity, displayOptions);
            const variable = {
                name: node.variableName,
                value: new types_1.NumberValue(result.quantity.value), // Numeric value for calculations
                rawValue: node.expression, // Original expression
                units: result.quantity.unit.toString(), // Unit string (e.g., "m", "kg", "°C")
                quantity: result.quantity, // CRITICAL: Store complete Quantity object with dimensional info
                createdAt: existingVariable?.createdAt || now,
                updatedAt: now,
            };
            const success = variableStore.setVariableWithMetadata(variable);
            if (!success.success) {
                return {
                    type: "error",
                    line: node.line,
                    originalRaw: node.raw,
                    error: success.error || "Failed to store variable",
                    errorType: "runtime",
                    displayText: `${node.variableName} = ${node.expression} => ⚠️ Variable storage error`,
                };
            }
            // Format the result with units
            const displayText = `${node.variableName} = ${node.expression} => ${resultText}`;
            return {
                type: "combined",
                line: node.line,
                originalRaw: node.raw,
                variableName: node.variableName,
                expression: node.expression,
                result: resultText,
                displayText,
            };
        }
        catch (error) {
            return {
                type: "error",
                line: node.line,
                originalRaw: node.raw,
                error: `Units evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
                errorType: "runtime",
                displayText: `${node.raw} ⚠️ Units evaluation error`,
            };
        }
    }
    evaluateUnitsVariableAssignment(node, context) {
        const { variableContext, variableStore } = context;
        const displayOptions = this.getDisplayOptions(context);
        try {
            // Convert SmartPad variables to quantities
            const quantities = convertVariablesToQuantities(variableContext);
            // Evaluate the value (which contains the units expression) with units
            const valueStr = node.rawValue || node.parsedValue.toString();
            const result = (0, unitsEvaluator_1.evaluateUnitsExpression)(valueStr, quantities);
            if (result.error) {
                return {
                    type: "error",
                    line: node.line,
                    originalRaw: node.raw,
                    error: result.error,
                    errorType: "runtime",
                    displayText: `${node.variableName} = ${valueStr} ⚠️ ${result.error}`,
                };
            }
            // Store the result as a variable with complete units information
            const now = new Date();
            const existingVariable = variableStore.getVariable(node.variableName);
            const resultText = this.formatQuantity(result.quantity, displayOptions);
            const variable = {
                name: node.variableName,
                value: new types_1.NumberValue(result.quantity.value), // Numeric value for calculations
                rawValue: valueStr, // Original expression
                units: result.quantity.unit.toString(), // Unit string (e.g., "m", "kg", "°C")
                quantity: result.quantity, // CRITICAL: Store complete Quantity object with dimensional info
                createdAt: existingVariable?.createdAt || now,
                updatedAt: now,
            };
            const success = variableStore.setVariableWithMetadata(variable);
            if (!success.success) {
                return {
                    type: "error",
                    line: node.line,
                    originalRaw: node.raw,
                    error: success.error || "Failed to store variable",
                    errorType: "runtime",
                    displayText: `${node.variableName} = ${valueStr} ⚠️ Variable storage error`,
                };
            }
            // Format the result with units
            const displayText = `${node.variableName} = ${resultText}`;
            return {
                type: "combined",
                line: node.line,
                originalRaw: node.raw,
                variableName: node.variableName,
                expression: valueStr,
                result: resultText,
                displayText,
            };
        }
        catch (error) {
            return {
                type: "error",
                line: node.line,
                originalRaw: node.raw,
                error: `Units evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
                errorType: "runtime",
                displayText: `${node.raw} ⚠️ Units evaluation error`,
            };
        }
    }
    /**
     * Format a quantity for display with appropriate precision
     */
    formatQuantity(quantity, displayOptions) {
        const precision = displayOptions.precision ?? 6;
        const formattedValue = this.formatScalarValue(quantity.value, precision, displayOptions);
        // Format with units
        const unitStr = quantity.unit.toString();
        if (unitStr === "1") {
            return formattedValue; // dimensionless
        }
        return `${formattedValue} ${unitStr}`;
    }
    formatScalarValue(value, precision, displayOptions) {
        if (!isFinite(value))
            return "Infinity";
        if (value === 0)
            return "0";
        const abs = Math.abs(value);
        const upperThreshold = displayOptions.scientificUpperThreshold ?? 1e12;
        const lowerThreshold = displayOptions.scientificLowerThreshold ?? 1e-4;
        const formatScientific = (num) => {
            const s = num.toExponential(Math.max(0, precision));
            const [mantissa, exp] = s.split("e");
            const shouldTrim = displayOptions.scientificTrimTrailingZeros ?? true;
            const outputMantissa = shouldTrim
                ? mantissa.replace(/(?:\.0+|(\.\d+?)0+)$/, "$1")
                : mantissa;
            return `${outputMantissa}e${exp}`;
        };
        if (abs >= upperThreshold ||
            (abs > 0 && lowerThreshold > 0 && abs < lowerThreshold)) {
            return formatScientific(value);
        }
        if (Number.isInteger(value))
            return value.toString();
        const fixed = value.toFixed(precision);
        const fixedNumber = parseFloat(fixed);
        if (fixedNumber === 0) {
            return formatScientific(value);
        }
        return fixedNumber.toString();
    }
    getDisplayOptions(context) {
        return {
            precision: context.decimalPlaces,
            scientificUpperThreshold: context.scientificUpperThreshold,
            scientificLowerThreshold: context.scientificLowerThreshold,
            scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
        };
    }
}
exports.UnitsExpressionEvaluator = UnitsExpressionEvaluator;
