/**
 * @file Expression Evaluator V2 - Semantic Type Version  
 * @description Updated expression evaluator that works with semantic types.
 * Handles simple expressions and delegates complex percentage operations
 * to the percentage evaluator.
 */

import {
  ASTNode,
  ExpressionNode,
  isExpressionNode,
} from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import {
  RenderNode,
  MathResultRenderNode,
  ErrorRenderNode,
} from "./renderNodes";
import { 
  SemanticValue,
  NumberValue, 
  PercentageValue,
  CurrencyValue,
  UnitValue,
  ErrorValue,
  SemanticValueTypes,
  SemanticParsers,
  SemanticArithmetic
} from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";

/**
 * Simple expression parser for basic arithmetic
 */
class SimpleExpressionParser {
  /**
   * Parse simple arithmetic expressions like "100 + 20" or "$100 * 2"
   */
  static parseArithmetic(expr: string, context: EvaluationContext): SemanticValue | null {
    // Handle basic operators
    const operators = ['+', '-', '*', '/', '^'];
    
    for (const op of operators) {
      const parts = expr.split(op).map(p => p.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        const left = this.parseOperand(parts[0], context);
        const right = this.parseOperand(parts[1], context);
        
        if (SemanticValueTypes.isError(left) || SemanticValueTypes.isError(right)) {
          return left; // Return first error
        }
        
        return this.performOperation(left, right, op);
      }
    }
    
    return null;
  }
  
  /**
   * Parse an operand (variable, literal, or parenthesized expression)
   */
  private static parseOperand(operand: string, context: EvaluationContext): SemanticValue {
    const trimmed = operand.trim();
    
    // Check for variable
    const variable = context.variableContext.get(trimmed);
    if (variable) {
      // Create a NumberValue from the legacy numeric value
      if (typeof variable.value === 'number') {
        return NumberValue.from(variable.value);
      }
    }
    
    // Try to parse as literal
    const parsed = SemanticParsers.parse(trimmed);
    if (parsed) {
      return parsed;
    }
    
    return ErrorValue.semanticError(`Cannot resolve: "${trimmed}"`);
  }
  
  /**
   * Perform arithmetic operation between two semantic values
   */
  private static performOperation(left: SemanticValue, right: SemanticValue, operator: string): SemanticValue {
    switch (operator) {
      case '+':
        return SemanticArithmetic.add(left, right);
      case '-':
        return SemanticArithmetic.subtract(left, right);
      case '*':
        return SemanticArithmetic.multiply(left, right);
      case '/':
        return SemanticArithmetic.divide(left, right);
      case '^':
        if (!right.isNumeric()) {
          return ErrorValue.typeError("Exponent must be numeric", 'number', right.getType());
        }
        return SemanticArithmetic.power(left, right.getNumericValue());
      default:
        return ErrorValue.semanticError(`Unknown operator: ${operator}`);
    }
  }
}

/**
 * Semantic-aware expression evaluator
 * Handles simple arithmetic and delegates complex operations to specialized evaluators
 */
export class ExpressionEvaluatorV2 implements NodeEvaluator {
  /**
   * Check if this evaluator can handle the node
   * This is a fallback evaluator for simple expressions
   */
  canHandle(node: ASTNode): boolean {
    if (!isExpressionNode(node)) {
      return false;
    }
    
    const expr = (node as ExpressionNode).expression;
    
    // Don't handle percentage expressions - let the percentage evaluator handle those
    if (this.isPercentageExpression(expr)) {
      return false;
    }
    
    // Handle simple arithmetic expressions
    return this.isSimpleArithmetic(expr) || this.isSimpleLiteral(expr) || this.isVariableReference(expr);
  }
  
  /**
   * Evaluate expression using semantic types
   */
  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isExpressionNode(node)) {
      return null;
    }
    
    const exprNode = node as ExpressionNode;
    
    try {
      let result: SemanticValue;
      
      // Try simple literal first
      if (this.isSimpleLiteral(exprNode.expression)) {
        result = this.evaluateLiteral(exprNode.expression);
      }
      // Try variable reference
      else if (this.isVariableReference(exprNode.expression)) {
        result = this.evaluateVariableReference(exprNode.expression, context);
      }
      // Try simple arithmetic
      else if (this.isSimpleArithmetic(exprNode.expression)) {
        const evalResult = parseAndEvaluateExpression(
          exprNode.expression,
          context.variableContext
        );
        if (evalResult.error) {
          result = ErrorValue.semanticError(evalResult.error);
        } else {
          result = NumberValue.from(evalResult.value);
        }
      }
      // Fallback
      else {
        result = ErrorValue.semanticError(`Unsupported expression: "${exprNode.expression}"`);
      }
      
      // Create render node
      return this.createMathResultNode(exprNode.expression, result, context.lineNumber);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorNode(message, exprNode.expression, context.lineNumber);
    }
  }
  
  /**
   * Check if expression is a percentage expression
   */
  private isPercentageExpression(expr: string): boolean {
    return (
      /%/.test(expr) ||
      /\bof\b/.test(expr) ||
      /\bon\b/.test(expr) ||
      /\boff\b/.test(expr) ||
      /\bas\s+%/.test(expr)
    );
  }
  
  /**
   * Check if expression is simple arithmetic
   */
  private isSimpleArithmetic(expr: string): boolean {
    return /[\+\-\*\/\^]/.test(expr);
  }
  
  /**
   * Check if expression is a simple literal
   */
  private isSimpleLiteral(expr: string): boolean {
    const parsed = SemanticParsers.parse(expr.trim());
    return parsed !== null && !SemanticValueTypes.isError(parsed);
  }
  
  /**
   * Check if expression is a variable reference
   */
  private isVariableReference(expr: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(expr.trim());
  }
  
  /**
   * Evaluate a literal expression
   */
  private evaluateLiteral(expr: string): SemanticValue {
    const parsed = SemanticParsers.parse(expr.trim());
    return parsed || ErrorValue.parseError(`Cannot parse literal: "${expr}"`);
  }
  
  /**
   * Evaluate a variable reference
   */
  private evaluateVariableReference(expr: string, context: EvaluationContext): SemanticValue {
    const trimmed = expr.trim();
    const variable = context.variableContext.get(trimmed);
    
    if (!variable) {
      return ErrorValue.semanticError(`Undefined variable: "${trimmed}"`);
    }
    
    // Convert legacy numeric value to SemanticValue
    if (typeof variable.value === 'number') {
      return NumberValue.from(variable.value);
    }
    
    return ErrorValue.semanticError(`Variable "${trimmed}" has unsupported type`);
  }
  
  /**
   * Create render nodes
   */
  private createMathResultNode(
    expression: string, 
    result: SemanticValue, 
    lineNumber: number
  ): MathResultRenderNode {
    const resultString = result.toString();
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
  
  private createErrorNode(
    message: string,
    expression: string, 
    lineNumber: number
  ): ErrorRenderNode {
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

export const defaultExpressionEvaluatorV2 = new ExpressionEvaluatorV2();
