/**
 * Comment Evaluator for SmartPad
 *
 * This evaluator handles comment lines (starting with #), returning text render nodes.
 * Comments are not evaluated and are displayed as-is.
 */

import { ASTNode, CommentNode, isCommentNode } from "../parsing/ast";
import { RenderNode, TextRenderNode } from "./renderNodes";
import { NodeEvaluator, EvaluationContext } from "./registry";

/**
 * Evaluator for comment nodes
 */
export class CommentEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isCommentNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isCommentNode(node)) {
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

/**
 * Default comment evaluator instance
 */
export const defaultCommentEvaluator = new CommentEvaluator();

