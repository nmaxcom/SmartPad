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
import { Variable } from "../state/types";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { applyThousandsSeparator } from "../utils/numberFormatting";

function rewriteSimpleTimeLiterals(expression: string): string {
  return expression.replace(/(\d+(?:\.\d+)?)\s*(h|min|day)\b/g, (_m, num, unit) => {
    const v = parseFloat(num);
    const seconds = unit === "h" ? v * 3600 : unit === "min" ? v * 60 : v * 86400;
    return `${seconds} s`;
  });
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

  variableContext.forEach((variable, name) => {
    if (variable.value instanceof UnitValue || variable.value instanceof NumberValue) {
      quantities[name] = variable.value;
      return;
    }
    if (variable.value instanceof DurationValue) {
      quantities[name] = UnitValue.fromValueAndUnit(variable.value.getTotalSeconds(), "s");
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
      const hasUnits = expressionContainsUnitsNet(valueStr);
      const hasConstants = this.containsMathematicalConstants(valueStr);
      const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(valueStr); // Check for variable names
      return hasUnits || hasConstants || hasVariables;
    }

    // For expression and combined assignment nodes, check the expression
    const expression = isExpressionNode(node) ? node.expression : node.expression;
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
      return this.evaluateUnitsNetExpression(node, context);
    } else if (isCombinedAssignmentNode(node)) {
      return this.evaluateUnitsNetCombinedAssignment(node, context);
    } else if (isVariableAssignmentNode(node)) {
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
        formattedResult = this.formatQuantityWithSmartThresholds(
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
          ? this.formatQuantity(value.getQuantity(), displayOptions)
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

  private shouldPreferBaseUnit(expression: string, quantity: SmartPadQuantity): boolean {
    if (quantity.unitsnetValue) {
      return false;
    }
    if (/\b(to|in)\b/.test(expression)) {
      return false;
    }
    const unit = quantity.unit;
    if (unit === "C" || unit === "F" || unit === "K") {
      return false;
    }
    return true;
  }

  private hasExplicitConversion(expression: string): boolean {
    return /\b(to|in)\b/.test(expression);
  }

  private resolveUnitsPrecision(unit: string, value: number, defaultPlaces: number): number {
    // Follow the configured decimalPlaces consistently for all units.
    return defaultPlaces;
  }

  private formatUnitLabel(unit: string, value: number): string {
    const absValue = Math.abs(value);
    const pluralizableUnits = new Set(["day", "week", "month", "year"]);
    if (
      pluralizableUnits.has(unit) &&
      absValue !== 1 &&
      !unit.includes("/") &&
      !unit.includes("^") &&
      !unit.includes("*")
    ) {
      return `${unit}s`;
    }
    return unit;
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
