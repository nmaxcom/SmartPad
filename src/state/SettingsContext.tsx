import React, { createContext, useReducer, useCallback, useMemo, ReactNode, useEffect } from "react";
import { SettingsContextType, SettingsState, SettingsAction } from "./types";
import { createSettingsState, settingsReducer } from "./settingsStore";
import { setDateLocaleOverride } from "../types/DateValue";
import { setListMaxLength } from "../types/listConfig";

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

/**
 * Settings Context Provider component
 * Provides settings state management to the entire application
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const [state, dispatch] = useReducer(settingsReducer, createSettingsState());

  useEffect(() => {
    if (state.dateLocaleMode === "custom" && state.dateLocaleOverride.trim()) {
      setDateLocaleOverride(state.dateLocaleOverride);
    } else {
      setDateLocaleOverride(null);
    }
  }, [state.dateLocaleMode, state.dateLocaleOverride]);

  useEffect(() => {
    setListMaxLength(state.listMaxLength);
  }, [state.listMaxLength]);

  // Memoized action creators for performance
  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      dispatch({
        type: "UPDATE_SETTING",
        payload: { key, value },
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    dispatch({ type: "RESET_SETTINGS" });
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<SettingsContextType>(
    () => ({
      settings: state,
      updateSetting,
      resetSettings,
    }),
    [state, updateSetting, resetSettings]
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

/**
 * Hook to access the Settings Context
 * Throws an error if used outside of SettingsProvider
 */
export function useSettingsContext(): SettingsContextType {
  const context = React.useContext(SettingsContext);

  if (context === undefined) {
    throw new Error("useSettingsContext must be used within a SettingsProvider");
  }

  return context;
}

export { SettingsContext };
