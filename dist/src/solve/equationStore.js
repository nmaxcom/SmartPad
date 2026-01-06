"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordEquationFromNode = exports.normalizeVariableName = void 0;
const ast_1 = require("../parsing/ast");
const normalizeVariableName = (name) => name.replace(/\s+/g, " ").trim();
exports.normalizeVariableName = normalizeVariableName;
const recordEquationFromNode = (node, equations) => {
    if ((0, ast_1.isVariableAssignmentNode)(node)) {
        const expression = node.rawValue?.trim();
        if (!expression)
            return;
        equations.push({
            line: node.line,
            variableName: (0, exports.normalizeVariableName)(node.variableName),
            expression,
        });
        return;
    }
    if ((0, ast_1.isCombinedAssignmentNode)(node)) {
        const expression = node.expression?.trim();
        if (!expression)
            return;
        equations.push({
            line: node.line,
            variableName: (0, exports.normalizeVariableName)(node.variableName),
            expression,
        });
    }
};
exports.recordEquationFromNode = recordEquationFromNode;
