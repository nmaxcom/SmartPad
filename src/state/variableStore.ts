import { Variable, SemanticVariable, VariableState, VariableAction } from "./types";
import { DependencyGraph } from "./dependencyGraph";
import { evaluateMath } from "../parsing/mathEvaluator";
import { 
  SemanticValue,
  NumberValue, 
  PercentageValue, 
  CurrencyValue, 
  UnitValue, 
  ErrorValue,
  ErrorType 
} from "../types";

/**
 * Enhanced variable store that supports reactive variables with expressions
 */
export class ReactiveVariableStore {
  private dependencyGraph = new DependencyGraph();
  private variables = new Map<string, Variable>();

  private normalizeVariableName(name: string): string {
    return name.replace(/\s+/g, " ").trim();
  }


  /**
   * Sets a variable with a SemanticValue (new interface)
   * This is the preferred method for the new type system
   */
  setVariableWithSemanticValue(name: string, value: SemanticValue, rawValue: string): { success: boolean; error?: string } {
    try {
      const normalized = this.normalizeVariableName(name);
      const now = new Date();
      const existingVariable = this.variables.get(normalized);
      
      const variable: SemanticVariable = {
        name: normalized,
        value,
        rawValue,
        createdAt: existingVariable?.createdAt || now,
        updatedAt: now,
      };
      
      this.variables.set(normalized, variable);
      return { success: true };
    } catch (error) {
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
  setVariable(name: string, rawValue: string): { success: boolean; error?: string } {
    return this.setVariableLegacy(name, rawValue);
  }

  /**
   * Sets a variable with a raw value (legacy method)
   */
  setVariableLegacy(name: string, rawValue: string): { success: boolean; error?: string } {
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
  setVariableWithMetadata(variable: Variable): { success: boolean; error?: string } {
    try {
      const normalized = this.normalizeVariableName(variable.name);
      // Store the variable directly without dependency graph evaluation
      this.variables.set(normalized, { ...variable, name: normalized });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Gets a variable's current value
   */
  getVariable(name: string): Variable | undefined {
    return this.variables.get(this.normalizeVariableName(name));
  }

  /**
   * Gets a variable's numeric value for calculations
   */
  getVariableValue(name: string): number | null {
    const variable = this.variables.get(this.normalizeVariableName(name));
    if (!variable) return null;

    const node = this.dependencyGraph.getNode(this.normalizeVariableName(name));
    if (node?.isCircular) return null;

    if (typeof variable.value === "number") {
      return variable.value;
    }
    if (variable.value instanceof SemanticValue && variable.value.isNumeric()) {
      return variable.value.getNumericValue();
    }
    return null;
  }

  /**
   * Checks if a variable exists
   */
  hasVariable(name: string): boolean {
    return this.variables.has(this.normalizeVariableName(name));
  }

  /**
   * Gets all variables
   */
  getAllVariables(): Variable[] {
    return Array.from(this.variables.values());
  }

  /**
   * Deletes a variable
   */
  deleteVariable(name: string): boolean {
    const normalized = this.normalizeVariableName(name);
    const exists = this.variables.has(normalized);
    if (!exists) return false;

    this.variables.delete(normalized);
    // Note: We don't remove from dependency graph to maintain references
    // The graph will handle orphaned references gracefully
    return true;
  }

  /**
   * Clears all variables
   */
  clearVariables(): void {
    this.variables.clear();
    this.dependencyGraph = new DependencyGraph();
  }

  /**
   * Recalculates all variables in the correct dependency order
   */
  private recalculateVariables(): void {
    const updateOrder = this.dependencyGraph.getUpdateOrder();

    for (const nodeName of updateOrder) {
      const node = this.dependencyGraph.getNode(nodeName);
      if (!node) continue;

      const now = new Date();
      const existingVariable = this.variables.get(nodeName);

      try {
        let value: SemanticValue;

        if (node.isCircular) {
          value = ErrorValue.runtimeError("Circular dependency", { expression: node.rawValue });
        } else {
          // Try to parse the raw value directly first
          value = this.parseRawValue(node.rawValue);
          
          // If it's an error and not a simple value, try evaluating as expression
          if (value instanceof ErrorValue) {
            try {
              const context = this.createEvaluationContext();
              const result = evaluateMath(node.rawValue, context);
              if (result.error) {
                throw new Error(result.error);
              }
              value = new NumberValue(result.value);
            } catch (error) {
              value = ErrorValue.runtimeError(error instanceof Error ? error.message : "Unknown error", { expression: node.rawValue });
            }
          }
        }

        const variable: SemanticVariable = {
          name: nodeName,
          value,
          rawValue: node.rawValue,
          createdAt: existingVariable?.createdAt || now,
          updatedAt: now,
        };

        this.variables.set(nodeName, variable);
      } catch (error) {
        // If evaluation fails, store the error
        const variable: SemanticVariable = {
          name: nodeName,
          value: error instanceof ErrorValue ? error : ErrorValue.runtimeError(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, { expression: node.rawValue }),
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
  private parseRawValue(rawValue: string): SemanticValue {
    // Try to parse as percentage
    if (rawValue.trim().match(/^\d+(?:\.\d+)?%$/)) {
      const match = rawValue.trim().match(/^(\d+(?:\.\d+)?)%$/);
      if (match) {
        return new PercentageValue(parseFloat(match[1]));
      }
    }
    
    // Try to parse as currency
    const trimmed = rawValue.trim();
    const currencySymbolPattern = /^[\$€£¥₹₿]\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/;
    const currencySymbolSuffixPattern = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*[\$€£¥₹₿]$/;
    const currencyCodePattern = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s+(CHF|CAD|AUD)$/;
    if (
      currencySymbolPattern.test(trimmed) ||
      currencySymbolSuffixPattern.test(trimmed) ||
      currencyCodePattern.test(trimmed)
    ) {
      try {
        return CurrencyValue.fromString(trimmed);
      } catch {
        // Fall through to number parsing
      }
    }
    
    // Try to parse as number
    const numericValue = parseFloat(rawValue);
    if (!isNaN(numericValue)) {
      return new NumberValue(numericValue);
    }
    
    // If all parsing fails, return error
    return ErrorValue.parseError(`Cannot parse value: "${rawValue}"`, rawValue);
  }

  /**
   * Creates an evaluation context with current variable values
   * Extracts numeric values from all SemanticValue types
   */
  private createEvaluationContext(): Record<string, number> {
    const context: Record<string, number> = {};

    for (const [name, variable] of this.variables) {
      if (variable.value instanceof SemanticValue && variable.value.isNumeric()) {
        context[name] = variable.value.getNumericValue();
      }
    }

    return context;
  }
}

// No more legacy code - all functionality is now in ReactiveVariableStore
