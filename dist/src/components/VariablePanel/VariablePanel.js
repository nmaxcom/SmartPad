"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const state_1 = require("../../state");
const SettingsContext_1 = require("../../state/SettingsContext");
const DateValue_1 = require("../../types/DateValue");
require("./VariablePanel.css");
function VariablePanel() {
    const { variables } = (0, state_1.useVariables)();
    const { settings } = (0, SettingsContext_1.useSettingsContext)();
    const displayOptions = {
        precision: settings.decimalPlaces,
        scientificUpperThreshold: Math.pow(10, settings.scientificUpperExponent),
        scientificLowerThreshold: Math.pow(10, settings.scientificLowerExponent),
        scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
        dateFormat: settings.dateDisplayFormat,
        dateLocale: (0, DateValue_1.getDateLocaleEffective)(),
    };
    // Convert the Map to an array for easier rendering
    const variableList = Array.from(variables.entries());
    // Helper function to format variable values using SemanticValue's toString()
    const formatVariableValue = (variable) => {
        if (variable.value?.toString) {
            return variable.value.toString(displayOptions);
        }
        return String(variable.value);
    };
    // Helper function to get the display value for computed values in the panel
    const getComputedDisplayValue = (variable) => {
        if (variable.value?.toString) {
            return variable.value.toString(displayOptions);
        }
        return String(variable.value);
    };
    return (react_1.default.createElement("aside", { className: "variable-panel", "data-testid": "variable-panel" },
        react_1.default.createElement("h2", { className: "panel-title" }, "Variables"),
        react_1.default.createElement("div", { className: "panel-content" }, variableList.length > 0 ? (react_1.default.createElement("ul", { className: "variable-list" }, variableList.map(([name, variable]) => (react_1.default.createElement("li", { key: name, className: "variable-item" },
            react_1.default.createElement("div", { className: "variable-info" },
                react_1.default.createElement("span", { className: "variable-name" }, name),
                react_1.default.createElement("div", { className: "variable-values" }, variable.rawValue &&
                    variable.rawValue !== variable.value?.toString(displayOptions) ? (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement("span", { className: "variable-raw-value" }, variable.rawValue),
                    react_1.default.createElement("span", { className: "variable-equals" }, "="),
                    react_1.default.createElement("span", { className: "variable-computed-value" }, (() => {
                        if (variable.value?.toString) {
                            const value = variable.value.toString(displayOptions);
                            const type = variable.value.getType();
                            return (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement("span", { className: "variable-value" }, value),
                                react_1.default.createElement("span", { className: `variable-type variable-type-${type}` }, type)));
                        }
                        return String(variable.value);
                    })()))) : (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement("span", { className: "variable-value" }, formatVariableValue(variable)),
                    variable.value?.getType && (react_1.default.createElement("span", { className: `variable-type variable-type-${variable.value.getType()}` }, variable.value.getType()))))))))))) : (react_1.default.createElement("p", { className: "empty-message" }, "No variables defined yet.")))));
}
exports.default = VariablePanel;
