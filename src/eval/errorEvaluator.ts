/**
 * Error Evaluator for SmartPad
 *
 * This evaluator handles error nodes, returning error render nodes.
 */

import { ASTNode, ErrorNode, isErrorNode } from "../parsing/ast";
import { RenderNode, ErrorRenderNode } from "./renderNodes";
import { NodeEvaluator, EvaluationContext } from "./registry";

/**
 * Evaluator for error nodes
 */
export class ErrorEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isErrorNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isErrorNode(node)) {
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

/**
 * Default error evaluator instance
 */
export const defaultErrorEvaluator = new ErrorEvaluator();
