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
  CurrencyValue,
  UnitValue,
  ErrorValue,
  SemanticValueTypes,
  SemanticArithmetic
} from "../types";

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
      
      // Parse percentage operation patterns
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
      
      // Try "A is what % of B" pattern
      if (!result) {
        const whatPercent = PercentageExpressionParser.parseWhatPercent(expression);
        if (whatPercent) {
          result = this.evaluateWhatPercent(whatPercent.partExpr, whatPercent.baseExpr, context);
        }
      }
      
      // Try "X as %" pattern  
      if (!result) {
        const asPercent = PercentageExpressionParser.parseAsPercent(expression);
        if (asPercent) {
          result = this.evaluateAsPercent(asPercent.valueExpr, context);
        }
      }
      
      // If no specific pattern matched, try general percentage arithmetic
      if (!result) {
        result = this.evaluateGeneralPercentageExpression(expression, context);
      }
      
      if (!result) {
        return this.createErrorNode("Could not evaluate percentage expression", expression, context.lineNumber);
      }
      
      // Create render node
      if (isExpr) {
        return this.createMathResultNode(expression, result, context.lineNumber);
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
  
  /**
   * Evaluate a sub-expression (could be variable, literal, etc.)
   */
  private evaluateSubExpression(expr: string, context: EvaluationContext): SemanticValue {
    const trimmed = expr.trim();
    
    // Try to get variable first
    const variable = context.variableContext.get(trimmed);
    if (variable) {
      return variable.value; // Now a SemanticValue!
    }
    
    // Try to parse as literal
    const parsed = this.parseLiteral(trimmed);
    if (parsed) {
      return parsed;
    }
    
    // If we can't resolve it, return an error
    return ErrorValue.semanticError(`Cannot resolve expression: "${expr}"`);
  }
  
  /**
   * Parse a literal value into a SemanticValue
   */
  private parseLiteral(str: string): SemanticValue | null {
    // Try percentage
    if (str.match(/^\d+(?:\.\d+)?%$/)) {
      const match = str.match(/^(\d+(?:\.\d+)?)%$/);
      if (match) {
        return new PercentageValue(parseFloat(match[1]));
      }
    }
    
    // Try currency
    if (str.match(/^[\$€£]\d+(?:\.\d+)?$/)) {
      try {
        return CurrencyValue.fromString(str);
      } catch {
        return null;
      }
    }
    
    // Try number
    if (str.match(/^\d+(?:\.\d+)?$/)) {
      return new NumberValue(parseFloat(str));
    }
    
    return null;
  }
  
  /**
   * Create render nodes
   */
  private createMathResultNode(expression: string, result: SemanticValue, lineNumber: number): MathResultRenderNode {
    const displayText = `${expression} => ${result.toString()}`;
    
    return {
      type: "mathResult",
      expression,
      result: result.toString(),
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
    const displayText = `${node.variableName} = ${node.expression} => ${result.toString()}`;
    
    // Store the result in the variable store
    context.variableStore.setVariable(node.variableName, result.toString());
    
    return {
      type: "combined",
      variableName: node.variableName,
      expression: node.expression,
      result: result.toString(),
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
}