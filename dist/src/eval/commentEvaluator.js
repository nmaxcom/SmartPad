"use strict";
/**
 * Comment Evaluator for SmartPad
 *
 * This evaluator handles comment lines (starting with #), returning text render nodes.
 * Comments are not evaluated and are displayed as-is.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCommentEvaluator = exports.CommentEvaluator = void 0;
const ast_1 = require("../parsing/ast");
/**
 * Evaluator for comment nodes
 */
class CommentEvaluator {
    canHandle(node) {
        return (0, ast_1.isCommentNode)(node);
    }
    evaluate(node, context) {
        if (!(0, ast_1.isCommentNode)(node)) {
            return null;
        }
        // Return a text render node - comments are not evaluated
        return {
            type: "text",
            line: node.line,
            originalRaw: node.raw,
            content: node.content,
        };
    }
}
exports.CommentEvaluator = CommentEvaluator;
/**
 * Default comment evaluator instance
 */
exports.defaultCommentEvaluator = new CommentEvaluator();
