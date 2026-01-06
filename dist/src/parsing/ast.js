"use strict";
/**
 * AST Node Definitions for SmartPad
 *
 * These immutable interfaces represent the parsed structure of each line in the SmartPad editor.
 * They serve as the intermediate representation between raw text and evaluated content.
 *
 * Updated to support semantic types - values are parsed into SemanticValue instances
 * during parsing, eliminating the need for type guessing during evaluation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlainTextNode = isPlainTextNode;
exports.isCommentNode = isCommentNode;
exports.isVariableAssignmentNode = isVariableAssignmentNode;
exports.isExpressionNode = isExpressionNode;
exports.isCombinedAssignmentNode = isCombinedAssignmentNode;
exports.isErrorNode = isErrorNode;
exports.isFunctionDefinitionNode = isFunctionDefinitionNode;
/**
 * Type guard functions for AST nodes
 */
function isPlainTextNode(node) {
    return node.type === "plainText";
}
function isCommentNode(node) {
    return node.type === "comment";
}
function isVariableAssignmentNode(node) {
    return node.type === "variableAssignment";
}
function isExpressionNode(node) {
    return node.type === "expression";
}
function isCombinedAssignmentNode(node) {
    return node.type === "combinedAssignment";
}
function isErrorNode(node) {
    return node.type === "error";
}
function isFunctionDefinitionNode(node) {
    return node.type === "functionDefinition";
}
