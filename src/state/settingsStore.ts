import { SettingsState, SettingsAction } from "./types";

// Default settings configuration
export const DEFAULT_SETTINGS: SettingsState = {
  decimalPlaces: 2, // Default to 2 decimal places for clean display
  showVariablePanel: true, // Show variable panel by default
  showTemplatePanel: true, // Show template panel by default
};

// localStorage key for settings persistence
const SETTINGS_STORAGE_KEY = "smartpad-settings";

/**
 * Create initial settings state
 * Loads from localStorage if available, otherwise uses defaults
 */
export function createSettingsState(): SettingsState {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new settings
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
  }

  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to localStorage
 */
export function saveSettingsToStorage(settings: SettingsState): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to save settings to localStorage:", error);
  }
}

/**
 * Settings reducer for state management
 */
export function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case "UPDATE_SETTING": {
      const newState = {
        ...state,
        [action.payload.key]: action.payload.value,
      };

      // Auto-save to localStorage
      saveSettingsToStorage(newState);

      return newState;
    }

    case "RESET_SETTINGS": {
      const newState = { ...DEFAULT_SETTINGS };

      // Clear localStorage and save defaults
      saveSettingsToStorage(newState);

      return newState;
    }

    case "LOAD_SETTINGS": {
      return { ...action.payload };
    }

    default:
      return state;
  }
}
