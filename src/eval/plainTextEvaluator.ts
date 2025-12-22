/**
 * Plain Text Evaluator for SmartPad
 *
 * This evaluator handles plain text nodes, returning text render nodes.
 */

import { ASTNode, PlainTextNode, isPlainTextNode } from "../parsing/ast";
import { RenderNode, TextRenderNode } from "./renderNodes";
import { NodeEvaluator, EvaluationContext } from "./registry";

/**
 * Evaluator for plain text nodes
 */
export class PlainTextEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isPlainTextNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isPlainTextNode(node)) {
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

/**
 * Default plain text evaluator instance
 */
export const defaultPlainTextEvaluator = new PlainTextEvaluator();
