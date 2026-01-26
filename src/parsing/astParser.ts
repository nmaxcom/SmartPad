/**
 * AST Parser for SmartPad
 *
 * This module parses individual lines of text into structured AST nodes.
 * It uses the existing parsing functions but outputs structured AST nodes instead of ad-hoc objects.
 * 
 * Updated to support semantic types - values are parsed into SemanticValue instances
 * during the parsing phase, eliminating the need for type guessing during evaluation.
 */

import {
  ASTNode,
  PlainTextNode,
  CommentNode,
  ViewDirectiveNode,
  VariableAssignmentNode,
  ExpressionNode,
  CombinedAssignmentNode,
  ErrorNode,
  FunctionDefinitionNode,
} from "./ast";
import {
  parseVariableAssignment,
  parseVariableAssignmentWithOptionalEvaluation,
} from "./variableParser";
import { needsExpressionEvaluation, isVariableAssignmentWithEvaluation } from "./expressionParser";
import { SemanticParsers, ErrorValue, SemanticValueTypes } from "../types";
import { validateExpressionTypes } from "./typeResolver";
import { parseExpressionComponents } from "./expressionComponents";
import { looksLikeDateExpression } from "../date/dateMath";
import { containsRangeOperatorOutsideString } from "../utils/rangeExpression";
import { splitTopLevelCommas } from "../utils/listExpression";

/**
 * Parse a single line of text into an AST node
 * @param line The raw text line to parse
 * @param lineNumber The line number (1-based) for debugging
 * @returns An AST node representing the parsed line
 */
export function parseLine(line: string, lineNumber: number = 1): ASTNode {
  const trimmedLine = line.trim();

  // Handle empty lines as plain text
  if (trimmedLine === "") {
    return createPlainTextNode(line, lineNumber);
  }

  // Handle comments: lines starting with # (markdown-style)
  if (trimmedLine.startsWith("#")) {
    return createCommentNode(line, lineNumber);
  }

  // Handle view directives
  if (trimmedLine.startsWith("@view")) {
    return parseViewDirective(trimmedLine, line, lineNumber);
  }

  try {
    // Check for function definitions before variable assignments
    const functionDef = parseFunctionDefinition(trimmedLine, line, lineNumber);
    if (functionDef) {
      return functionDef;
    }

    // Check for explicit solve expressions before variable assignments
    if (/^solve\b/i.test(trimmedLine)) {
      if (needsExpressionEvaluation(trimmedLine)) {
        return parseExpression(line, lineNumber);
      }
    }

    // Check for variable assignment first (with or without =>)
    // This follows the principle: assignment is assignment, => is just "show result"
    const varParseResult = parseVariableAssignmentWithOptionalEvaluation(trimmedLine);
    
    if (varParseResult.isValid && varParseResult.variableName) {
      if (varParseResult.showResult) {
        // Variable assignment with => (show result)
        return createCombinedAssignmentNode(
          varParseResult.variableName,
          varParseResult.expression || "",
          line,
          lineNumber
        );
      } else {
        // Variable assignment without => (just store)
        const rawValue = varParseResult.rawValue || varParseResult.value?.toString() || "";
        return createVariableAssignmentNode(
          varParseResult.variableName,
          rawValue,
          line,
          lineNumber
        );
      }
    }

    // Check for expression evaluation (non-assignment expressions)
    // Pattern: expression =>
    if (needsExpressionEvaluation(trimmedLine)) {
      return parseExpression(line, lineNumber);
    }

    // Default to plain text
    return createPlainTextNode(line, lineNumber);
  } catch (error) {
    return createErrorNode(
      `Parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "parse",
      line,
      lineNumber
    );
  }
}

/**
 * Parse a combined assignment line: variableName = expression =>
 */
function parseCombinedAssignment(
  line: string,
  lineNumber: number
): CombinedAssignmentNode | ErrorNode {
  try {
    const arrowIndex = line.indexOf("=>");
    if (arrowIndex === -1) {
      return createErrorNode("Missing => in combined assignment", "syntax", line, lineNumber);
    }

    const assignmentPart = line.substring(0, arrowIndex).trim();
    const equalsIndex = assignmentPart.indexOf("=");

    if (equalsIndex === -1) {
      return createErrorNode("Missing = in combined assignment", "syntax", line, lineNumber);
    }

    const variableName = assignmentPart.substring(0, equalsIndex).trim();
    const expression = assignmentPart.substring(equalsIndex + 1).trim();

    if (!variableName) {
      return createErrorNode(
        "Missing variable name in combined assignment",
        "syntax",
        line,
        lineNumber
      );
    }

    if (!expression) {
      return createErrorNode(
        "Missing expression in combined assignment",
        "syntax",
        line,
        lineNumber
      );
    }

    return createCombinedAssignmentNode(variableName, expression, line, lineNumber);
  } catch (error) {
    return createErrorNode(
      `Combined assignment parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "parse",
      line,
      lineNumber
    );
  }
}

/**
 * Parse an expression line: expression => or unit expression
 */
function parseExpression(line: string, lineNumber: number): ExpressionNode | ErrorNode {
  try {
    const arrowIndex = line.indexOf("=>");

    if (arrowIndex === -1) {
      // For expressions without =>, treat the entire line as the expression
      // This handles unit expressions like "100 ft to m", "PI", etc.
      const expression = line.trim();
      if (!expression) {
        return createErrorNode("Empty expression", "syntax", line, lineNumber);
      }
      return createExpressionNode(expression, line, lineNumber);
    }

    const expression = line.substring(0, arrowIndex).trim();

    if (!expression) {
      return createErrorNode("Missing expression before =>", "syntax", line, lineNumber);
    }

    return createExpressionNode(expression, line, lineNumber);
  } catch (error) {
    return createErrorNode(
      `Expression parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "parse",
      line,
      lineNumber
    );
  }
}

/**
 * Parse a view directive line: @view <kind> key=value ...
 */
function parseViewDirective(
  trimmedLine: string,
  rawLine: string,
  lineNumber: number
): ViewDirectiveNode | ErrorNode {
  try {
    const parts = trimmedLine.split(/\s+/).filter(Boolean);
    if (parts.length === 0 || parts[0] !== "@view") {
      return createErrorNode("Invalid view directive", "syntax", rawLine, lineNumber);
    }

    let kind = "plot";
    let paramStart = 1;
    if (parts[1] && !parts[1].includes("=")) {
      kind = parts[1];
      paramStart = 2;
    }

    const params: Record<string, string> = {};
    const remainder = parts.slice(paramStart).join(" ");
    const keyRegex = /(\w+)=/g;
    const matches = Array.from(remainder.matchAll(keyRegex));
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const key = match[1];
      if (!key) continue;
      const valueStart = (match.index ?? 0) + match[0].length;
      const valueEnd = i + 1 < matches.length ? (matches[i + 1].index ?? remainder.length) : remainder.length;
      let value = remainder.slice(valueStart, valueEnd).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!value) continue;
      params[key] = value;
    }

    return createViewDirectiveNode(kind, params, rawLine, lineNumber);
  } catch (error) {
    return createErrorNode(
      `View directive parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "parse",
      rawLine,
      lineNumber
    );
  }
}

/**
 * Factory functions for creating AST nodes
 */
function createPlainTextNode(raw: string, line: number): PlainTextNode {
  return {
    type: "plainText",
    line,
    raw,
    content: raw,
  };
}

function createCommentNode(raw: string, line: number): CommentNode {
  return {
    type: "comment",
    line,
    raw,
    content: raw,
  };
}

function createViewDirectiveNode(
  kind: string,
  params: Record<string, string>,
  raw: string,
  line: number
): ViewDirectiveNode {
  return {
    type: "viewDirective",
    line,
    raw,
    kind,
    params,
  };
}

function createVariableAssignmentNode(
  variableName: string,
  rawValue: string,
  raw: string,
  line: number
): VariableAssignmentNode {
  try {
    // Parse the raw value into a semantic value during AST creation
    const parsedValue = SemanticParsers.parseOrError(rawValue);
    
    return {
      type: "variableAssignment",
      line,
      raw,
      variableName,
      rawValue,
      parsedValue,
    };
  } catch (error) {
    // If there's an error, we'll create an error node instead
    throw error;
  }
}

function createExpressionNode(expression: string, raw: string, line: number): ExpressionNode | ErrorNode {
  try {
    const hasTrigger = raw.includes("=>");
    if (!hasTrigger && containsTopLevelEquation(expression)) {
      return {
        type: "expression",
        line,
        raw,
        expression,
        components: [],
      };
    }
    const isPercentageExpression =
      /%/.test(expression) ||
      /\bof\b/.test(expression) ||
      /\bon\b/.test(expression) ||
      /\boff\b/.test(expression) ||
      /\bas\s+%/.test(expression) ||
      /\bis\s+%/.test(expression);

    const parsedLiteral = SemanticParsers.parse(expression);
    if (parsedLiteral && SemanticValueTypes.isError(parsedLiteral)) {
      if (hasTrigger) {
        return createErrorNode(
          (parsedLiteral as ErrorValue).getMessage(),
          "semantic",
          raw,
          line
        );
      }
    }
    const isListLiteral = parsedLiteral && parsedLiteral.getType() === "list";
    const normalizedExpression = normalizeExponentUnitSuffix(
      normalizeTrailingUnitSuffix(expression)
    );
    const expressionForComponents = stripConversionSuffix(normalizedExpression);

    // Parse the expression into a component tree if it's not a raw list literal
    let components: ReturnType<typeof parseExpressionComponents> = [];
    const isCommaList = splitTopLevelCommas(expressionForComponents).length > 1;
    if (!isListLiteral) {
      try {
        if (!isCommaList) {
          components = parseExpressionComponents(expressionForComponents);
        }
      } catch (error) {
        if (
          hasTrigger &&
          !isPercentageExpression &&
          !looksLikeDateExpression(expression) &&
          !containsRangeOperatorOutsideString(expression)
        ) {
          throw error;
        }
      }
    }

    // Validate types early (without variable context yet)
    const hasFunction = components.some((component) => component.type === "function");
    if (
      hasTrigger &&
      !isPercentageExpression &&
      !hasFunction &&
      components.length > 0 &&
      !looksLikeDateExpression(normalizedExpression)
    ) {
      const typeError = validateExpressionTypes(components, new Map(), undefined, {
        allowUnknownVariables: true,
      });
      if (typeError) {
        return createErrorNode(typeError.getMessage(), "semantic", raw, line);
      }
    }

    return {
      type: "expression",
      line,
      raw,
      expression,
      components,
    };
  } catch (error) {
    return createErrorNode(
      `Expression parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "parse",
      raw,
      line
    );
  }
}

function createCombinedAssignmentNode(
  variableName: string,
  expression: string,
  raw: string,
  line: number
): CombinedAssignmentNode | ErrorNode {
  try {
    const isPercentageExpression =
      /%/.test(expression) ||
      /\bof\b/.test(expression) ||
      /\bon\b/.test(expression) ||
      /\boff\b/.test(expression) ||
      /\bas\s+%/.test(expression) ||
      /\bis\s+%/.test(expression);

    const parsedLiteral = SemanticParsers.parse(expression);
    if (parsedLiteral && SemanticValueTypes.isError(parsedLiteral)) {
      return createErrorNode(
        (parsedLiteral as ErrorValue).getMessage(),
        "semantic",
        raw,
        line
      );
    }
    const isListLiteral = parsedLiteral && parsedLiteral.getType() === "list";
    const normalizedExpression = normalizeExponentUnitSuffix(
      normalizeTrailingUnitSuffix(expression)
    );
    const expressionForComponents = stripConversionSuffix(normalizedExpression);

    // Parse the expression into a component tree
    let components: ReturnType<typeof parseExpressionComponents> = [];
    const isCommaList = splitTopLevelCommas(expressionForComponents).length > 1;
    if (!isListLiteral) {
      try {
        if (!isCommaList) {
          components = parseExpressionComponents(expressionForComponents);
        }
      } catch (error) {
        if (
          !isPercentageExpression &&
          !looksLikeDateExpression(expression) &&
          !containsRangeOperatorOutsideString(expression)
        ) {
          throw error;
        }
      }
    }
    
    // Validate types early (without variable context yet)
    const hasFunction = components.some((component) => component.type === "function");
    if (!isPercentageExpression && !hasFunction && components.length > 0 && !looksLikeDateExpression(expression)) {
      const typeError = validateExpressionTypes(components, new Map(), undefined, {
        allowUnknownVariables: true,
      });
      if (typeError) {
        return createErrorNode(typeError.getMessage(), "semantic", raw, line);
      }
    }

    return {
      type: "combinedAssignment",
      line,
      raw,
      variableName,
      expression,
      components,
    };
  } catch (error) {
    return createErrorNode(
      `Combined assignment parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "parse",
      raw,
      line
    );
  }
}

function createErrorNode(
  error: string,
  errorType: "parse" | "syntax" | "semantic",
  raw: string,
  line: number
): ErrorNode {
  return {
    type: "error",
    line,
    raw,
    error,
    errorType,
  };
}

function stripConversionSuffix(expression: string): string {
  const match = expression.match(/\b(to|in)\b\s+.+$/i);
  if (!match || match.index === undefined) {
    return expression;
  }
  const base = expression.slice(0, match.index).trim();
  return base || expression;
}

function normalizeExponentUnitSuffix(expression: string): string {
  const pattern =
    /\^([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(\s*[A-Za-z°µμΩ$€£¥₹₿][A-Za-z0-9°µμΩ$€£¥₹₿\/\^\*\-]*)/g;
  return expression.replace(pattern, (match, exponent, suffix) => {
    const cleanSuffix = suffix.trim();
    return `^${exponent} * 1 ${cleanSuffix}`;
  });
}

function normalizeTrailingUnitSuffix(expression: string): string {
  const trimmed = expression.trim();
  if (!trimmed) return expression;

  const match = trimmed.match(/^(.*?)([A-Za-z°µμΩ][A-Za-z0-9°µμΩ\/\^\-\*\·]*)$/);
  if (!match) return expression;

  const before = match[1].trimEnd();
  const unitStr = match[2];
  if (!before) return expression;
  if (/\s$/.test(match[1])) {
    return expression;
  }

  if (/[A-Za-z°µμΩ]/.test(before)) {
    return expression;
  }

  if (/[+\-*/^%]$/.test(before)) {
    return expression;
  }

  if (/^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(before.trim())) {
    return expression;
  }

  const parsed = SemanticParsers.parse(`1${unitStr}`);
  if (!parsed || parsed.getType() !== "unit") {
    return expression;
  }

  return `(${before}) * 1 ${unitStr}`;
}

function containsTopLevelEquation(input: string): boolean {
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (char === "=" && depth === 0) {
      const prev = input[i - 1];
      const next = input[i + 1];
      if (prev === ">" || prev === "<" || prev === "=" || prev === "!") {
        continue;
      }
      if (next === "=") {
        continue;
      }
      return true;
    }
  }
  return false;
}

function parseFunctionDefinition(
  trimmedLine: string,
  raw: string,
  line: number
): FunctionDefinitionNode | ErrorNode | null {
  if (!trimmedLine.includes("(") || !trimmedLine.includes("=") || trimmedLine.includes("=>")) {
    return null;
  }

  const assignment = splitTopLevelAssignment(trimmedLine);
  if (!assignment) return null;
  const { left, right } = assignment;
  if (!left || !right) return null;

  const signatureMatch = left.match(/^([a-zA-Z][a-zA-Z0-9\s_]*)\s*\((.*)\)$/);
  if (!signatureMatch) return null;

  const functionName = signatureMatch[1].trim();
  const paramsRaw = signatureMatch[2].trim();
  const expression = right.trim();

  if (!expression) {
    return createErrorNode("Missing function body", "syntax", raw, line);
  }

  const paramsResult = parseFunctionParams(paramsRaw, raw, line);
  if (paramsResult && (paramsResult as ErrorNode).type === "error") {
    return paramsResult as ErrorNode;
  }

  let components: ReturnType<typeof parseExpressionComponents> = [];
  try {
    components = parseExpressionComponents(expression);
  } catch (error) {
    return createErrorNode(
      `Function body parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "parse",
      raw,
      line
    );
  }

  return {
    type: "functionDefinition",
    line,
    raw,
    functionName,
    params: paramsResult as FunctionDefinitionNode["params"],
    expression,
    components,
  };
}

function splitTopLevelAssignment(line: string): { left: string; right: string } | null {
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "=" && depth === 0) {
      return {
        left: line.substring(0, i).trim(),
        right: line.substring(i + 1).trim(),
      };
    }
  }
  return null;
}

function parseFunctionParams(
  paramsRaw: string,
  raw: string,
  line: number
): FunctionDefinitionNode["params"] | ErrorNode {
  if (!paramsRaw) return [];

  const params: FunctionDefinitionNode["params"] = [];
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < paramsRaw.length; i++) {
    const char = paramsRaw[i];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    parts.push(current);
  }

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const equalsIndex = trimmed.indexOf("=");
    const name = (equalsIndex === -1 ? trimmed : trimmed.substring(0, equalsIndex)).trim();
    const defaultExpression =
      equalsIndex === -1 ? undefined : trimmed.substring(equalsIndex + 1).trim();

    if (!/^[a-zA-Z][a-zA-Z0-9\s_]*$/.test(name)) {
      return createErrorNode(`Invalid parameter name: ${name}`, "syntax", raw, line);
    }

    let defaultComponents: ReturnType<typeof parseExpressionComponents> | undefined;
    if (defaultExpression) {
      try {
        defaultComponents = parseExpressionComponents(defaultExpression);
      } catch (error) {
        return createErrorNode(
          `Invalid default for ${name}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "parse",
          raw,
          line
        );
      }
    }

    params.push({ name, defaultExpression, defaultComponents });
  }

  return params;
}

/**
 * Helper function to parse multiple lines at once
 * @param content The full text content to parse
 * @returns Array of AST nodes, one per line
 */
export function parseContent(content: string): ASTNode[] {
  const lines = content.split("\n");
  return lines.map((line, index) => parseLine(line, index + 1));
}

/**
 * Developer utility function for debugging (exposed on window in dev mode)
 */
export function debugParseToAst(line: string): ASTNode {
  return parseLine(line);
}

// Expose debug function in development
if (process.env.NODE_ENV === "development") {
  (window as any).parseToAst = debugParseToAst;
}
