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
exports.SyntaxExplorer = SyntaxExplorer;
const react_1 = __importStar(require("react"));
const registry_1 = require("../syntax/registry");
/**
 * SyntaxExplorer Component
 *
 * A developer tool that displays all available syntax patterns in SmartPad.
 * This serves as a quick reference for developers and can be used during development.
 */
function SyntaxExplorer() {
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)("all");
    const [searchTerm, setSearchTerm] = (0, react_1.useState)("");
    const [expandedCategories, setExpandedCategories] = (0, react_1.useState)(new Set());
    const categories = ["all", ...(0, registry_1.getSyntaxByCategory)("percentages").map(() => "percentages"), ...(0, registry_1.getSyntaxByCategory)("variables").map(() => "variables"), ...(0, registry_1.getSyntaxByCategory)("units").map(() => "units"), ...(0, registry_1.getSyntaxByCategory)("currency").map(() => "currency")].filter((v, i, a) => a.indexOf(v) === i);
    const toggleCategory = (category) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        }
        else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };
    const getFilteredSyntax = () => {
        let filtered = registry_1.SYNTAX_REGISTRY;
        if (selectedCategory !== "all") {
            filtered = filtered.filter(pattern => pattern.category === selectedCategory);
        }
        if (searchTerm) {
            filtered = (0, registry_1.searchSyntax)(searchTerm);
        }
        return filtered;
    };
    const filteredSyntax = getFilteredSyntax();
    return (react_1.default.createElement("div", { className: "syntax-explorer", style: { padding: "20px", fontFamily: "monospace" } },
        react_1.default.createElement("h2", null, "SmartPad Syntax Reference"),
        react_1.default.createElement("div", { style: { marginBottom: "20px" } },
            react_1.default.createElement("input", { type: "text", placeholder: "Search syntax patterns...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), style: {
                    padding: "8px",
                    marginRight: "10px",
                    width: "300px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                } }),
            react_1.default.createElement("select", { value: selectedCategory, onChange: (e) => setSelectedCategory(e.target.value), style: {
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                } },
                react_1.default.createElement("option", { value: "all" }, "All Categories"),
                categories.filter(cat => cat !== "all").map(category => (react_1.default.createElement("option", { key: category, value: category }, category.charAt(0).toUpperCase() + category.slice(1)))))),
        react_1.default.createElement("div", { style: { marginBottom: "20px", color: "#666" } },
            "Showing ",
            filteredSyntax.length,
            " syntax patterns",
            selectedCategory !== "all" && ` in ${selectedCategory}`,
            searchTerm && ` matching "${searchTerm}"`),
        react_1.default.createElement("div", null, filteredSyntax.map((pattern, index) => (react_1.default.createElement("div", { key: index, style: {
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "15px",
                backgroundColor: "#f9f9f9"
            } },
            react_1.default.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
                react_1.default.createElement("h3", { style: { margin: 0, color: "#333" } }, pattern.syntax),
                react_1.default.createElement("span", { style: {
                        backgroundColor: "#007bff",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        textTransform: "uppercase"
                    } }, pattern.category)),
            react_1.default.createElement("p", { style: { margin: "8px 0", color: "#555" } }, pattern.description),
            react_1.default.createElement("div", { style: { margin: "8px 0" } },
                react_1.default.createElement("strong", null, "Output:"),
                " ",
                pattern.output),
            pattern.examples && pattern.examples.length > 0 && (react_1.default.createElement("div", { style: { margin: "8px 0" } },
                react_1.default.createElement("strong", null, "Examples:"),
                react_1.default.createElement("ul", { style: { margin: "8px 0", paddingLeft: "20px" } }, pattern.examples.map((example, i) => (react_1.default.createElement("li", { key: i, style: { fontFamily: "monospace", color: "#007bff" } }, example)))))))))),
        react_1.default.createElement("div", { style: { marginTop: "30px", padding: "20px", backgroundColor: "#f0f8ff", borderRadius: "8px" } },
            react_1.default.createElement("h3", null, "Quick Reference"),
            react_1.default.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" } }, categories.filter(cat => cat !== "all").map(category => {
                const categoryPatterns = (0, registry_1.getSyntaxByCategory)(category);
                return (react_1.default.createElement("div", { key: category, style: { border: "1px solid #ddd", borderRadius: "6px", padding: "15px", backgroundColor: "white" } },
                    react_1.default.createElement("h4", { style: { margin: "0 0 10px 0", color: "#333" } },
                        category.charAt(0).toUpperCase() + category.slice(1),
                        " (",
                        categoryPatterns.length,
                        ")"),
                    react_1.default.createElement("ul", { style: { margin: 0, paddingLeft: "20px", fontSize: "14px" } },
                        categoryPatterns.slice(0, 3).map((pattern, i) => (react_1.default.createElement("li", { key: i, style: { marginBottom: "5px" } },
                            react_1.default.createElement("code", { style: { backgroundColor: "#f5f5f5", padding: "2px 4px", borderRadius: "3px" } }, pattern.syntax)))),
                        categoryPatterns.length > 3 && (react_1.default.createElement("li", { style: { color: "#666", fontStyle: "italic" } },
                            "... and ",
                            categoryPatterns.length - 3,
                            " more")))));
            })))));
}
exports.default = SyntaxExplorer;
