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
import { UnitValue, NumberValue } from "../types";
import { Variable } from "../state/types";

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
    } else {
      quantities[name] = new NumberValue(variable.value.getNumericValue());
    }
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
      const valueStr = node.parsedValue.toString();
      const hasUnits = expressionContainsUnitsNet(valueStr);
      const hasConstants = this.containsMathematicalConstants(valueStr);
      const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(valueStr); // Check for variable names
      return hasUnits || hasConstants || hasVariables;
    }

    // For expression and combined assignment nodes, check the expression
    const expression = isExpressionNode(node) ? node.expression : node.expression;
    const hasUnits = expressionContainsUnitsNet(expression);
    const hasConstants = this.containsMathematicalConstants(expression);

    if (hasUnits || hasConstants) return true;

    // Also handle expressions that reference variables present in context
    // We can only determine this at evaluation time, so conservatively return true
    // when expression contains identifiers (to allow variable-only expressions like "area")
    const hasIdentifiers = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(expression);
    return hasIdentifiers;
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

  private evaluateUnitsNetExpression(node: ExpressionNode, context: EvaluationContext): RenderNode {
    const { variableContext, decimalPlaces } = context;

    try {
      const variables = convertVariablesToUnitsNetQuantities(variableContext);
      const rewritten = rewritePercentVariableAddition(
        rewriteSimpleTimeLiterals(node.expression),
        variableContext
      );
      const result = evaluateUnitsNetExpression(rewritten.expression, variables);

      if (result.error) {
        return {
          type: "error",
          error: result.error,
          errorType: "runtime" as const,
          displayText: `${node.expression} => ⚠️ ${result.error}`,
          line: context.lineNumber,
          originalRaw: node.expression,
        } as ErrorRenderNode;
      }

      // For expressions, use smart thresholds
      let formattedResult = result.value.toString({ precision: decimalPlaces });
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
  ): RenderNode {
    const { variableContext, variableStore, decimalPlaces } = context;

    try {
      const variables = convertVariablesToUnitsNetQuantities(variableContext);
      const rewritten = rewritePercentVariableAddition(
        rewriteSimpleTimeLiterals(node.expression),
        variableContext
      );
      const result = evaluateUnitsNetExpression(rewritten.expression, variables);

      if (result.error) {
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

      let valueStr = result.value.toString({ precision: decimalPlaces });
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

  private evaluateUnitsNetVariableAssignment(
    node: VariableAssignmentNode,
    context: EvaluationContext
  ): RenderNode {
    const { variableStore, decimalPlaces } = context;

    try {
      // Parse the value to extract units
      const valueStr = node.parsedValue.toString();

      // Check if this is a units expression, mathematical constants, or variables
      const hasUnits = expressionContainsUnitsNet(valueStr);
      const hasConstants = this.containsMathematicalConstants(valueStr);
      const hasVariables = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/.test(valueStr);

      let value: UnitValue | NumberValue;

      if (hasUnits || hasConstants || hasVariables) {
        // Parse as units expression with proper variable context
        const variables = convertVariablesToUnitsNetQuantities(context.variableContext);
        const result = evaluateUnitsNetExpression(rewriteSimpleTimeLiterals(valueStr), variables);

        if (result.error) {
          return {
            type: "error",
            error: result.error,
            errorType: "parse" as const,
            displayText: result.error,
            line: context.lineNumber,
            originalRaw: valueStr,
          } as ErrorRenderNode;
        }

        value = result.value;
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

      const displayText = `${node.variableName} = ${value.toString({ precision: decimalPlaces })}`;

      return {
        type: "combined",
        variableName: node.variableName,
        expression: valueStr,
        result: value.toString({ precision: decimalPlaces }),
        displayText,
        line: context.lineNumber,
        originalRaw: `${node.variableName} = ${valueStr}`,
      } as CombinedRenderNode;
    } catch (error) {
      const valueStr = node.parsedValue.toString();
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

  private formatQuantity(quantity: SmartPadQuantity, decimalPlaces: number): string {
    if (quantity.isDimensionless()) {
      // For mathematical constants, preserve full precision
      if (this.isMathematicalConstant(quantity.value)) {
        return quantity.value.toString();
      }
      // If integer, show without decimals
      if (Number.isInteger(quantity.value)) {
        return quantity.value.toString();
      }
      return parseFloat(quantity.value.toFixed(decimalPlaces)).toString();
    }

    // For simple assignments, preserve the original unit format
    // Only use smart conversion for complex expressions
    const value = quantity.value;
    const unit = quantity.unit;

    // Apply unit-specific precision overrides to align with UI expectations
    const resolvedPrecision = this.resolveUnitsPrecision(unit, value, decimalPlaces);

    // Format number, removing unnecessary trailing zeros
    const formattedValue = Number.isInteger(value)
      ? value.toString()
      : parseFloat(value.toFixed(resolvedPrecision)).toString();

    if (unit === "") {
      return formattedValue;
    }

    return `${formattedValue} ${unit}`;
  }

  private isMathematicalConstant(value: number): boolean {
    // Check if the value matches known mathematical constants (with tolerance for floating point)
    const tolerance = 1e-15;
    return Math.abs(value - Math.PI) < tolerance || Math.abs(value - Math.E) < tolerance;
  }

  private formatQuantityWithSmartThresholds(
    quantity: SmartPadQuantity,
    decimalPlaces: number
  ): string {
    if (quantity.isDimensionless()) {
      // For mathematical constants, preserve full precision even in smart thresholds
      if (this.isMathematicalConstant(quantity.value)) {
        return quantity.value.toString();
      }
      if (Number.isInteger(quantity.value)) {
        return quantity.value.toString();
      }
      return parseFloat(quantity.value.toFixed(decimalPlaces)).toString();
    }

    // For expressions, use smart thresholds to convert to more readable units
    const displayQuantity = quantity.getBestDisplayUnit();
    const resolvedPrecision = this.resolveUnitsPrecision(
      displayQuantity.unit,
      displayQuantity.value,
      decimalPlaces
    );
    return displayQuantity.toString(resolvedPrecision);
  }

  private resolveUnitsPrecision(unit: string, value: number, defaultPlaces: number): number {
    const abs = Math.abs(value);
    // Length (meters): more precision for sub-meter values
    if (unit === "m") {
      // Use default places for meters when value is >= 1; bump precision only for sub-meter values
      return abs < 1 ? Math.max(defaultPlaces, 3) : defaultPlaces;
    }
    // Area (square meters): show at least 3 decimals for readability in examples
    if (unit === "m^2") {
      return Math.max(defaultPlaces, 3);
    }
    // Temperature (Kelvin): two decimals in examples
    if (unit === "K") {
      return Math.max(defaultPlaces, 2);
    }
    // Force (Newtons): one decimal often shown (e.g., 19.6 N); integers remain integers naturally
    if (unit === "N") {
      return Math.max(defaultPlaces, 1);
    }
    // Default: keep configured precision
    return defaultPlaces;
  }
}
