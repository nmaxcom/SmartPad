// Main API exports
export { useVariables } from "./useVariables";
export { VariableProvider, useVariableContext } from "./VariableContext";

// Types
export type {
  Variable,
  VariableState,
  VariableOperations,
  VariableContextType,
  VariableAction,
} from "./types";

// Core utilities (for advanced use cases)
export { ReactiveVariableStore } from "./variableStore";
