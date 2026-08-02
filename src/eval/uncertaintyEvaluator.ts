import {
  ASTNode,
  CombinedAssignmentNode,
  ExpressionNode,
  VariableAssignmentNode,
  isCombinedAssignmentNode,
  isExpressionNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import {
  ErrorValue,
  SemanticParsers,
  SemanticValue,
  SemanticValueTypes,
  UncertainValue,
} from "../types";
import { splitUncertaintyExpression } from "../utils/uncertaintyExpression";
import { SimpleExpressionParser } from "./expressionEvaluatorV2";
import { EvaluationContext, NodeEvaluator } from "./registry";
import {
  CombinedRenderNode,
  ErrorRenderNode,
  MathResultRenderNode,
  RenderNode,
  VariableRenderNode,
} from "./renderNodes";

const supportedUncertaintyType = (value: SemanticValue): boolean =>
  ["number", "percentage", "currency", "unit", "currencyUnit", "duration"].includes(
    value.getType()
  );

export const evaluateUncertaintyPart = (
  expression: string,
  context: EvaluationContext
): SemanticValue => {
  const literal = SemanticParsers.parse(expression);
  if (literal && !SemanticValueTypes.isError(literal)) return literal;
  try {
    const evaluated = SimpleExpressionParser.parseComponents(
      parseExpressionComponents(expression),
      context
    );
    return evaluated || ErrorValue.parseError("Empty uncertainty expression", expression);
  } catch (error) {
    return ErrorValue.parseError(
      error instanceof Error ? error.message : String(error),
      expression
    );
  }
};

export const evaluateUncertaintyExpression = (
  expression: string,
  context: EvaluationContext
): UncertainValue | ErrorValue | null => {
  const parts = splitUncertaintyExpression(expression);
  if (!parts) return null;

  const center = evaluateUncertaintyPart(parts.center, context);
  if (SemanticValueTypes.isError(center)) return center as ErrorValue;
  const tolerance = evaluateUncertaintyPart(parts.tolerance, context);
  if (SemanticValueTypes.isError(tolerance)) return tolerance as ErrorValue;

  if (!supportedUncertaintyType(center) || !supportedUncertaintyType(tolerance)) {
    return ErrorValue.semanticError(
      "Uncertainty supports numbers, percentages, currency, units, rates, and durations"
    );
  }
  if (center.getType() !== tolerance.getType()) {
    return ErrorValue.semanticError(
      `Uncertainty center and tolerance must use the same type (${center.getType()} vs ${tolerance.getType()})`
    );
  }

  try {
    return UncertainValue.plusMinus(center, tolerance);
  } catch (error) {
    return ErrorValue.semanticError(
      error instanceof Error ? error.message : String(error)
    );
  }
};

const getExpression = (node: ASTNode): string | null => {
  if (isVariableAssignmentNode(node)) return (node as VariableAssignmentNode).rawValue;
  if (isCombinedAssignmentNode(node)) return (node as CombinedAssignmentNode).expression;
  if (isExpressionNode(node)) return (node as ExpressionNode).expression;
  return null;
};

export class UncertaintyEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    const expression = getExpression(node);
    return !!expression && splitUncertaintyExpression(expression) !== null;
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    const expression = getExpression(node);
    if (!expression) return null;
    const value = evaluateUncertaintyExpression(expression, context);
    if (!value) return null;
    if (SemanticValueTypes.isError(value)) {
      return this.errorNode(node, (value as ErrorValue).getMessage());
    }

    const display = value.toString({
      precision: context.decimalPlaces,
      scientificUpperThreshold: context.scientificUpperThreshold,
      scientificLowerThreshold: context.scientificLowerThreshold,
      scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
      groupThousands: context.groupThousands,
    });

    if (isVariableAssignmentNode(node) || isCombinedAssignmentNode(node)) {
      const variableName = node.variableName;
      const stored = context.variableStore.setVariableWithSemanticValue(
        variableName,
        value,
        expression
      );
      if (!stored.success) {
        return this.errorNode(node, stored.error || "Failed to store uncertain value");
      }
      if (isCombinedAssignmentNode(node)) {
        const renderNode: CombinedRenderNode = {
          type: "combined",
          variableName,
          expression,
          result: display,
          semanticValue: value,
          displayText: `${variableName} = ${expression} => ${display}`,
          line: node.line,
          originalRaw: node.raw,
        };
        return renderNode;
      }
      const renderNode: VariableRenderNode = {
        type: "variable",
        variableName,
        value: display,
        semanticValue: value,
        displayText: `${variableName} = ${display}`,
        line: node.line,
        originalRaw: node.raw,
      };
      return renderNode;
    }

    const renderNode: MathResultRenderNode = {
      type: "mathResult",
      expression,
      result: display,
      semanticValue: value,
      displayText: `${expression} => ${display}`,
      line: node.line,
      originalRaw: node.raw,
    };
    return renderNode;
  }

  private errorNode(node: ASTNode, message: string): ErrorRenderNode {
    return {
      type: "error",
      error: message,
      errorType: "semantic",
      displayText: `⚠️ ${message}`,
      line: node.line,
      originalRaw: node.raw,
    };
  }
}

export const defaultUncertaintyEvaluator = new UncertaintyEvaluator();
