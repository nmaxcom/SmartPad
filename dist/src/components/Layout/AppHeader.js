"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./AppHeader.css");
function AppHeader({ onSettingsClick }) {
    return (react_1.default.createElement("header", { className: "app-header" },
        react_1.default.createElement("div", { className: "header-content" },
            react_1.default.createElement("img", { className: "header-icon", src: "/smartpad.png", alt: "SmartPad" }),
            react_1.default.createElement("h1", { className: "header-title" }, "SmartPad")),
        onSettingsClick && (react_1.default.createElement("button", { className: "settings-button", onClick: onSettingsClick, "aria-label": "Open settings", title: "Settings" }, "\u2699\uFE0F"))));
}
exports.default = AppHeader;
