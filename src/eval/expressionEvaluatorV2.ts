/**
 * @file Expression Evaluator V2 - Semantic Type Version  
 * @description Updated expression evaluator that works with semantic types.
 * Handles simple expressions and delegates complex percentage operations
 * to the percentage evaluator.
 */

import {
  ASTNode,
  ExpressionNode,
  ExpressionComponent,
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
  ErrorValue,
  SemanticValueTypes,
  SemanticParsers,
  SemanticArithmetic
} from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";

/**
 * Simple expression parser for basic arithmetic
 */
export class SimpleExpressionParser {
  /**
   * Parse simple arithmetic expressions like "100 + 20" or "$100 * 2"
   */
  static parseArithmetic(expr: string, context: EvaluationContext): SemanticValue | null {
    const trimmed = expr.trim();
    if (
      /[()]/.test(trimmed) ||
      /\b(sqrt|abs|round|floor|ceil|max|min|sin|cos|tan|log|ln|exp)\s*\(/.test(trimmed)
    ) {
      return null;
    }

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
   * Parse arithmetic expressions from components (supports chained operators and parentheses)
   */
  static parseComponents(
    components: ExpressionComponent[],
    context: EvaluationContext
  ): SemanticValue | null {
    if (components.length === 0) {
      return null;
    }

    try {
      return this.evaluateComponentList(components, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return ErrorValue.semanticError(message);
    }
  }

  static containsCurrency(components: ExpressionComponent[], context: EvaluationContext): boolean {
    const visit = (items: ExpressionComponent[]): boolean => {
      for (const component of items) {
        if (component.type === "literal" && component.parsedValue) {
          if (component.parsedValue.getType() === "currency") {
            return true;
          }
        }
        if (component.type === "variable") {
          const variable = context.variableContext.get(component.value);
          if (variable?.value instanceof SemanticValue && variable.value.getType() === "currency") {
            return true;
          }
        }
        if (component.children && component.children.length > 0) {
          if (visit(component.children)) {
            return true;
          }
        }
      }
      return false;
    };

    return visit(components);
  }
  
  /**
   * Parse an operand (variable, literal, or parenthesized expression)
   */
  private static parseOperand(operand: string, context: EvaluationContext): SemanticValue {
    const normalized = operand.replace(/\s+/g, " ").trim();
    
    // Check for variable
    const variable = context.variableContext.get(normalized);
    if (variable) {
      const value = (variable as any).value;
      if (value instanceof SemanticValue) {
        return value;
      }
      if (typeof value === 'number') {
        return NumberValue.from(value);
      }
      if (typeof value === 'string') {
        const parsed = SemanticParsers.parse(value.trim());
        if (parsed) {
          return parsed;
        }
      }
    }
    
    // Try to parse as literal
    const parsed = SemanticParsers.parse(normalized);
    if (parsed) {
      return parsed;
    }
    
    return ErrorValue.semanticError(`Cannot resolve: "${normalized}"`);
  }

  private static evaluateComponentList(
    components: ExpressionComponent[],
    context: EvaluationContext
  ): SemanticValue {
    const values: SemanticValue[] = [];
    const operators: string[] = [];
    const precedence: Record<string, number> = {
      "^": 3,
      "*": 2,
      "/": 2,
      "+": 1,
      "-": 1,
    };

    const shouldApplyOperator = (stackOp: string, currentOp: string): boolean => {
      const stackPrec = precedence[stackOp] ?? 0;
      const currentPrec = precedence[currentOp] ?? 0;
      if (stackPrec > currentPrec) return true;
      if (stackPrec === currentPrec && currentOp !== "^") return true;
      return false;
    };

    const applyOperator = (): SemanticValue | null => {
      const op = operators.pop();
      const right = values.pop();
      const left = values.pop();
      if (!op || !right || !left) {
        return ErrorValue.semanticError("Invalid expression");
      }

      switch (op) {
        case "+":
          return SemanticArithmetic.add(left, right);
        case "-":
          return SemanticArithmetic.subtract(left, right);
        case "*":
          return SemanticArithmetic.multiply(left, right);
        case "/":
          return SemanticArithmetic.divide(left, right);
        case "^":
          if (!right.isNumeric()) {
            return ErrorValue.typeError("Exponent must be numeric", "number", right.getType());
          }
          return SemanticArithmetic.power(left, right.getNumericValue());
        default:
          return ErrorValue.semanticError(`Unknown operator: ${op}`);
      }
    };

    let expectValue = true;
    let pendingUnary: "+" | "-" | null = null;

    for (const component of components) {
      if (component.type === "operator") {
        const op = component.value;
        if (expectValue) {
          if (op === "+" || op === "-") {
            pendingUnary = op;
            continue;
          }
          return ErrorValue.semanticError(`Unexpected operator: "${op}"`);
        }

        while (
          operators.length > 0 &&
          shouldApplyOperator(operators[operators.length - 1], op)
        ) {
          const applied = applyOperator();
          if (applied && SemanticValueTypes.isError(applied)) {
            return applied;
          }
          if (applied) {
            values.push(applied);
          }
        }
        operators.push(op);
        expectValue = true;
        continue;
      }

      const value = this.resolveComponentValue(component, context);
      if (SemanticValueTypes.isError(value)) {
        return value;
      }

      let resolved = value;
      if (pendingUnary === "-") {
        resolved = SemanticArithmetic.multiply(new NumberValue(-1), resolved);
        if (SemanticValueTypes.isError(resolved)) {
          return resolved;
        }
      }
      pendingUnary = null;

      values.push(resolved);
      expectValue = false;
    }

    if (expectValue) {
      return ErrorValue.semanticError("Expression ended unexpectedly");
    }

    while (operators.length > 0) {
      const applied = applyOperator();
      if (applied && SemanticValueTypes.isError(applied)) {
        return applied;
      }
      if (applied) {
        values.push(applied);
      }
    }

    if (values.length !== 1) {
      return ErrorValue.semanticError("Invalid expression");
    }

    return values[0];
  }

  private static resolveComponentValue(
    component: ExpressionComponent,
    context: EvaluationContext
  ): SemanticValue {
    switch (component.type) {
      case "literal": {
        if (component.parsedValue) {
          return component.parsedValue;
        }
        const parsed = SemanticParsers.parse(component.value);
        return parsed || ErrorValue.semanticError(`Cannot parse literal: "${component.value}"`);
      }
      case "variable": {
        const variable = context.variableContext.get(component.value);
        if (!variable) {
          return ErrorValue.semanticError(`Variable "${component.value}" not defined`);
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
        return ErrorValue.semanticError(`Variable "${component.value}" has unsupported type`);
      }
      case "parentheses": {
        if (!component.children || component.children.length === 0) {
          return ErrorValue.semanticError("Empty parentheses");
        }
        return this.evaluateComponentList(component.children, context);
      }
      case "function": {
        if (!component.children || component.children.length === 0) {
          return ErrorValue.semanticError(`Function "${component.value}" has no arguments`);
        }
        const argValue = this.evaluateComponentList(component.children, context);
        if (SemanticValueTypes.isError(argValue)) {
          return argValue;
        }
        if (!argValue.isNumeric()) {
          return ErrorValue.typeError(
            `Function "${component.value}" requires numeric argument`,
            "number",
            argValue.getType()
          );
        }
        const num = argValue.getNumericValue();
        switch (component.value) {
          case "sqrt":
            return NumberValue.from(Math.sqrt(num));
          case "abs":
            return NumberValue.from(Math.abs(num));
          case "round":
            return NumberValue.from(Math.round(num));
          case "floor":
            return NumberValue.from(Math.floor(num));
          case "ceil":
            return NumberValue.from(Math.ceil(num));
          case "sin":
            return NumberValue.from(Math.sin(num));
          case "cos":
            return NumberValue.from(Math.cos(num));
          case "tan":
            return NumberValue.from(Math.tan(num));
          case "log":
            return NumberValue.from(Math.log10(num));
          case "ln":
            return NumberValue.from(Math.log(num));
          case "exp":
            return NumberValue.from(Math.exp(num));
          default:
            return ErrorValue.semanticError(`Unsupported function: "${component.value}"`);
        }
      }
      default:
        return ErrorValue.semanticError(`Unsupported component: "${component.type}"`);
    }
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
        const hasCurrency =
          exprNode.components.length > 0 &&
          SimpleExpressionParser.containsCurrency(exprNode.components, context);
        const componentResult = hasCurrency
          ? SimpleExpressionParser.parseComponents(exprNode.components, context)
          : null;
        const semanticResult =
          componentResult || SimpleExpressionParser.parseArithmetic(exprNode.expression, context);

        if (semanticResult) {
          result = semanticResult;
        } else {
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
      }
      // Fallback
      else {
        result = ErrorValue.semanticError(`Unsupported expression: "${exprNode.expression}"`);
      }
      
      if (SemanticValueTypes.isError(result)) {
        return this.createErrorNode(
          (result as ErrorValue).getMessage(),
          exprNode.expression,
          context.lineNumber
        );
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
    const normalized = expr.replace(/\s+/g, " ").trim();
    const variable = context.variableContext.get(normalized);
    
    if (!variable) {
      return ErrorValue.semanticError(`Undefined variable: "${normalized}"`);
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
