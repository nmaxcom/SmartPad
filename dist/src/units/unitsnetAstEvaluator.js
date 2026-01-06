"use strict";
/**
 * UnitsNet.js AST Evaluator for SmartPad
 *
 * 🎯 KEY INTEGRATION INSIGHT:
 * This evaluator acts as a bridge between SmartPad's expression parsing and UnitsNet's
 * unit-aware calculations. It handles the conversion of parsed expressions into UnitsNet
 * operations while preserving SmartPad's variable system and display formatting.
 *
 * RESPONSIBILITY SEPARATION:
 * - Expression parsing: handled by SmartPad's existing AST system
 * - Unit operations: delegated to UnitsNet via unitsnetEvaluator
 * - Physics relationships: handled by SmartPadQuantity's physics-aware methods
 * - Display formatting: handled here with smart unit display thresholds
 *
 * This keeps the AST evaluator focused on orchestration rather than reimplementing
 * unit logic that UnitsNet already handles well.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitsNetExpressionEvaluator = void 0;
const ast_1 = require("../parsing/ast");
const unitsnetEvaluator_1 = require("./unitsnetEvaluator");
const types_1 = require("../types");
const expressionComponents_1 = require("../parsing/expressionComponents");
function rewriteSimpleTimeLiterals(expression) {
    return expression.replace(/(\d+(?:\.\d+)?)\s*(h|min|day)\b/g, (_m, num, unit) => {
        const v = parseFloat(num);
        const seconds = unit === "h" ? v * 3600 : unit === "min" ? v * 60 : v * 86400;
        return `${seconds} s`;
    });
}
function parsePercentFromVariable(variable) {
    if (!variable)
        return null;
    const candidates = [
        variable.value.toString(),
        variable.rawValue,
    ];
    for (const cand of candidates) {
        if (!cand)
            continue;
        const s = String(cand).trim();
        const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
        if (m)
            return parseFloat(m[1]);
    }
    return null;
}
function currencySymbolFromVariable(variable) {
    if (!variable)
        return null;
    const candidates = [
        variable.value.toString(),
        variable.rawValue,
    ];
    for (const cand of candidates) {
        if (!cand)
            continue;
        const m = String(cand)
            .trim()
            .match(/^([$€£])/);
        if (m)
            return m[1];
    }
    return null;
}
function rewritePercentVariableAddition(expression, variableContext) {
    // Support chains: BASE (+|-) pv1 (+|-) pv2 ... where pvN are variables that look like percents
    let expr = expression.trim();
    const ops = [];
    const endRe = /([+\-])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;
    while (true) {
        const m = endRe.exec(expr);
        if (!m)
            break;
        const sign = m[1];
        const varName = m[2];
        const variable = variableContext.get(varName);
        const p = parsePercentFromVariable(variable);
        if (p === null)
            break;
        ops.push({ sign, p, varName, varSymbol: currencySymbolFromVariable(variable) });
        expr = expr.slice(0, m.index).trim();
    }
    if (ops.length === 0)
        return { expression };
    const baseExpr = expr;
    // Detect base currency symbol if base is a single identifier with currency-like display
    let baseCurrencySymbol;
    const baseVarMatch = baseExpr.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
    if (baseVarMatch) {
        baseCurrencySymbol =
            currencySymbolFromVariable(variableContext.get(baseVarMatch[0])) || undefined;
    }
    // Guard: currency mismatch between base and any percent var symbol
    for (const op of ops) {
        if (op.varSymbol && baseCurrencySymbol && op.varSymbol !== baseCurrencySymbol) {
            throw new Error("Cannot mix different currency symbols with percent modifiers");
        }
    }
    const factors = ops.map((o) => (o.sign === "+" ? `1 + ${o.p / 100}` : `1 - ${o.p / 100}`));
    const rewrittenExpr = `(${baseExpr}) * ${factors.map((f) => `(${f})`).join(" * ")}`;
    return { expression: rewrittenExpr, currencySymbol: baseCurrencySymbol };
}
/**
 * Convert SmartPad variables to unitsnet-js quantities
 */
function convertVariablesToUnitsNetQuantities(variableContext) {
    const quantities = {};
    variableContext.forEach((variable, name) => {
        if (variable.value instanceof types_1.UnitValue || variable.value instanceof types_1.NumberValue) {
            quantities[name] = variable.value;
            return;
        }
        if (variable.value instanceof types_1.DateValue) {
            return;
        }
        if (variable.value instanceof types_1.SymbolicValue || variable.value instanceof types_1.ErrorValue) {
            return;
        }
        const numericValue = variable.value.getNumericValue();
        if (!Number.isFinite(numericValue)) {
            return;
        }
        quantities[name] = new types_1.NumberValue(numericValue);
    });
    return quantities;
}
/**
 * AST Evaluator for expressions with units using unitsnet-js
 */
class UnitsNetExpressionEvaluator {
    canHandle(node) {
        // Check if node type is supported
        if (!(0, ast_1.isExpressionNode)(node) &&
            !(0, ast_1.isCombinedAssignmentNode)(node) &&
            !(0, ast_1.isVariableAssignmentNode)(node)) {
            return false;
        }
        // For variable assignments, check if the value contains units or variables
        if ((0, ast_1.isVariableAssignmentNode)(node)) {
            const valueStr = (node.rawValue || node.parsedValue?.toString() || "").trim();
            const hasUnits = (0, unitsnetEvaluator_1.expressionContainsUnitsNet)(valueStr);
            const hasConstants = this.containsMathematicalConstants(valueStr);
            const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(valueStr); // Check for variable names
            return hasUnits || hasConstants || hasVariables;
        }
        // For expression and combined assignment nodes, check the expression
        const expression = (0, ast_1.isExpressionNode)(node) ? node.expression : node.expression;
        const hasUnits = (0, unitsnetEvaluator_1.expressionContainsUnitsNet)(expression);
        const hasConstants = this.containsMathematicalConstants(expression);
        if (hasUnits || hasConstants)
            return true;
        // Also handle expressions that reference variables present in context
        // We can only determine this at evaluation time, so conservatively return true
        // when expression contains identifiers (to allow variable-only expressions like "area")
        const hasIdentifiers = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(expression);
        return hasIdentifiers;
    }
    containsMathematicalConstants(expression) {
        // Check for mathematical constants like PI, E
        return /\b(PI|E)\b/.test(expression);
    }
    evaluate(node, context) {
        if ((0, ast_1.isExpressionNode)(node)) {
            return this.evaluateUnitsNetExpression(node, context);
        }
        else if ((0, ast_1.isCombinedAssignmentNode)(node)) {
            return this.evaluateUnitsNetCombinedAssignment(node, context);
        }
        else if ((0, ast_1.isVariableAssignmentNode)(node)) {
            return this.evaluateUnitsNetVariableAssignment(node, context);
        }
        return null;
    }
    evaluateUnitsNetExpression(node, context) {
        const { variableContext } = context;
        const displayOptions = this.getDisplayOptions(context);
        try {
            if (this.containsDateVariable(node.components, context)) {
                return null;
            }
            if (this.shouldDeferToSemanticEvaluator(node.components, node.expression, context)) {
                return null;
            }
            const variables = convertVariablesToUnitsNetQuantities(variableContext);
            const rewritten = rewritePercentVariableAddition(rewriteSimpleTimeLiterals(node.expression), variableContext);
            const result = (0, unitsnetEvaluator_1.evaluateUnitsNetExpression)(rewritten.expression, variables);
            if (result.error) {
                if (/Undefined variable/i.test(result.error)) {
                    const symbolic = types_1.SymbolicValue.from(node.expression);
                    const resultString = symbolic.toString(displayOptions);
                    return {
                        type: "mathResult",
                        expression: node.expression,
                        result: resultString,
                        displayText: `${node.expression} => ${resultString}`,
                        line: context.lineNumber,
                        originalRaw: node.expression,
                    };
                }
                return {
                    type: "error",
                    error: result.error,
                    errorType: "runtime",
                    displayText: `${node.expression} => ⚠️ ${result.error}`,
                    line: context.lineNumber,
                    originalRaw: node.expression,
                };
            }
            // For expressions, use smart thresholds for units
            let formattedResult;
            if (result.value instanceof types_1.UnitValue) {
                formattedResult = this.formatQuantityWithSmartThresholds(result.value.getQuantity(), displayOptions, this.shouldPreferBaseUnit(node.expression, result.value.getQuantity()), this.hasExplicitConversion(node.expression));
            }
            else {
                const numericValue = result.value.getNumericValue();
                formattedResult = this.isMathematicalConstant(numericValue)
                    ? numericValue.toString()
                    : result.value.toString(displayOptions);
            }
            if (rewritten.currencySymbol && result.value instanceof types_1.NumberValue) {
                formattedResult = `${rewritten.currencySymbol}${formattedResult}`;
            }
            const displayText = `${node.expression} => ${formattedResult}`;
            return {
                type: "mathResult",
                expression: node.expression,
                result: formattedResult, // Use formatted string instead of just the numeric value
                displayText,
                line: context.lineNumber,
                originalRaw: node.expression,
            };
        }
        catch (error) {
            return {
                type: "error",
                error: error instanceof Error ? error.message : String(error),
                errorType: "runtime",
                displayText: error instanceof Error ? error.message : String(error),
                line: context.lineNumber,
                originalRaw: node.expression,
            };
        }
    }
    evaluateUnitsNetCombinedAssignment(node, context) {
        const { variableContext, variableStore } = context;
        const displayOptions = this.getDisplayOptions(context);
        try {
            if (this.containsDateVariable(node.components, context)) {
                return null;
            }
            if (this.shouldDeferToSemanticEvaluator(node.components, node.expression, context)) {
                return null;
            }
            const variables = convertVariablesToUnitsNetQuantities(variableContext);
            const rewritten = rewritePercentVariableAddition(rewriteSimpleTimeLiterals(node.expression), variableContext);
            const result = (0, unitsnetEvaluator_1.evaluateUnitsNetExpression)(rewritten.expression, variables);
            if (result.error) {
                if (/Undefined variable/i.test(result.error)) {
                    const symbolic = types_1.SymbolicValue.from(node.expression);
                    const variable = {
                        name: node.variableName,
                        value: symbolic,
                        rawValue: node.expression,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    variableStore.setVariableWithMetadata(variable);
                    const resultString = this.substituteKnownValues(node.expression, context, displayOptions);
                    return {
                        type: "combined",
                        variableName: node.variableName,
                        expression: node.expression,
                        result: resultString,
                        displayText: `${node.variableName} = ${node.expression} => ${resultString}`,
                        line: context.lineNumber,
                        originalRaw: `${node.variableName} = ${node.expression}`,
                    };
                }
                // Debug: surface evaluation error context for failing tests
                console.log("UnitsNetCombinedAssignment error:", result.error, "expr:", node.expression);
                return {
                    type: "error",
                    error: result.error,
                    errorType: "runtime",
                    displayText: `${node.variableName} = ${node.expression} => ⚠️ ${result.error}`,
                    line: context.lineNumber,
                    originalRaw: `${node.variableName} = ${node.expression}`,
                };
            }
            // Store the variable with units information
            const variable = {
                name: node.variableName,
                value: result.value,
                rawValue: node.expression,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            variableStore.setVariableWithMetadata(variable);
            let valueStr = result.value instanceof types_1.UnitValue
                ? this.formatQuantityWithSmartThresholds(result.value.getQuantity(), displayOptions, this.shouldPreferBaseUnit(node.expression, result.value.getQuantity()), this.hasExplicitConversion(node.expression))
                : result.value.toString(displayOptions);
            if (rewritten.currencySymbol && result.value instanceof types_1.NumberValue) {
                valueStr = `${rewritten.currencySymbol}${valueStr}`;
            }
            const displayText = `${node.variableName} = ${node.expression} => ${valueStr}`;
            return {
                type: "combined",
                variableName: node.variableName,
                expression: node.expression,
                result: valueStr,
                displayText,
                line: context.lineNumber,
                // originalRaw must match the text prior to => so the decorator can map reliably
                originalRaw: `${node.variableName} = ${node.expression}`,
            };
        }
        catch (error) {
            return {
                type: "error",
                error: error instanceof Error ? error.message : String(error),
                errorType: "runtime",
                displayText: error instanceof Error ? error.message : String(error),
                line: context.lineNumber,
                originalRaw: node.expression,
            };
        }
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
            if (!value || value instanceof types_1.SymbolicValue || value instanceof types_1.ErrorValue) {
                return;
            }
            substitutions.set(name.replace(/\s+/g, " ").trim(), formatValue(value));
        });
        context.variableStore.getAllVariables().forEach((variable) => {
            const value = variable.value;
            if (!value || value instanceof types_1.SymbolicValue || value instanceof types_1.ErrorValue) {
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
    evaluateUnitsNetVariableAssignment(node, context) {
        const { variableStore } = context;
        const displayOptions = this.getDisplayOptions(context);
        try {
            // Parse the value to extract units
            const valueStr = (node.rawValue || node.parsedValue?.toString() || "").trim();
            let components = [];
            try {
                components = (0, expressionComponents_1.parseExpressionComponents)(valueStr);
            }
            catch {
                components = [];
            }
            if (components.length > 0 && this.shouldDeferToSemanticEvaluator(components, valueStr, context)) {
                return null;
            }
            // Check if this is a units expression, mathematical constants, or variables
            const hasUnits = (0, unitsnetEvaluator_1.expressionContainsUnitsNet)(valueStr);
            const hasConstants = this.containsMathematicalConstants(valueStr);
            const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(valueStr);
            let value;
            if (hasUnits || hasConstants || hasVariables) {
                // Parse as units expression with proper variable context
                const variables = convertVariablesToUnitsNetQuantities(context.variableContext);
                const result = (0, unitsnetEvaluator_1.evaluateUnitsNetExpression)(rewriteSimpleTimeLiterals(valueStr), variables);
                if (result.error) {
                    if (/Undefined variable/i.test(result.error)) {
                        value = types_1.SymbolicValue.from(valueStr);
                    }
                    else {
                        return {
                            type: "error",
                            error: result.error,
                            errorType: "parse",
                            displayText: result.error,
                            line: context.lineNumber,
                            originalRaw: valueStr,
                        };
                    }
                }
                if (!value) {
                    value = result.value;
                }
            }
            else {
                // Parse as regular number
                value = new types_1.NumberValue(node.parsedValue.getNumericValue());
            }
            // Store the variable
            const variable = {
                name: node.variableName,
                value,
                rawValue: valueStr,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            variableStore.setVariableWithMetadata(variable);
            const displayValue = value instanceof types_1.UnitValue
                ? this.formatQuantity(value.getQuantity(), displayOptions)
                : value.toString(displayOptions);
            const displayText = `${node.variableName} = ${displayValue}`;
            return {
                type: "combined",
                variableName: node.variableName,
                expression: valueStr,
                result: displayValue,
                displayText,
                line: context.lineNumber,
                originalRaw: `${node.variableName} = ${valueStr}`,
            };
        }
        catch (error) {
            const valueStr = (node.rawValue || node.parsedValue?.toString() || "").trim();
            return {
                type: "error",
                error: error instanceof Error ? error.message : String(error),
                errorType: "runtime",
                displayText: error instanceof Error ? error.message : String(error),
                line: context.lineNumber,
                originalRaw: valueStr,
            };
        }
    }
    formatQuantity(quantity, displayOptions) {
        const precision = displayOptions.precision ?? 6;
        if (quantity.isDimensionless()) {
            // For mathematical constants, preserve full precision
            if (this.isMathematicalConstant(quantity.value)) {
                return quantity.value.toString();
            }
            // If integer, show without decimals
            return this.formatScalarValue(quantity.value, precision, displayOptions);
        }
        // For simple assignments, preserve the original unit format
        // Only use smart conversion for complex expressions
        const value = quantity.value;
        const unit = quantity.unit;
        // Apply unit-specific precision overrides to align with UI expectations
        const resolvedPrecision = this.resolveUnitsPrecision(unit, value, precision);
        // Format number, removing unnecessary trailing zeros
        const formattedValue = this.formatScalarValue(value, resolvedPrecision, displayOptions);
        if (unit === "") {
            return formattedValue;
        }
        return `${formattedValue} ${this.formatUnitLabel(unit, value)}`;
    }
    isMathematicalConstant(value) {
        // Check if the value matches known mathematical constants (with tolerance for floating point)
        const tolerance = 1e-15;
        return Math.abs(value - Math.PI) < tolerance || Math.abs(value - Math.E) < tolerance;
    }
    formatQuantityWithSmartThresholds(quantity, displayOptions, preferBaseUnit, preserveUnit) {
        const precision = displayOptions.precision ?? 6;
        if (quantity.isDimensionless()) {
            // For mathematical constants, preserve full precision even in smart thresholds
            if (this.isMathematicalConstant(quantity.value)) {
                return quantity.value.toString();
            }
            return this.formatScalarValue(quantity.value, precision, displayOptions);
        }
        if (preserveUnit) {
            const formattedValue = this.formatScalarValue(quantity.value, precision, displayOptions);
            return quantity.unit
                ? `${formattedValue} ${this.formatUnitLabel(quantity.unit, quantity.value)}`
                : formattedValue;
        }
        // For expressions, use smart thresholds and optionally prefer base units
        return quantity.toString(precision, { ...displayOptions, preferBaseUnit });
    }
    shouldPreferBaseUnit(expression, quantity) {
        if (quantity.unitsnetValue) {
            return false;
        }
        if (/\b(to|in)\b/.test(expression)) {
            return false;
        }
        const unit = quantity.unit;
        if (unit === "C" || unit === "F" || unit === "K") {
            return false;
        }
        return true;
    }
    hasExplicitConversion(expression) {
        return /\b(to|in)\b/.test(expression);
    }
    resolveUnitsPrecision(unit, value, defaultPlaces) {
        // Follow the configured decimalPlaces consistently for all units.
        return defaultPlaces;
    }
    formatUnitLabel(unit, value) {
        const absValue = Math.abs(value);
        const pluralizableUnits = new Set(["day", "week", "month", "year"]);
        if (pluralizableUnits.has(unit) &&
            absValue !== 1 &&
            !unit.includes("/") &&
            !unit.includes("^") &&
            !unit.includes("*")) {
            return `${unit}s`;
        }
        return unit;
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
    shouldDeferToSemanticEvaluator(components, expression, context) {
        const parsedLiteral = types_1.SemanticParsers.parse(expression);
        if (parsedLiteral && parsedLiteral.getType() !== "error") {
            // Let UnitsNet handle unit literals; defer for other semantic literals.
            if (parsedLiteral.getType() === "unit") {
                return types_1.UnitValue.isUnitString(expression) ? false : true;
            }
            return true;
        }
        const functionComponents = components.filter((component) => component.type === "function");
        if (functionComponents.length > 0) {
            const hasUserFunction = functionComponents.some((component) => context.functionStore?.has(component.value));
            if (hasUserFunction) {
                return true;
            }
            // Allow UnitsNet to handle built-in functions when units are involved.
            if ((0, unitsnetEvaluator_1.expressionContainsUnitsNet)(expression)) {
                return false;
            }
            return true;
        }
        const hasCurrencyLiteral = components.some((component) => component.type === "literal" &&
            component.parsedValue &&
            (component.parsedValue.getType() === "currency" ||
                component.parsedValue.getType() === "currencyUnit"));
        if (hasCurrencyLiteral) {
            return true;
        }
        const variableNames = this.collectVariableNames(components);
        if (variableNames.size === 0) {
            return false;
        }
        const maskedExpression = this.maskVariableNames(expression, variableNames);
        if ((0, unitsnetEvaluator_1.expressionContainsUnitsNet)(maskedExpression) ||
            this.containsMathematicalConstants(maskedExpression)) {
            return false;
        }
        let hasCurrency = false;
        let hasUnit = false;
        let hasPercentage = false;
        variableNames.forEach((name) => {
            const variable = context.variableContext.get(name);
            const value = variable?.value;
            if (value instanceof types_1.UnitValue) {
                hasUnit = true;
            }
            if (value instanceof types_1.PercentageValue) {
                hasPercentage = true;
            }
            if (value instanceof types_1.CurrencyValue || value instanceof types_1.CurrencyUnitValue) {
                hasCurrency = true;
            }
        });
        if (hasCurrency) {
            return true;
        }
        if (hasUnit || hasPercentage) {
            return false;
        }
        return false;
    }
    maskVariableNames(expression, variableNames) {
        if (variableNames.size === 0) {
            return expression;
        }
        const names = Array.from(variableNames).sort((a, b) => b.length - a.length);
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
                    result += "__var__";
                    pos += name.length;
                    replaced = true;
                    break;
                }
            }
            if (!replaced) {
                result += expression[pos];
                pos++;
            }
        }
        return result;
    }
    collectVariableNames(components) {
        const names = new Set();
        const visit = (items) => {
            items.forEach((component) => {
                if (component.type === "variable") {
                    names.add(component.value);
                }
                if (component.type === "function" && component.args) {
                    component.args.forEach((arg) => visit(arg.components));
                }
                else if (component.children && component.children.length > 0) {
                    visit(component.children);
                }
            });
        };
        visit(components);
        return names;
    }
    containsDateVariable(components, context) {
        const variableNames = this.collectVariableNames(components);
        for (const name of variableNames) {
            const variable = context.variableContext.get(name);
            if (variable?.value instanceof types_1.DateValue) {
                return true;
            }
        }
        return false;
    }
}
exports.UnitsNetExpressionEvaluator = UnitsNetExpressionEvaluator;
