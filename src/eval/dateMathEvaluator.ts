/**
 * @file Date Math Evaluator
 * @description Handles date/time expressions and combined assignments.
 */

import {
  ASTNode,
  ExpressionNode,
  CombinedAssignmentNode,
  VariableAssignmentNode,
  isExpressionNode,
  isCombinedAssignmentNode,
  isVariableAssignmentNode,
} from '../parsing/ast';
import { NodeEvaluator, EvaluationContext } from './registry';
import {
  RenderNode,
  MathResultRenderNode,
  CombinedRenderNode,
  VariableRenderNode,
  ErrorRenderNode,
} from './renderNodes';
import {
  DateValue,
  DisplayOptions,
  SemanticValue,
  SemanticValueTypes,
  ErrorValue,
} from '../types';
import {
  evaluateDateExpression,
  looksLikeDateExpression,
  parseDateLiteral,
} from '../date/dateMath';
import { splitTopLevelCommas } from '../utils/listExpression';
import { rewriteLocaleDateLiterals } from "../utils/localeDateNormalization";
import { containsRangeOperatorOutsideString } from "../utils/rangeExpression";

const containsRangeOperator = (text?: string): boolean =>
  !!text && containsRangeOperatorOutsideString(text);

export class DateMathEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    if (isVariableAssignmentNode(node)) {
      const raw = (node.rawValue || '').trim();
      if (containsRangeOperator(raw)) {
        return false;
      }
      if (raw.includes(',') && splitTopLevelCommas(raw).length > 1) {
        return false;
      }
      return !!parseDateLiteral(raw);
    }

    if (isCombinedAssignmentNode(node) || isExpressionNode(node)) {
      const expr = isExpressionNode(node) ? node.expression : node.expression;
      if (containsRangeOperator(expr)) {
        return false;
      }
      if (expr.includes(',') && splitTopLevelCommas(expr).length > 1) {
        return false;
      }
      return looksLikeDateExpression(expr);
    }

    return false;
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (isVariableAssignmentNode(node)) {
      return this.evaluateVariableAssignment(node, context);
    }

    if (isCombinedAssignmentNode(node)) {
      return this.evaluateCombinedAssignment(node, context);
    }

    if (isExpressionNode(node)) {
      return this.evaluateExpression(node, context);
    }

    return null;
  }

  private evaluateVariableAssignment(
    node: VariableAssignmentNode,
    context: EvaluationContext
  ): RenderNode | null {
    const raw = (node.rawValue || '').trim();
    const normalized = rewriteLocaleDateLiterals(raw, context.dateLocale);
    if (normalized.errors.length > 0) {
      return this.createErrorNode(
        normalized.errors[0],
        node.variableName,
        context.lineNumber,
        node.rawValue
      );
    }
    const parsed = parseDateLiteral(normalized.expression);
    if (!parsed) {
      return null;
    }

    const result = context.variableStore.setVariableWithSemanticValue(
      node.variableName,
      parsed,
      node.rawValue
    );

    if (!result.success) {
      return this.createErrorNode(result.error || 'Failed to set variable', node.variableName, context.lineNumber);
    }

    return this.createVariableRenderNode(
      node.variableName,
      parsed,
      context.lineNumber,
      node.raw,
      this.getDisplayOptions(context)
    );
  }

  private evaluateCombinedAssignment(
    node: CombinedAssignmentNode,
    context: EvaluationContext
  ): RenderNode | null {
    const normalized = rewriteLocaleDateLiterals(
      node.expression,
      context.dateLocale
    );
    if (normalized.errors.length > 0) {
      return this.createErrorNode(
        normalized.errors[0],
        node.variableName,
        context.lineNumber,
        node.expression
      );
    }
    const result = evaluateDateExpression(
      normalized.expression,
      context.variableContext
    );
    if (!result) {
      return null;
    }

    if (SemanticValueTypes.isError(result)) {
      return this.createErrorNode((result as ErrorValue).getMessage(), node.variableName, context.lineNumber, node.expression);
    }

    const stored = context.variableStore.setVariableWithSemanticValue(
      node.variableName,
      result,
      node.expression
    );

    if (!stored.success) {
      return this.createErrorNode(stored.error || 'Failed to set variable', node.variableName, context.lineNumber, node.expression);
    }

    return this.createCombinedRenderNode(
      node.variableName,
      node.expression,
      result,
      context.lineNumber,
      node.raw,
      this.getDisplayOptions(context)
    );
  }

  private evaluateExpression(node: ExpressionNode, context: EvaluationContext): RenderNode | null {
    const normalized = rewriteLocaleDateLiterals(
      node.expression,
      context.dateLocale
    );
    if (normalized.errors.length > 0) {
      return this.createErrorNode(
        normalized.errors[0],
        node.expression,
        context.lineNumber
      );
    }
    const result = evaluateDateExpression(
      normalized.expression,
      context.variableContext
    );
    if (!result) {
      return null;
    }

    if (SemanticValueTypes.isError(result)) {
      return this.createErrorNode((result as ErrorValue).getMessage(), node.expression, context.lineNumber);
    }

    return this.createMathResultNode(
      node.expression,
      result,
      context.lineNumber,
      this.getDisplayOptions(context)
    );
  }

  private createMathResultNode(
    expression: string,
    value: SemanticValue,
    lineNumber: number,
    displayOptions: DisplayOptions
  ): MathResultRenderNode {
    const valueString = value.toString(displayOptions);
    return {
      type: 'mathResult',
      expression,
      result: valueString,
      displayText: `${expression} => ${valueString}`,
      line: lineNumber,
      originalRaw: expression,
    };
  }

  private createCombinedRenderNode(
    variableName: string,
    expression: string,
    value: SemanticValue,
    lineNumber: number,
    originalRaw: string,
    displayOptions: DisplayOptions
  ): CombinedRenderNode {
    const valueString = value.toString(displayOptions);
    return {
      type: 'combined',
      variableName,
      expression,
      result: valueString,
      displayText: `${variableName} = ${expression} => ${valueString}`,
      line: lineNumber,
      originalRaw,
    };
  }

  private createVariableRenderNode(
    variableName: string,
    value: SemanticValue,
    lineNumber: number,
    originalRaw: string,
    displayOptions: DisplayOptions
  ): VariableRenderNode {
    const valueString = value.toString(displayOptions);
    return {
      type: 'variable',
      variableName,
      value: valueString,
      displayText: `${variableName} = ${valueString}`,
      line: lineNumber,
      originalRaw,
    };
  }

  private createErrorNode(
    message: string,
    expression: string,
    lineNumber: number,
    rawExpression?: string
  ): ErrorRenderNode {
    const raw = rawExpression || expression;
    return {
      type: 'error',
      error: message,
      errorType: 'runtime',
      displayText: `${raw} => ⚠️ ${message}`,
      line: lineNumber,
      originalRaw: raw,
    };
  }

  private getDisplayOptions(context: EvaluationContext): DisplayOptions {
    return {
      precision: context.decimalPlaces,
      scientificUpperThreshold: context.scientificUpperThreshold,
      scientificLowerThreshold: context.scientificLowerThreshold,
      scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
      dateFormat: context.dateDisplayFormat,
      dateLocale: context.dateLocale,
      groupThousands: context.groupThousands,
    };
  }
}

export const defaultDateMathEvaluator = new DateMathEvaluator();
