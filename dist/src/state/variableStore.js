"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactiveVariableStore = void 0;
const dependencyGraph_1 = require("./dependencyGraph");
const mathEvaluator_1 = require("../parsing/mathEvaluator");
const types_1 = require("../types");
/**
 * Enhanced variable store that supports reactive variables with expressions
 */
class ReactiveVariableStore {
    dependencyGraph = new dependencyGraph_1.DependencyGraph();
    variables = new Map();
    normalizeVariableName(name) {
        return name.replace(/\s+/g, " ").trim();
    }
    /**
     * Sets a variable with a SemanticValue (new interface)
     * This is the preferred method for the new type system
     */
    setVariableWithSemanticValue(name, value, rawValue) {
        try {
            const normalized = this.normalizeVariableName(name);
            const now = new Date();
            const existingVariable = this.variables.get(normalized);
            const variable = {
                name: normalized,
                value,
                rawValue,
                createdAt: existingVariable?.createdAt || now,
                updatedAt: now,
            };
            this.variables.set(normalized, variable);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Legacy setVariable method for backward compatibility
     * This maintains the old string signature for tests and legacy code
     */
    setVariable(name, rawValue) {
        return this.setVariableLegacy(name, rawValue);
    }
    /**
     * Sets a variable with a raw value (legacy method)
     */
    setVariableLegacy(name, rawValue) {
        const normalized = this.normalizeVariableName(name);
        const result = this.dependencyGraph.addNode(normalized, rawValue);
        // Always recalculate variables, even if there was a circular dependency
        // This ensures variables with errors are still created in the store
        this.recalculateVariables();
        return result;
    }
    /**
     * Sets a variable directly with a complete Variable object
     * This bypasses the dependency graph and is used for units-aware variables
     */
    setVariableWithMetadata(variable) {
        try {
            const normalized = this.normalizeVariableName(variable.name);
            // Store the variable directly without dependency graph evaluation
            this.variables.set(normalized, { ...variable, name: normalized });
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
    /**
     * Gets a variable's current value
     */
    getVariable(name) {
        return this.variables.get(this.normalizeVariableName(name));
    }
    /**
     * Gets a variable's numeric value for calculations
     */
    getVariableValue(name) {
        const variable = this.variables.get(this.normalizeVariableName(name));
        if (!variable)
            return null;
        const node = this.dependencyGraph.getNode(this.normalizeVariableName(name));
        if (node?.isCircular)
            return null;
        if (typeof variable.value === "number") {
            return variable.value;
        }
        if (variable.value instanceof types_1.SemanticValue && variable.value.isNumeric()) {
            return variable.value.getNumericValue();
        }
        return null;
    }
    /**
     * Checks if a variable exists
     */
    hasVariable(name) {
        return this.variables.has(this.normalizeVariableName(name));
    }
    /**
     * Gets all variables
     */
    getAllVariables() {
        return Array.from(this.variables.values());
    }
    /**
     * Deletes a variable
     */
    deleteVariable(name) {
        const normalized = this.normalizeVariableName(name);
        const exists = this.variables.has(normalized);
        if (!exists)
            return false;
        this.variables.delete(normalized);
        // Note: We don't remove from dependency graph to maintain references
        // The graph will handle orphaned references gracefully
        return true;
    }
    /**
     * Clears all variables
     */
    clearVariables() {
        this.variables.clear();
        this.dependencyGraph = new dependencyGraph_1.DependencyGraph();
    }
    /**
     * Recalculates all variables in the correct dependency order
     */
    recalculateVariables() {
        const updateOrder = this.dependencyGraph.getUpdateOrder();
        for (const nodeName of updateOrder) {
            const node = this.dependencyGraph.getNode(nodeName);
            if (!node)
                continue;
            const now = new Date();
            const existingVariable = this.variables.get(nodeName);
            try {
                let value;
                if (node.isCircular) {
                    value = types_1.ErrorValue.runtimeError("Circular dependency", { expression: node.rawValue });
                }
                else {
                    // Try to parse the raw value directly first
                    value = this.parseRawValue(node.rawValue);
                    // If it's an error and not a simple value, try evaluating as expression
                    if (value instanceof types_1.ErrorValue) {
                        try {
                            const context = this.createEvaluationContext();
                            const result = (0, mathEvaluator_1.evaluateMath)(node.rawValue, context);
                            if (result.error) {
                                if (/Undefined variable/i.test(result.error)) {
                                    value = types_1.SymbolicValue.from(node.rawValue);
                                }
                                else {
                                    throw new Error(result.error);
                                }
                            }
                            if (!(value instanceof types_1.SymbolicValue)) {
                                value = new types_1.NumberValue(result.value);
                            }
                        }
                        catch (error) {
                            value = types_1.ErrorValue.runtimeError(error instanceof Error ? error.message : "Unknown error", { expression: node.rawValue });
                        }
                    }
                }
                const variable = {
                    name: nodeName,
                    value,
                    rawValue: node.rawValue,
                    createdAt: existingVariable?.createdAt || now,
                    updatedAt: now,
                };
                this.variables.set(nodeName, variable);
            }
            catch (error) {
                // If evaluation fails, store the error
                const variable = {
                    name: nodeName,
                    value: error instanceof types_1.ErrorValue ? error : types_1.ErrorValue.runtimeError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, { expression: node.rawValue }),
                    rawValue: node.rawValue,
                    createdAt: existingVariable?.createdAt || now,
                    updatedAt: now,
                };
                this.variables.set(nodeName, variable);
            }
        }
    }
    /**
     * Parse a raw value into a SemanticValue
     */
    parseRawValue(rawValue) {
        const parsed = types_1.SemanticParsers.parse(rawValue);
        if (parsed) {
            return parsed;
        }
        // Try to parse as percentage
        if (rawValue.trim().match(/^\d+(?:\.\d+)?%$/)) {
            const match = rawValue.trim().match(/^(\d+(?:\.\d+)?)%$/);
            if (match) {
                return new types_1.PercentageValue(parseFloat(match[1]));
            }
        }
        // Try to parse as currency
        const trimmed = rawValue.trim();
        const currencySymbolPattern = /^[\$€£¥₹₿]\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/;
        const currencySymbolSuffixPattern = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*[\$€£¥₹₿]$/;
        const currencyCodePattern = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s+(CHF|CAD|AUD)$/;
        if (currencySymbolPattern.test(trimmed) ||
            currencySymbolSuffixPattern.test(trimmed) ||
            currencyCodePattern.test(trimmed)) {
            try {
                return types_1.CurrencyValue.fromString(trimmed);
            }
            catch {
                // Fall through to number parsing
            }
        }
        // Try to parse as number
        const numericValue = parseFloat(rawValue);
        if (!isNaN(numericValue)) {
            return new types_1.NumberValue(numericValue);
        }
        // If all parsing fails, return error
        return types_1.ErrorValue.parseError(`Cannot parse value: "${rawValue}"`, rawValue);
    }
    /**
     * Creates an evaluation context with current variable values
     * Extracts numeric values from all SemanticValue types
     */
    createEvaluationContext() {
        const context = {};
        for (const [name, variable] of this.variables) {
            if (variable.value instanceof types_1.SemanticValue && variable.value.isNumeric()) {
                context[name] = variable.value.getNumericValue();
            }
        }
        return context;
    }
}
exports.ReactiveVariableStore = ReactiveVariableStore;
// No more legacy code - all functionality is now in ReactiveVariableStore
