"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsContext = void 0;
exports.SettingsProvider = SettingsProvider;
exports.useSettingsContext = useSettingsContext;
const react_1 = __importStar(require("react"));
const settingsStore_1 = require("./settingsStore");
const DateValue_1 = require("../types/DateValue");
// Create the context
const SettingsContext = (0, react_1.createContext)(undefined);
exports.SettingsContext = SettingsContext;
/**
 * Settings Context Provider component
 * Provides settings state management to the entire application
 */
function SettingsProvider({ children }) {
    const [state, dispatch] = (0, react_1.useReducer)(settingsStore_1.settingsReducer, (0, settingsStore_1.createSettingsState)());
    (0, react_1.useEffect)(() => {
        if (state.dateLocaleMode === "custom" && state.dateLocaleOverride.trim()) {
            (0, DateValue_1.setDateLocaleOverride)(state.dateLocaleOverride);
        }
        else {
            (0, DateValue_1.setDateLocaleOverride)(null);
        }
    }, [state.dateLocaleMode, state.dateLocaleOverride]);
    // Memoized action creators for performance
    const updateSetting = (0, react_1.useCallback)((key, value) => {
        dispatch({
            type: "UPDATE_SETTING",
            payload: { key, value },
        });
    }, []);
    const resetSettings = (0, react_1.useCallback)(() => {
        dispatch({ type: "RESET_SETTINGS" });
    }, []);
    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = (0, react_1.useMemo)(() => ({
        settings: state,
        updateSetting,
        resetSettings,
    }), [state, updateSetting, resetSettings]);
    return react_1.default.createElement(SettingsContext.Provider, { value: contextValue }, children);
}
/**
 * Hook to access the Settings Context
 * Throws an error if used outside of SettingsProvider
 */
function useSettingsContext() {
    const context = react_1.default.useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettingsContext must be used within a SettingsProvider");
    }
    return context;
}
