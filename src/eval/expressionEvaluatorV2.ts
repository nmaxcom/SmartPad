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
  UnitValue,
  CurrencyUnitValue,
  SymbolicValue,
  ErrorValue,
  SemanticValueTypes,
  DisplayOptions,
  SemanticParsers,
  SemanticArithmetic
} from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";
import { parseExpressionComponents } from "../parsing/expressionComponents";

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
          if (component.parsedValue.getType() === "currency" || component.parsedValue.getType() === "currencyUnit") {
            return true;
          }
        }
        if (component.type === "variable") {
          const variable = context.variableContext.get(component.value);
          if (
            variable?.value instanceof SemanticValue &&
            (variable.value.getType() === "currency" || variable.value.getType() === "currencyUnit")
          ) {
            return true;
          }
        }
        if (component.type === "function" && component.args) {
          for (const arg of component.args) {
            if (visit(arg.components)) {
              return true;
            }
          }
        } else if (component.children && component.children.length > 0) {
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

    if (normalized === "PI") {
      return NumberValue.from(Math.PI);
    }
    if (normalized === "E") {
      return NumberValue.from(Math.E);
    }
    
    return SymbolicValue.from(normalized);
  }

  private static wrapExpression(expr: string): string {
    const trimmed = expr.trim();
    if (!/\s|[+\-*/^]/.test(trimmed)) {
      return trimmed;
    }
    return `(${trimmed})`;
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
          if (SemanticValueTypes.isSymbolic(right)) {
            const leftExpr = SimpleExpressionParser.wrapExpression(left.toString());
            const rightExpr = SimpleExpressionParser.wrapExpression(right.toString());
            return SymbolicValue.from(`${leftExpr} ^ ${rightExpr}`);
          }
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
          if (component.value === "PI") {
            return NumberValue.from(Math.PI);
          }
          if (component.value === "E") {
            return NumberValue.from(Math.E);
          }
          return SymbolicValue.from(component.value);
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
        const args = this.evaluateFunctionArgs(component.args || [], context);
        if (args instanceof ErrorValue) {
          return args;
        }

        return this.evaluateFunction(component.value, args, context);
      }
      default:
        return ErrorValue.semanticError(`Unsupported component: "${component.type}"`);
    }
  }

  private static evaluateFunctionArgs(
    args: Array<{ name?: string; components: ExpressionComponent[] }>,
    context: EvaluationContext
  ): { positional: SemanticValue[]; named: Map<string, SemanticValue> } | ErrorValue {
    const positional: SemanticValue[] = [];
    const named = new Map<string, SemanticValue>();

    for (const arg of args) {
      const value = this.evaluateComponentList(arg.components, context);
      if (SemanticValueTypes.isError(value)) {
        return value;
      }
      if (arg.name) {
        named.set(arg.name, value);
      } else {
        positional.push(value);
      }
    }

    return { positional, named };
  }

  private static evaluateFunction(
    name: string,
    args: { positional: SemanticValue[]; named: Map<string, SemanticValue> },
    context: EvaluationContext
  ): SemanticValue {
    const builtIn = this.evaluateBuiltInFunction(name, args);
    if (builtIn) {
      return builtIn;
    }

    return this.evaluateUserFunction(name, args, context);
  }

  private static evaluateBuiltInFunction(
    name: string,
    args: { positional: SemanticValue[]; named: Map<string, SemanticValue> }
  ): SemanticValue | null {
    const funcName = name;
    const builtIns = new Set([
      "sqrt",
      "abs",
      "round",
      "floor",
      "ceil",
      "sin",
      "cos",
      "tan",
      "log",
      "log10",
      "ln",
      "exp",
      "max",
      "min",
    ]);

    if (!builtIns.has(funcName)) {
      return null;
    }

    const hasSymbolic =
      args.positional.some(SemanticValueTypes.isSymbolic) ||
      Array.from(args.named.values()).some(SemanticValueTypes.isSymbolic);
    if (hasSymbolic) {
      const positional = args.positional.map((value) => value.toString());
      const named = Array.from(args.named.entries()).map(
        ([key, value]) => `${key}: ${value.toString()}`
      );
      return SymbolicValue.from(`${funcName}(${[...positional, ...named].join(", ")})`);
    }

    if (args.named.size > 0) {
      return ErrorValue.semanticError(`Named arguments not supported for ${funcName}`);
    }

    const unitArgs = args.positional.filter((value) => value.getType() === "unit");
    const currencyArgs = args.positional.filter(
      (value) => value.getType() === "currency" || value.getType() === "currencyUnit"
    );

    if (unitArgs.length > 0) {
      if (funcName === "sqrt") {
        if (args.positional.length !== 1) {
          return ErrorValue.semanticError(`sqrt expects 1 argument, got ${args.positional.length}`);
        }
        const unitValue = args.positional[0] as UnitValue;
        const resultQuantity = unitValue.getQuantity().power(0.5);
        return new UnitValue(resultQuantity);
      }
      return ErrorValue.semanticError(`Function "${funcName}" does not support unit arguments`);
    }

    if (currencyArgs.length > 0) {
      return ErrorValue.semanticError(`Function "${funcName}" does not support currency arguments`);
    }

    const numericArgs = args.positional.map((value) => {
      if (!value.isNumeric()) {
        throw new Error(
          `Function "${funcName}" requires numeric argument, got ${value.getType()}`
        );
      }
      return value.getNumericValue();
    });

    try {
      switch (funcName) {
        case "sqrt":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`sqrt expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.sqrt(numericArgs[0]));
        case "abs":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`abs expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.abs(numericArgs[0]));
        case "round":
          if (numericArgs.length === 1) {
            return NumberValue.from(Math.round(numericArgs[0]));
          }
          if (numericArgs.length === 2) {
            const decimals = numericArgs[1];
            if (!Number.isInteger(decimals)) {
              return ErrorValue.semanticError("round decimals must be an integer");
            }
            const factor = Math.pow(10, decimals);
            return NumberValue.from(Math.round(numericArgs[0] * factor) / factor);
          }
          return ErrorValue.semanticError(`round expects 1 or 2 arguments, got ${numericArgs.length}`);
        case "floor":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`floor expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.floor(numericArgs[0]));
        case "ceil":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`ceil expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.ceil(numericArgs[0]));
        case "sin":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`sin expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.sin(numericArgs[0]));
        case "cos":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`cos expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.cos(numericArgs[0]));
        case "tan":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`tan expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.tan(numericArgs[0]));
        case "log":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`log expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.log10(numericArgs[0]));
        case "log10":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`log10 expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.log10(numericArgs[0]));
        case "ln":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`ln expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.log(numericArgs[0]));
        case "exp":
          if (numericArgs.length !== 1) {
            return ErrorValue.semanticError(`exp expects 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.exp(numericArgs[0]));
        case "max":
          if (numericArgs.length < 1) {
            return ErrorValue.semanticError(`max expects at least 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.max(...numericArgs));
        case "min":
          if (numericArgs.length < 1) {
            return ErrorValue.semanticError(`min expects at least 1 argument, got ${numericArgs.length}`);
          }
          return NumberValue.from(Math.min(...numericArgs));
        default:
          return null;
      }
    } catch (error) {
      return ErrorValue.semanticError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private static evaluateUserFunction(
    name: string,
    args: { positional: SemanticValue[]; named: Map<string, SemanticValue> },
    context: EvaluationContext
  ): SemanticValue {
    const functionStore = context.functionStore ?? new Map();
    const definition = functionStore.get(name);
    if (!definition) {
      return ErrorValue.semanticError(`Undefined function: ${name}`);
    }

    const nextDepth = (context.functionCallDepth || 0) + 1;
    if (nextDepth > 20) {
      return ErrorValue.semanticError("Maximum call depth exceeded");
    }

    const boundVariables = new Map(context.variableContext);
    const usedNamed = new Set<string>();

    definition.params.forEach((param: (typeof definition.params)[number], index: number) => {
      let value: SemanticValue | null = null;

      if (args.named.has(param.name)) {
        value = args.named.get(param.name) || null;
        usedNamed.add(param.name);
      } else if (args.positional.length > index) {
        value = args.positional[index];
      } else if (param.defaultComponents || param.defaultExpression) {
        const components =
          param.defaultComponents ||
          parseExpressionComponents(param.defaultExpression || "");
        const resolved = this.evaluateComponentList(components, {
          ...context,
          variableContext: boundVariables,
          functionCallDepth: nextDepth,
        });
        if (SemanticValueTypes.isError(resolved)) {
          value = resolved;
        } else {
          value = resolved;
        }
      }

      if (!value) {
        value = ErrorValue.semanticError(
          `Missing argument: ${param.name}`
        );
      }

      boundVariables.set(param.name, {
        name: param.name,
        value,
        rawValue: value.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    if (args.named.size > usedNamed.size) {
      const unknown = Array.from(args.named.keys()).filter((key) => !usedNamed.has(key));
      return ErrorValue.semanticError(`Unknown argument: ${unknown[0]}`);
    }

    const result = this.evaluateComponentList(definition.components, {
      ...context,
      variableContext: boundVariables,
      functionCallDepth: nextDepth,
    });

    if (SemanticValueTypes.isError(result)) {
      const message = (result as ErrorValue).getMessage();
      return ErrorValue.semanticError(`Error in ${name}: ${message}`);
    }

    return result;
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
        if (SemanticValueTypes.isSymbolic(right)) {
          const leftExpr = SimpleExpressionParser.wrapExpression(left.toString());
          const rightExpr = SimpleExpressionParser.wrapExpression(right.toString());
          return SymbolicValue.from(`${leftExpr} ^ ${rightExpr}`);
        }
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
    
    if (this.containsFunctionCall(expr)) {
      return true;
    }

    // Don't handle percentage expressions - let the percentage evaluator handle those
    if (this.isPercentageExpression(expr)) {
      return false;
    }

    // Handle simple arithmetic expressions
    return (
      this.isSimpleArithmetic(expr) ||
      this.isSimpleLiteral(expr) ||
      this.isVariableReference(expr)
    );
  }
  
  /**
   * Evaluate expression using semantic types
   */
  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isExpressionNode(node)) {
      return null;
    }
    
    const exprNode = node as ExpressionNode;
    const conversion = this.extractConversionSuffix(exprNode.expression);
    const expression = conversion ? conversion.baseExpression : exprNode.expression;
    const components = conversion
      ? parseExpressionComponents(expression)
      : exprNode.components;
    
    try {
      let result: SemanticValue;
      
      // Try simple literal first
      if (this.isSimpleLiteral(expression)) {
        result = this.evaluateLiteral(expression);
      }
      // Try variable reference
      else if (this.isVariableReference(expression)) {
        result = this.evaluateVariableReference(expression, context);
      }
      // Function calls or expression components
      else if (this.containsFunctionCall(expression)) {
        const componentResult = SimpleExpressionParser.parseComponents(
          components,
          context
        );
        if (componentResult) {
          result = componentResult;
        } else {
          result = ErrorValue.semanticError(`Unsupported expression: "${expression}"`);
        }
      }
      // Try simple arithmetic
      else if (this.isSimpleArithmetic(expression)) {
        const componentResult =
          components.length > 0
            ? SimpleExpressionParser.parseComponents(components, context)
            : null;
        const semanticResult =
          componentResult || SimpleExpressionParser.parseArithmetic(expression, context);

        if (semanticResult) {
          result = semanticResult;
        } else {
          const evalResult = parseAndEvaluateExpression(
            expression,
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
        result = ErrorValue.semanticError(`Unsupported expression: "${expression}"`);
      }

      if (conversion) {
        result = this.applyUnitConversion(result, conversion.target, conversion.keyword);
      }
      
      if (SemanticValueTypes.isError(result)) {
        return this.createErrorNode(
          (result as ErrorValue).getMessage(),
          exprNode.expression,
          context.lineNumber
        );
      }

      // Create render node
      return this.createMathResultNode(
        exprNode.expression,
        result,
        context.lineNumber,
        this.getDisplayOptions(context)
      );
      
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

  private containsFunctionCall(expr: string): boolean {
    return /[a-zA-Z_][a-zA-Z0-9_\s]*\s*\(/.test(expr);
  }

  private extractConversionSuffix(
    expression: string
  ): { baseExpression: string; target: string; keyword: string } | null {
    const match = expression.match(/\b(to|in)\b\s+(.+)$/i);
    if (!match || match.index === undefined) {
      return null;
    }
    const baseExpression = expression.slice(0, match.index).trim();
    if (!baseExpression) {
      return null;
    }
    const target = match[2].trim();
    if (!target) {
      return null;
    }
    return { baseExpression, target, keyword: match[1].toLowerCase() };
  }

  private applyUnitConversion(value: SemanticValue, target: string, keyword: string): SemanticValue {
    const parsed = this.parseConversionTarget(target);
    if (!parsed) {
      return ErrorValue.semanticError(`Expected unit after '${keyword}'`);
    }

    if (value.getType() === "unit") {
      try {
        return (value as UnitValue).convertTo(parsed.unit);
      } catch (error) {
        return ErrorValue.semanticError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    if (value.getType() === "currencyUnit") {
      const currencyValue = value as CurrencyUnitValue;
      if (parsed.symbol && parsed.symbol !== currencyValue.getSymbol()) {
        return ErrorValue.semanticError("Cannot convert between different currencies");
      }
      try {
        return currencyValue.convertTo(parsed.unit);
      } catch (error) {
        return ErrorValue.semanticError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return ErrorValue.semanticError("Cannot convert non-unit value");
  }

  private parseConversionTarget(
    target: string
  ): { unit: string; symbol?: string } | null {
    let raw = target.trim();
    if (!raw) {
      return null;
    }

    let symbol: string | undefined;
    const symbolMatch = raw.match(/^([$€£¥₹₿])\s*(.*)$/);
    if (symbolMatch) {
      symbol = symbolMatch[1];
      raw = symbolMatch[2].trim();
    }

    raw = raw.replace(/^per\b/i, "").trim();
    raw = raw.replace(/^[/*]+/, "").trim();

    const unit = raw.replace(/\s+/g, "");
    if (!unit) {
      return null;
    }

    return { unit, symbol };
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
      return SymbolicValue.from(normalized);
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
    lineNumber: number,
    displayOptions: DisplayOptions
  ): MathResultRenderNode {
    const resultString = result.toString(displayOptions);
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

  private getDisplayOptions(context: EvaluationContext): DisplayOptions {
    return {
      precision: context.decimalPlaces,
      scientificUpperThreshold: context.scientificUpperThreshold,
      scientificLowerThreshold: context.scientificLowerThreshold,
      scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
      dateFormat: context.dateDisplayFormat,
      dateLocale: context.dateLocale,
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
