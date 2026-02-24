/**
 * UnitsNet.js AST Evaluator for SmartPad
 *
 * 🎯 KEY INTEGRATION INSIGHT:
 * This evaluator acts as a bridge between SmartPad's expression parsing and UnitsNet's
 * unit-aware calculations. It handles the conversion of parsed expressions into UnitsNet
 * operations while preserving SmartPad's variable system and display formatting.
 *
 * RESPONSIBILITY SEPARATION:
 * - Expression parsing: handled by SmartPad's existing AST system
 * - Unit operations: delegated to UnitsNet via unitsnetEvaluator
 * - Physics relationships: handled by SmartPadQuantity's physics-aware methods
 * - Display formatting: handled here with smart unit display thresholds
 *
 * This keeps the AST evaluator focused on orchestration rather than reimplementing
 * unit logic that UnitsNet already handles well.
 */

import {
  ASTNode,
  ExpressionComponent,
  ExpressionNode,
  CombinedAssignmentNode,
  VariableAssignmentNode,
  isExpressionNode,
  isCombinedAssignmentNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import {
  RenderNode,
  MathResultRenderNode,
  CombinedRenderNode,
  ErrorRenderNode,
} from "../eval/renderNodes";
import { NodeEvaluator, EvaluationContext } from "../eval/registry";
import { evaluateUnitsNetExpression, expressionContainsUnitsNet } from "./unitsnetEvaluator";
import { SmartPadQuantity } from "./unitsnetAdapter";
import { defaultUnitRegistry } from "./definitions";
import { formatUnitLabel } from "./unitDisplay";
import {
  CurrencyValue,
  CurrencyUnitValue,
  UnitValue,
  NumberValue,
  PercentageValue,
  SymbolicValue,
  DateValue,
  ErrorValue,
  DisplayOptions,
  SemanticParsers,
  ListValue,
  SemanticValueTypes,
  DurationValue,
} from "../types";
import type { DurationUnit } from "../types/DurationValue";
import { Variable } from "../state/types";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { applyThousandsSeparator } from "../utils/numberFormatting";
import { parseUnitTargetWithScale } from "./unitConversionTarget";
import { extractConversionSuffix } from "../utils/conversionSuffix";
import { splitTopLevelCommas } from "../utils/listExpression";

const containsResultReferenceComponent = (expression: string): boolean => {
  const trimmed = expression.trim();
  if (!trimmed) return false;
  try {
    const components = parseExpressionComponents(trimmed);
    return components.some((component) => component.type === "resultReference");
  } catch {
    return /__sp_ref_[a-z0-9]+__/i.test(trimmed);
  }
};

function rewriteSimpleTimeLiterals(expression: string): string {
  // Preserve user-provided time units so compound-unit cancellation and display
  // stay intuitive (e.g., L/min * min => L).
  return expression;
}

function parsePercentFromVariable(variable: Variable | undefined): number | null {
  if (!variable) return null;
  const candidates: Array<string | undefined> = [
    variable.value.toString(),
    variable.rawValue,
  ];
  for (const cand of candidates) {
    if (!cand) continue;
    const s = String(cand).trim();
    const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function currencySymbolFromVariable(variable: Variable | undefined): string | null {
  if (!variable) return null;
  const candidates: Array<string | undefined> = [
    variable.value.toString(),
    variable.rawValue,
  ];
  for (const cand of candidates) {
    if (!cand) continue;
    const m = String(cand)
      .trim()
      .match(/^([$€£])/);
    if (m) return m[1];
  }
  return null;
}

function rewritePercentVariableAddition(
  expression: string,
  variableContext: Map<string, Variable>
): { expression: string; currencySymbol?: string } {
  // Support chains: BASE (+|-) pv1 (+|-) pv2 ... where pvN are variables that look like percents
  let expr = expression.trim();
  const ops: Array<{ sign: string; p: number; varName: string; varSymbol?: string | null }> = [];
  const endRe = /([+\-])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/;
  while (true) {
    const m = endRe.exec(expr);
    if (!m) break;
    const sign = m[1];
    const varName = m[2];
    const variable = variableContext.get(varName);
    const p = parsePercentFromVariable(variable);
    if (p === null) break;
    ops.push({ sign, p, varName, varSymbol: currencySymbolFromVariable(variable) });
    expr = expr.slice(0, m.index).trim();
  }
  if (ops.length === 0) return { expression };

  const baseExpr = expr;

  // Detect base currency symbol if base is a single identifier with currency-like display
  let baseCurrencySymbol: string | undefined;
  const baseVarMatch = baseExpr.trim().match(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
  if (baseVarMatch) {
    baseCurrencySymbol =
      currencySymbolFromVariable(variableContext.get(baseVarMatch[0])) || undefined;
  }

  // Guard: currency mismatch between base and any percent var symbol
  for (const op of ops) {
    if (op.varSymbol && baseCurrencySymbol && op.varSymbol !== baseCurrencySymbol) {
      throw new Error("Cannot mix different currency symbols with percent modifiers");
    }
  }

  const factors = ops.map((o) => (o.sign === "+" ? `1 + ${o.p / 100}` : `1 - ${o.p / 100}`));
  const rewrittenExpr = `(${baseExpr}) * ${factors.map((f) => `(${f})`).join(" * ")}`;
  return { expression: rewrittenExpr, currencySymbol: baseCurrencySymbol };
}

/**
 * Convert SmartPad variables to unitsnet-js quantities
 */
function convertVariablesToUnitsNetQuantities(
  variableContext: Map<string, Variable>
): Record<string, UnitValue | NumberValue> {
  const quantities: Record<string, UnitValue | NumberValue> = {};
  const durationUnitOrder: Array<DurationUnit> = [
    "year",
    "month",
    "week",
    "businessDay",
    "day",
    "hour",
    "minute",
    "second",
    "millisecond",
  ];
  const durationUnitSymbols: Record<DurationUnit, string> = {
    year: "year",
    month: "month",
    week: "week",
    businessDay: "day",
    day: "day",
    hour: "h",
    minute: "min",
    second: "s",
    millisecond: "ms",
  };
  const durationUnitSeconds: Record<DurationUnit, number> = {
    year: 365 * 24 * 60 * 60,
    month: 30 * 24 * 60 * 60,
    week: 7 * 24 * 60 * 60,
    businessDay: 24 * 60 * 60,
    day: 24 * 60 * 60,
    hour: 60 * 60,
    minute: 60,
    second: 1,
    millisecond: 1 / 1000,
  };
  const chooseDurationUnit = (duration: DurationValue): DurationUnit => {
    const parts = duration.getParts() as Partial<Record<DurationUnit, number>>;
    const entries = Object.entries(parts).filter(([, value]) => (value ?? 0) !== 0);
    if (entries.length === 1) {
      return entries[0][0] as DurationUnit;
    }
    for (const unit of durationUnitOrder) {
      if (parts[unit]) return unit;
    }
    const absSeconds = Math.abs(duration.getTotalSeconds());
    if (absSeconds >= durationUnitSeconds.year) return "year";
    if (absSeconds >= durationUnitSeconds.month) return "month";
    if (absSeconds >= durationUnitSeconds.week) return "week";
    if (absSeconds >= durationUnitSeconds.day) return "day";
    if (absSeconds >= durationUnitSeconds.hour) return "hour";
    if (absSeconds >= durationUnitSeconds.minute) return "minute";
    if (absSeconds >= durationUnitSeconds.second) return "second";
    return "millisecond";
  };

  variableContext.forEach((variable, name) => {
    if (variable.value instanceof UnitValue || variable.value instanceof NumberValue) {
      quantities[name] = variable.value;
      return;
    }
    if (variable.value instanceof DurationValue) {
      const duration = variable.value;
      const unit = chooseDurationUnit(duration);
      const numeric = duration.toFixedUnit(unit === "businessDay" ? "day" : unit);
      const value = typeof numeric === "number" ? numeric : duration.getTotalSeconds();
      const unitSymbol = durationUnitSymbols[unit] || "s";
      quantities[name] = UnitValue.fromValueAndUnit(value, unitSymbol);
      return;
    }
    if (variable.value instanceof DateValue) {
      return;
    }
    if (variable.value instanceof ListValue) {
      return;
    }
    if (variable.value instanceof SymbolicValue || variable.value instanceof ErrorValue) {
      return;
    }
    const numericValue = variable.value.getNumericValue();
    if (!Number.isFinite(numericValue)) {
      return;
    }
    quantities[name] = new NumberValue(numericValue);
  });

  return quantities;
}

/**
 * Enhanced render node for unitsnet-js results
 */
export interface UnitsNetRenderNode extends MathResultRenderNode {
  readonly type: "mathResult";
  readonly units?: string; // Unit string for display
  readonly isUnitsAware: boolean;
  readonly value: number; // Override the result field to be more specific
}

/**
 * AST Evaluator for expressions with units using unitsnet-js
 */
export class UnitsNetExpressionEvaluator implements NodeEvaluator {
  private containsPhraseAlias(expression: string, context: EvaluationContext): boolean {
    const normalizedExpr = expression.toLowerCase();
    for (const name of context.variableContext.keys()) {
      const normalizedName = name.replace(/\s+/g, " ").trim();
      if (!normalizedName || !normalizedName.includes(" ")) {
        continue;
      }
      if (normalizedExpr.includes(normalizedName.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private containsBlockedAlias(expression: string, context: EvaluationContext): boolean {
    const normalizedExpr = expression.toLowerCase();
    for (const name of context.variableContext.keys()) {
      const normalizedName = name.replace(/\s+/g, " ").trim();
      if (!normalizedName) continue;
      if (!defaultUnitRegistry.isBlocked(normalizedName)) continue;
      if (normalizedExpr.includes(normalizedName.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  private getBlockedAliasMessage(expression: string, context: EvaluationContext): string | null {
    const normalizedExpr = expression.toLowerCase();
    for (const name of context.variableContext.keys()) {
      const normalizedName = name.replace(/\s+/g, " ").trim();
      if (!normalizedName) continue;
      const message = defaultUnitRegistry.getBlockedMessage(normalizedName);
      if (!message) continue;
      if (normalizedExpr.includes(normalizedName.toLowerCase())) {
        return message;
      }
    }
    return null;
  }

  canHandle(node: ASTNode): boolean {
    // Check if node type is supported
    if (
      !isExpressionNode(node) &&
      !isCombinedAssignmentNode(node) &&
      !isVariableAssignmentNode(node)
    ) {
      return false;
    }

    // For variable assignments, check if the value contains units or variables
    if (isVariableAssignmentNode(node)) {
      const valueStr = (node.rawValue || node.parsedValue?.toString() || "").trim();
      if (containsResultReferenceComponent(valueStr)) {
        return false;
      }
      const hasUnits = expressionContainsUnitsNet(valueStr);
      const hasConstants = this.containsMathematicalConstants(valueStr);
      const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(valueStr); // Check for variable names
      return hasUnits || hasConstants || hasVariables;
    }

    // For expression and combined assignment nodes, check the expression
    const expression = isExpressionNode(node) ? node.expression : node.expression;
    if (containsResultReferenceComponent(expression)) {
      return false;
    }
    if (/\bwhere\b/i.test(expression)) {
      return false;
    }
    if (expression.includes("[")) {
      return false;
    }
    const listFunctionPattern = /\b(sum|total|avg|mean|median|count|stddev|min|max)\s*\(/i;
    if (listFunctionPattern.test(expression)) {
      return false;
    }

    const hasUnits = expressionContainsUnitsNet(expression);
    const hasConstants = this.containsMathematicalConstants(expression);

    if (hasUnits || hasConstants) return true;

    return false;
  }

  private containsMathematicalConstants(expression: string): boolean {
    // Check for mathematical constants like PI, E
    return /\b(PI|E)\b/.test(expression);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (isExpressionNode(node)) {
      const blockedMessage = this.getBlockedAliasMessage(node.expression, context);
      if (blockedMessage) {
        return {
          type: "error",
          error: blockedMessage,
          errorType: "runtime" as const,
          displayText: `${node.expression} => ⚠️ ${blockedMessage}`,
          line: context.lineNumber,
          originalRaw: node.expression,
        } as ErrorRenderNode;
      }
      if (this.containsPhraseAlias(node.expression, context)) {
        return null;
      }
      return this.evaluateUnitsNetExpression(node, context);
    } else if (isCombinedAssignmentNode(node)) {
      const blockedMessage = this.getBlockedAliasMessage(node.expression, context);
      if (blockedMessage) {
        return {
          type: "error",
          error: blockedMessage,
          errorType: "runtime" as const,
          displayText: `${node.variableName} = ${node.expression} => ⚠️ ${blockedMessage}`,
          line: context.lineNumber,
          originalRaw: `${node.variableName} = ${node.expression}`,
        } as ErrorRenderNode;
      }
      if (this.containsPhraseAlias(node.expression, context)) {
        return null;
      }
      return this.evaluateUnitsNetCombinedAssignment(node, context);
    } else if (isVariableAssignmentNode(node)) {
      const rawValue = (node.rawValue || node.parsedValue?.toString() || "").trim();
      const blockedMessage = this.getBlockedAliasMessage(rawValue, context);
      if (blockedMessage) {
        return {
          type: "error",
          error: blockedMessage,
          errorType: "runtime" as const,
          displayText: `${node.variableName} => ⚠️ ${blockedMessage}`,
          line: context.lineNumber,
          originalRaw: node.variableName,
        } as ErrorRenderNode;
      }
      if (this.containsPhraseAlias(rawValue, context)) {
        return null;
      }
      return this.evaluateUnitsNetVariableAssignment(node, context);
    }

    return null;
  }

  private evaluateUnitsNetExpression(
    node: ExpressionNode,
    context: EvaluationContext
  ): RenderNode | null {
    const { variableContext } = context;
    const displayOptions = this.getDisplayOptions(context);

    try {
      const invalidConversionTargetError = this.getInvalidScaledConversionTargetError(
        node.expression
      );
      if (invalidConversionTargetError) {
        return {
          type: "error",
          error: invalidConversionTargetError,
          errorType: "runtime" as const,
          displayText: `${node.expression} => ⚠️ ${invalidConversionTargetError}`,
          line: context.lineNumber,
          originalRaw: node.expression,
        } as ErrorRenderNode;
      }
      if (this.containsDateVariable(node.components, context)) {
        return null;
      }
      if (this.shouldDeferToSemanticEvaluator(node.components, node.expression, context)) {
        return null;
      }

      const variables = convertVariablesToUnitsNetQuantities(variableContext);
      const rewritten = rewritePercentVariableAddition(
        rewriteSimpleTimeLiterals(node.expression),
        variableContext
      );
      const result = evaluateUnitsNetExpression(rewritten.expression, variables);

      if (result.error) {
        if (/Undefined variable/i.test(result.error)) {
          const symbolic = SymbolicValue.from(node.expression);
          const resultString = symbolic.toString(displayOptions);
          return {
            type: "mathResult",
            expression: node.expression,
            result: resultString,
            displayText: `${node.expression} => ${resultString}`,
            line: context.lineNumber,
            originalRaw: node.expression,
          } as MathResultRenderNode;
        }
        return {
          type: "error",
          error: result.error,
          errorType: "runtime" as const,
          displayText: `${node.expression} => ⚠️ ${result.error}`,
          line: context.lineNumber,
          originalRaw: node.expression,
        } as ErrorRenderNode;
      }

      // For expressions, use smart thresholds for units
      let formattedResult: string;
      if (result.value instanceof UnitValue) {
        const scaledOverride = this.formatScaledConversionTarget(
          node.expression,
          result.value,
          displayOptions
        );
        formattedResult =
          scaledOverride ??
          this.formatQuantityWithSmartThresholds(
            result.value.getQuantity(),
            displayOptions,
            this.shouldPreferBaseUnit(node.expression, result.value.getQuantity()),
            this.hasExplicitConversion(node.expression)
          );
      } else {
        const numericValue = result.value.getNumericValue();
        formattedResult = this.isMathematicalConstant(numericValue)
          ? numericValue.toString()
          : result.value.toString(displayOptions);
      }
      if (rewritten.currencySymbol && result.value instanceof NumberValue) {
        formattedResult = `${rewritten.currencySymbol}${formattedResult}`;
      }
      const displayText = `${node.expression} => ${formattedResult}`;

      return {
        type: "mathResult",
        expression: node.expression,
        result: formattedResult, // Use formatted string instead of just the numeric value
        displayText,
        line: context.lineNumber,
        originalRaw: node.expression,
      } as MathResultRenderNode;
    } catch (error) {
      return {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        errorType: "runtime" as const,
        displayText: error instanceof Error ? error.message : String(error),
        line: context.lineNumber,
        originalRaw: node.expression,
      } as ErrorRenderNode;
    }
  }

  private evaluateUnitsNetCombinedAssignment(
    node: CombinedAssignmentNode,
    context: EvaluationContext
  ): RenderNode | null {
    const { variableContext, variableStore } = context;
    const displayOptions = this.getDisplayOptions(context);

    try {
      if (this.containsDateVariable(node.components, context)) {
        return null;
      }
      if (this.shouldDeferToSemanticEvaluator(node.components, node.expression, context)) {
        return null;
      }

      const variables = convertVariablesToUnitsNetQuantities(variableContext);
      const rewritten = rewritePercentVariableAddition(
        rewriteSimpleTimeLiterals(node.expression),
        variableContext
      );
      const result = evaluateUnitsNetExpression(rewritten.expression, variables);

      if (result.error) {
        if (/Undefined variable/i.test(result.error)) {
          const symbolic = SymbolicValue.from(node.expression);
          const variable: Variable = {
            name: node.variableName,
            value: symbolic,
            rawValue: node.expression,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          variableStore.setVariableWithMetadata(variable);

          const resultString = this.substituteKnownValues(
            node.expression,
            context,
            displayOptions
          );
          return {
            type: "combined",
            variableName: node.variableName,
            expression: node.expression,
            result: resultString,
            displayText: `${node.variableName} = ${node.expression} => ${resultString}`,
            line: context.lineNumber,
            originalRaw: `${node.variableName} = ${node.expression}`,
          } as CombinedRenderNode;
        }
        // Debug: surface evaluation error context for failing tests

        console.log("UnitsNetCombinedAssignment error:", result.error, "expr:", node.expression);
        return {
          type: "error",
          error: result.error,
          errorType: "runtime" as const,
          displayText: `${node.variableName} = ${node.expression} => ⚠️ ${result.error}`,
          line: context.lineNumber,
          originalRaw: `${node.variableName} = ${node.expression}`,
        } as ErrorRenderNode;
      }

      // Store the variable with units information
      const variable: Variable = {
        name: node.variableName,
        value: result.value,
        rawValue: node.expression,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      variableStore.setVariableWithMetadata(variable);

      let valueStr =
        result.value instanceof UnitValue
          ? this.formatQuantityWithSmartThresholds(
              result.value.getQuantity(),
              displayOptions,
              this.shouldPreferBaseUnit(node.expression, result.value.getQuantity()),
              this.hasExplicitConversion(node.expression)
            )
          : result.value.toString(displayOptions);
      if (rewritten.currencySymbol && result.value instanceof NumberValue) {
        valueStr = `${rewritten.currencySymbol}${valueStr}`;
      }
      const displayText = `${node.variableName} = ${node.expression} => ${valueStr}`;

      return {
        type: "combined",
        variableName: node.variableName,
        expression: node.expression,
        result: valueStr,
        displayText,
        line: context.lineNumber,
        // originalRaw must match the text prior to => so the decorator can map reliably
        originalRaw: `${node.variableName} = ${node.expression}`,
      } as CombinedRenderNode;
    } catch (error) {
      return {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        errorType: "runtime" as const,
        displayText: error instanceof Error ? error.message : String(error),
        line: context.lineNumber,
        originalRaw: node.expression,
      } as ErrorRenderNode;
    }
  }

  private substituteKnownValues(
    expression: string,
    context: EvaluationContext,
    displayOptions: DisplayOptions
  ): string {
    const substitutions = new Map<string, string>();
    const formatValue = (value: import("../types").SemanticValue): string => {
      const formatted = value.toString(displayOptions);
      if (/[+\-*/^]/.test(formatted)) {
        return `(${formatted})`;
      }
      return formatted;
    };

    context.variableContext.forEach((variable, name) => {
      const value = variable.value;
      if (!value || value instanceof SymbolicValue || value instanceof ErrorValue) {
        return;
      }
      substitutions.set(name.replace(/\s+/g, " ").trim(), formatValue(value));
    });

    context.variableStore.getAllVariables().forEach((variable) => {
      const value = variable.value;
      if (!value || value instanceof SymbolicValue || value instanceof ErrorValue) {
        return;
      }
      const normalized = variable.name.replace(/\s+/g, " ").trim();
      if (!substitutions.has(normalized)) {
        substitutions.set(normalized, formatValue(value));
      }
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

  private evaluateUnitsNetVariableAssignment(
    node: VariableAssignmentNode,
    context: EvaluationContext
  ): RenderNode | null {
    const { variableStore } = context;
    const displayOptions = this.getDisplayOptions(context);

    try {
      // Parse the value to extract units
      const valueStr = (node.rawValue || node.parsedValue?.toString() || "").trim();
      const parsedLiteral = SemanticParsers.parse(valueStr);
      if (parsedLiteral && parsedLiteral.getType() === "list") {
        return null;
      }
      let components: ExpressionComponent[] = [];
      try {
        components = parseExpressionComponents(valueStr);
      } catch {
        components = [];
      }

      if (components.length > 0 && this.shouldDeferToSemanticEvaluator(components, valueStr, context)) {
        return null;
      }

      // Check if this is a units expression, mathematical constants, or variables
      const hasUnits = expressionContainsUnitsNet(valueStr);
      const hasConstants = this.containsMathematicalConstants(valueStr);
      const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(valueStr);

      let value: UnitValue | NumberValue | SymbolicValue | undefined;

      if (hasUnits || hasConstants || hasVariables) {
        // Parse as units expression with proper variable context
        const variables = convertVariablesToUnitsNetQuantities(context.variableContext);
        const result = evaluateUnitsNetExpression(rewriteSimpleTimeLiterals(valueStr), variables);

        if (result.error) {
          if (/Undefined variable/i.test(result.error)) {
            value = SymbolicValue.from(valueStr);
          } else {
            return {
              type: "error",
              error: result.error,
              errorType: "parse" as const,
              displayText: result.error,
              line: context.lineNumber,
              originalRaw: valueStr,
            } as ErrorRenderNode;
          }
        }

        if (!value) {
          value = result.value;
        }
      } else {
        // Parse as regular number
        value = new NumberValue(node.parsedValue.getNumericValue());
      }

      // Store the variable
      const variable: Variable = {
        name: node.variableName,
        value,
        rawValue: valueStr,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      variableStore.setVariableWithMetadata(variable);

      const displayValue =
        value instanceof UnitValue
          ? this.formatScaledConversionTarget(valueStr, value, displayOptions) ??
            this.formatQuantity(value.getQuantity(), displayOptions)
          : value.toString(displayOptions);
      const displayText = `${node.variableName} = ${displayValue}`;

      return {
        type: "combined",
        variableName: node.variableName,
        expression: valueStr,
        result: displayValue,
        displayText,
        line: context.lineNumber,
        originalRaw: `${node.variableName} = ${valueStr}`,
      } as CombinedRenderNode;
    } catch (error) {
      const valueStr = (node.rawValue || node.parsedValue?.toString() || "").trim();
      return {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
        errorType: "runtime" as const,
        displayText: error instanceof Error ? error.message : String(error),
        line: context.lineNumber,
        originalRaw: valueStr,
      } as ErrorRenderNode;
    }
  }

  private formatQuantity(quantity: SmartPadQuantity, displayOptions: DisplayOptions): string {
    const precision = displayOptions.precision ?? 6;
    if (quantity.isDimensionless()) {
      // For mathematical constants, preserve full precision
      if (this.isMathematicalConstant(quantity.value)) {
        return quantity.value.toString();
      }
      // If integer, show without decimals
      return this.formatScalarValue(quantity.value, precision, displayOptions);
    }

    // For simple assignments, preserve the original unit format
    // Only use smart conversion for complex expressions
    const value = quantity.value;
    const unit = quantity.unit;

    // Apply unit-specific precision overrides to align with UI expectations
    const resolvedPrecision = this.resolveUnitsPrecision(unit, value, precision);

    // Format number, removing unnecessary trailing zeros
    const formattedValue = this.formatScalarValue(value, resolvedPrecision, displayOptions);

    if (unit === "") {
      return formattedValue;
    }

    return `${formattedValue} ${this.formatUnitLabel(unit, value)}`;
  }

  private isMathematicalConstant(value: number): boolean {
    // Check if the value matches known mathematical constants (with tolerance for floating point)
    const tolerance = 1e-15;
    return Math.abs(value - Math.PI) < tolerance || Math.abs(value - Math.E) < tolerance;
  }

  private formatQuantityWithSmartThresholds(
    quantity: SmartPadQuantity,
    displayOptions: DisplayOptions,
    preferBaseUnit: boolean,
    preserveUnit: boolean
  ): string {
    const precision = displayOptions.precision ?? 6;
    if (quantity.isDimensionless()) {
      // For mathematical constants, preserve full precision even in smart thresholds
      if (this.isMathematicalConstant(quantity.value)) {
        return quantity.value.toString();
      }
      return this.formatScalarValue(quantity.value, precision, displayOptions);
    }

    if (preserveUnit) {
      const formattedValue = this.formatScalarValue(
        quantity.value,
        precision,
        displayOptions
      );
      return quantity.unit
        ? `${formattedValue} ${this.formatUnitLabel(quantity.unit, quantity.value)}`
        : formattedValue;
    }

    // For expressions, use smart thresholds and optionally prefer base units
    return quantity.toString(precision, { ...displayOptions, preferBaseUnit });
  }

  private shouldPreferBaseUnit(_expression: string, _quantity: SmartPadQuantity): boolean {
    // Keep the computed unit representation by default.
    return false;
  }

  private hasExplicitConversion(expression: string): boolean {
    return /\b(to|in)\b/.test(expression);
  }

  private formatScaledConversionTarget(
    expression: string,
    value: UnitValue,
    displayOptions: DisplayOptions
  ): string | null {
    const conversion = extractConversionSuffix(expression);
    if (!conversion) return null;
    const rawTarget = conversion.target.trim();
    if (!rawTarget) return null;
    const parsed = parseUnitTargetWithScale(rawTarget);
    if (!parsed || parsed.scale === 1) return null;
    if (!Number.isFinite(parsed.scale) || parsed.scale <= 0) return null;

    const displayValue = value.getNumericValue() / parsed.scale;
    const precision = displayOptions.precision ?? 6;
    const displayQuantity = new SmartPadQuantity(displayValue, parsed.displayUnit);
    return displayQuantity.toString(precision, { ...displayOptions, forceUnit: true });
  }

  private getInvalidScaledConversionTargetError(expression: string): string | null {
    const conversion = extractConversionSuffix(expression);
    if (!conversion) return null;
    const parsed = parseUnitTargetWithScale(conversion.target.trim());
    if (!parsed) return null;
    if (!Number.isFinite(parsed.scale) || parsed.scale <= 0) {
      return "Invalid conversion target: denominator must be non-zero";
    }
    return null;
  }

  private resolveUnitsPrecision(unit: string, value: number, defaultPlaces: number): number {
    // Follow the configured decimalPlaces consistently for all units.
    return defaultPlaces;
  }

  private formatUnitLabel(unit: string, value: number): string {
    return formatUnitLabel(unit, value);
  }

  private formatScalarValue(
    value: number,
    precision: number,
    displayOptions: DisplayOptions
  ): string {
    if (!isFinite(value)) return this.groupIfEnabled("Infinity", displayOptions);
    if (value === 0) return this.groupIfEnabled("0", displayOptions);
    const abs = Math.abs(value);
    const upperThreshold = displayOptions.scientificUpperThreshold ?? 1e12;
    const lowerThreshold = displayOptions.scientificLowerThreshold ?? 1e-4;
    const formatScientific = (num: number) => {
      const s = num.toExponential(Math.max(0, precision));
      const [mantissa, exp] = s.split("e");
      const shouldTrim = displayOptions.scientificTrimTrailingZeros ?? true;
      const outputMantissa = shouldTrim
        ? mantissa.replace(/(?:\.0+|(\.\d+?)0+)$/, "$1")
        : mantissa;
      return `${outputMantissa}e${exp}`;
    };
    if (
      abs >= upperThreshold ||
      (abs > 0 && lowerThreshold > 0 && abs < lowerThreshold)
    ) {
      return this.groupIfEnabled(formatScientific(value), displayOptions);
    }
    if (Number.isInteger(value)) return value.toString();
    const fixed = value.toFixed(precision);
    const fixedNumber = parseFloat(fixed);
    if (fixedNumber === 0) {
      return this.groupIfEnabled(formatScientific(value), displayOptions);
    }
    return this.groupIfEnabled(fixedNumber.toString(), displayOptions);
  }

  private groupIfEnabled(value: string, displayOptions: DisplayOptions): string {
    return displayOptions.groupThousands ? applyThousandsSeparator(value) : value;
  }

  private getDisplayOptions(context: EvaluationContext): DisplayOptions {
    return {
      precision: context.decimalPlaces,
      scientificUpperThreshold: context.scientificUpperThreshold,
      scientificLowerThreshold: context.scientificLowerThreshold,
      scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
      groupThousands: context.groupThousands,
    };
  }

  private shouldDeferToSemanticEvaluator(
    components: ExpressionComponent[],
    expression: string,
    context: EvaluationContext
  ): boolean {
    // Semantic evaluators own comma-list construction and per-item annotation/conversion.
    // Deferring here avoids UnitsNet parse errors like "Unexpected token: ," for inputs such as:
    // "2,0,1,2 to $"
    if (splitTopLevelCommas(expression).length > 1) {
      return true;
    }

    if (/\bmod\b/i.test(expression)) {
      return true;
    }
    const variableNames = this.collectVariableNames(components);

    const { hasCurrency, hasUnit, hasPercentage, hasList } = this.collectVariableMetadata(
      variableNames,
      context
    );

    const parsedLiteral = SemanticParsers.parse(expression);
    if (parsedLiteral && parsedLiteral.getType() !== "error") {
      // Let UnitsNet handle unit literals; defer for other semantic literals.
      if (parsedLiteral.getType() === "unit") {
        return UnitValue.isUnitString(expression) ? false : true;
      }
      if (SemanticValueTypes.isSymbolic(parsedLiteral)) {
        return hasList || hasCurrency || hasPercentage;
      }
      return true;
    }

    const functionComponents = components.filter((component) => component.type === "function");
    if (functionComponents.length > 0) {
      const hasUserFunction = functionComponents.some(
        (component) => context.functionStore?.has(component.value)
      );
      if (hasUserFunction) {
        return true;
      }
      const listFunctionPattern = /\b(sum|total|avg|mean|median|count|stddev|min|max)\s*\(/i;
      if (listFunctionPattern.test(expression)) {
        return true;
      }
      // Allow UnitsNet to handle built-in functions when units are involved.
      if (expressionContainsUnitsNet(expression)) {
        return false;
      }
      return true;
    }

    const hasCurrencyLiteral = components.some(
      (component) =>
        component.type === "literal" &&
        component.parsedValue &&
        (component.parsedValue.getType() === "currency" ||
          component.parsedValue.getType() === "currencyUnit")
    );
    if (hasCurrencyLiteral) {
      return true;
    }

    const maskedExpression = this.maskVariableNames(expression, variableNames);
    if (
      expressionContainsUnitsNet(maskedExpression) ||
      this.containsMathematicalConstants(maskedExpression)
    ) {
      return false;
    }

    if (hasCurrency) {
      return true;
    }

    if (hasUnit || hasPercentage) {
      return false;
    }

    if (hasList) {
      return true;
    }

    return false;
  }

  private maskVariableNames(expression: string, variableNames: Set<string>): string {
    if (variableNames.size === 0) {
      return expression;
    }

    const names = Array.from(variableNames).sort((a, b) => b.length - a.length);
    const isBoundary = (char: string | undefined) =>
      !char || /[\s+\-*/^%()=<>!,]/.test(char);

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
          result += "__var__";
          pos += name.length;
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        result += expression[pos];
        pos++;
      }
    }

    return result;
  }

  private collectVariableNames(components: ExpressionComponent[]): Set<string> {
    const names = new Set<string>();
    const visit = (items: ExpressionComponent[]) => {
      items.forEach((component) => {
        if (component.type === "variable") {
          names.add(component.value);
        }
        if (component.type === "listAccess" && component.access) {
          visit([component.access.base]);
          if (component.access.indexComponents) {
            visit(component.access.indexComponents);
          }
          if (component.access.startComponents) {
            visit(component.access.startComponents);
          }
          if (component.access.endComponents) {
            visit(component.access.endComponents);
          }
        }
        if (component.type === "function" && component.args) {
          component.args.forEach((arg) => visit(arg.components));
        } else if (component.children && component.children.length > 0) {
          visit(component.children);
        }
      });
    };
    visit(components);
    return names;
  }

  private collectVariableMetadata(
    variableNames: Set<string>,
    context: EvaluationContext
  ): {
    hasCurrency: boolean;
    hasUnit: boolean;
    hasPercentage: boolean;
    hasList: boolean;
  } {
    let hasCurrency = false;
    let hasUnit = false;
    let hasPercentage = false;
    let hasList = false;

    variableNames.forEach((name) => {
      const variable = context.variableContext.get(name);
      const value = variable?.value;
      if (value instanceof ListValue) {
        hasList = true;
      }
      if (value instanceof UnitValue) {
        hasUnit = true;
      }
      if (value instanceof PercentageValue) {
        hasPercentage = true;
      }
      if (value instanceof CurrencyValue || value instanceof CurrencyUnitValue) {
        hasCurrency = true;
      }
    });

    return { hasCurrency, hasUnit, hasPercentage, hasList };
  }

  private containsDateVariable(
    components: ExpressionComponent[],
    context: EvaluationContext
  ): boolean {
    const variableNames = this.collectVariableNames(components);
    for (const name of variableNames) {
      const variable = context.variableContext.get(name);
      if (variable?.value instanceof DateValue) {
        return true;
      }
    }
    return false;
  }
}
