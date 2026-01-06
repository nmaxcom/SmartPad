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
exports.SettingsModal = SettingsModal;
const react_1 = __importStar(require("react"));
const SettingsContext_1 = require("../../state/SettingsContext");
const SettingsSections_1 = require("./SettingsSections");
require("./SettingsModal.css");
/**
 * Settings Modal Component
 * Provides settings configuration interface with modern UI
 */
function SettingsModal({ isOpen, onClose }) {
    const { resetSettings } = (0, SettingsContext_1.useSettingsContext)();
    const modalRef = (0, react_1.useRef)(null);
    // Handle Escape key press
    const handleKeyDown = (0, react_1.useCallback)((event) => {
        if (event.key === "Escape") {
            onClose();
        }
    }, [onClose]);
    // Handle click outside modal
    const handleBackdropClick = (0, react_1.useCallback)((event) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }, [onClose]);
    // Setup event listeners
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
            // Focus the modal for accessibility
            if (modalRef.current) {
                modalRef.current.focus();
            }
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, handleKeyDown]);
    // Handle reset settings
    const handleReset = (0, react_1.useCallback)(() => {
        if (window.confirm("Reset all settings to defaults?")) {
            resetSettings();
        }
    }, [resetSettings]);
    if (!isOpen)
        return null;
    return (react_1.default.createElement("div", { className: "settings-modal-backdrop", onClick: handleBackdropClick },
        react_1.default.createElement("div", { ref: modalRef, className: "settings-modal", role: "dialog", "aria-labelledby": "settings-title", "aria-modal": "true", tabIndex: -1 },
            react_1.default.createElement("div", { className: "settings-header" },
                react_1.default.createElement("h2", { id: "settings-title", className: "settings-title" }, "Settings"),
                react_1.default.createElement("button", { className: "settings-close-btn", onClick: onClose, "aria-label": "Close settings" }, "\u00D7")),
            react_1.default.createElement("div", { className: "settings-content" },
                react_1.default.createElement(SettingsSections_1.SettingsSections, null)),
            react_1.default.createElement("div", { className: "settings-footer" },
                react_1.default.createElement("button", { className: "settings-btn settings-btn-secondary", onClick: handleReset }, "Reset to Defaults"),
                react_1.default.createElement("button", { className: "settings-btn settings-btn-primary", onClick: onClose }, "Done")))));
}
