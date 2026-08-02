import {
  ASTNode,
  isModelBodyNode,
  isModelDefinitionNode,
} from "../parsing/ast";
import { EvaluationContext, NodeEvaluator } from "./registry";
import { RenderNode, TextRenderNode } from "./renderNodes";

export class ModelEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isModelDefinitionNode(node) || isModelBodyNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (isModelDefinitionNode(node)) {
      if (!context.modelStore) context.modelStore = new Map();
      context.functionStore?.delete(node.modelName);
      context.modelStore.set(node.modelName, node);
    }

    const renderNode: TextRenderNode = {
      type: "text",
      content: node.raw,
      line: node.line,
      originalRaw: node.raw,
    };
    return renderNode;
  }
}

export const defaultModelEvaluator = new ModelEvaluator();
