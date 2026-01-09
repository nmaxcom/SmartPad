import { ASTNode, ExpressionNode, isExpressionNode } from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import { ExpressionEvaluatorV2 } from "./expressionEvaluatorV2";
import { ErrorRenderNode, RenderNode } from "./renderNodes";
import { rewriteLocaleDateLiterals } from "../utils/localeDateNormalization";
import { parseExpressionComponents } from "../parsing/expressionComponents";

const containsRangeOperator = (expression: string): boolean => {
  let inSingle = false;
  let inDouble = false;
  for (let idx = 0; idx < expression.length - 1; idx += 1) {
    const char = expression[idx];
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inDouble && char === "." && expression[idx + 1] === ".") {
      return true;
    }
  }
  return false;
};

export class RangeExpressionEvaluator implements NodeEvaluator {
  private readonly expressionEvaluator = new ExpressionEvaluatorV2();

  canHandle(node: ASTNode): boolean {
    if (!isExpressionNode(node)) {
      return false;
    }
    return containsRangeOperator(node.expression);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isExpressionNode(node)) {
      return null;
    }
    const normalized = rewriteLocaleDateLiterals(node.expression, context.dateLocale);
    if (normalized.errors.length > 0) {
      const message = normalized.errors[0];
      return this.createErrorNode(message, node.expression, context.lineNumber);
    }
    const components = parseExpressionComponents(normalized.expression);
    const rewrittenNode: ExpressionNode = {
      ...node,
      expression: normalized.expression,
      components,
    };
    return this.expressionEvaluator.evaluate(rewrittenNode, context);
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
