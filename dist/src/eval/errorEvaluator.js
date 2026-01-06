"use strict";
/**
 * Error Evaluator for SmartPad
 *
 * This evaluator handles error nodes, returning error render nodes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultErrorEvaluator = exports.ErrorEvaluator = void 0;
const ast_1 = require("../parsing/ast");
/**
 * Evaluator for error nodes
 */
class ErrorEvaluator {
    canHandle(node) {
        return (0, ast_1.isErrorNode)(node);
    }
    evaluate(node, context) {
        if (!(0, ast_1.isErrorNode)(node)) {
            return null;
        }
        // Return an error render node
        return {
            type: "error",
            line: node.line,
            originalRaw: node.raw,
            error: node.error,
            errorType: node.errorType,
            displayText: `${node.raw} ⚠️ ${node.error}`,
        };
    }
}
exports.ErrorEvaluator = ErrorEvaluator;
/**
 * Default error evaluator instance
 */
exports.defaultErrorEvaluator = new ErrorEvaluator();
