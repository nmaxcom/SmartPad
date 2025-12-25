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
  const [variables, setVariables] = useState<Map<string, Variable>>(new Map());

  // Memoized methods that delegate to reactiveStore
  const refreshVariables = useCallback(() => {
    const vars = new Map<string, Variable>();
    reactiveStore.getAllVariables().forEach((variable) => {
      vars.set(variable.name, variable);
    });
    setVariables(vars);
  }, [reactiveStore]);

  const replaceAllVariables = useCallback((newVariables: Map<string, Variable>) => {
    const nextNames = new Set(newVariables.keys());
    reactiveStore.getAllVariables().forEach((variable) => {
      if (!nextNames.has(variable.name)) {
        reactiveStore.deleteVariable(variable.name);
      }
    });
    Array.from(newVariables.entries()).forEach(([name, variable]) => {
      reactiveStore.setVariableWithMetadata({ ...variable, name });
    });
    setVariables(new Map(newVariables));
  }, [reactiveStore]);

  const setVariable = useCallback((name: string, value: number) => {
    reactiveStore.setVariable(name, value.toString());
    refreshVariables();
  }, [reactiveStore, refreshVariables]);

  const getVariable = useCallback(
    (name: string) => {
      return reactiveStore.getVariable(name);
    },
    [reactiveStore]
  );

  const deleteVariable = useCallback(
    (name: string) => {
      const result = reactiveStore.deleteVariable(name);
      refreshVariables();
      return result;
    },
    [reactiveStore, refreshVariables]
  );

  const clearVariables = useCallback(() => {
    reactiveStore.clearVariables();
    refreshVariables();
  }, [reactiveStore, refreshVariables]);

  const hasVariable = useCallback(
    (name: string) => {
      return reactiveStore.hasVariable(name);
    },
    [reactiveStore]
  );

  const getAllVariables = useCallback(() => {
    return reactiveStore.getAllVariables();
  }, [reactiveStore]);

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
