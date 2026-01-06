"use strict";
/**
 * Plain Text Evaluator for SmartPad
 *
 * This evaluator handles plain text nodes, returning text render nodes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPlainTextEvaluator = exports.PlainTextEvaluator = void 0;
const ast_1 = require("../parsing/ast");
/**
 * Evaluator for plain text nodes
 */
class PlainTextEvaluator {
    canHandle(node) {
        return (0, ast_1.isPlainTextNode)(node);
    }
    evaluate(node, context) {
        if (!(0, ast_1.isPlainTextNode)(node)) {
            return null;
        }
        // Return a text render node
        return {
            type: "text",
            line: node.line,
            originalRaw: node.raw,
            content: node.content,
        };
    }
}
exports.PlainTextEvaluator = PlainTextEvaluator;
/**
 * Default plain text evaluator instance
 */
exports.defaultPlainTextEvaluator = new PlainTextEvaluator();
