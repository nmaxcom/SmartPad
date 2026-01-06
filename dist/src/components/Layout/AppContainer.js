"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./AppContainer.css");
function AppContainer({ children, className = "" }) {
    const combinedClassName = `app-container ${className}`.trim();
    return react_1.default.createElement("div", { className: combinedClassName }, children);
}
exports.default = AppContainer;
