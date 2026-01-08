import { SettingsState, SettingsAction } from "./types";

// Default settings configuration
export const DEFAULT_SETTINGS: SettingsState = {
  decimalPlaces: 2, // Default to 2 decimal places for clean display
  scientificUpperExponent: 12,
  scientificLowerExponent: -4,
  scientificTrimTrailingZeros: true,
  groupThousands: false,
  dateLocaleMode: "system",
  dateLocaleOverride: "",
  dateDisplayFormat: "iso",
  showVariablePanel: true,
  showTemplatePanel: true,
  showSettingsPanel: false,
  showResultPulse: true,
  showResultDelta: true,
  showResultBorders: true,
  showResultBackground: true,
  showErrorBorders: true,
  showErrorBackground: true,
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
      const merged = { ...DEFAULT_SETTINGS, ...parsed } as SettingsState & Record<string, any>;
      if (
        typeof parsed.scientificUpperExponent !== "number" &&
        typeof parsed.scientificUpperThreshold === "number" &&
        parsed.scientificUpperThreshold > 0
      ) {
        merged.scientificUpperExponent = Math.round(Math.log10(parsed.scientificUpperThreshold));
      }
      if (
        typeof parsed.scientificLowerExponent !== "number" &&
        typeof parsed.scientificLowerThreshold === "number" &&
        parsed.scientificLowerThreshold > 0
      ) {
        merged.scientificLowerExponent = Math.round(Math.log10(parsed.scientificLowerThreshold));
      }
      delete merged.scientificUpperThreshold;
      delete merged.scientificLowerThreshold;
      return merged;
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
