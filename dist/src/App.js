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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const Editor_1 = __importStar(require("./components/Editor"));
const state_1 = require("./state");
const SettingsContext_1 = require("./state/SettingsContext");
const AppHeader_1 = __importDefault(require("./components/Layout/AppHeader"));
const AppContainer_1 = __importDefault(require("./components/Layout/AppContainer"));
const VariablePanel_1 = __importDefault(require("./components/VariablePanel/VariablePanel"));
const TemplatePanel_1 = __importDefault(require("./components/VariablePanel/TemplatePanel"));
const SaveLoadButtons_1 = __importDefault(require("./components/VariablePanel/SaveLoadButtons"));
const SettingsModal_1 = require("./components/ui/SettingsModal");
const SettingsPanel_1 = require("./components/ui/SettingsPanel");
const tracing_1 = require("./eval/tracing");
// Initialize global tracer access
window.smartpadTracer = {
    tracer: tracing_1.tracer,
    setLogLevel: tracing_1.setLogLevel,
    LogLevel: tracing_1.LogLevel,
    getLogLevel: () => tracing_1.LogLevel.INFO, // Default getter
    // Helper functions for easy debugging
    enableVerboseLogging: () => (0, tracing_1.setLogLevel)(tracing_1.LogLevel.DEBUG),
    enableInfoLogging: () => (0, tracing_1.setLogLevel)(tracing_1.LogLevel.INFO),
    enableWarningLogging: () => (0, tracing_1.setLogLevel)(tracing_1.LogLevel.WARN),
    enableErrorOnlyLogging: () => (0, tracing_1.setLogLevel)(tracing_1.LogLevel.ERROR),
    clearTraces: () => tracing_1.tracer.clearTraces(),
    getCurrentLevel: () => {
        const level = tracing_1.LogLevel.INFO; // This should get the actual current level
        const names = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        return names[level] || 'UNKNOWN';
    }
};
function AppContent() {
    const [isSettingsOpen, setIsSettingsOpen] = (0, react_1.useState)(false);
    const { settings } = (0, SettingsContext_1.useSettingsContext)();
    const handleOpenSettings = () => setIsSettingsOpen(true);
    const handleCloseSettings = () => setIsSettingsOpen(false);
    // Show sidebar only if at least one panel is enabled
    const showSidebar = settings.showVariablePanel || settings.showTemplatePanel || settings.showSettingsPanel;
    const appClassName = [
        "app",
        settings.showResultPulse ? "results-pulse-on" : "results-pulse-off",
        settings.showResultDelta ? "results-delta-on" : "results-delta-off",
        settings.showResultBorders ? "results-borders-on" : "results-borders-off",
        settings.showResultBackground ? "results-bg-on" : "results-bg-off",
        settings.showErrorBorders ? "errors-borders-on" : "errors-borders-off",
        settings.showErrorBackground ? "errors-bg-on" : "errors-bg-off",
    ].join(" ");
    return (react_1.default.createElement("div", { className: appClassName },
        react_1.default.createElement(state_1.VariableProvider, null,
            react_1.default.createElement(Editor_1.EditorProvider, null,
                react_1.default.createElement(AppHeader_1.default, { onSettingsClick: handleOpenSettings }),
                react_1.default.createElement("main", { className: "app-main" },
                    react_1.default.createElement(AppContainer_1.default, { className: "main-grid-layout" },
                        react_1.default.createElement("div", { className: "editor-card-container" },
                            react_1.default.createElement(Editor_1.default, null)),
                        showSidebar && (react_1.default.createElement("div", { className: "sidebar-container" },
                            settings.showVariablePanel && (react_1.default.createElement(react_1.default.Fragment, null,
                                react_1.default.createElement(VariablePanel_1.default, null),
                                react_1.default.createElement(SaveLoadButtons_1.default, null))),
                            settings.showTemplatePanel && react_1.default.createElement(TemplatePanel_1.default, null),
                            settings.showSettingsPanel && react_1.default.createElement(SettingsPanel_1.SettingsPanel, null))))),
                react_1.default.createElement(SettingsModal_1.SettingsModal, { isOpen: isSettingsOpen, onClose: handleCloseSettings })))));
}
function App() {
    return (react_1.default.createElement(SettingsContext_1.SettingsProvider, null,
        react_1.default.createElement(AppContent, null)));
}
exports.default = App;
