import { all, create, MathJsStatic } from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Algebra";
import "nerdamer/Calculus";
import "nerdamer/Solve";
import {
  ASTNode,
  isCombinedAssignmentNode,
  isExpressionNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import {
  ComplexValue,
  ErrorValue,
  ListValue,
  MatrixValue,
  NumberValue,
  SemanticParsers,
  SemanticValue,
  SemanticValueTypes,
  SymbolicValue,
} from "../types";
import { EvaluationContext, NodeEvaluator } from "./registry";
import {
  CombinedRenderNode,
  ErrorRenderNode,
  MathResultRenderNode,
  RenderNode,
  VariableRenderNode,
} from "./renderNodes";

type SupportedNode = Extract<
  ASTNode,
  { type: "expression" | "variableAssignment" | "combinedAssignment" }
>;

type SymbolicOperation =
  | { kind: "simplify" | "expand" | "factor"; expression: string }
  | { kind: "derive" | "integrate" | "roots"; expression: string; variable: string }
  | { kind: "substitute"; expression: string; variable: string; replacement: string };

const math: MathJsStatic = create(all, {
  number: "number",
  precision: 14,
  relTol: 1e-12,
  absTol: 1e-12,
});

const ADVANCED_FUNCTION_PATTERN =
  /\b(?:complex|conj|arg|re|im|transpose|det|inv|trace|eigenvalues|eigs|linsolve|lusolve|rows|cols|simplify|expand|factor|derive|derivative|diff|integrate|roots|substitute)\s*\(/i;
const SYMBOLIC_COMMAND_PATTERN =
  /^\s*(?:simplify|expand|factor|derive|derivative|differentiate|integrate|roots|substitute)\b/i;
const MATRIX_LITERAL_PATTERN = /^\s*\[\s*(?:\[|[^\]]+;)/;
const COMPLEX_LITERAL_PATTERN = /(?:\d|\))\s*i\b|\bi\s*(?:[+\-*/^)]|$)/i;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const displayOptions = (context: EvaluationContext) => ({
  precision: context.decimalPlaces,
  scientificUpperThreshold: context.scientificUpperThreshold,
  scientificLowerThreshold: context.scientificLowerThreshold,
  scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
  groupThousands: context.groupThousands,
});

const expressionForNode = (node: SupportedNode): string => {
  if (isExpressionNode(node) || isCombinedAssignmentNode(node)) return node.expression;
  return node.rawValue;
};

const splitTopLevelArguments = (input: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of input) {
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const parseFunctionCall = (input: string): { name: string; args: string[] } | null => {
  const match = input.trim().match(/^([A-Za-z]+)\s*\((.*)\)$/s);
  if (!match) return null;
  return { name: match[1].toLowerCase(), args: splitTopLevelArguments(match[2]) };
};

const parseSymbolicOperation = (input: string): SymbolicOperation | null => {
  const trimmed = input.trim();
  const call = parseFunctionCall(trimmed);
  if (call) {
    if (["simplify", "expand", "factor"].includes(call.name) && call.args.length === 1) {
      return { kind: call.name as "simplify" | "expand" | "factor", expression: call.args[0] };
    }
    if (["derive", "derivative", "diff", "integrate", "roots"].includes(call.name) && call.args.length === 2) {
      const normalizedKind = ["derive", "derivative", "diff"].includes(call.name)
        ? "derive"
        : call.name;
      return {
        kind: normalizedKind as "derive" | "integrate" | "roots",
        expression: call.args[0],
        variable: call.args[1].trim(),
      };
    }
    if (call.name === "substitute" && call.args.length === 3) {
      return {
        kind: "substitute",
        expression: call.args[0],
        variable: call.args[1].trim(),
        replacement: call.args[2],
      };
    }
  }

  const unary = trimmed.match(/^(simplify|expand|factor)\s+(.+)$/i);
  if (unary) {
    return {
      kind: unary[1].toLowerCase() as "simplify" | "expand" | "factor",
      expression: unary[2].trim(),
    };
  }
  const byVariable = trimmed.match(
    /^(derive|derivative|differentiate|integrate|roots)\s+(.+)\s+by\s+([A-Za-z_][A-Za-z0-9_]*)$/i
  );
  if (byVariable) {
    const command = byVariable[1].toLowerCase();
    return {
      kind: ["derive", "derivative", "differentiate"].includes(command)
        ? "derive"
        : (command as "integrate" | "roots"),
      expression: byVariable[2].trim(),
      variable: byVariable[3],
    };
  }
  return null;
};

const substituteKnownSymbolicValues = (
  expression: string,
  context: EvaluationContext,
  excluded: string[] = []
): string => {
  let output = expression;
  const excludedNames = new Set(excluded.map((name) => name.trim().toLowerCase()));
  const variables = Array.from(context.variableContext.values())
    .filter((variable) =>
      variable.value instanceof SymbolicValue &&
      !excludedNames.has(variable.name.toLowerCase())
    )
    .sort((left, right) => right.name.length - left.name.length);
  variables.forEach((variable) => {
    output = output.replace(
      new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(variable.name)}(?=$|[^A-Za-z0-9_])`, "g"),
      (_match, prefix) => `${prefix}(${variable.value.toString()})`
    );
  });
  return output;
};

const formatSymbolic = (value: string): string => {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/\+\-/g, "-")
    .trim();
  try {
    return math.parse(normalized).toString();
  } catch {
    return normalized;
  }
};

const evaluateSymbolic = (
  operation: SymbolicOperation,
  context: EvaluationContext
): SemanticValue | ErrorValue => {
  try {
    const excluded = "variable" in operation ? [operation.variable] : [];
    const expression = substituteKnownSymbolicValues(operation.expression, context, excluded);
    let result: string;
    switch (operation.kind) {
      case "simplify":
        result = nerdamer(expression).toString();
        break;
      case "expand":
        result = nerdamer(`expand(${expression})`).toString();
        break;
      case "factor":
        result = nerdamer(`factor(${expression})`).toString();
        break;
      case "derive":
        result = nerdamer(`diff(${expression},${operation.variable})`).toString();
        break;
      case "integrate":
        result = nerdamer(`integrate(${expression},${operation.variable})`).toString();
        break;
      case "roots": {
        const equation = expression.includes("=") ? expression : `${expression}=0`;
        result = nerdamer(`solve(${equation},${operation.variable})`).toString();
        const listBody = result.startsWith("[") && result.endsWith("]")
          ? result.slice(1, -1)
          : result;
        const parsed = SemanticParsers.parse(listBody);
        return parsed || SymbolicValue.from(formatSymbolic(result));
      }
      case "substitute":
        result = nerdamer(expression).sub(operation.variable, operation.replacement).toString();
        break;
    }
    return SymbolicValue.from(formatSymbolic(result));
  } catch (error) {
    return ErrorValue.semanticError(
      `Symbolic math: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

const toMathValue = (value: SemanticValue): any => {
  if (value instanceof NumberValue) return value.getNumericValue();
  if (value instanceof ComplexValue) return math.complex(value.getReal(), value.getImaginary());
  if (value instanceof MatrixValue) {
    return math.matrix(
      value.getRows().map((row) =>
        row.map((entry) =>
          entry instanceof ComplexValue
            ? math.complex(entry.getReal(), entry.getImaginary())
            : entry.getNumericValue()
        )
      )
    );
  }
  if (value instanceof ListValue) {
    return value.getItems().map((entry) => toMathValue(entry));
  }
  if (value.isNumeric()) return value.getNumericValue();
  return undefined;
};

const normalizeExpressionAndScope = (
  expression: string,
  context: EvaluationContext
): { expression: string; scope: Record<string, any> } => {
  let normalized = expression;
  const scope: Record<string, any> = {};
  const variables = Array.from(context.variableContext.values())
    .filter((variable) =>
      variable.value instanceof MatrixValue ||
      variable.value instanceof ComplexValue ||
      variable.value instanceof ListValue ||
      variable.value instanceof NumberValue
    )
    .sort((left, right) => right.name.length - left.name.length);
  variables.forEach((variable, index) => {
    const mathValue = toMathValue(variable.value);
    if (mathValue === undefined) return;
    const placeholder = `__sp_advanced_${index}`;
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9_.])${escapeRegExp(variable.name)}(?=$|[^A-Za-z0-9_.])`,
      "g"
    );
    let replaced = false;
    normalized = normalized.replace(pattern, (_match, prefix) => {
      replaced = true;
      return `${prefix}${placeholder}`;
    });
    if (replaced) scope[placeholder] = mathValue;
  });
  return { expression: normalized, scope };
};

const normalizeSmallNumber = (value: number): number =>
  Math.abs(value) < 1e-12 ? 0 : value;

const fromMathValue = (value: any): SemanticValue | ErrorValue => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return ErrorValue.runtimeError("Advanced math produced a non-finite result");
    return NumberValue.from(normalizeSmallNumber(value));
  }
  if (value && typeof value.re === "number" && typeof value.im === "number") {
    return ComplexValue.from(normalizeSmallNumber(value.re), normalizeSmallNumber(value.im));
  }

  const array = value && typeof value.toArray === "function" ? value.toArray() : value;
  if (Array.isArray(array)) {
    if (array.length === 0) return ListValue.fromItems([]);
    if (!Array.isArray(array[0])) {
      const items = array.map((entry) => fromMathValue(entry));
      const error = items.find((entry) => SemanticValueTypes.isError(entry));
      return error || ListValue.fromItems(items as SemanticValue[]);
    }
    try {
      return MatrixValue.fromNumbers(
        array.map((row: any[]) =>
          row.map((entry) =>
            typeof entry === "number"
              ? normalizeSmallNumber(entry)
              : { re: normalizeSmallNumber(entry.re), im: normalizeSmallNumber(entry.im) }
          )
        )
      );
    } catch (error) {
      return ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
    }
  }
  return ErrorValue.semanticError("Advanced math returned an unsupported value");
};

const evaluateNumericAdvanced = (
  rawExpression: string,
  context: EvaluationContext
): SemanticValue | ErrorValue => {
  const normalized = normalizeExpressionAndScope(rawExpression, context);
  const call = parseFunctionCall(normalized.expression);
  try {
    if (call?.name === "rows" || call?.name === "cols") {
      const target = math.evaluate(call.args[0], normalized.scope) as any;
      const size = typeof target?.size === "function" ? target.size() : math.size(target).valueOf();
      return NumberValue.from(call.name === "rows" ? size[0] : size[1] ?? 1);
    }
    if (call?.name === "eigenvalues" || call?.name === "eigs") {
      const target = math.evaluate(call.args[0], normalized.scope) as any;
      const eigen = (math as any).eigs(target);
      return fromMathValue(eigen.values);
    }
    const expression = normalized.expression.replace(/\blinsolve\s*\(/gi, "lusolve(");
    return fromMathValue(math.evaluate(expression, normalized.scope));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return ErrorValue.semanticError(`Advanced math: ${message}`);
  }
};

const isAdvancedExpression = (expression: string, context: EvaluationContext): boolean => {
  if (SYMBOLIC_COMMAND_PATTERN.test(expression)) return true;
  if (ADVANCED_FUNCTION_PATTERN.test(expression)) return true;
  if (MATRIX_LITERAL_PATTERN.test(expression)) return true;
  if (COMPLEX_LITERAL_PATTERN.test(expression)) return true;
  return Array.from(context.variableContext.values()).some((variable) => {
    if (!(variable.value instanceof MatrixValue) && !(variable.value instanceof ComplexValue)) {
      return false;
    }
    return new RegExp(
      `(^|[^A-Za-z0-9_.])${escapeRegExp(variable.name)}(?=$|[^A-Za-z0-9_.])`
    ).test(expression);
  });
};

const createError = (node: SupportedNode, value: ErrorValue): ErrorRenderNode => ({
  type: "error",
  line: node.line,
  originalRaw: node.raw,
  error: value.toString(),
  errorType: "semantic",
  displayText: `⚠️ ${value.toString()}`,
  livePreview: !node.raw.includes("=>"),
});

export class AdvancedMathEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isExpressionNode(node) || isVariableAssignmentNode(node) || isCombinedAssignmentNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isExpressionNode(node) && !isVariableAssignmentNode(node) && !isCombinedAssignmentNode(node)) {
      return null;
    }
    const expression = expressionForNode(node);
    if (!isAdvancedExpression(expression, context)) return null;

    const symbolic = parseSymbolicOperation(expression);
    const value = symbolic
      ? evaluateSymbolic(symbolic, context)
      : evaluateNumericAdvanced(expression, context);
    if (SemanticValueTypes.isError(value)) return createError(node, value as ErrorValue);

    const result = value.toString(displayOptions(context));
    if (isVariableAssignmentNode(node)) {
      context.variableStore.setVariableWithSemanticValue(node.variableName, value, node.rawValue);
      return {
        type: "variable",
        line: node.line,
        originalRaw: node.raw,
        variableName: node.variableName,
        value: result,
        displayText: `${node.variableName} = ${result}`,
      } as VariableRenderNode;
    }
    if (isCombinedAssignmentNode(node)) {
      context.variableStore.setVariableWithSemanticValue(node.variableName, value, node.expression);
      return {
        type: "combined",
        line: node.line,
        originalRaw: node.raw,
        variableName: node.variableName,
        expression: node.expression,
        result,
        displayText: `${node.variableName} = ${node.expression} => ${result}`,
      } as CombinedRenderNode;
    }
    return {
      type: "mathResult",
      line: node.line,
      originalRaw: node.raw,
      expression: node.expression,
      result,
      displayText: `${node.expression} => ${result}`,
    } as MathResultRenderNode;
  }
}

export const defaultAdvancedMathEvaluator = new AdvancedMathEvaluator();
