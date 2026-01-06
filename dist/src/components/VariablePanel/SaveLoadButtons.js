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
exports.default = SaveLoadButtons;
const react_1 = __importStar(require("react"));
const Editor_1 = require("../Editor");
const editorText_1 = require("../editorText");
require("./SaveLoadButtons.css");
const STORAGE_KEY = "smartpad-saves";
function SaveLoadButtons() {
    const { editor, setSmartPadContent } = (0, Editor_1.useEditorContext)();
    const [saves, setSaves] = (0, react_1.useState)([]);
    const [isLoadMenuOpen, setIsLoadMenuOpen] = (0, react_1.useState)(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = (0, react_1.useState)(false);
    const [saveName, setSaveName] = (0, react_1.useState)("");
    const loadButtonRef = (0, react_1.useRef)(null);
    const saveDialogRef = (0, react_1.useRef)(null);
    // Load saves from localStorage on mount
    (0, react_1.useEffect)(() => {
        const savedSaves = localStorage.getItem(STORAGE_KEY);
        if (savedSaves) {
            try {
                setSaves(JSON.parse(savedSaves));
            }
            catch (e) {
                console.error("Failed to parse saved saves:", e);
            }
        }
    }, []);
    // Save saves to localStorage whenever saves change
    (0, react_1.useEffect)(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
    }, [saves]);
    // Close load menu when clicking outside
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (event) => {
            if (loadButtonRef.current && !loadButtonRef.current.contains(event.target)) {
                setIsLoadMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    // Close save dialog when clicking outside
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (event) => {
            if (saveDialogRef.current && !saveDialogRef.current.contains(event.target)) {
                setIsSaveDialogOpen(false);
                setSaveName("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handleSave = () => {
        if (!editor)
            return;
        const content = (0, editorText_1.getSmartPadText)(editor);
        if (!content.trim())
            return;
        setIsSaveDialogOpen(true);
    };
    const confirmSave = () => {
        if (!editor || !saveName.trim())
            return;
        const content = (0, editorText_1.getSmartPadText)(editor);
        const now = Date.now();
        const newSave = {
            id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
            name: saveName.trim(),
            content,
            timestamp: now,
        };
        setSaves(prev => {
            // Add new save to the beginning
            const updatedSaves = [newSave, ...prev];
            // Keep only the 10 most recent saves
            return updatedSaves.slice(0, 10);
        });
        setIsSaveDialogOpen(false);
        setSaveName("");
    };
    const handleLoad = (save) => {
        setSmartPadContent(save.content);
        // Ensure evaluation runs after insertion (same as TemplatePanel)
        try {
            window.dispatchEvent(new Event('forceEvaluation'));
        }
        catch { }
        setIsLoadMenuOpen(false);
    };
    const handleDelete = (saveId, event) => {
        event.stopPropagation();
        setSaves(prev => prev.filter(s => s.id !== saveId));
    };
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - timestamp;
        if (diff < 60000)
            return "Just now";
        if (diff < 3600000)
            return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000)
            return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };
    return (react_1.default.createElement("div", { className: "save-load-buttons" },
        react_1.default.createElement("button", { onClick: handleSave, className: "save-button", "aria-label": "Save current content with a name", title: "Save current content with a name" },
            react_1.default.createElement("svg", { className: "button-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                react_1.default.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
                react_1.default.createElement("polyline", { points: "17,21 17,13 7,13 7,21" }),
                react_1.default.createElement("polyline", { points: "7,3 7,8 15,8" })),
            "Save"),
        react_1.default.createElement("div", { className: "load-button-container", ref: loadButtonRef },
            react_1.default.createElement("button", { onClick: () => setIsLoadMenuOpen(!isLoadMenuOpen), className: `load-button ${isLoadMenuOpen ? 'active' : ''}`, "aria-label": "Load a saved state", title: "Load a saved state" },
                react_1.default.createElement("svg", { className: "button-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                    react_1.default.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                    react_1.default.createElement("polyline", { points: "7,10 12,15 17,10" }),
                    react_1.default.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })),
                "Load",
                react_1.default.createElement("svg", { className: "dropdown-arrow", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                    react_1.default.createElement("polyline", { points: "6,9 12,15 18,9" }))),
            isLoadMenuOpen && (react_1.default.createElement("div", { className: "load-menu" }, saves.length === 0 ? (react_1.default.createElement("div", { className: "empty-state" },
                react_1.default.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "empty-icon" },
                    react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                    react_1.default.createElement("line", { x1: "8", y1: "12", x2: "16", y2: "12" })),
                react_1.default.createElement("span", null, "No saved states"),
                react_1.default.createElement("small", null, "Save some content to get started"))) : (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("div", { className: "menu-header" },
                    react_1.default.createElement("span", null, "Saved States"),
                    react_1.default.createElement("small", null,
                        saves.length,
                        " slot",
                        saves.length !== 1 ? 's' : '')),
                react_1.default.createElement("div", { className: "save-slots" }, saves.map((save) => (react_1.default.createElement("div", { key: save.id, className: "save-slot", onClick: () => handleLoad(save) },
                    react_1.default.createElement("div", { className: "slot-info" },
                        react_1.default.createElement("span", { className: "slot-name" }, save.name),
                        react_1.default.createElement("span", { className: "slot-time" }, formatTimestamp(save.timestamp))),
                    react_1.default.createElement("button", { className: "delete-slot", onClick: (e) => handleDelete(save.id, e), "aria-label": `Delete ${save.name}`, title: `Delete ${save.name}` },
                        react_1.default.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                            react_1.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                            react_1.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })))))))))))),
        isSaveDialogOpen && (react_1.default.createElement("div", { className: "save-dialog-overlay" },
            react_1.default.createElement("div", { className: "save-dialog", ref: saveDialogRef },
                react_1.default.createElement("div", { className: "dialog-header" },
                    react_1.default.createElement("h3", null, "Save Current State"),
                    react_1.default.createElement("button", { className: "close-dialog", onClick: () => {
                            setIsSaveDialogOpen(false);
                            setSaveName("");
                        }, "aria-label": "Close dialog" },
                        react_1.default.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                            react_1.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                            react_1.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })))),
                react_1.default.createElement("div", { className: "dialog-content" },
                    react_1.default.createElement("label", { htmlFor: "save-name" }, "Give this save a name:"),
                    react_1.default.createElement("input", { id: "save-name", type: "text", value: saveName, onChange: (e) => setSaveName(e.target.value), placeholder: "e.g., 'Login flow test', 'Error case 1'", autoFocus: true, onKeyDown: (e) => {
                            if (e.key === 'Enter')
                                confirmSave();
                            if (e.key === 'Escape') {
                                setIsSaveDialogOpen(false);
                                setSaveName("");
                            }
                        } })),
                react_1.default.createElement("div", { className: "dialog-actions" },
                    react_1.default.createElement("button", { className: "cancel-button", onClick: () => {
                            setIsSaveDialogOpen(false);
                            setSaveName("");
                        } }, "Cancel"),
                    react_1.default.createElement("button", { className: "confirm-button", onClick: confirmSave, disabled: !saveName.trim() }, "Save")))))));
}
