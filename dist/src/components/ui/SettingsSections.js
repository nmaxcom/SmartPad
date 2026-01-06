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
exports.SettingsSections = SettingsSections;
const react_1 = __importStar(require("react"));
const SettingsContext_1 = require("../../state/SettingsContext");
const DateValue_1 = require("../../types/DateValue");
function SettingsSections() {
    const { settings, updateSetting } = (0, SettingsContext_1.useSettingsContext)();
    const detectedLocale = (0, DateValue_1.getDateLocaleDetected)();
    const effectiveLocale = (0, DateValue_1.getDateLocaleEffective)();
    const isCustomLocale = settings.dateLocaleMode === "custom";
    const handleDecimalPlacesChange = (0, react_1.useCallback)((value) => {
        const clampedValue = Math.max(0, Math.min(10, value));
        updateSetting("decimalPlaces", clampedValue);
    }, [updateSetting]);
    const handleScientificUpperChange = (0, react_1.useCallback)((value) => {
        const safeValue = Number.isFinite(value)
            ? Math.round(value)
            : settings.scientificUpperExponent;
        updateSetting("scientificUpperExponent", safeValue);
    }, [updateSetting, settings.scientificUpperExponent]);
    const handleScientificLowerChange = (0, react_1.useCallback)((value) => {
        const safeValue = Number.isFinite(value)
            ? Math.round(value)
            : settings.scientificLowerExponent;
        updateSetting("scientificLowerExponent", safeValue);
    }, [updateSetting, settings.scientificLowerExponent]);
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement("div", { className: "settings-section" },
            react_1.default.createElement("h3", { className: "settings-section-title" }, "Display Options"),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "decimal-places", className: "settings-label" }, "Decimal Places"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Number of decimal places to show in results and variable panel (0-10). If a non-zero value would round to 0, SmartPad forces scientific notation instead.")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("input", { id: "decimal-places", type: "number", min: "0", max: "10", value: settings.decimalPlaces, onChange: (e) => handleDecimalPlacesChange(parseInt(e.target.value) || 0), className: "settings-number-input" }))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "scientific-upper-exponent", className: "settings-label" }, "Scientific Upper Exponent (10^N)"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Use scientific notation when values are at or above 10^N")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("input", { id: "scientific-upper-exponent", type: "number", step: "1", value: settings.scientificUpperExponent, onChange: (e) => handleScientificUpperChange(parseFloat(e.target.value)), className: "settings-number-input" }))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "scientific-lower-exponent", className: "settings-label" }, "Scientific Lower Exponent (10^N)"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Use scientific notation when values are below 10^N")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("input", { id: "scientific-lower-exponent", type: "number", step: "1", value: settings.scientificLowerExponent, onChange: (e) => handleScientificLowerChange(parseFloat(e.target.value)), className: "settings-number-input" }))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "scientific-trim-zeros", className: "settings-label" }, "Trim Scientific Trailing Zeros"),
                    react_1.default.createElement("p", { className: "settings-description" }, "When enabled, 5.000e+3 renders as 5e+3. Disable to keep fixed mantissa decimals.")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "scientific-trim-zeros", type: "checkbox", checked: settings.scientificTrimTrailingZeros, onChange: (e) => updateSetting("scientificTrimTrailingZeros", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" }))))),
        react_1.default.createElement("div", { className: "settings-section" },
            react_1.default.createElement("h3", { className: "settings-section-title" }, "Date Parsing"),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "date-locale-mode", className: "settings-label" }, "Date Locale"),
                    react_1.default.createElement("p", { className: "settings-description" },
                        "Detected locale: ",
                        detectedLocale,
                        ". Using: ",
                        effectiveLocale,
                        ".")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("select", { id: "date-locale-mode", value: settings.dateLocaleMode, onChange: (e) => updateSetting("dateLocaleMode", e.target.value === "custom" ? "custom" : "system"), className: "settings-select" },
                        react_1.default.createElement("option", { value: "system" }, "System default"),
                        react_1.default.createElement("option", { value: "custom" }, "Custom override")))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "date-display-format", className: "settings-label" }, "Date Display Format"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Choose between ISO (YYYY-MM-DD) or locale-style formatting.")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("select", { id: "date-display-format", value: settings.dateDisplayFormat, onChange: (e) => updateSetting("dateDisplayFormat", e.target.value === "locale" ? "locale" : "iso"), className: "settings-select" },
                        react_1.default.createElement("option", { value: "iso" }, "ISO (YYYY-MM-DD)"),
                        react_1.default.createElement("option", { value: "locale" }, "Locale format")))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "date-locale-override", className: "settings-label" }, "Locale Override"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Use a BCP 47 locale code (example: en-US, en-GB). Only affects numeric dates like 06/05/2024.")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("input", { id: "date-locale-override", type: "text", value: settings.dateLocaleOverride, onChange: (e) => updateSetting("dateLocaleOverride", e.target.value), className: "settings-text-input", disabled: !isCustomLocale, placeholder: "en-US" })))),
        react_1.default.createElement("div", { className: "settings-section" },
            react_1.default.createElement("h3", { className: "settings-section-title" }, "Results Feedback"),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-result-pulse", className: "settings-label" }, "Flash on Result Change"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Brief pulse animation when a result value updates")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-result-pulse", type: "checkbox", checked: settings.showResultPulse, onChange: (e) => updateSetting("showResultPulse", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-result-delta", className: "settings-label" }, "Delta Badge"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Show the change amount beside updated results")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-result-delta", type: "checkbox", checked: settings.showResultDelta, onChange: (e) => updateSetting("showResultDelta", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-result-borders", className: "settings-label" }, "Result Borders"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Toggle the border outline around results")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-result-borders", type: "checkbox", checked: settings.showResultBorders, onChange: (e) => updateSetting("showResultBorders", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-result-background", className: "settings-label" }, "Result Backgrounds"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Toggle the filled background behind results")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-result-background", type: "checkbox", checked: settings.showResultBackground, onChange: (e) => updateSetting("showResultBackground", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-error-borders", className: "settings-label" }, "Error Borders"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Toggle the border outline around errors")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-error-borders", type: "checkbox", checked: settings.showErrorBorders, onChange: (e) => updateSetting("showErrorBorders", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-error-background", className: "settings-label" }, "Error Backgrounds"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Toggle the filled background behind errors")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-error-background", type: "checkbox", checked: settings.showErrorBackground, onChange: (e) => updateSetting("showErrorBackground", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" }))))),
        react_1.default.createElement("div", { className: "settings-section" },
            react_1.default.createElement("h3", { className: "settings-section-title" }, "Layout"),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-variable-panel", className: "settings-label" }, "Show Variable Panel"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Display the panel showing all defined variables and their current values")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-variable-panel", type: "checkbox", checked: settings.showVariablePanel, onChange: (e) => updateSetting("showVariablePanel", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-template-panel", className: "settings-label" }, "Show Template Panel"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Display the panel with quick template examples to get started")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-template-panel", type: "checkbox", checked: settings.showTemplatePanel, onChange: (e) => updateSetting("showTemplatePanel", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))),
            react_1.default.createElement("div", { className: "settings-item" },
                react_1.default.createElement("div", { className: "settings-item-info" },
                    react_1.default.createElement("label", { htmlFor: "show-settings-panel", className: "settings-label" }, "Show Settings Panel"),
                    react_1.default.createElement("p", { className: "settings-description" }, "Keep settings visible next to the editor")),
                react_1.default.createElement("div", { className: "settings-control" },
                    react_1.default.createElement("label", { className: "toggle-switch" },
                        react_1.default.createElement("input", { id: "show-settings-panel", type: "checkbox", checked: settings.showSettingsPanel, onChange: (e) => updateSetting("showSettingsPanel", e.target.checked) }),
                        react_1.default.createElement("span", { className: "toggle-slider" })))))));
}
