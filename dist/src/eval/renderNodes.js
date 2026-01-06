"use strict";
/**
 * Render Node Definitions for SmartPad
 *
 * These interfaces represent the evaluated output of AST nodes after processing.
 * They define what should be rendered in the editor for each type of content.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTextRenderNode = isTextRenderNode;
exports.isErrorRenderNode = isErrorRenderNode;
exports.isMathResultRenderNode = isMathResultRenderNode;
exports.isVariableRenderNode = isVariableRenderNode;
exports.isCombinedRenderNode = isCombinedRenderNode;
exports.isSliderRenderNode = isSliderRenderNode;
exports.isChartRenderNode = isChartRenderNode;
/**
 * Type guard functions for render nodes
 */
function isTextRenderNode(node) {
    return node.type === "text";
}
function isErrorRenderNode(node) {
    return node.type === "error";
}
function isMathResultRenderNode(node) {
    return node.type === "mathResult";
}
function isVariableRenderNode(node) {
    return node.type === "variable";
}
function isCombinedRenderNode(node) {
    return node.type === "combined";
}
function isSliderRenderNode(node) {
    return node.type === "slider";
}
function isChartRenderNode(node) {
    return node.type === "chart";
}
