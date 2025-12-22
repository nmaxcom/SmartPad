import { useVariableContext } from "./VariableContext";
import { Variable } from "./types";

/**
 * Custom hook for variable state management
 * Provides a clean, easy-to-use API for components
 */
export function useVariables() {
  const context = useVariableContext();

  return {
    /**
     * Map of all current variables
     */
    variables: context.variables,

    /**
     * Replaces the entire variable map.
     * @param newVariables The new map of variables.
     */
    replaceAllVariables: context.replaceAllVariables,

    /**
     * Set or update a variable with the given name and value
     * @param name Variable name (supports phrases with spaces)
     * @param value Numeric value
     */
    setVariable: context.setVariable,

    /**
     * Get a variable by name
     * @param name Variable name
     * @returns Variable object or undefined if not found
     */
    getVariable: context.getVariable,

    /**
     * Delete a variable by name
     * @param name Variable name
     * @returns true if variable existed and was deleted, false otherwise
     */
    deleteVariable: context.deleteVariable,

    /**
     * Check if a variable exists
     * @param name Variable name
     * @returns true if variable exists, false otherwise
     */
    hasVariable: context.hasVariable,

    /**
     * Get all variables as an array
     * @returns Array of all variables
     */
    getAllVariables: context.getAllVariables,

    /**
     * Clear all variables
     */
    clearVariables: context.clearVariables,

    /**
     * Get the count of variables
     */
    getVariableCount: (): number => context.variables.size,

    /**
     * Get variable names as an array
     */
    getVariableNames: (): string[] => Array.from(context.variables.keys()),

    /**
     * Get variable values as an array (only numeric values)
     */
    getVariableValues: (): number[] =>
      Array.from(context.variables.values())
        .map((v: Variable) => v.value)
        .filter((value) => value.isNumeric())
        .map((value) => value.getNumericValue()),
  };
}
