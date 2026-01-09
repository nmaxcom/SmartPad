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
  DateValue,
  CurrencyUnitValue,
  CurrencyValue,
  CurrencySymbol,
  SymbolicValue,
  ErrorValue,
  SemanticValueTypes,
  DisplayOptions,
  SemanticParsers,
  SemanticArithmetic,
  ListValue,
  createListResult,
  mapListItems,
} from "../types";
import { DateTime } from "luxon";
import { getListMaxLength } from "../types/listConfig";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { splitTopLevelCommas, inferListDelimiter } from "../utils/listExpression";
import { PercentageValue } from "../types/PercentageValue";
import { isAggregatorExpression } from "./aggregatorUtils";
import { rewriteLocaleDateLiterals } from "../utils/localeDateNormalization";

function applyAbsToSemanticValue(value: SemanticValue): SemanticValue {
  if (!value.isNumeric()) {
    return ErrorValue.typeError("abs expects a numeric argument", "number", value.getType());
  }

  switch (value.getType()) {
    case "number":
      return NumberValue.from(Math.abs(value.getNumericValue()));
    case "unit": {
      const unitValue = value as UnitValue;
      return UnitValue.fromValueAndUnit(
        Math.abs(unitValue.getNumericValue()),
        unitValue.getUnit()
      );
    }
    case "currency": {
      const currency = value as CurrencyValue;
      return new CurrencyValue(currency.getSymbol(), Math.abs(currency.getNumericValue()));
    }
    case "currencyUnit": {
      const currencyUnit = value as CurrencyUnitValue;
      return new CurrencyUnitValue(
        currencyUnit.getSymbol() as CurrencySymbol,
        Math.abs(currencyUnit.getNumericValue()),
        currencyUnit.getUnit(),
        currencyUnit.isPerUnit()
      );
    }
    case "percentage": {
      const percentage = value as PercentageValue;
      return new PercentageValue(
        Math.abs(percentage.getDisplayPercentage()),
        percentage.getContext()
      );
    }
    default:
      return NumberValue.from(Math.abs(value.getNumericValue()));
  }
}

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
      /\b(sqrt|abs|round|floor|ceil|max|min|sum|total|avg|mean|median|count|stddev|sin|cos|tan|log|log10|ln|exp)\s*\(/.test(trimmed)
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
        if (SemanticValueTypes.isList(value)) {
          return resolveSymbolicListForDisplay(value as ListValue, context);
        }
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
          if (SemanticValueTypes.isList(value)) {
            return resolveSymbolicListForDisplay(value as ListValue, context);
          }
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

      case "listAccess": {
        if (!component.access) {
          return ErrorValue.semanticError("Invalid list access expression");
        }
        const baseValue = this.resolveComponentValue(component.access.base, context);
        if (SemanticValueTypes.isError(baseValue)) {
          return baseValue;
        }
        if (!SemanticValueTypes.isList(baseValue)) {
          return ErrorValue.semanticError("Cannot index a non-list value");
        }
        const listValue = baseValue as ListValue;
        if (component.access.kind === "index") {
          if (!component.access.indexComponents?.length) {
            return ErrorValue.semanticError("Empty index expression");
          }
          const idxValue = this.evaluateComponentList(component.access.indexComponents, context);
          if (SemanticValueTypes.isError(idxValue)) {
            return idxValue;
          }
          return evaluateListIndex(listValue, idxValue);
        }
        if (component.access.kind === "slice") {
          if (!component.access.startComponents?.length || !component.access.endComponents?.length) {
            return ErrorValue.semanticError("Slice requires start and end expressions");
          }
          const startValue = this.evaluateComponentList(component.access.startComponents, context);
          if (SemanticValueTypes.isError(startValue)) {
            return startValue;
          }
          const endValue = this.evaluateComponentList(component.access.endComponents, context);
          if (SemanticValueTypes.isError(endValue)) {
            return endValue;
          }
          return evaluateListSlice(listValue, startValue, endValue);
        }
        return ErrorValue.semanticError("Unsupported list access operation");
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
    const builtIn = this.evaluateBuiltInFunction(name, args, context);
    if (builtIn) {
      return builtIn;
    }

    return this.evaluateUserFunction(name, args, context);
  }

  private static evaluateBuiltInFunction(
    name: string,
    args: { positional: SemanticValue[]; named: Map<string, SemanticValue> },
    context: EvaluationContext
  ): SemanticValue | null {
    const funcName = name;
    const builtIns = new Set([
      "sqrt",
      "abs",
      "round",
      "floor",
      "ceil",
      "sum",
      "total",
      "avg",
      "mean",
      "median",
      "count",
      "stddev",
      "sin",
      "cos",
      "tan",
      "log",
      "log10",
      "ln",
      "exp",
      "max",
      "min",
      "range",
      "sort",
      RANGE_LITERAL_FUNCTION,
    ]);
    const listFunctionNames = new Set(["sum", "total", "avg", "mean", "median", "count", "stddev", "min", "max", "range"]);

    if (!builtIns.has(funcName)) {
      return null;
    }

    if (funcName === RANGE_LITERAL_FUNCTION) {
      return evaluateRangeLiteralFunction(args);
    }

    if (listFunctionNames.has(funcName)) {
      const allowSingleScalar = false;
      const listArgsResult = collectListFunctionValues(
        args.positional,
        context,
        funcName,
        allowSingleScalar
      );
      if (listArgsResult instanceof ErrorValue) {
        return listArgsResult;
      }
      if (listArgsResult.containsNestedList) {
        return ErrorValue.semanticError(`${funcName}() does not support nested lists`);
      }
      const resolvedArgs = listArgsResult.values;
      switch (funcName) {
        case "sum":
        case "total":
          return sumSemanticValues(resolvedArgs);
        case "avg":
        case "mean":
          return averageSemanticValues(resolvedArgs);
        case "median":
          return medianSemanticValues(resolvedArgs);
        case "count":
          return NumberValue.from(resolvedArgs.length);
        case "stddev":
          return standardDeviation(resolvedArgs);
        case "min":
          return extremumSemanticValue(resolvedArgs, (next, current) => next < current);
        case "max":
          return extremumSemanticValue(resolvedArgs, (next, current) => next > current);
        case "range":
          return rangeSemanticValues(resolvedArgs);
        default:
          return null;
      }
    }

    if (
      funcName === "abs" &&
      args.positional.length === 1 &&
      SemanticValueTypes.isList(args.positional[0])
    ) {
      return mapListItems(
        args.positional[0] as ListValue,
        (value) => applyAbsToSemanticValue(value)
      );
    }

    if (funcName === "sort") {
      if (args.positional.length === 0) {
        return ErrorValue.semanticError("sort() expects a list, got nothing");
      }
      const listArg = args.positional[0];
      if (!SemanticValueTypes.isList(listArg)) {
        const gotType = canonicalTypeName(listArg);
        return ErrorValue.semanticError(`sort() expects a list, got ${gotType}`);
      }
      const directionArg = args.positional[1];
      const descending = directionArg
        ? directionArg.toString().trim().toLowerCase() === "desc"
        : false;
      return sortListValue(listArg as ListValue, descending);
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

const flattenArgumentList = (values: SemanticValue[]): SemanticValue[] => {
  const flattened: SemanticValue[] = [];

  for (const value of values) {
    if (SemanticValueTypes.isList(value)) {
      flattened.push(...(value as ListValue).getItems());
      continue;
    }
    flattened.push(value);
  }

  return flattened;
};

const canonicalTypeName = (value: SemanticValue): string => {
  switch (value.getType()) {
    case "number":
      return "number";
    case "percentage":
      return "percent";
    case "currency":
    case "currencyUnit":
      return "currency";
    case "unit":
      return "quantity";
    case "date":
      return "date";
    case "list":
      return "list";
    case "symbolic":
      return "unknown";
    default:
      return "unknown";
  }
};

const describeSemanticValue = (value: SemanticValue): string => {
  const trimmed = value.toString().trim();
  if (trimmed) {
    return trimmed;
  }
  return canonicalTypeName(value);
};

const filterNumericItems = (values: SemanticValue[]): SemanticValue[] => {
  return flattenArgumentList(values).filter((value) => value.isNumeric());
};

type ListFunctionResolution = {
  values: SemanticValue[];
  containsNestedList: boolean;
};

function collectListFunctionValues(
  values: SemanticValue[],
  context: EvaluationContext,
  functionName: string,
  allowSingleScalar = false
): ListFunctionResolution | ErrorValue {
  if (values.length === 0) {
    return { values: [], containsNestedList: false };
  }
  if (values.length === 1 && !SemanticValueTypes.isList(values[0])) {
    if (allowSingleScalar) {
      return resolveFunctionArguments(values, context);
    }
    const gotType = canonicalTypeName(values[0]);
    return ErrorValue.semanticError(
      `${functionName}() expects a list, got ${gotType}`
    );
  }
  return resolveFunctionArguments(values, context);
}

const sumSemanticValues = (values: SemanticValue[]): SemanticValue => {
  const numericItems = filterNumericItems(values);
  if (numericItems.length === 0) {
    return NumberValue.from(0);
  }
  let accumulator = numericItems[0];
  for (const next of numericItems.slice(1)) {
    const updated = SemanticArithmetic.add(accumulator, next);
    if (SemanticValueTypes.isError(updated)) {
      return updated;
    }
    accumulator = updated;
  }
  return accumulator;
};

const createZeroNumberValue = (): NumberValue => NumberValue.from(0);

const averageSemanticValues = (values: SemanticValue[]): SemanticValue => {
  const numericItems = filterNumericItems(values);
  if (numericItems.length === 0) {
    return createZeroNumberValue();
  }
  const total = sumSemanticValues(numericItems);
  if (SemanticValueTypes.isError(total)) {
    return total;
  }
  const countValue = NumberValue.from(numericItems.length);
  return SemanticArithmetic.divide(total, countValue);
};

const medianSemanticValues = (values: SemanticValue[]): SemanticValue => {
  const numericItems = filterNumericItems(values);
  if (numericItems.length === 0) {
    return createZeroNumberValue();
  }
  const sorted = [...numericItems].sort(
    (a, b) => a.getNumericValue() - b.getNumericValue()
  );
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  const pairSum = SemanticArithmetic.add(sorted[mid - 1], sorted[mid]);
  if (SemanticValueTypes.isError(pairSum)) {
    return pairSum;
  }
  return SemanticArithmetic.divide(pairSum, NumberValue.from(2));
};

const standardDeviation = (values: SemanticValue[]): SemanticValue => {
  const numericItems = filterNumericItems(values);
  if (numericItems.length === 0) {
    return createZeroNumberValue();
  }
  const meanValue = averageSemanticValues(numericItems);
  if (SemanticValueTypes.isError(meanValue)) {
    return meanValue;
  }
  const squaredDiffs: SemanticValue[] = [];
  for (const item of numericItems) {
    const difference = SemanticArithmetic.subtract(item, meanValue);
    if (SemanticValueTypes.isError(difference)) {
      return difference;
    }
    const squared = SemanticArithmetic.multiply(difference, difference);
    if (SemanticValueTypes.isError(squared)) {
      return squared;
    }
    squaredDiffs.push(squared);
  }
  const sumOfSquares = sumSemanticValues(squaredDiffs);
  if (SemanticValueTypes.isError(sumOfSquares)) {
    return sumOfSquares;
  }
  const variance = SemanticArithmetic.divide(sumOfSquares, NumberValue.from(numericItems.length));
  if (SemanticValueTypes.isError(variance)) {
    return variance;
  }
  return SemanticArithmetic.power(variance, 0.5);
};

const extremumSemanticValue = (
  values: SemanticValue[],
  comparator: (next: number, current: number) => boolean
): SemanticValue => {
  const numericItems = filterNumericItems(values);
  if (numericItems.length === 0) {
    return createZeroNumberValue();
  }
  let bestItem = numericItems[0];
  let bestValue = bestItem.getNumericValue();
  for (const item of numericItems.slice(1)) {
    const currentValue = item.getNumericValue();
    if (comparator(currentValue, bestValue)) {
      bestValue = currentValue;
      bestItem = item;
    }
  }
  return bestItem;
};

const rangeSemanticValues = (values: SemanticValue[]): SemanticValue => {
  const numericItems = filterNumericItems(values);
  if (numericItems.length === 0) {
    return createZeroNumberValue();
  }
  const minValue = extremumSemanticValue(numericItems, (next, current) => next < current);
  const maxValue = extremumSemanticValue(numericItems, (next, current) => next > current);
  const difference = SemanticArithmetic.subtract(maxValue, minValue);
  if (SemanticValueTypes.isError(difference)) {
    return difference;
  }
  return difference;
};

const RANGE_LITERAL_FUNCTION = "__rangeLiteral";
const MAX_RANGE_ELEMENTS = 10000;

const DATE_RANGE_STEP_ERROR = "Date ranges require a duration step (e.g., 1 day)";
const RANGE_TIME_MISMATCH_ERROR = "Range endpoints must both include time or both be date-only";
const TIME_ONLY_DURATION_UNITS = new Set<DurationUnit>(["hour", "minute", "second"]);

type RangeEndpoint = number | DateValue;
type DurationUnit = "year" | "month" | "week" | "day" | "hour" | "minute" | "second";
type DurationStep = {
  value: number;
  unit: DurationUnit;
};

const DURATION_UNIT_ALIASES: Record<string, DurationUnit> = {
  year: "year",
  years: "year",
  month: "month",
  months: "month",
  week: "week",
  weeks: "week",
  w: "week",
  day: "day",
  days: "day",
  d: "day",
  h: "hour",
  hr: "hour",
  hrs: "hour",
  hour: "hour",
  hours: "hour",
  min: "minute",
  mins: "minute",
  minute: "minute",
  minutes: "minute",
  sec: "second",
  secs: "second",
  s: "second",
  second: "second",
  seconds: "second",
};

const evaluateRangeLiteralFunction = (
  args: { positional: SemanticValue[]; named: Map<string, SemanticValue> }
): SemanticValue => {
  if (args.named.size > 0) {
    return ErrorValue.semanticError("range literal does not support named arguments");
  }
  if (args.positional.length < 2 || args.positional.length > 3) {
    return ErrorValue.semanticError("range literal expects 2 or 3 arguments");
  }

  const startEndpoint = ensureRangeEndpoint(args.positional[0]);
  if (startEndpoint instanceof ErrorValue) {
    return startEndpoint;
  }
  const endEndpoint = ensureRangeEndpoint(args.positional[1]);
  if (endEndpoint instanceof ErrorValue) {
    return endEndpoint;
  }

  if (typeof startEndpoint === "number" && typeof endEndpoint === "number") {
    return evaluateNumericRange(startEndpoint, endEndpoint, args.positional[2]);
  }

  if (startEndpoint instanceof DateValue && endEndpoint instanceof DateValue) {
    return evaluateDateRange(startEndpoint, endEndpoint, args.positional[2]);
  }

  return ErrorValue.semanticError("range endpoints must be both numbers or both dates");
};

const evaluateNumericRange = (
  start: number,
  end: number,
  stepArg?: SemanticValue
): SemanticValue => {
  if (start === end) {
    return buildListValue([NumberValue.from(start)]);
  }

  let stepValue = start < end ? 1 : -1;
  if (stepArg) {
    const candidateStep = ensureRangeStep(stepArg);
    if (typeof candidateStep !== "number") {
      return candidateStep;
    }
    stepValue = candidateStep;
  }

  if (stepValue === 0) {
    return ErrorValue.semanticError("step cannot be 0");
  }

  const direction = Math.sign(end - start);
  if (direction === 0) {
    return buildListValue([NumberValue.from(start)]);
  }
  if (Math.sign(stepValue) !== direction) {
    const message =
      direction > 0
        ? "step must be positive for an increasing range"
        : "step must be negative for a decreasing range";
    return ErrorValue.semanticError(message);
  }

  return buildRangeList(start, end, stepValue);
};

const evaluateDateRange = (
  start: DateValue,
  end: DateValue,
  stepArg?: SemanticValue
): SemanticValue => {
  if (start.getNumericValue() === end.getNumericValue()) {
    return buildListValue([start]);
  }

  if (start.hasTimeComponent() !== end.hasTimeComponent()) {
    return ErrorValue.semanticError(RANGE_TIME_MISMATCH_ERROR);
  }

  const direction = Math.sign(end.getNumericValue() - start.getNumericValue());
  if (direction === 0) {
    return buildListValue([start]);
  }

  if (!stepArg) {
    return ErrorValue.semanticError(DATE_RANGE_STEP_ERROR);
  }

  const ensured = ensureDurationStep(stepArg);
  if (ensured instanceof ErrorValue) {
    return ensured;
  }
  const step = ensured;

  if (!start.hasTimeComponent() && TIME_ONLY_DURATION_UNITS.has(step.unit)) {
    return ErrorValue.semanticError(DATE_RANGE_STEP_ERROR);
  }

  return buildDateRangeList(start, end, step, direction);
};

const ensureRangeEndpoint = (value: SemanticValue): RangeEndpoint | ErrorValue => {
  if (value.getType() === "date") {
    return value as DateValue;
  }

  if (value.getType() !== "number") {
    if (value.getType() === "unit") {
      const unitValue = value as UnitValue;
      return ErrorValue.semanticError(
        `range endpoints must be unitless integers (got ${unitValue.getUnit()})`
      );
    }
    const fallback = value.toString().trim() || value.getType();
    return ErrorValue.semanticError(
      `range endpoints must be integers (got ${fallback})`
    );
  }
  const numeric = value.getNumericValue();
  if (!Number.isFinite(numeric)) {
    return ErrorValue.semanticError("range endpoints must be finite integers");
  }
  if (!Number.isInteger(numeric)) {
    return ErrorValue.semanticError(
      `range endpoints must be integers (got ${value.toString().trim()})`
    );
  }
  return numeric;
};

const ensureRangeStep = (value: SemanticValue): number | ErrorValue => {
  if (value.getType() !== "number") {
    const fallback = value.toString().trim() || value.getType();
    return ErrorValue.semanticError(`step must be an integer (got ${fallback})`);
  }
  const numeric = value.getNumericValue();
  if (!Number.isFinite(numeric)) {
    return ErrorValue.semanticError("step must be an integer");
  }
  if (!Number.isInteger(numeric)) {
    return ErrorValue.semanticError(
      `step must be an integer (got ${value.toString().trim()})`
    );
  }
  if (numeric === 0) {
    return ErrorValue.semanticError("step cannot be 0");
  }
  return numeric;
};

const ensureDurationStep = (value: SemanticValue): DurationStep | ErrorValue => {
  if (value.getType() !== "unit") {
    return ErrorValue.semanticError(
      `Invalid range step: expected duration, got ${describeSemanticValue(value)}`
    );
  }
  const unitValue = value as UnitValue;
  const rawUnit = unitValue.getUnit().toLowerCase();
  const normalized = DURATION_UNIT_ALIASES[rawUnit];
  if (!normalized) {
    return ErrorValue.semanticError(
      `Invalid range step: expected duration, got ${describeSemanticValue(value)}`
    );
  }
  const numeric = unitValue.getNumericValue();
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return ErrorValue.semanticError(
      `Invalid range step: expected a positive duration, got ${describeSemanticValue(value)}`
    );
  }
  return { value: numeric, unit: normalized };
};

const getRangeElementLimit = (): number => Math.min(MAX_RANGE_ELEMENTS, getListMaxLength());

const buildRangeList = (start: number, end: number, step: number): SemanticValue => {
  const direction = Math.sign(end - start);
  if (direction === 0) {
    return buildListValue([NumberValue.from(start)]);
  }
  const comparator = direction > 0 ? (value: number) => value <= end : (value: number) => value >= end;
  const items: SemanticValue[] = [];
  let current = start;
  let count = 0;
  const limit = getRangeElementLimit();
  while (comparator(current)) {
    items.push(NumberValue.from(current));
    count += 1;
    if (count > limit) {
      return ErrorValue.semanticError(
        `range too large (${count} elements; max ${limit})`
      );
    }
    current += step;
  }
  return buildListValue(items);
};

const buildDateRangeList = (
  start: DateValue,
  end: DateValue,
  step: DurationStep,
  direction: number
): SemanticValue => {
  const endMs = end.getNumericValue();
  const comparator =
    direction > 0
      ? (value: DateValue) => value.getNumericValue() <= endMs
      : (value: DateValue) => value.getNumericValue() >= endMs;
  const items: SemanticValue[] = [];
  let current = start;
  let count = 0;
  const limit = getRangeElementLimit();
  let iteration = 0;

  while (comparator(current)) {
    items.push(current);
    count += 1;
    if (count > limit) {
      return ErrorValue.semanticError(`range too large (${count} elements; max ${limit})`);
    }
    iteration += 1;
    if (step.unit === "month" || step.unit === "year") {
      current = buildMonthYearCandidate(start, step, direction, iteration);
    } else {
      current = addDurationStep(current, step, direction);
    }
  }

  return buildListValue(items);
};

const buildMonthYearCandidate = (
  start: DateValue,
  step: DurationStep,
  direction: number,
  iteration: number
): DateValue => {
  const base = start.getDateTime();
  const monthsPerStep =
    step.unit === "year" ? step.value * 12 : step.unit === "month" ? step.value : 0;
  const totalMonths = monthsPerStep * direction * iteration;
  const candidate = base.plus({ months: totalMonths });
  return DateValue.fromDateTime(candidate, start.getZone(), start.hasTimeComponent());
};

const addDurationStep = (
  current: DateValue,
  step: DurationStep,
  direction: number
): DateValue => {
  const dt = current.getDateTime();
  const amount = step.value * direction;
  let updated: DateTime;
  switch (step.unit) {
    case "year":
      updated = dt.plus({ years: amount });
      break;
    case "month":
      updated = dt.plus({ months: amount });
      break;
    case "week":
      updated = dt.plus({ days: amount * 7 });
      break;
    case "day":
      updated = dt.plus({ days: amount });
      break;
    case "hour":
      updated = dt.plus({ hours: amount });
      break;
    case "minute":
      updated = dt.plus({ minutes: amount });
      break;
    case "second":
      updated = dt.plus({ seconds: amount });
      break;
  }
  return DateValue.fromDateTime(updated, current.getZone(), current.hasTimeComponent());
};

const buildListValue = (items: SemanticValue[]): SemanticValue => {
  return createListResult(items);
};

const getCanonicalMagnitude = (value: SemanticValue): number => {
  if (value.getType() === "unit") {
    const unitValue = value as UnitValue;
    return unitValue.getQuantity().toBaseUnit().value;
  }
  return value.getNumericValue();
};

const sortListValue = (list: ListValue, descending: boolean): SemanticValue => {
  const items = list.getItems();

  if (items.length <= 1) {
    return buildListValue(items);
  }

  const base = items[0];
  for (const item of items.slice(1)) {
    const diff = SemanticArithmetic.subtract(item, base);
    if (SemanticValueTypes.isError(diff)) {
      return ErrorValue.semanticError("Cannot sort: incompatible units");
    }
  }

  const sorted = [...items].sort((a, b) => {
    const aValue = getCanonicalMagnitude(a);
    const bValue = getCanonicalMagnitude(b);
    return aValue - bValue;
  });
  const result = descending ? sorted.reverse() : sorted;
  return buildListValue(result);
};

const parseRawIntegerIndex = (value: SemanticValue): number | ErrorValue => {
  if (!value.isNumeric()) {
    return ErrorValue.typeError("Index must be numeric", "number", value.getType());
  }
  const raw = value.getNumericValue();
  if (!Number.isFinite(raw)) {
    return ErrorValue.semanticError("Index must be finite");
  }
  if (!Number.isInteger(raw)) {
    return ErrorValue.semanticError("Index must be an integer");
  }
  if (raw === 0) {
    return ErrorValue.semanticError("Indexing starts at 1");
  }
  return raw;
};

const convertToZeroBased = (raw: number, length: number): number => {
  return raw > 0 ? raw - 1 : length + raw;
};

const evaluateListIndex = (list: ListValue, indexValue: SemanticValue): SemanticValue => {
  const items = list.getItems();
  if (items.length === 0) {
    return ErrorValue.semanticError("Index out of range (size 0)");
  }
  const raw = parseRawIntegerIndex(indexValue);
  if (typeof raw !== "number") {
    return raw;
  }
  const index = convertToZeroBased(raw, items.length);
  if (index < 0 || index >= items.length) {
    return ErrorValue.semanticError(`Index out of range (size ${items.length})`);
  }
  return items[index];
};

const evaluateListSlice = (
  list: ListValue,
  startValue: SemanticValue,
  endValue: SemanticValue
): SemanticValue => {
  const items = list.getItems();
  if (items.length === 0) {
    return buildListValue([]);
  }
  const rawStart = parseRawIntegerIndex(startValue);
  if (typeof rawStart !== "number") {
    return rawStart;
  }
  const rawEnd = parseRawIntegerIndex(endValue);
  if (typeof rawEnd !== "number") {
    return rawEnd;
  }
  const startIndex = convertToZeroBased(rawStart, items.length);
  const endIndex = convertToZeroBased(rawEnd, items.length);
  if (startIndex > endIndex) {
    return ErrorValue.semanticError("Range can't go downwards");
  }
  const clampedStart = Math.max(0, Math.min(items.length - 1, startIndex));
  const clampedEnd = Math.max(0, Math.min(items.length - 1, endIndex));
  const slice = items.slice(clampedStart, clampedEnd + 1);
  return buildListValue(slice);
};

type WherePredicate = {
  comparator: string;
  otherExpression: string;
  itemOnLeft: boolean;
};

const ABSOLUTE_TOLERANCE = 1e-12;
const RELATIVE_TOLERANCE = 1e-9;

const toleranceThreshold = (left: number, right: number): number => {
  const magnitude = Math.max(Math.abs(left), Math.abs(right));
  return Math.max(ABSOLUTE_TOLERANCE, RELATIVE_TOLERANCE * magnitude);
};

const comparatorFunctions: Record<
  string,
  (diff: number, left: number, right: number) => boolean
> = {
  ">": (diff, left, right) => diff > toleranceThreshold(left, right),
  "<": (diff, left, right) => diff < -toleranceThreshold(left, right),
  ">=": (diff, left, right) => diff >= -toleranceThreshold(left, right),
  "<=": (diff, left, right) => diff <= toleranceThreshold(left, right),
  "==": (diff, left, right) => Math.abs(diff) <= toleranceThreshold(left, right),
  "=": (diff, left, right) => Math.abs(diff) <= toleranceThreshold(left, right),
  "!=": (diff, left, right) =>
    Math.abs(diff) > toleranceThreshold(left, right),
};

const comparatorPrefixRegex = /^(>=|<=|==|!=|=|>|<)\s*(.+)$/;
const comparatorSuffixRegex = /^(.+?)\s*(>=|<=|==|!=|=|>|<)\s*$/;

function parseWherePredicate(predicate: string): WherePredicate | ErrorValue {
  const trimmed = predicate.trim();
  if (!trimmed) {
    return ErrorValue.semanticError("Empty where predicate");
  }
  const prefixMatch = trimmed.match(comparatorPrefixRegex);
  if (prefixMatch) {
    return {
      comparator: prefixMatch[1],
      otherExpression: prefixMatch[2].trim(),
      itemOnLeft: true,
    };
  }
  const suffixMatch = trimmed.match(comparatorSuffixRegex);
  if (suffixMatch) {
    return {
      comparator: suffixMatch[2],
      otherExpression: suffixMatch[1].trim(),
      itemOnLeft: false,
    };
  }
  return ErrorValue.semanticError("Unsupported where predicate");
}

function evaluatePredicateExpression(
  expression: string,
  context: EvaluationContext
): SemanticValue {
  const components = parseExpressionComponents(expression);
  const result = SimpleExpressionParser.parseComponents(components, context);
  return result || ErrorValue.semanticError(`Invalid expression in predicate: "${expression}"`);
}

const resolveSymbolicReference = (
  value: SemanticValue,
  context: EvaluationContext
): SemanticValue | null => {
  if (!SemanticValueTypes.isSymbolic(value)) {
    return value;
  }
  const identifier = value.toString().trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    return null;
  }
  const variable = context.variableContext.get(identifier);
  if (variable && variable.value instanceof SemanticValue) {
    return variable.value;
  }
  return null;
};

const resolveFunctionArguments = (
  values: SemanticValue[],
  context: EvaluationContext
): ListFunctionResolution => {
  const resolved: SemanticValue[] = [];
  let containsNestedList = false;
  for (const rawValue of values) {
    const candidate = resolveSymbolicReference(rawValue, context) || rawValue;
    if (SemanticValueTypes.isList(candidate)) {
      const listValue = candidate as ListValue;
      if (listValue.containsNestedList()) {
        containsNestedList = true;
      }
      const listItems = listValue.getItems();
      const nested = resolveFunctionArguments(listItems, context);
      resolved.push(...nested.values);
      containsNestedList = containsNestedList || nested.containsNestedList;
      continue;
    }
    resolved.push(candidate);
  }
  return { values: resolved, containsNestedList };
};

const resolveSymbolicListForDisplay = (
  list: ListValue,
  context: EvaluationContext
): SemanticValue => {
  const resolvedItems = list
    .getItems()
    .map((item) => resolveSymbolicReference(item, context) ?? item);
  return createListResult(resolvedItems, list.getDelimiter());
};

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

    if (/\bwhere\b/i.test(expr)) {
      return true;
    }

    if (this.containsListAccess(expr)) {
      return true;
    }

    if (expr.includes("..")) {
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
    const normalized = rewriteLocaleDateLiterals(exprNode.expression, context.dateLocale);
    if (normalized.errors.length > 0) {
      return this.createErrorNode(
        normalized.errors[0],
        exprNode.expression,
        context.lineNumber
      );
    }
    const conversion = this.extractConversionSuffix(normalized.expression);
    const expression = conversion ? conversion.baseExpression : normalized.expression;
    const whereMatch = expression.match(/(.+?)\bwhere\b(.+)/i);
    if (whereMatch) {
      const filtered = this.evaluateWhereExpression(
        whereMatch[1].trim(),
        whereMatch[2].trim(),
        context
      );
      if (SemanticValueTypes.isError(filtered)) {
        return this.createErrorNode(
          (filtered as ErrorValue).getMessage(),
          exprNode.expression,
          context.lineNumber
        );
      }
      if (!filtered) {
        return this.createErrorNode(
          "Cannot evaluate where expression",
          exprNode.expression,
          context.lineNumber
        );
      }
      return this.createMathResultNode(
        exprNode.expression,
        filtered,
        context.lineNumber,
        this.getDisplayOptions(context)
      );
    }
    const listValue = this.tryBuildListFromExpression(expression, context);
    if (listValue) {
      if (SemanticValueTypes.isError(listValue)) {
        return this.createErrorNode(
          (listValue as ErrorValue).getMessage(),
          exprNode.expression,
          context.lineNumber
        );
      }

      return this.createMathResultNode(
        exprNode.expression,
        this.prepareDisplayValue(listValue, context),
        context.lineNumber,
        this.getDisplayOptions(context)
      );
    }

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
      // Function calls, range literals, or expression components
      else if (this.containsFunctionCall(expression) || expression.includes("..")) {
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
      // List access expressions (e.g., indexing/slicing)
      else if (this.containsListAccess(expression)) {
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

      const baseDisplayOptions = this.getDisplayOptions(context);
      const displayOptions = {
        ...baseDisplayOptions,
        preferBaseUnit: false,
        forceUnit: !!conversion,
        precision: isAggregatorExpression(exprNode.expression)
          ? 4
          : baseDisplayOptions.precision,
      };
      const displayValue = this.prepareDisplayValue(result, context);
      // Create render node
      return this.createMathResultNode(
        exprNode.expression,
        displayValue,
        context.lineNumber,
        displayOptions
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
    if (expr.includes("..")) {
      return false;
    }
    const parsed = SemanticParsers.parse(expr.trim());
    return (
      parsed !== null &&
      !SemanticValueTypes.isError(parsed) &&
      !SemanticValueTypes.isSymbolic(parsed)
    );
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

  private containsListAccess(expr: string): boolean {
    return /\[[^\]]+\]/.test(expr);
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
    if (SemanticValueTypes.isList(value)) {
      const converted: SemanticValue[] = [];
      for (const item of (value as ListValue).getItems()) {
        const result = this.convertSingleValue(item, target, keyword);
        if (SemanticValueTypes.isError(result)) {
          return result;
        }
        converted.push(result);
      }
      return buildListValue(converted);
    }
    return this.convertSingleValue(value, target, keyword);
  }

  private convertSingleValue(value: SemanticValue, target: string, keyword: string): SemanticValue {
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

  private evaluateWhereExpression(
    listExpr: string,
    predicateExpr: string,
    context: EvaluationContext
  ): SemanticValue {
    const listComponents = parseExpressionComponents(listExpr);
    const listValue = SimpleExpressionParser.parseComponents(listComponents, context);

    if (!listValue) {
      return ErrorValue.semanticError(`Cannot evaluate list expression: "${listExpr}"`);
    }

    if (SemanticValueTypes.isError(listValue)) {
      return listValue;
    }

    if (!SemanticValueTypes.isList(listValue)) {
      return ErrorValue.semanticError(
        `where() expects a list, got ${canonicalTypeName(listValue)}`
      );
    }

    const predicate = parseWherePredicate(predicateExpr);
    if (predicate instanceof ErrorValue) {
      return predicate;
    }

    if (!predicate.otherExpression) {
      return ErrorValue.semanticError("Missing predicate expression");
    }

    const otherValue = evaluatePredicateExpression(predicate.otherExpression, context);
    if (SemanticValueTypes.isError(otherValue)) {
      return otherValue;
    }

    const comparatorFn = comparatorFunctions[predicate.comparator];
    if (!comparatorFn) {
      return ErrorValue.semanticError(`Unsupported comparator: ${predicate.comparator}`);
    }

    const filteredItems: SemanticValue[] = [];
    for (const item of (listValue as ListValue).getItems()) {
      const difference = predicate.itemOnLeft
        ? SemanticArithmetic.subtract(item, otherValue)
        : SemanticArithmetic.subtract(otherValue, item);

      if (SemanticValueTypes.isError(difference)) {
        return ErrorValue.semanticError("Cannot compare: incompatible units");
      }

      if (!difference.isNumeric()) {
        return ErrorValue.semanticError("Comparison result is not numeric");
      }

      const diffValue = difference.getNumericValue();
      const itemNumeric = item.getNumericValue();
      const otherNumeric = otherValue.getNumericValue();
      const leftNumeric = predicate.itemOnLeft ? itemNumeric : otherNumeric;
      const rightNumeric = predicate.itemOnLeft ? otherNumeric : itemNumeric;
      if (comparatorFn(diffValue, leftNumeric, rightNumeric)) {
        filteredItems.push(item);
      }
    }

    return buildListValue(filteredItems);
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
      groupThousands: context.groupThousands,
    };
  }

  private prepareDisplayValue(value: SemanticValue, context: EvaluationContext): SemanticValue {
    if (!SemanticValueTypes.isList(value)) {
      return value;
    }
    return resolveSymbolicListForDisplay(value as ListValue, context);
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

  private tryBuildListFromExpression(
    expression: string,
    context: EvaluationContext
  ): SemanticValue | null {
    const segments = splitTopLevelCommas(expression);
    if (segments.length <= 1) {
      return null;
    }

    const items: SemanticValue[] = [];
    for (let idx = 0; idx < segments.length; idx += 1) {
      const segment = segments[idx];
      const trimmed = segment.trim();
      if (!trimmed) {
        if (idx === segments.length - 1) {
          continue;
        }
        return ErrorValue.semanticError("Cannot create list: empty value");
      }

      const evaluated = this.evaluateListSegment(trimmed, context);
      if (!evaluated) {
        return null;
      }
      if (SemanticValueTypes.isError(evaluated)) {
        return evaluated;
      }
      items.push(evaluated);
    }

    return createListResult(items, inferListDelimiter(expression));
  }

  private evaluateListSegment(
    segment: string,
    context: EvaluationContext
  ): SemanticValue | null {
    const trimmed = segment.trim();
    if (!trimmed) {
      return null;
    }

    if (!trimmed.includes("..")) {
      const literal = SemanticParsers.parse(trimmed);
      if (literal) {
        return literal;
      }
    }

    const variable = this.evaluateVariableReference(trimmed, context);
    if (variable) {
      return variable;
    }

    let components: ExpressionComponent[] = [];
    try {
      components = parseExpressionComponents(trimmed);
    } catch {
      components = [];
    }

    if (components.length > 0) {
      const evaluated = SimpleExpressionParser.parseComponents(components, context);
      if (evaluated) {
        return evaluated;
      }
    }

    const arithmetic = SimpleExpressionParser.parseArithmetic(trimmed, context);
    if (arithmetic) {
      return arithmetic;
    }

    const evalResult = parseAndEvaluateExpression(trimmed, context.variableContext);
    if (evalResult.error) {
      if (/Undefined variable|not defined/i.test(evalResult.error)) {
        return SymbolicValue.from(trimmed);
      }
      return ErrorValue.semanticError(evalResult.error);
    }

    return NumberValue.from(evalResult.value);
  }

}

export const defaultExpressionEvaluatorV2 = new ExpressionEvaluatorV2();
