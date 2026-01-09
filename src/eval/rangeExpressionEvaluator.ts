import { ASTNode, ExpressionNode, isExpressionNode } from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import { ExpressionEvaluatorV2 } from "./expressionEvaluatorV2";
import { ErrorRenderNode, RenderNode } from "./renderNodes";
import { rewriteLocaleDateLiterals } from "../utils/localeDateNormalization";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import {
  containsRangeOperatorOutsideString,
  isValidRangeExpressionCandidate,
  normalizeRangeErrorMessage,
} from "../utils/rangeExpression";

export class RangeExpressionEvaluator implements NodeEvaluator {
  private readonly expressionEvaluator = new ExpressionEvaluatorV2();

  canHandle(node: ASTNode): boolean {
    if (!isExpressionNode(node)) {
      return false;
    }
    return containsRangeOperatorOutsideString(node.expression);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isExpressionNode(node)) {
      return null;
    }
    const normalized = rewriteLocaleDateLiterals(
      node.expression,
      context.dateLocale
    );
    if (normalized.errors.length > 0) {
      const message = normalized.errors[0];
      return this.createErrorNode(message, node.expression, context.lineNumber);
    }
    if (!isValidRangeExpressionCandidate(normalized.expression)) {
      return this.createErrorNode(
        `Invalid range expression near "${node.expression}"`,
        node.expression,
        context.lineNumber
      );
    }
    const components = parseExpressionComponents(normalized.expression);
    const rewrittenNode: ExpressionNode = {
      ...node,
      expression: normalized.expression,
      components,
    };
    const result = this.expressionEvaluator.evaluate(rewrittenNode, context);
    if (result?.type === "error") {
      return this.createErrorNode(
        normalizeRangeErrorMessage(node.expression, result.error),
        node.expression,
        context.lineNumber
      );
    }
    return result;
  }

  private createErrorNode(
    message: string,
    expression: string,
    line: number
  ): ErrorRenderNode {
    return {
      type: "error",
      line,
      originalRaw: expression,
      error: message,
      errorType: "parse",
      displayText: `${expression} => ⚠️ ${message}`,
    };
  }
}
