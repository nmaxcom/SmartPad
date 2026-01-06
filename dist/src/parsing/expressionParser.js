"use strict";
/**
 * Expression Parser for SmartPad
 * Handles expressions with `=>` trigger and variable substitution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVariableAssignmentWithEvaluation = isVariableAssignmentWithEvaluation;
exports.parseVariableAssignmentWithEvaluation = parseVariableAssignmentWithEvaluation;
exports.parseExpressionLine = parseExpressionLine;
exports.parseAndEvaluateExpression = parseAndEvaluateExpression;
exports.substituteVariables = substituteVariables;
exports.formatResult = formatResult;
exports.needsExpressionEvaluation = needsExpressionEvaluation;
exports.extractExpression = extractExpression;
exports.expressionNeedsUpdate = expressionNeedsUpdate;
const mathEvaluator_1 = require("./mathEvaluator");
/**
 * Check if a line is a combined variable assignment and expression evaluation
 * Pattern: "variableName = expression =>"
 */
function isVariableAssignmentWithEvaluation(line) {
    if (!line.includes("=>"))
        return false;
    const arrowIndex = line.indexOf("=>");
    const beforeArrow = line.substring(0, arrowIndex).trim();
    // Check if the part before "=>" contains a variable assignment pattern
    return beforeArrow.includes("=") && !beforeArrow.includes("==");
}
/**
 * Parse a combined variable assignment and expression evaluation
 * Pattern: "variableName = expression =>"
 */
function parseVariableAssignmentWithEvaluation(line, variableStore, decimalPlaces = 6) {
    if (!isVariableAssignmentWithEvaluation(line)) {
        return {
            isValid: false,
            originalExpression: line,
            error: "Not a variable assignment with evaluation",
        };
    }
    const arrowIndex = line.indexOf("=>");
    const assignmentPart = line.substring(0, arrowIndex).trim();
    const existingResult = line.substring(arrowIndex + 2).trim();
    // CRITICAL FIX: Clean the assignment part if it contains accumulated errors
    let cleanAssignmentPart = assignmentPart;
    if (existingResult.includes("⚠️")) {
        // Remove any error text that might have accumulated in the assignment part
        cleanAssignmentPart = assignmentPart.replace(/\s*⚠️.*$/, "").trim();
    }
    // Split the assignment part on the first "="
    const equalsIndex = cleanAssignmentPart.indexOf("=");
    const variableName = cleanAssignmentPart.substring(0, equalsIndex).trim();
    const expression = cleanAssignmentPart.substring(equalsIndex + 1).trim();
    if (!variableName || !expression) {
        return {
            isValid: false,
            originalExpression: line,
            error: "Invalid variable assignment format",
        };
    }
    try {
        // Evaluate the expression
        const evalResult = parseAndEvaluateExpression(expression, variableStore);
        if (evalResult.error) {
            return {
                isValid: true,
                originalExpression: line,
                error: evalResult.error,
                displayText: `${cleanAssignmentPart} => ⚠️ ${evalResult.error}`,
                cursorPosition: `${cleanAssignmentPart} => ⚠️ ${evalResult.error}`.length,
                variableName, // Include variable name even in error cases for semantic highlighting
            };
        }
        // Format result
        const resultText = formatResult(evalResult.value, decimalPlaces);
        const displayText = `${cleanAssignmentPart} => ${resultText}`;
        return {
            isValid: true,
            originalExpression: line,
            evaluatedResult: evalResult.value,
            displayText,
            variables: evalResult.variables,
            cursorPosition: displayText.length,
            variableName,
            variableValue: evalResult.value,
        };
    }
    catch (error) {
        return {
            isValid: true,
            originalExpression: line,
            error: error.message,
            displayText: `${cleanAssignmentPart} => ⚠️ ${error.message}`,
            cursorPosition: `${cleanAssignmentPart} => ⚠️ ${error.message}`.length,
            variableName, // Include variable name even in error cases for semantic highlighting
        };
    }
}
/**
 * Parse a line for expression evaluation
 * Returns result if line contains ` => ` pattern
 */
function parseExpressionLine(line, variableStore, decimalPlaces = 6) {
    // Check if line contains the evaluation trigger
    if (!line.includes("=>")) {
        return {
            isValid: false,
            originalExpression: line,
            error: "No evaluation trigger found",
        };
    }
    // Split on first occurrence of '=>'
    const arrowIndex = line.indexOf("=>");
    const expression = line.substring(0, arrowIndex).trim();
    const existingResult = line.substring(arrowIndex + 2).trim();
    // CRITICAL FIX: If the line already contains error messages, extract just the clean expression
    // This prevents error accumulation when the same line gets re-evaluated
    let cleanExpression = expression;
    if (existingResult.includes("⚠️")) {
        // The existing result contains errors, which means this line has been evaluated before
        // We should extract the original expression without any accumulated error text
        // The expression part before => should be clean, but just to be safe, let's clean it
        cleanExpression = expression.replace(/\s*⚠️.*$/, "").trim();
    }
    // Validate expression part
    if (!cleanExpression) {
        return {
            isValid: false,
            originalExpression: line,
            error: "Empty expression before =>",
        };
    }
    try {
        // Parse and evaluate the expression with variable substitution
        const evalResult = parseAndEvaluateExpression(cleanExpression, variableStore);
        if (evalResult.error) {
            return {
                isValid: true,
                originalExpression: line,
                error: evalResult.error,
                displayText: `${cleanExpression} => ⚠️ ${evalResult.error}`,
                cursorPosition: `${cleanExpression} => ⚠️ ${evalResult.error}`.length,
            };
        }
        // Format result
        const resultText = formatResult(evalResult.value, decimalPlaces);
        const displayText = `${cleanExpression} => ${resultText}`;
        return {
            isValid: true,
            originalExpression: line,
            evaluatedResult: evalResult.value,
            displayText,
            variables: evalResult.variables,
            cursorPosition: displayText.length,
        };
    }
    catch (error) {
        return {
            isValid: true,
            originalExpression: line,
            error: error.message,
            displayText: `${cleanExpression} => ⚠️ ${error.message}`,
            cursorPosition: `${cleanExpression} => ⚠️ ${error.message}`.length,
        };
    }
}
/**
 * Enhanced expression evaluator with variable substitution
 */
function parseAndEvaluateExpression(expression, variableStore) {
    // Track variables used in this expression
    const usedVariables = [];
    try {
        // First pass: identify and substitute variables
        const substitutedExpression = substituteVariables(expression, variableStore, usedVariables);
        // Second pass: evaluate the mathematical expression
        const mathResult = (0, mathEvaluator_1.evaluateMath)(substitutedExpression);
        if (mathResult.error) {
            return {
                value: 0,
                variables: usedVariables,
                error: mathResult.error,
            };
        }
        return {
            value: mathResult.value,
            variables: usedVariables,
        };
    }
    catch (error) {
        return {
            value: 0,
            variables: usedVariables,
            error: error.message,
        };
    }
}
/**
 * Substitute variables in an expression
 * Uses intelligent longest-match-first strategy for phrase-based variables
 */
function substituteVariables(expression, variableStore, usedVariables = []) {
    // Normalize whitespace so phrase variables in the store (which are normalized)
    // match expressions typed with arbitrary spacing (e.g., "base   rent").
    // This does not affect the displayed text; it's only for evaluation.
    let result = expression.replace(/\s+/g, " ").trim();
    // Get all variable names sorted by length (longest first for proper matching)
    const variableNames = Array.from(variableStore.keys()).sort((a, b) => b.length - a.length);
    // Track substitutions to avoid conflicts and maintain order
    const substituted = new Set();
    const variablesFound = [];
    for (const variableName of variableNames) {
        if (variableStore.has(variableName) && !substituted.has(variableName)) {
            const variable = variableStore.get(variableName);
            // Check if variable exists in the expression
            if (result.includes(variableName)) {
                // For phrase-based variables, we need to ensure we match complete variable names
                // Use a more careful replacement that considers context
                let newResult = "";
                let lastIndex = 0;
                let found = false;
                while (true) {
                    const index = result.indexOf(variableName, lastIndex);
                    if (index === -1)
                        break;
                    // Check if this is a complete variable name (not part of another variable)
                    const before = index > 0 ? result[index - 1] : " ";
                    const after = index + variableName.length < result.length ? result[index + variableName.length] : " ";
                    // Check if surrounded by non-identifier characters (space, operators, parentheses, etc.)
                    const isValidBoundary = (char) => /[\s+\-*/^%()=<>!,]/.test(char);
                    if ((index === 0 || isValidBoundary(before)) &&
                        (index + variableName.length === result.length || isValidBoundary(after))) {
                        // This is a valid variable match
                        newResult += result.substring(lastIndex, index) + variable.value.toString();
                        lastIndex = index + variableName.length;
                        if (!found) {
                            // Record the position where this variable first appears in original expression
                            variablesFound.push({
                                name: variableName,
                                position: expression.indexOf(variableName),
                            });
                            found = true;
                        }
                        substituted.add(variableName);
                    }
                    else {
                        // Not a valid match, continue searching
                        newResult += result.substring(lastIndex, index + 1);
                        lastIndex = index + 1;
                    }
                }
                // Add remaining part
                newResult += result.substring(lastIndex);
                result = newResult;
            }
        }
    }
    // Add variables to usedVariables in the order they appear in the original expression
    variablesFound
        .sort((a, b) => a.position - b.position)
        .forEach(({ name }) => {
        if (!usedVariables.includes(name)) {
            usedVariables.push(name);
        }
    });
    // Check for any remaining undefined variables by tokenizing the final result
    const tokens = (0, mathEvaluator_1.tokenize)(result);
    for (const token of tokens) {
        if (token.type === mathEvaluator_1.TokenType.IDENTIFIER) {
            // If we still have identifiers after substitution, they're undefined
            throw new Error(`'${token.value}' not defined`);
        }
    }
    return result;
}
/**
 * Format numeric results for display
 */
function formatResult(value, decimalPlaces = 6) {
    if (!isFinite(value))
        return "Infinity";
    if (value === 0)
        return "0";
    const abs = Math.abs(value);
    // Scientific notation thresholds
    const formatScientific = (num, fracDigits) => {
        const s = num.toExponential(Math.max(0, fracDigits));
        const [mantissa, exp] = s.split("e");
        const trimmedMantissa = mantissa.replace(/(?:\.0+|(\.\d+?)0+)$/, "$1");
        return `${trimmedMantissa}e${exp}`;
    };
    if (abs >= 1e12 || (abs > 0 && abs < 1e-4)) {
        return formatScientific(value, decimalPlaces);
    }
    if (Number.isInteger(value))
        return value.toString();
    const fixed = value.toFixed(decimalPlaces);
    const fixedNumber = parseFloat(fixed);
    if (fixedNumber === 0) {
        return formatScientific(value, decimalPlaces);
    }
    return fixedNumber.toString();
}
/**
 * Check if a line needs expression evaluation
 * Returns true if line contains ` => ` pattern or contains units/mathematical expressions
 */
function needsExpressionEvaluation(line) {
    const trimmed = line.trim();
    if (trimmed.length === 0)
        return false;
    // Traditional expression evaluation with arrow
    if (line.includes("=>"))
        return true;
    // Check for unit expressions that should be evaluated even without =>
    return containsUnitsOrMathExpression(trimmed);
}
/**
 * Check if a line contains units or mathematical expressions that should be evaluated
 */
function containsUnitsOrMathExpression(line) {
    // Check for mathematical constants
    if (/\b(PI|E)\b/.test(line))
        return true;
    // Check for basic unit patterns
    const unitPattern = /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*[a-zA-Z°]+(?:\/[a-zA-Z°]+)?(?:\^?\d+)?(?:\s+to\s+[a-zA-Z°]+)?\b/;
    if (unitPattern.test(line))
        return true;
    // Check for arithmetic with potential units
    if (!line.trim().startsWith('//') && /[\+\-\*\/\^]/.test(line) && /[a-zA-Z]/.test(line))
        return true;
    return false;
}
/**
 * Extract just the expression part before '=>'
 */
function extractExpression(line) {
    const arrowIndex = line.indexOf("=>");
    if (arrowIndex === -1)
        return line.trim(); // For unit expressions without =>
    return line.substring(0, arrowIndex).trim();
}
/**
 * Check if an expression line has been modified (result doesn't match)
 */
function expressionNeedsUpdate(line, variableStore) {
    if (!needsExpressionEvaluation(line))
        return false;
    const arrowIndex = line.indexOf("=>");
    const expression = line.substring(0, arrowIndex).trim();
    const currentResult = line.substring(arrowIndex + 2).trim();
    // Skip if it's an error result
    if (currentResult.includes("⚠️"))
        return true;
    try {
        const evalResult = parseAndEvaluateExpression(expression, variableStore);
        if (evalResult.error)
            return true;
        const expectedResult = formatResult(evalResult.value);
        return currentResult !== expectedResult;
    }
    catch {
        return true;
    }
}
