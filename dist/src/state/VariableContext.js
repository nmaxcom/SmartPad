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
exports.VariableContext = void 0;
exports.VariableProvider = VariableProvider;
exports.useVariableContext = useVariableContext;
const react_1 = __importStar(require("react"));
const variableStore_1 = require("./variableStore");
// Create the context
const VariableContext = (0, react_1.createContext)(undefined);
exports.VariableContext = VariableContext;
/**
 * Variable Context Provider component
 * Provides variable state management to the entire application
 */
function VariableProvider({ children }) {
    // Create a reactive variable store for this context
    const [reactiveStore] = (0, react_1.useState)(() => new variableStore_1.ReactiveVariableStore());
    const [variables, setVariables] = (0, react_1.useState)(new Map());
    // Memoized methods that delegate to reactiveStore
    const refreshVariables = (0, react_1.useCallback)(() => {
        const vars = new Map();
        reactiveStore.getAllVariables().forEach((variable) => {
            vars.set(variable.name, variable);
        });
        setVariables(vars);
    }, [reactiveStore]);
    const replaceAllVariables = (0, react_1.useCallback)((newVariables) => {
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
    const setVariable = (0, react_1.useCallback)((name, value) => {
        reactiveStore.setVariable(name, value.toString());
        refreshVariables();
    }, [reactiveStore, refreshVariables]);
    const getVariable = (0, react_1.useCallback)((name) => {
        return reactiveStore.getVariable(name);
    }, [reactiveStore]);
    const deleteVariable = (0, react_1.useCallback)((name) => {
        const result = reactiveStore.deleteVariable(name);
        refreshVariables();
        return result;
    }, [reactiveStore, refreshVariables]);
    const clearVariables = (0, react_1.useCallback)(() => {
        reactiveStore.clearVariables();
        refreshVariables();
    }, [reactiveStore, refreshVariables]);
    const hasVariable = (0, react_1.useCallback)((name) => {
        return reactiveStore.hasVariable(name);
    }, [reactiveStore]);
    const getAllVariables = (0, react_1.useCallback)(() => {
        return reactiveStore.getAllVariables();
    }, [reactiveStore]);
    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = (0, react_1.useMemo)(() => ({
        variables,
        replaceAllVariables,
        setVariable,
        getVariable,
        deleteVariable,
        clearVariables,
        hasVariable,
        getAllVariables,
        reactiveStore,
    }), [
        variables,
        replaceAllVariables,
        setVariable,
        getVariable,
        deleteVariable,
        clearVariables,
        hasVariable,
        getAllVariables,
    ]);
    return react_1.default.createElement(VariableContext.Provider, { value: contextValue }, children);
}
/**
 * Hook to access the Variable Context
 * Throws an error if used outside of VariableProvider
 */
function useVariableContext() {
    const context = react_1.default.useContext(VariableContext);
    if (context === undefined) {
        throw new Error("useVariableContext must be used within a VariableProvider");
    }
    return context;
}
