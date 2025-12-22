import { SemanticValue } from '../types';
import { ReactiveVariableStore } from './variableStore';

/**
 * Modern variable interface with semantic values
 * Used by the new type system
 */
export interface SemanticVariable {
  name: string;
  /**
   * Semantic value with proper type information
   * Replaces the old number | string approach with typed values
   */
  value: SemanticValue;
  /**
   * Original raw expression/value for display and debugging
   */
  rawValue: string;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Unit information for the variable (e.g., "m", "kg", "°C")
   * This is preserved for unit-aware operations and display
   */
  units?: string;
  /**
   * Quantity information for complex unit calculations
   * This bridges to the existing UnitsNet integration
   */
  quantity?: any;
}

/**
 * Variable type - now exclusively using semantic values
 * This completes the type system reform
 */
export type Variable = SemanticVariable;

export interface VariableState {
  variables: Map<string, Variable>;
}

export interface VariableOperations {
  replaceAllVariables: (newVariables: Map<string, Variable>) => void;
  /**
   * Legacy setVariable method (maintains backward compatibility)
   */
  setVariable: (name: string, value: number) => void;
  getVariable: (name: string) => Variable | undefined;
  deleteVariable: (name: string) => boolean;
  clearVariables: () => void;
  hasVariable: (name: string) => boolean;
  getAllVariables: () => Variable[];
  reactiveStore: ReactiveVariableStore;
}

export interface VariableContextType extends VariableOperations {
  variables: Map<string, Variable>;
}

export type VariableAction =
  | { type: "SET_VARIABLE"; payload: { name: string; value: number } }
  | { type: "DELETE_VARIABLE"; payload: { name: string } }
  | { type: "REPLACE_ALL"; payload: { newVariables: Map<string, Variable> } }
  | { type: "CLEAR_VARIABLES" };

// Settings Types
export interface SettingsState {
  decimalPlaces: number;
  // Future: theme, fontSize, autoSave, etc.
}

export interface SettingsOperations {
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
}

export interface SettingsContextType extends SettingsOperations {
  settings: SettingsState;
}

export type SettingsAction =
  | { type: "UPDATE_SETTING"; payload: { key: keyof SettingsState; value: any } }
  | { type: "RESET_SETTINGS" }
  | { type: "LOAD_SETTINGS"; payload: SettingsState };
