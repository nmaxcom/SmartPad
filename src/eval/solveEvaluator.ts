import {
  ASTNode,
  ExpressionComponent,
  ExpressionNode,
  isExpressionNode,
} from "../parsing/ast";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";
import { EquationEntry, normalizeVariableName } from "../solve/equationStore";
import { splitTopLevelEquation, isVariableReferenceExpression } from "../solve/parseUtils";
import type { SolveEquation } from "../solve/parseUtils";
import { NodeEvaluator, EvaluationContext } from "./registry";
import {
  ErrorRenderNode,
  MathResultRenderNode,
  RenderNode,
} from "./renderNodes";
import {
  CurrencyUnitValue,
  DisplayOptions,
  ErrorValue,
  NumberValue,
  SemanticParsers,
  SemanticValue,
  SemanticValueTypes,
  UnitValue,
} from "../types";
import { SimpleExpressionParser } from "./expressionEvaluatorV2";
import { attemptPerUnitConversion } from "./unitConversionUtils";
import { extractConversionSuffix } from "../utils/conversionSuffix";

type SolveExpression =
  | { type: "literal"; value: string; parsed?: SemanticValue }
  | { type: "variable"; name: string }
  | { type: "binary"; op: string; left: SolveExpression; right: SolveExpression }
  | { type: "unary"; op: "+" | "-"; value: SolveExpression }
  | { type: "function"; name: string; args: SolveExpression[] };

type SolveParseResult = {
  target: string;
  equations: SolveEquation[];
  whereClause?: string;
};

const operatorPrecedence: Record<string, number> = {
  "^": 3,
  "*": 2,
  "/": 2,
  "+": 1,
  "-": 1,
};

const isSolveExpression = (expr: string): boolean => /^solve\b/i.test(expr.trim());
const isConstantName = (name: string): boolean =>
  name === "PI" || name === "E";
const isErrorValue = (value: unknown): value is ErrorValue => value instanceof ErrorValue;

const findKeywordIndex = (expression: string, keyword: string): number | null => {
  const lower = expression.toLowerCase();
  const target = keyword.toLowerCase();
  let depth = 0;

  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (depth > 0) continue;

    if (lower.startsWith(target, i)) {
      const before = i === 0 ? "" : lower[i - 1];
      const after = lower[i + target.length] ?? "";
      const beforeOk = !/[a-z0-9_]/.test(before);
      const afterOk = !/[a-z0-9_]/.test(after);
      if (beforeOk && afterOk) {
        return i;
      }
    }
  }

  return null;
};

const splitTopLevelList = (input: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
};

const parseSolveExpression = (expression: string): SolveParseResult | null => {
  const trimmed = expression.trim();
  if (!isSolveExpression(trimmed)) return null;

  const afterSolve = trimmed.replace(/^solve\s+/i, "");
  const inIndex = findKeywordIndex(afterSolve, "in");
  if (inIndex === null) {
    return null;
  }

  const target = afterSolve.slice(0, inIndex).trim();
  if (!target) return null;

  const rest = afterSolve.slice(inIndex + 2).trim();
  if (!rest) return null;

  const whereIndex = findKeywordIndex(rest, "where");
  const equationSection = (whereIndex === null ? rest : rest.slice(0, whereIndex)).trim();
  const whereClause = whereIndex === null ? undefined : rest.slice(whereIndex + 5).trim();

  if (!equationSection) return null;
  if (/,\s*$/.test(equationSection)) return null;

  const rawEquations = splitTopLevelList(equationSection);
  if (rawEquations.length === 0) return null;

  const equations: SolveEquation[] = [];
  for (const raw of rawEquations) {
    if (!raw) {
      return null;
    }
    const eq = splitTopLevelEquation(raw);
    if (!eq) {
      return null;
    }
    equations.push(eq);
  }

  return { target, equations, whereClause };
};

const buildSolveExpression = (components: ExpressionComponent[]): SolveExpression | ErrorValue => {
  const values: SolveExpression[] = [];
  const operators: string[] = [];
  let expectValue = true;
  let pendingUnary: "+" | "-" | null = null;

  const shouldApplyOperator = (stackOp: string, currentOp: string): boolean => {
    const stackPrec = operatorPrecedence[stackOp] ?? 0;
    const currentPrec = operatorPrecedence[currentOp] ?? 0;
    if (stackPrec > currentPrec) return true;
    if (stackPrec === currentPrec && currentOp !== "^") return true;
    return false;
  };

  const applyOperator = (): SolveExpression | ErrorValue => {
    const op = operators.pop();
    const right = values.pop();
    const left = values.pop();
    if (!op || !right || !left) {
      return ErrorValue.semanticError("Invalid expression");
    }
    return { type: "binary", op, left, right };
  };

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

      while (operators.length > 0 && shouldApplyOperator(operators[operators.length - 1], op)) {
        const applied = applyOperator();
        if (isErrorValue(applied)) {
          return applied;
        }
        values.push(applied as SolveExpression);
      }

      operators.push(op);
      expectValue = true;
      continue;
    }

    let node: SolveExpression | ErrorValue;

    switch (component.type) {
      case "literal":
        node = {
          type: "literal",
          value: component.value,
          parsed: component.parsedValue ?? SemanticParsers.parse(component.value) ?? undefined,
        };
        break;
      case "variable":
        node = { type: "variable", name: normalizeVariableName(component.value) };
        break;
      case "parentheses":
        if (!component.children || component.children.length === 0) {
          return ErrorValue.semanticError("Empty parentheses");
        }
        node = buildSolveExpression(component.children);
        break;
      case "function": {
        const args: SolveExpression[] = [];
        for (const arg of component.args || []) {
          const built = buildSolveExpression(arg.components);
          if (isErrorValue(built)) {
            return built;
          }
          args.push(built as SolveExpression);
        }
        const expanded = expandAggregatorFunction(component.value, args);
        if (expanded) {
          node = expanded;
          break;
        }
        node = { type: "function", name: component.value, args };
        break;
      }
      default:
        return ErrorValue.semanticError(`Unsupported component: "${component.type}"`);
    }

    if (isErrorValue(node)) {
      return node;
    }

    let resolvedNode = node as SolveExpression;
    if (pendingUnary) {
      resolvedNode = { type: "unary", op: pendingUnary, value: resolvedNode };
      pendingUnary = null;
    }

    values.push(resolvedNode);
    expectValue = false;
  }

  if (pendingUnary) {
    return ErrorValue.semanticError("Dangling unary operator");
  }

  while (operators.length > 0) {
    const applied = applyOperator();
    if (isErrorValue(applied)) {
      return applied;
    }
    values.push(applied as SolveExpression);
  }

  if (values.length !== 1) {
    return ErrorValue.semanticError("Invalid expression");
  }

  return values[0];
};

const countTarget = (expr: SolveExpression, target: string): number => {
  const normalized = normalizeVariableName(target);
  switch (expr.type) {
    case "variable":
      return normalizeVariableName(expr.name) === normalized ? 1 : 0;
    case "binary":
      return countTarget(expr.left, target) + countTarget(expr.right, target);
    case "unary":
      return countTarget(expr.value, target);
    case "function":
      return expr.args.reduce((sum, arg) => sum + countTarget(arg, target), 0);
    default:
      return 0;
  }
};

const containsTarget = (expr: SolveExpression, target: string): boolean =>
  countTarget(expr, target) > 0;

const formatSolveExpression = (expr: SolveExpression, parentOp: string | null = null, isRight = false): string => {
  const wrapIfNeeded = (value: string): string =>
    value.startsWith("(") && value.endsWith(")") ? value : `(${value})`;

  switch (expr.type) {
    case "literal": {
      const match = expr.value.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)([a-zA-Z°µμΩ].*)$/i);
      if (match) {
        return `${match[1]} ${match[2]}`;
      }
      return expr.value;
    }
    case "variable":
      return expr.name;
    case "function":
      return `${expr.name}(${expr.args.map((arg) => formatSolveExpression(arg)).join(", ")})`;
    case "unary": {
      const child = formatSolveExpression(expr.value, "u");
      const needsParens = expr.value.type === "binary";
      return `${expr.op}${needsParens ? `(${child})` : child}`;
    }
    case "binary": {
      const prec = operatorPrecedence[expr.op] ?? 0;
      const parentPrec = parentOp ? operatorPrecedence[parentOp] ?? 0 : 0;
      const leftStr = formatSolveExpression(expr.left, expr.op, false);
      const rightStr = formatSolveExpression(expr.right, expr.op, true);

      const leftNeeds = expr.left.type === "binary" &&
        ((operatorPrecedence[expr.left.op] ?? 0) < prec || (expr.op === "^" && (operatorPrecedence[expr.left.op] ?? 0) === prec));
      const rightPrec = expr.right.type === "binary" ? (operatorPrecedence[expr.right.op] ?? 0) : 0;
      const rightNeeds = expr.right.type === "binary" &&
        (rightPrec < prec || (rightPrec === prec && (expr.op === "-" || expr.op === "/" || expr.op === "^")));

      const left = leftNeeds ? wrapIfNeeded(leftStr) : leftStr;
      const right = rightNeeds ? wrapIfNeeded(rightStr) : rightStr;
      const formatted = `${left} ${expr.op} ${right}`;

      if (!parentOp) return formatted;
      if (prec < parentPrec) return wrapIfNeeded(formatted);
      if (prec === parentPrec && isRight && (parentOp === "-" || parentOp === "/")) {
        return wrapIfNeeded(formatted);
      }
      return formatted;
    }
    default:
      return "";
  }
};

const makeBinary = (op: string, left: SolveExpression, right: SolveExpression): SolveExpression => ({
  type: "binary",
  op,
  left,
  right,
});

const makeFunction = (name: string, args: SolveExpression[]): SolveExpression => ({
  type: "function",
  name,
  args,
});

const makeLiteral = (value: string): SolveExpression => ({
  type: "literal",
  value,
});

const makeUnary = (op: "+" | "-", value: SolveExpression): SolveExpression => ({
  type: "unary",
  op,
  value,
});

const aggregatorFunctionNames = new Set(["sum", "total"]);

const expandAggregatorFunction = (name: string, args: SolveExpression[]): SolveExpression | null => {
  if (!aggregatorFunctionNames.has(name.toLowerCase())) {
    return null;
  }
  if (args.length === 0) {
    return makeLiteral("0");
  }
  let accumulator = args[0];
  for (let i = 1; i < args.length; i += 1) {
    accumulator = makeBinary("+", accumulator, args[i]);
  }
  return accumulator;
};

const parseArithmeticLiteral = (value: string): number | null => {
  if (!value.trim()) return null;
  const normalized = value.trim();
  if (/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalized)) {
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }
  const result = parseAndEvaluateExpression(normalized, new Map());
  if (result.error) {
    return null;
  }
  return Number.isFinite(result.value) ? result.value : null;
};

const evaluateNumericExpression = (expr: SolveExpression): number | null => {
  switch (expr.type) {
    case "literal": {
      const parsed = expr.parsed ?? SemanticParsers.parse(expr.value);
      if (parsed && parsed.getType() === "number") {
        return parsed.getNumericValue();
      }
      return parseArithmeticLiteral(expr.value);
    }
    case "unary": {
      const value = evaluateNumericExpression(expr.value);
      if (value === null) return null;
      return expr.op === "-" ? -value : value;
    }
    case "binary": {
      const left = evaluateNumericExpression(expr.left);
      const right = evaluateNumericExpression(expr.right);
      if (left === null || right === null) return null;
      switch (expr.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right === 0 ? null : left / right;
        case "^":
          return Math.pow(left, right);
        default:
          return null;
      }
    }
    default:
      return null;
  }
};

const extractNumericLiteral = (expr: SolveExpression): number | null =>
  evaluateNumericExpression(expr);

const containsNegativeRadicand = (expr: SolveExpression): boolean => {
  if (expr.type === "function") {
    const name = expr.name.toLowerCase();
    if (name === "sqrt" && expr.args.length === 1) {
      const numericArg = evaluateNumericExpression(expr.args[0]);
      if (numericArg !== null && numericArg < 0) {
        return true;
      }
    }
    return expr.args.some(containsNegativeRadicand);
  }
  if (expr.type === "binary") {
    return containsNegativeRadicand(expr.left) || containsNegativeRadicand(expr.right);
  }
  if (expr.type === "unary") {
    return containsNegativeRadicand(expr.value);
  }
  return false;
};

const buildNumericConstants = (
  context: EvaluationContext,
  localValues: Map<string, SemanticValue>,
  target: string
): Map<string, number> => {
  const constants = new Map<string, number>();
  const tryAdd = (name: string, value: SemanticValue) => {
    const normalized = normalizeVariableName(name);
    if (normalized === normalizeVariableName(target)) {
      return;
    }
    if (value.getType() !== "number") {
      return;
    }
    constants.set(normalized, value.getNumericValue());
  };

  context.variableContext.forEach((variable, name) => {
    if (variable.value) {
      tryAdd(name, variable.value);
    }
  });

  localValues.forEach((value, name) => {
    tryAdd(name, value);
  });

  return constants;
};

const substituteNumericConstants = (
  expr: SolveExpression,
  constants: Map<string, number>,
  target: string
): SolveExpression => {
  switch (expr.type) {
    case "variable": {
      const normalized = normalizeVariableName(expr.name);
      if (normalized === normalizeVariableName(target)) {
        return expr;
      }
      const value = constants.get(normalized);
      if (value === undefined) {
        return expr;
      }
      return { type: "literal", value: String(value) };
    }
    case "binary":
      return {
        ...expr,
        left: substituteNumericConstants(expr.left, constants, target),
        right: substituteNumericConstants(expr.right, constants, target),
      };
    case "unary":
      return {
        ...expr,
        value: substituteNumericConstants(expr.value, constants, target),
      };
    case "function":
      return {
        ...expr,
        args: expr.args.map((arg) => substituteNumericConstants(arg, constants, target)),
      };
    default:
      return expr;
  }
};

const isExactTargetVariable = (expr: SolveExpression, target: string): boolean =>
  expr.type === "variable" && normalizeVariableName(expr.name) === normalizeVariableName(target);

const tryHandleDivisionWithDenominator = (
  expr: SolveExpression,
  target: string,
  other: SolveExpression
): SolveExpression | null => {
  if (expr.type !== "binary" || expr.op !== "/") return null;
  if (!containsTarget(expr.left, target) || !containsTarget(expr.right, target)) return null;
  if (!isExactTargetVariable(expr.left, target)) return null;
  if (expr.right.type !== "binary" || expr.right.op !== "-") return null;
  if (containsTarget(expr.right.left, target)) return null;
  if (!containsTarget(expr.right.right, target)) return null;

  const constantValue = evaluateNumericExpression(expr.right.left);
  if (constantValue === null) return null;

  const numerator =
    constantValue === 1
      ? other
      : makeBinary("*", makeLiteral(String(constantValue)), other);
  const denominator = makeBinary("+", makeLiteral("1"), other);
  return makeBinary("/", numerator, denominator);
};

const solveForTarget = (
  expr: SolveExpression,
  target: string,
  other: SolveExpression
): SolveExpression | ErrorValue => {
  if (expr.type === "variable") {
    if (normalizeVariableName(expr.name) === normalizeVariableName(target)) {
      return other;
    }
    return ErrorValue.semanticError(`Cannot solve: expected ${target}`);
  }

  if (expr.type === "unary") {
    if (expr.op === "+") {
      return solveForTarget(expr.value, target, other);
    }
    if (expr.op === "-") {
      return solveForTarget(expr.value, target, makeUnary("-", other));
    }
  }

  if (expr.type === "function") {
    const targetArg = expr.args.find((arg) => containsTarget(arg, target));
    if (!targetArg) {
      return ErrorValue.semanticError("Cannot solve: variable not found");
    }

    const funcName = expr.name.toLowerCase();
    switch (funcName) {
      case "sqrt":
        return solveForTarget(targetArg, target, makeBinary("^", other, makeLiteral("2")));
      case "exp":
        return solveForTarget(targetArg, target, makeFunction("ln", [other]));
      case "log":
      case "ln":
        return solveForTarget(targetArg, target, makeFunction("exp", [other]));
      case "log10":
        return solveForTarget(targetArg, target, makeBinary("^", makeLiteral("10"), other));
      case "sin":
        return solveForTarget(targetArg, target, makeFunction("asin", [other]));
      case "cos":
        return solveForTarget(targetArg, target, makeFunction("acos", [other]));
      case "tan":
        return solveForTarget(targetArg, target, makeFunction("atan", [other]));
      case "asin":
        return solveForTarget(targetArg, target, makeFunction("sin", [other]));
      case "acos":
        return solveForTarget(targetArg, target, makeFunction("cos", [other]));
      case "atan":
        return solveForTarget(targetArg, target, makeFunction("tan", [other]));
      default:
        return ErrorValue.semanticError("Cannot solve: unsupported function");
    }
  }

  if (expr.type !== "binary") {
    return ErrorValue.semanticError("Cannot solve: unsupported expression");
  }

  const leftHas = containsTarget(expr.left, target);
  const rightHas = containsTarget(expr.right, target);
  if (leftHas && rightHas) {
    const divisionSpecial = tryHandleDivisionWithDenominator(expr, target, other);
    if (divisionSpecial) {
      return divisionSpecial;
    }
    return ErrorValue.semanticError("Cannot solve: variable appears on both sides");
  }

  if (!leftHas && !rightHas) {
    return ErrorValue.semanticError("Cannot solve: variable not found");
  }

  const op = expr.op;

  if (leftHas) {
    switch (op) {
      case "+":
        return solveForTarget(expr.left, target, makeBinary("-", other, expr.right));
      case "-":
        return solveForTarget(expr.left, target, makeBinary("+", other, expr.right));
      case "*":
        return solveForTarget(expr.left, target, makeBinary("/", other, expr.right));
      case "/":
        return solveForTarget(expr.left, target, makeBinary("*", other, expr.right));
      case "^": {
        const exponent = extractNumericLiteral(expr.right);
        if (exponent === null) {
          return ErrorValue.semanticError("Cannot solve: exponent must be numeric");
        }
        if (Math.abs(exponent - 2) < 1e-12) {
          return solveForTarget(expr.left, target, {
            type: "function",
            name: "sqrt",
            args: [other],
          });
        }
        const reciprocal = 1 / exponent;
        const exponentLiteral = Number.isFinite(reciprocal)
          ? makeLiteral(String(reciprocal))
          : makeBinary("/", makeLiteral("1"), makeLiteral(String(exponent)));
        return solveForTarget(
          expr.left,
          target,
          makeBinary("^", other, exponentLiteral)
        );
      }
      default:
        return ErrorValue.semanticError("Cannot solve: unsupported operator");
    }
  }

  switch (op) {
    case "+":
      return solveForTarget(expr.right, target, makeBinary("-", other, expr.left));
    case "-":
      return solveForTarget(expr.right, target, makeBinary("-", expr.left, other));
    case "*":
      return solveForTarget(expr.right, target, makeBinary("/", other, expr.left));
    case "/":
      return solveForTarget(expr.right, target, makeBinary("/", expr.left, other));
    case "^": {
      const base = extractNumericLiteral(expr.left);
      if (base === null) {
        return ErrorValue.semanticError("Cannot solve: exponent requires constant base");
      }
      return solveForTarget(
        expr.right,
        target,
        makeBinary(
          "/",
          { type: "function", name: "log", args: [other] },
          { type: "function", name: "log", args: [{ type: "literal", value: String(base) }] }
        )
      );
    }
    default:
      return ErrorValue.semanticError("Cannot solve: unsupported operator");
  }
};

const buildSolveTreeFromExpression = (expression: string): SolveExpression | ErrorValue => {
  try {
    const components = parseExpressionComponents(expression);
    return buildSolveExpression(components);
  } catch (error) {
    return ErrorValue.semanticError(
      error instanceof Error ? error.message : String(error)
    );
  }
};

const getEquationCandidates = (
  target: string,
  lineNumber: number,
  equations: EquationEntry[]
): EquationEntry | null => {
    for (let i = equations.length - 1; i >= 0; i -= 1) {
      const equation = equations[i];
      if (equation.line >= lineNumber) continue;
      if (normalizeVariableName(equation.variableName) === normalizeVariableName(target)) {
        return equation;
      }

    const topLevel = splitTopLevelEquation(equation.expression);
    if (topLevel) {
      const leftTree = buildSolveTreeFromExpression(topLevel.left);
      const rightTree = buildSolveTreeFromExpression(topLevel.right);
      const leftHas =
        !isErrorValue(leftTree) && containsTarget(leftTree as SolveExpression, target);
      const rightHas =
        !isErrorValue(rightTree) && containsTarget(rightTree as SolveExpression, target);
      if (leftHas || rightHas) {
        return equation;
      }
      continue;
    }

    const parsed = buildSolveTreeFromExpression(equation.expression);
    if (!isErrorValue(parsed) && containsTarget(parsed as SolveExpression, target)) {
      return equation;
    }
  }
  return null;
};

const makeFraction = (numerator: SolveExpression, denominator: SolveExpression): SolveExpression => ({
  type: "binary",
  op: "/",
  left: numerator,
  right: denominator,
});

const simplifyExponentProduct = (inner: SolveExpression, outer: SolveExpression): SolveExpression => {
  if (outer.type === "binary" && outer.op === "/" && outer.left.type === "literal" && outer.left.value === "1") {
    return makeFraction(inner, outer.right);
  }
  if (outer.type === "literal") {
    const outerNumber = parseArithmeticLiteral(outer.value);
    if (outerNumber !== null && outerNumber !== 0) {
      const reciprocal = 1 / outerNumber;
      const rounded = Math.round(reciprocal);
      if (Math.abs(reciprocal - rounded) < 1e-12 && rounded !== 0) {
        return makeFraction(inner, makeLiteral(String(rounded)));
      }
    }
  }
  return makeBinary("*", inner, outer);
};

const simplifyLog10Power = (expr: SolveExpression): SolveExpression => {
  if (expr.type !== "binary" || expr.op !== "^") return expr;
  if (expr.left.type !== "binary" || expr.left.op !== "^") return expr;
  const base = expr.left.left;
  const innerExp = expr.left.right;
  const outerExp = expr.right;
  if (base.type === "literal" && base.value === "10") {
    const combined = simplifyExponentProduct(innerExp, outerExp);
    return makeBinary("^", base, combined);
  }
  return expr;
};

const simplifySolveExpression = (expr: SolveExpression): SolveExpression => {
  if (expr.type === "binary") {
    const simplifiedLeft = simplifySolveExpression(expr.left);
    const simplifiedRight = simplifySolveExpression(expr.right);
    const rebuilt = makeBinary(expr.op, simplifiedLeft, simplifiedRight);
    if (expr.op === "^") {
      return simplifyLog10Power(rebuilt);
    }
    return rebuilt;
  }
  if (expr.type === "unary") {
    return makeUnary(expr.op, simplifySolveExpression(expr.value));
  }
  if (expr.type === "function") {
    return {
      ...expr,
      args: expr.args.map((arg) => simplifySolveExpression(arg)),
    };
  }
  return expr;
};

const mergeVariableContext = (
  context: EvaluationContext,
  localValues: Map<string, SemanticValue>
): Map<string, import("../state/types").Variable> => {
  const merged = new Map<string, import("../state/types").Variable>();

  context.variableContext.forEach((variable, key) => {
    if (variable.value.getType() === "symbolic") {
      return;
    }
    merged.set(key, variable);
  });

  for (const [key, value] of localValues.entries()) {
    if (value.getType() === "symbolic") {
      continue;
    }
    merged.set(key, {
      name: key,
      value,
      rawValue: value.toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return merged;
};

export class SolveEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    if (!isExpressionNode(node)) return false;
    const expr = (node as ExpressionNode).expression;
    if (isSolveExpression(expr)) return true;
    return isVariableReferenceExpression(expr);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isExpressionNode(node)) return null;
    const exprNode = node as ExpressionNode;
    const rawExpression = exprNode.expression.trim();
    const conversion = isSolveExpression(rawExpression)
      ? null
      : this.extractConversionSuffix(rawExpression);
    const baseExpression = conversion ? conversion.baseExpression : rawExpression;

    if (isSolveExpression(baseExpression)) {
      return this.evaluateExplicitSolve(exprNode, baseExpression, conversion, context);
    }

    if (!isVariableReferenceExpression(baseExpression)) {
      return null;
    }

    const target = normalizeVariableName(baseExpression);
    if (isConstantName(target)) {
      return null;
    }
    if (context.variableContext.has(target)) {
      const existing = context.variableContext.get(target);
      if (existing?.value && existing.value.getType() !== "symbolic") {
        return null;
      }
    }

    return this.evaluateImplicitSolve(exprNode, target, conversion, context);
  }

  private evaluateExplicitSolve(
    node: ExpressionNode,
    baseExpression: string,
    conversion: { baseExpression: string; target: string; keyword: string } | null,
    context: EvaluationContext
  ): RenderNode {
    const parsed = parseSolveExpression(baseExpression);
    if (!parsed) {
      return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
    }

    const target = normalizeVariableName(parsed.target);
    const localValues = new Map<string, SemanticValue>();
    const assignmentEquations: SolveEquation[] = [];
    let targetEquation: SolveEquation | null = null;

    for (const eq of parsed.equations) {
      const leftTree = buildSolveTreeFromExpression(eq.left);
      const rightTree = buildSolveTreeFromExpression(eq.right);
      if (isErrorValue(leftTree) || isErrorValue(rightTree)) {
        return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
      }

      const leftHas = containsTarget(leftTree as SolveExpression, target);
      const rightHas = containsTarget(rightTree as SolveExpression, target);
      if (leftHas || rightHas) {
        if (targetEquation) {
          return this.createErrorNode("Cannot solve: multiple equations for target", node.expression, context.lineNumber);
        }
        targetEquation = eq;
      } else {
        assignmentEquations.push(eq);
      }
    }

    if (!targetEquation) {
      return this.createErrorNode(`Cannot solve: no equation found for "${target}"`, node.expression, context.lineNumber);
    }

    for (const eq of assignmentEquations) {
      const leftTree = buildSolveTreeFromExpression(eq.left);
      if (isErrorValue(leftTree)) {
        return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
      }

      const leftExpression = leftTree as SolveExpression;
      if (leftExpression.type !== "variable") {
        return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
      }

      const leftName = normalizeVariableName(leftExpression.name);
      const value = this.evaluateExpression(eq.right, context, localValues);
      if (SemanticValueTypes.isError(value)) {
        return this.createErrorNode((value as ErrorValue).getMessage(), node.expression, context.lineNumber);
      }
      localValues.set(leftName, value as SemanticValue);
    }

    const solved = this.solveEquation(targetEquation, target, localValues, context);
    if (isErrorValue(solved)) {
      return this.createErrorNode((solved as ErrorValue).getMessage(), node.expression, context.lineNumber);
    }

    return this.formatSolveResult(node, solved as SolveExpression, conversion, context, localValues);
  }

  private evaluateImplicitSolve(
    node: ExpressionNode,
    target: string,
    conversion: { baseExpression: string; target: string; keyword: string } | null,
    context: EvaluationContext
  ): RenderNode {
    const equations = context.equationStore ?? [];
    const equation = getEquationCandidates(target, context.lineNumber, equations);
    if (!equation) {
      return this.createErrorNode(`Cannot solve: no equation found for "${target}"`, node.expression, context.lineNumber);
    }

    const knownValues = this.collectKnownValueAssignments(equations, context, equation.line, target);
    const equationParts = this.buildSolveEquationFromEntry(equation);
    const solved = this.solveEquation(equationParts, target, knownValues, context);
    if (isErrorValue(solved)) {
      return this.createErrorNode((solved as ErrorValue).getMessage(), node.expression, context.lineNumber);
    }

    return this.formatSolveResult(node, solved as SolveExpression, conversion, context, knownValues);
  }

  private buildSolveEquationFromEntry(equation: EquationEntry): SolveEquation {
    if (equation.variableName) {
      return { left: equation.variableName, right: equation.expression };
    }
    const parsed = splitTopLevelEquation(equation.expression);
    if (parsed) {
      return parsed;
    }
    return { left: equation.variableName, right: equation.expression };
  }

  private collectKnownValueAssignments(
    equations: EquationEntry[],
    context: EvaluationContext,
    excludeLine: number,
    target: string
  ): Map<string, SemanticValue> {
    const knownValues = new Map<string, SemanticValue>();

    for (const equation of equations) {
      if (equation.line >= context.lineNumber || equation.line === excludeLine) {
        continue;
      }

      const parsed = splitTopLevelEquation(equation.expression);
      if (!parsed) {
        continue;
      }

      const normalizedLeft = normalizeVariableName(parsed.left);
      if (normalizedLeft === target) {
        continue;
      }
      if (containsTarget(buildSolveTreeFromExpression(parsed.right) as SolveExpression, target)) {
        continue;
      }

      const value = this.evaluateExpression(parsed.right, context, knownValues);
      if (SemanticValueTypes.isError(value) || SemanticValueTypes.isSymbolic(value)) {
        continue;
      }

      knownValues.set(normalizedLeft, value as SemanticValue);
    }

    return knownValues;
  }

  private solveEquation(
    equation: SolveEquation,
    target: string,
    localValues: Map<string, SemanticValue>,
    context: EvaluationContext
  ): SolveExpression | ErrorValue {
    const leftTree = buildSolveTreeFromExpression(equation.left);
    const rightTree = buildSolveTreeFromExpression(equation.right);

    if (isErrorValue(leftTree) || isErrorValue(rightTree)) {
      return ErrorValue.semanticError("Cannot solve: equation is not valid");
    }

    const constants = buildNumericConstants(context, localValues, target);
    const left = substituteNumericConstants(
      leftTree as SolveExpression,
      constants,
      target
    );
    const right = substituteNumericConstants(
      rightTree as SolveExpression,
      constants,
      target
    );
    const leftHas = containsTarget(left, target);
    const rightHas = containsTarget(right, target);

    if (leftHas && rightHas) {
      return ErrorValue.semanticError("Cannot solve: variable appears on both sides");
    }

    if (!leftHas && !rightHas) {
      return ErrorValue.semanticError(`Cannot solve: no equation found for "${target}"`);
    }

    if (leftHas) {
      return solveForTarget(left, target, right);
    }

    return solveForTarget(right, target, left);
  }

  private formatSolveResult(
    node: ExpressionNode,
    solved: SolveExpression,
    conversion: { baseExpression: string; target: string; keyword: string } | null,
    context: EvaluationContext,
    localValues: Map<string, SemanticValue>
  ): RenderNode {
    const simplifiedExpression = simplifySolveExpression(solved);
    if (containsNegativeRadicand(simplifiedExpression)) {
      return this.createMathResultNode(
        node.expression,
        "⚠️ Cannot solve: no real solution",
        context.lineNumber
      );
    }
    const expressionText = formatSolveExpression(simplifiedExpression);
    const displayOptions = this.getDisplayOptions(context);

    const value = this.evaluateExpression(expressionText, context, localValues);
    if (SemanticValueTypes.isError(value)) {
      const containsIdentifier = /[a-zA-Z]/.test(expressionText);
      if (containsIdentifier) {
        const substituted = this.substituteKnownValues(expressionText, context, localValues, displayOptions);
        return this.createMathResultNode(
          node.expression,
          conversion ? `${substituted} ${conversion.keyword} ${conversion.target}` : substituted,
          context.lineNumber
        );
      }
      return this.createErrorNode((value as ErrorValue).getMessage(), node.expression, context.lineNumber);
    }

    let resolved = value as SemanticValue;
    if (SemanticValueTypes.isSymbolic(resolved)) {
      const substituted = this.substituteKnownValues(expressionText, context, localValues, displayOptions);
      const resultText = conversion
        ? `${substituted} ${conversion.keyword} ${conversion.target}`
        : substituted;
      return this.createMathResultNode(node.expression, resultText, context.lineNumber);
    }
    if (conversion) {
      resolved = this.applyUnitConversion(resolved, conversion.target, conversion.keyword);
      if (SemanticValueTypes.isError(resolved)) {
        return this.createErrorNode((resolved as ErrorValue).getMessage(), node.expression, context.lineNumber);
      }
    }

    return this.createMathResultNode(
      node.expression,
      resolved.toString(displayOptions),
      context.lineNumber
    );
  }

  private evaluateExpression(
    expression: string,
    context: EvaluationContext,
    localValues: Map<string, SemanticValue>
  ): SemanticValue {
    const parsedLiteral = SemanticParsers.parse(expression.trim());
    if (parsedLiteral && !SemanticValueTypes.isError(parsedLiteral)) {
      return parsedLiteral;
    }

    const mergedContext: EvaluationContext = {
      ...context,
      variableContext: mergeVariableContext(context, localValues),
      implicitUnitSymbols: false,
    };

    const components = parseExpressionComponents(expression);
    const componentResult = SimpleExpressionParser.parseComponents(components, mergedContext);
    if (componentResult) {
      return componentResult;
    }

    const arithmeticResult = SimpleExpressionParser.parseArithmetic(expression, mergedContext);
    if (arithmeticResult) {
      return arithmeticResult;
    }

    const evalResult = parseAndEvaluateExpression(expression, mergedContext.variableContext);
    if (evalResult.error) {
      return ErrorValue.semanticError(evalResult.error);
    }
    return NumberValue.from(evalResult.value);
  }

  private substituteKnownValues(
    expression: string,
    context: EvaluationContext,
    localValues: Map<string, SemanticValue>,
    displayOptions: DisplayOptions
  ): string {
    const substitutions = new Map<string, string>();
    const formatValue = (value: SemanticValue): string => {
      const formatted = value.toString(displayOptions);
      if (/[+\-*/^]/.test(formatted)) {
        return `(${formatted})`;
      }
      return formatted;
    };
    const addValue = (name: string, value: SemanticValue) => {
      if (SemanticValueTypes.isSymbolic(value) || SemanticValueTypes.isError(value)) {
        return;
      }
      substitutions.set(normalizeVariableName(name), formatValue(value));
    };

    context.variableContext.forEach((variable, name) => {
      const value = variable.value;
      if (value) {
        addValue(name, value);
      }
    });

    localValues.forEach((value, name) => {
      addValue(name, value);
    });

    if (substitutions.size === 0) {
      return expression;
    }

    const names = Array.from(substitutions.keys()).sort((a, b) => b.length - a.length);
    const isBoundary = (char: string | undefined) => !char || /[\s+\-*/^%()=<>!,]/.test(char);

    let result = "";
    let pos = 0;
    while (pos < expression.length) {
      let replaced = false;
      for (const name of names) {
        if (!expression.startsWith(name, pos)) {
          continue;
        }
        const before = pos > 0 ? expression[pos - 1] : undefined;
        const after = pos + name.length < expression.length ? expression[pos + name.length] : undefined;
        if (isBoundary(before) && isBoundary(after)) {
          result += substitutions.get(name);
          pos += name.length;
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        result += expression[pos];
        pos += 1;
      }
    }

    return result;
  }

  private extractConversionSuffix(
    expression: string
  ): { baseExpression: string; target: string; keyword: string } | null {
    return extractConversionSuffix(expression);
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
        const fallback = attemptPerUnitConversion(value as UnitValue, {
          unit: parsed.unit,
          scale: 1,
          displayUnit: parsed.unit,
        });
        if (fallback) {
          return fallback;
        }
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

  private createMathResultNode(
    expression: string,
    result: string,
    lineNumber: number
  ): MathResultRenderNode {
    return {
      type: "mathResult",
      expression,
      result,
      displayText: `${expression} => ${result}`,
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
      originalRaw: `${expression} =>`,
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

export const defaultSolveEvaluator = new SolveEvaluator();
