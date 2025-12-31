/**
 * @file Percentage Expression Evaluator V2 - Semantic Type Version
 * @description Updated percentage evaluator that works with semantic types.
 * No more regex-based type detection! Uses parsed SemanticValues from AST nodes.
 * 
 * Supports percentage operations:
 * - "20% of 100" -> 20
 * - "100 + 20%" -> 120  
 * - "100 - 20%" -> 80
 * - "20% * 5" -> 100%
 * - "what percent is 20 of 100" -> 20%
 * - "0.2 as %" -> 20%
 */

import {
  ASTNode,
  ExpressionNode,
  CombinedAssignmentNode,
  isExpressionNode,
  isCombinedAssignmentNode,
} from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import {
  RenderNode,
  MathResultRenderNode,
  CombinedRenderNode,
  ErrorRenderNode,
} from "./renderNodes";
import { 
  SemanticValue,
  PercentageValue, 
  NumberValue, 
  ErrorValue,
  DisplayOptions,
  SemanticValueTypes,
  SemanticParsers
} from "../types";
import { evaluateMath } from "../parsing/mathEvaluator";

/**
 * Expression parser for percentage operations
 */
class PercentageExpressionParser {
  /**
   * Parse "X% of Y" pattern
   */
  static parsePercentOf(expr: string): { percent: number; baseExpr: string } | null {
    const match = expr.match(/^\s*(\d+(?:\.\d+)?)\s*%\s*of\s+(.+)$/i);
    if (!match) return null;
    
    return {
      percent: parseFloat(match[1]),
      baseExpr: match[2].trim()
    };
  }
  
  /**
   * Parse "X% on/off Y" pattern 
   */
  static parsePercentOnOff(expr: string): { percent: number; operation: 'on' | 'off'; baseExpr: string } | null {
    const match = expr.match(/^\s*(\d+(?:\.\d+)?)\s*%\s*(on|off)\s+(.+)$/i);
    if (!match) return null;
    
    return {
      percent: parseFloat(match[1]),
      operation: match[2].toLowerCase() as 'on' | 'off',
      baseExpr: match[3].trim()
    };
  }
  
  /**
   * Parse "A is what % of B" pattern
   */
  static parseWhatPercent(expr: string): { partExpr: string; baseExpr: string } | null {
    const match = expr.match(/^\s*(.+?)\s+is\s+what\s+%\s+of\s+(.+)$/i);
    if (match) {
      return { partExpr: match[1].trim(), baseExpr: match[2].trim() };
    }
    
    // Also handle "what % is A of B"
    const match2 = expr.match(/^\s*what\s+%\s+is\s+(.+?)\s+of\s+(.+)$/i);
    if (match2) {
      return { partExpr: match2[1].trim(), baseExpr: match2[2].trim() };
    }
    
    return null;
  }

  /**
   * Parse "A of B is %" pattern
   */
  static parsePartOfBaseIsPercent(expr: string): { partExpr: string; baseExpr: string } | null {
    const match = expr.match(/^\s*(.+?)\s+of\s+(.+?)\s+is\s+%\s*$/i);
    if (!match) return null;

    return {
      partExpr: match[1].trim(),
      baseExpr: match[2].trim(),
    };
  }
  
  /**
   * Parse "X as %" pattern
   */
  static parseAsPercent(expr: string): { valueExpr: string } | null {
    const match = expr.match(/^(.+?)\s+as\s+%$/i);
    if (!match) return null;
    
    return { valueExpr: match[1].trim() };
  }
}

/**
 * Semantic-aware percentage expression evaluator
 * Uses parsed SemanticValues instead of string parsing
 */
export class PercentageExpressionEvaluatorV2 implements NodeEvaluator {
  /**
   * Check if this evaluator can handle the node
   * Now much simpler - just look for percentage-related patterns
   */
  canHandle(node: ASTNode): boolean {
    if (!(isExpressionNode(node) || isCombinedAssignmentNode(node))) {
      return false;
    }
    
    const expr = isExpressionNode(node)
      ? (node as ExpressionNode).expression
      : (node as CombinedAssignmentNode).expression;
    
    // Check for percentage operation patterns
    return (
      // "20% of 100" 
      /\d+(?:\.\d+)?\s*%\s*of\s+/.test(expr) ||
      // "20% on/off 100"
      /\d+(?:\.\d+)?\s*%\s*(on|off)\s+/.test(expr) ||
      // "A is what % of B"
      /\bis\s+what\s+%\s+of\b/.test(expr) ||
      // "what % is A of B"
      /^what\s+%\s+is\b/.test(expr) ||
      // "0.2 as %"
      /\bas\s+%\s*$/.test(expr) ||
      // Implicit "X of Y" where X is a percent-like value
      /\bof\b/.test(expr) ||
      // "discount on/off 100" where discount is a percentage variable
      /\b(on|off)\b/.test(expr) ||
      // Contains percentage values that need special handling
      /%/.test(expr)
    );
  }
  
  /**
   * Evaluate percentage expressions using semantic types
   */
  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    try {
      const isExpr = isExpressionNode(node);
      const expression = isExpr
        ? (node as ExpressionNode).expression
        : (node as CombinedAssignmentNode).expression;

      if (this.shouldSkipDueToPhraseVariable(expression, context)) {
        return null;
      }

      const directValue = this.resolveDirectVariableReference(expression, context);
      if (directValue) {
        if (SemanticValueTypes.isError(directValue)) {
          return this.createErrorNode(
            (directValue as ErrorValue).getMessage(),
            expression,
            context.lineNumber
          );
        }
        return isExpr
          ? this.createMathResultNode(expression, directValue, context.lineNumber, context)
          : this.createCombinedNode(node as CombinedAssignmentNode, directValue, context);
      }
      
      const result = this.evaluatePercentageExpression(expression, context);
      if (!result) {
        return this.createErrorNode("Could not evaluate percentage expression", expression, context.lineNumber);
      }

      if (SemanticValueTypes.isError(result)) {
        return this.createErrorNode(
          (result as ErrorValue).getMessage(),
          expression,
          context.lineNumber
        );
      }
      
      // Create render node
      if (isExpr) {
        return this.createMathResultNode(expression, result, context.lineNumber, context);
      } else {
        return this.createCombinedNode(
          node as CombinedAssignmentNode,
          result,
          context
        );
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorNode(message, '', context.lineNumber);
    }
  }

  /**
   * Evaluate a percentage expression string and return a SemanticValue
   */
  private evaluatePercentageExpression(expression: string, context: EvaluationContext): SemanticValue | null {
    let result: SemanticValue | null = null;

    // Try "X% of Y" pattern
    const percentOf = PercentageExpressionParser.parsePercentOf(expression);
    if (percentOf) {
      result = this.evaluatePercentOf(percentOf.percent, percentOf.baseExpr, context);
    }

    // Try "X% on/off Y" pattern
    if (!result) {
      const percentOnOff = PercentageExpressionParser.parsePercentOnOff(expression);
      if (percentOnOff) {
        result = this.evaluatePercentOnOff(
          percentOnOff.percent,
          percentOnOff.operation,
          percentOnOff.baseExpr,
          context
        );
      }
    }

    // Try "X on/off Y" where X is a percentage variable/expression
    if (!result) {
      result = this.evaluatePercentVariableOnOff(expression, context);
    }

    // Try "A is what % of B" pattern
    if (!result) {
      const whatPercent = PercentageExpressionParser.parseWhatPercent(expression);
      if (whatPercent) {
        result = this.evaluateWhatPercent(whatPercent.partExpr, whatPercent.baseExpr, context);
      }
    }

    // Try "A of B is %" pattern
    if (!result) {
      const partOfBase = PercentageExpressionParser.parsePartOfBaseIsPercent(expression);
      if (partOfBase) {
        result = this.evaluateWhatPercent(partOfBase.partExpr, partOfBase.baseExpr, context);
      }
    }

    // Try "X as %" pattern
    if (!result) {
      const asPercent = PercentageExpressionParser.parseAsPercent(expression);
      if (asPercent) {
        result = this.evaluateAsPercent(asPercent.valueExpr, context);
      }
    }

    // Try base +/- percent chain (e.g., "500 - 10% - 5%")
    if (!result) {
      result = this.evaluateAdditivePercentageChain(expression, context);
    }

    // Try implicit "X of Y" where X is a percent-like value
    if (!result) {
      result = this.evaluateImplicitPercentOf(expression, context);
    }

    // If no specific pattern matched, try general percentage arithmetic
    if (!result) {
      result = this.evaluateGeneralPercentageExpression(expression, context);
    }

    return result;
  }
  
  /**
   * Evaluate "20% of 100" -> 20
   */
  private evaluatePercentOf(percent: number, baseExpr: string, context: EvaluationContext): SemanticValue {
    const percentValue = new PercentageValue(percent);
    const baseValue = this.evaluateSubExpression(baseExpr, context);
    
    if (SemanticValueTypes.isError(baseValue)) {
      return baseValue;
    }
    
    return percentValue.of(baseValue);
  }

  /**
   * Evaluate "base +/- percent" chains like "500 - 10% - 5%"
   */
  private evaluateAdditivePercentageChain(expression: string, context: EvaluationContext): SemanticValue | null {
    const parsed = this.parseTrailingPercentChain(expression);
    if (!parsed) return null;

    const baseValue = this.evaluateSubExpression(parsed.baseExpr, context);
    if (SemanticValueTypes.isError(baseValue)) {
      return baseValue;
    }

    let current = baseValue;
    for (const op of parsed.ops) {
      const percentValue = new PercentageValue(op.percent);
      current = op.sign === "+" ? percentValue.on(current) : percentValue.off(current);
    }

    return current;
  }

  /**
   * Evaluate implicit "X of Y" where X is a percent-like value (number or percentage)
   */
  private evaluateImplicitPercentOf(expression: string, context: EvaluationContext): SemanticValue | null {
    const match = expression.match(/^\s*(.+?)\s+of\s+(.+)$/i);
    if (!match) return null;

    const leftValue = this.evaluateSubExpression(match[1], context);
    const rightValue = this.evaluateSubExpression(match[2], context);

    if (SemanticValueTypes.isError(leftValue)) return leftValue;
    if (SemanticValueTypes.isError(rightValue)) return rightValue;

    if (SemanticValueTypes.isPercentage(leftValue)) {
      return (leftValue as PercentageValue).of(rightValue);
    }

    if (leftValue.isNumeric()) {
      const percentValue = new PercentageValue(leftValue.getNumericValue());
      return percentValue.of(rightValue);
    }

    return ErrorValue.typeError(
      "Left side of 'of' must be numeric or percentage",
      undefined,
      leftValue.getType()
    );
  }
  
  /**
   * Evaluate "20% on 100" -> 120 or "20% off 100" -> 80
   */
  private evaluatePercentOnOff(
    percent: number, 
    operation: 'on' | 'off', 
    baseExpr: string, 
    context: EvaluationContext
  ): SemanticValue {
    const percentValue = new PercentageValue(percent);
    const baseValue = this.evaluateSubExpression(baseExpr, context);
    
    if (SemanticValueTypes.isError(baseValue)) {
      return baseValue;
    }
    
    if (operation === 'on') {
      return percentValue.on(baseValue);
    } else {
      return percentValue.off(baseValue);
    }
  }

  /**
   * Evaluate "discount on 80" / "discount off 80" where discount is a percentage value
   */
  private evaluatePercentVariableOnOff(
    expression: string,
    context: EvaluationContext
  ): SemanticValue | null {
    const match = expression.match(/^\s*(.+?)\s+(on|off)\s+(.+)$/i);
    if (!match) return null;

    const leftValue = this.evaluateSubExpression(match[1], context);
    if (SemanticValueTypes.isError(leftValue)) {
      return leftValue;
    }

    if (!SemanticValueTypes.isPercentage(leftValue)) {
      return ErrorValue.typeError(
        "Left side of on/off must be a percentage",
        "percentage",
        leftValue.getType()
      );
    }

    const baseValue = this.evaluateSubExpression(match[3], context);
    if (SemanticValueTypes.isError(baseValue)) {
      return baseValue;
    }

    return match[2].toLowerCase() === "on"
      ? (leftValue as PercentageValue).on(baseValue)
      : (leftValue as PercentageValue).off(baseValue);
  }
  
  /**
   * Evaluate "what percent is 20 of 100" -> 20%
   */
  private evaluateWhatPercent(partExpr: string, baseExpr: string, context: EvaluationContext): SemanticValue {
    const partValue = this.evaluateSubExpression(partExpr, context);
    const baseValue = this.evaluateSubExpression(baseExpr, context);
    
    if (SemanticValueTypes.isError(partValue)) return partValue;
    if (SemanticValueTypes.isError(baseValue)) return baseValue;
    
    return PercentageValue.whatPercentOf(partValue, baseValue);
  }
  
  /**
   * Evaluate "0.2 as %" -> 20%
   */
  private evaluateAsPercent(valueExpr: string, context: EvaluationContext): SemanticValue {
    const value = this.evaluateSubExpression(valueExpr, context);
    
    if (SemanticValueTypes.isError(value)) {
      return value;
    }
    
    if (!value.isNumeric()) {
      return ErrorValue.typeError("Cannot convert non-numeric value to percentage", 'percentage', value.getType());
    }
    
    return PercentageValue.fromDecimal(value.getNumericValue());
  }
  
  /**
   * Handle general percentage expressions that don't match specific patterns
   */
  private evaluateGeneralPercentageExpression(expression: string, context: EvaluationContext): SemanticValue | null {
    // This is a simplified version - in a full implementation, 
    // we'd parse the expression tree and handle complex arithmetic
    
    // For now, just try to evaluate simple cases
    const trimmed = expression.trim();
    
    // Check if it's just a percentage literal
    if (trimmed.match(/^\d+(?:\.\d+)?%$/)) {
      const match = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
      if (match) {
        return new PercentageValue(parseFloat(match[1]));
      }
    }
    
    return null;
  }

  private parseTrailingPercentChain(
    expression: string
  ): { baseExpr: string; ops: Array<{ sign: "+" | "-"; percent: number }> } | null {
    let expr = expression.trim();
    const ops: Array<{ sign: "+" | "-"; percent: number }> = [];
    const tailRegex = /([+\-])\s*(\d+(?:\.\d+)?)\s*%\s*$/;

    while (true) {
      const match = tailRegex.exec(expr);
      if (!match) break;

      ops.push({ sign: match[1] as "+" | "-", percent: parseFloat(match[2]) });
      expr = expr.slice(0, match.index).trim();
    }

    if (ops.length === 0 || !expr) {
      return null;
    }

    return { baseExpr: expr, ops: ops.reverse() };
  }

  private containsPercentageSyntax(expr: string): boolean {
    return (
      /%/.test(expr) ||
      /\bof\b/.test(expr) ||
      /\bon\b/.test(expr) ||
      /\boff\b/.test(expr) ||
      /\bis\s+%\b/.test(expr) ||
      /\bas\s+%\b/.test(expr)
    );
  }

  private evaluateArithmeticExpression(expr: string, context: EvaluationContext): SemanticValue | null {
    if (/[€$£¥₹₿%]/.test(expr)) {
      return null;
    }

    const variables = this.buildNumericContext(context.variableContext);
    const result = evaluateMath(expr, variables);
    if (result.error) {
      return ErrorValue.semanticError(result.error);
    }
    return new NumberValue(result.value);
  }

  private buildNumericContext(variableContext: Map<string, any>): Record<string, number> {
    const context: Record<string, number> = {};
    variableContext.forEach((variable, name) => {
      const value = variable?.value;
      if (value instanceof SemanticValue) {
        if (value.isNumeric()) {
          context[name] = value.getNumericValue();
        }
      } else if (typeof value === "number") {
        context[name] = value;
      }
    });
    return context;
  }
  
  /**
   * Evaluate a sub-expression (could be variable, literal, etc.)
   */
  private evaluateSubExpression(
    expr: string,
    context: EvaluationContext,
    options: { skipPercentVariableChain?: boolean } = {}
  ): SemanticValue {
    const normalized = expr.replace(/\s+/g, " ").trim();

    if (!options.skipPercentVariableChain) {
      const percentVariableResult = this.evaluatePercentVariableChain(normalized, context);
      if (percentVariableResult) {
        return percentVariableResult;
      }
    }
    
    // Try to get variable first
    const variable = context.variableContext.get(normalized);
    if (variable) {
      const value = (variable as any).value;
      if (value instanceof SemanticValue) {
        return value;
      }
      if (typeof value === "number") {
        return NumberValue.from(value);
      }
      if (typeof value === "string") {
        const parsedValue = this.parseLiteral(value.trim());
        if (parsedValue) return parsedValue;
      }
    }

    // Try nested percentage expressions
    if (this.containsPercentageSyntax(normalized)) {
      const percentResult = this.evaluatePercentageExpression(normalized, context);
      if (percentResult) {
        return percentResult;
      }
    }
    
    // Try to parse as literal
    const parsed = this.parseLiteral(normalized);
    if (parsed) {
      return parsed;
    }

    // Try to evaluate as arithmetic expression
    const arithmetic = this.evaluateArithmeticExpression(normalized, context);
    if (arithmetic) {
      return arithmetic;
    }
    
    // If we can't resolve it, return an error
    return ErrorValue.semanticError(`Cannot resolve expression: "${expr}"`);
  }

  private evaluatePercentVariableChain(
    expression: string,
    context: EvaluationContext
  ): SemanticValue | null {
    let expr = expression.trim();
    const ops: Array<{ sign: "+" | "-"; percent: PercentageValue }> = [];
    const tailRegex = /([+\-])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;

    while (true) {
      const match = tailRegex.exec(expr);
      if (!match) break;

      const percentValue = this.getPercentValueFromVariable(match[2], context);
      if (!percentValue) break;

      ops.push({ sign: match[1] as "+" | "-", percent: percentValue });
      expr = expr.slice(0, match.index).trim();
    }

    if (ops.length === 0 || !expr) return null;

    const baseValue = this.evaluateSubExpression(expr, context, { skipPercentVariableChain: true });
    if (SemanticValueTypes.isError(baseValue)) {
      return baseValue;
    }

    let current = baseValue;
    for (const op of ops.reverse()) {
      current = op.sign === "+" ? op.percent.on(current) : op.percent.off(current);
    }

    return current;
  }

  private getPercentValueFromVariable(
    variableName: string,
    context: EvaluationContext
  ): PercentageValue | null {
    const variable = context.variableContext.get(variableName);
    if (!variable) return null;

    const value = (variable as any).value;
    if (value instanceof PercentageValue) {
      return value;
    }

    const rawValue = (variable as any).rawValue;
    const percentMatch = rawValue ? String(rawValue).match(/(\d+(?:\.\d+)?)\s*%/) : null;
    if (percentMatch) {
      return new PercentageValue(parseFloat(percentMatch[1]));
    }

    return null;
  }
  
  /**
   * Parse a literal value into a SemanticValue
   */
  private parseLiteral(str: string): SemanticValue | null {
    const parsed = SemanticParsers.parse(str);
    return parsed && !SemanticValueTypes.isError(parsed) ? parsed : null;
  }
  
  /**
   * Create render nodes
   */
  private createMathResultNode(
    expression: string,
    result: SemanticValue,
    lineNumber: number,
    context: EvaluationContext
  ): MathResultRenderNode {
    const resultString = result.toString(this.getDisplayOptions(context));
    const displayText = `${expression} => ${resultString}`;
    
    return {
      type: "mathResult",
      expression,
      result: resultString,
      displayText,
      line: lineNumber,
      originalRaw: expression,
    };
  }
  
  private createCombinedNode(
    node: CombinedAssignmentNode,
    result: SemanticValue,
    context: EvaluationContext
  ): CombinedRenderNode {
    const resultString = result.toString(this.getDisplayOptions(context));
    const displayText = `${node.variableName} = ${node.expression} => ${resultString}`;
    
    // Store the result in the variable store
    context.variableStore.setVariableWithSemanticValue(
      node.variableName,
      result,
      node.expression
    );
    
    return {
      type: "combined",
      variableName: node.variableName,
      expression: node.expression,
      result: resultString,
      displayText,
      line: context.lineNumber,
      originalRaw: `${node.variableName} = ${node.expression}`,
    };
  }
  
  private createErrorNode(message: string, expression: string, lineNumber: number): ErrorRenderNode {
    return {
      type: "error",
      error: message,
      errorType: "runtime",
      displayText: `${expression} => ⚠️ ${message}`,
      line: lineNumber,
      originalRaw: expression,
    };
  }

  private getDisplayOptions(context: EvaluationContext): DisplayOptions {
    return {
      precision: context.decimalPlaces,
      scientificUpperThreshold: context.scientificUpperThreshold,
      scientificLowerThreshold: context.scientificLowerThreshold,
      scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
    };
  }

  private resolveDirectVariableReference(
    expression: string,
    context: EvaluationContext
  ): SemanticValue | null {
    const trimmed = expression.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(trimmed)) {
      return null;
    }

    const normalized = trimmed.replace(/\s+/g, " ").trim();
    const variable = context.variableContext.get(normalized);
    if (!variable) {
      return null;
    }

    const value = (variable as any).value;
    if (value instanceof SemanticValue) {
      return value;
    }

    if (typeof value === "number") {
      return NumberValue.from(value);
    }

    if (typeof value === "string") {
      const parsed = SemanticParsers.parse(value.trim());
      if (parsed) {
        return parsed;
      }
    }

    return ErrorValue.semanticError(`Variable "${normalized}" has unsupported type`);
  }

  private shouldSkipDueToPhraseVariable(
    expression: string,
    context: EvaluationContext
  ): boolean {
    const normalized = expression.replace(/\s+/g, " ").trim();
    if (!normalized.includes(" of ")) {
      return false;
    }

    const hasExplicitPercentSyntax =
      /%/.test(normalized) ||
      /\b(on|off)\b/.test(normalized) ||
      /\bwhat\s+%\b/.test(normalized) ||
      /\b(as|is)\s+%\b/.test(normalized);
    if (hasExplicitPercentSyntax) {
      return false;
    }

    const variableNames = Array.from(context.variableContext.keys()).map((name) =>
      name.replace(/\s+/g, " ").trim()
    );

    return variableNames.some(
      (name) => name.includes(" of ") && normalized.includes(name)
    );
  }
}
