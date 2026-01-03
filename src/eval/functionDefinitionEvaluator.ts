/**
 * @file Function Definition Evaluator
 * @description Registers user-defined functions in the evaluation context.
 */

import {
  ASTNode,
  FunctionDefinitionNode,
  isFunctionDefinitionNode,
} from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import { RenderNode, TextRenderNode } from "./renderNodes";

export class FunctionDefinitionEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isFunctionDefinitionNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isFunctionDefinitionNode(node)) {
      return null;
    }

    const def = node as FunctionDefinitionNode;
    const normalizedName = def.functionName.replace(/\s+/g, " ").trim();

    if (!context.functionStore) {
      context.functionStore = new Map();
    }

    if (context.functionStore.has(normalizedName)) {
      console.warn(`Function redefined: ${normalizedName}`);
    }

    context.functionStore.set(normalizedName, def);

    const renderNode: TextRenderNode = {
      type: "text",
      content: def.raw,
      line: def.line,
      originalRaw: def.raw,
    };

    return renderNode;
  }
}

export const defaultFunctionDefinitionEvaluator = new FunctionDefinitionEvaluator();
