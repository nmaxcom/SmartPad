import React, { createContext, useState, useCallback, useMemo, ReactNode } from "react";
import { VariableContextType, Variable } from "./types";
import { ReactiveVariableStore } from "./variableStore";

// Create the context
const VariableContext = createContext<VariableContextType | undefined>(undefined);

interface VariableProviderProps {
  children: ReactNode;
}

/**
 * Variable Context Provider component
 * Provides variable state management to the entire application
 */
export function VariableProvider({ children }: VariableProviderProps) {
  // Create a reactive variable store for this context
  const [reactiveStore] = useState(() => new ReactiveVariableStore());

  // Memoized methods that delegate to reactiveStore
  const replaceAllVariables = useCallback((newVariables: Map<string, Variable>) => {
    // Convert to array of [name, value] pairs and set each one
    Array.from(newVariables.entries()).forEach(([name, variable]) => {
      reactiveStore.setVariableWithSemanticValue(name, variable.value, variable.rawValue);
    });
  }, [reactiveStore]);

  const setVariable = useCallback((name: string, value: number) => {
    reactiveStore.setVariable(name, value.toString());
  }, [reactiveStore]);

  const getVariable = useCallback(
    (name: string) => {
      return reactiveStore.getVariable(name);
    },
    [reactiveStore]
  );

  const deleteVariable = useCallback(
    (name: string) => {
      return reactiveStore.deleteVariable(name);
    },
    [reactiveStore]
  );

  const clearVariables = useCallback(() => {
    reactiveStore.clearVariables();
  }, [reactiveStore]);

  const hasVariable = useCallback(
    (name: string) => {
      return reactiveStore.hasVariable(name);
    },
    [reactiveStore]
  );

  const getAllVariables = useCallback(() => {
    return reactiveStore.getAllVariables();
  }, [reactiveStore]);

  // Create a Map view of the variables for compatibility
  const variables = useMemo(() => {
    const vars = new Map<string, Variable>();
    getAllVariables().forEach(variable => {
      vars.set(variable.name, variable);
    });
    return vars;
  }, [getAllVariables]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<VariableContextType>(
    () => ({
      variables,
      replaceAllVariables,
      setVariable,
      getVariable,
      deleteVariable,
      clearVariables,
      hasVariable,
      getAllVariables,
      reactiveStore,
    }),
    [
      variables,
      replaceAllVariables,
      setVariable,
      getVariable,
      deleteVariable,
      clearVariables,
      hasVariable,
      getAllVariables,
    ]
  );

  return <VariableContext.Provider value={contextValue}>{children}</VariableContext.Provider>;
}

/**
 * Hook to access the Variable Context
 * Throws an error if used outside of VariableProvider
 */
export function useVariableContext(): VariableContextType {
  const context = React.useContext(VariableContext);

  if (context === undefined) {
    throw new Error("useVariableContext must be used within a VariableProvider");
  }

  return context;
}

export { VariableContext };
