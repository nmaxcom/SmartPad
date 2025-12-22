/**
 * Units Expression Evaluator for SmartPad AST Pipeline
 *
 * Integrates units support with SmartPad's existing AST pipeline,
 * handling expressions that contain quantities with units.
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
import { evaluateUnitsExpression, expressionContainsUnits } from "./unitsEvaluator";
import { Quantity } from "./quantity";
import { Variable } from "../state/types";
import { NumberValue } from "../types";

/**
 * Convert SmartPad variables to units-aware quantities
 */
function convertVariablesToQuantities(
  variableContext: Map<string, Variable>
): Record<string, Quantity> {
  const quantities: Record<string, Quantity> = {};

  variableContext.forEach((variable, name) => {
    if (typeof variable.value === "number") {
      // CRITICAL FIX: Check if the variable has a stored Quantity object
      if (variable.quantity) {
        // Use the stored Quantity object to preserve dimensional information
        quantities[name] = variable.quantity;
      } else {
        // Fallback: treat as dimensionless quantity for backward compatibility
        quantities[name] = Quantity.dimensionless(variable.value);
      }
    }
  });

  return quantities;
}

/**
 * Enhanced render node for units-aware results
 */
export interface UnitsRenderNode extends MathResultRenderNode {
  readonly type: "mathResult";
  readonly units?: string; // Unit string for display
  readonly isUnitsAware: boolean;
}

/**
 * AST Evaluator for expressions with units
 */
export class UnitsExpressionEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    if (
      !isExpressionNode(node) &&
      !isCombinedAssignmentNode(node) &&
      !isVariableAssignmentNode(node)
    ) {
      return false;
    }

    // For variable assignments, check if the value contains units
    if (isVariableAssignmentNode(node)) {
      const valueStr = node.parsedValue.toString();
      return expressionContainsUnits(valueStr);
    }

    // For expression and combined assignment nodes, check the expression
    const expression = isExpressionNode(node) ? node.expression : node.expression;
    return expressionContainsUnits(expression);
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (isExpressionNode(node)) {
      return this.evaluateUnitsExpression(node, context);
    } else if (isCombinedAssignmentNode(node)) {
      return this.evaluateUnitsCombinedAssignment(node, context);
    } else if (isVariableAssignmentNode(node)) {
      return this.evaluateUnitsVariableAssignment(node, context);
    }

    return null;
  }

  private evaluateUnitsExpression(node: ExpressionNode, context: EvaluationContext): RenderNode {
    const { variableContext, decimalPlaces } = context;

    try {
      // Convert SmartPad variables to quantities
      const quantities = convertVariablesToQuantities(variableContext);

      // Evaluate the expression with units
      const result = evaluateUnitsExpression(node.expression, quantities);

      if (result.error) {
        return {
          type: "error",
          line: node.line,
          originalRaw: node.raw,
          error: result.error,
          errorType: "runtime",
          displayText: `${node.expression} => ⚠️ ${result.error}`,
        };
      }

      // Format the result with units
      const resultText = this.formatQuantity(result.quantity, decimalPlaces);
      const displayText = `${node.expression} => ${resultText}`;

      return {
        type: "mathResult",
        line: node.line,
        originalRaw: node.raw,
        expression: node.expression,
        result: resultText,
        displayText,
        units: result.quantity.unit.toString(),
        isUnitsAware: true,
      } as UnitsRenderNode;
    } catch (error) {
      return {
        type: "error",
        line: node.line,
        originalRaw: node.raw,
        error: `Units evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        errorType: "runtime",
        displayText: `${node.raw} ⚠️ Units evaluation error`,
      };
    }
  }

  private evaluateUnitsCombinedAssignment(
    node: CombinedAssignmentNode,
    context: EvaluationContext
  ): RenderNode {
    const { variableStore, variableContext, decimalPlaces } = context;

    try {
      // Convert SmartPad variables to quantities
      const quantities = convertVariablesToQuantities(variableContext);

      // Evaluate the expression with units
      const result = evaluateUnitsExpression(node.expression, quantities);

      if (result.error) {
        return {
          type: "error",
          line: node.line,
          originalRaw: node.raw,
          error: result.error,
          errorType: "runtime",
          displayText: `${node.variableName} = ${node.expression} => ⚠️ ${result.error}`,
        };
      }

      // Store the result as a variable with complete units information
      const now = new Date();
      const existingVariable = variableStore.getVariable(node.variableName);
      const resultText = this.formatQuantity(result.quantity, decimalPlaces);

      const variable: Variable = {
        name: node.variableName,
        value: new NumberValue(result.quantity.value), // Numeric value for calculations
        rawValue: node.expression, // Original expression
        units: result.quantity.unit.toString(), // Unit string (e.g., "m", "kg", "°C")
        quantity: result.quantity, // CRITICAL: Store complete Quantity object with dimensional info
        createdAt: existingVariable?.createdAt || now,
        updatedAt: now,
      };

      const success = variableStore.setVariableWithMetadata(variable);

      if (!success.success) {
        return {
          type: "error",
          line: node.line,
          originalRaw: node.raw,
          error: success.error || "Failed to store variable",
          errorType: "runtime",
          displayText: `${node.variableName} = ${node.expression} => ⚠️ Variable storage error`,
        };
      }

      // Format the result with units
      const displayText = `${node.variableName} = ${node.expression} => ${resultText}`;

      return {
        type: "combined",
        line: node.line,
        originalRaw: node.raw,
        variableName: node.variableName,
        expression: node.expression,
        result: resultText,
        displayText,
      };
    } catch (error) {
      return {
        type: "error",
        line: node.line,
        originalRaw: node.raw,
        error: `Units evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        errorType: "runtime",
        displayText: `${node.raw} ⚠️ Units evaluation error`,
      };
    }
  }

  private evaluateUnitsVariableAssignment(
    node: VariableAssignmentNode,
    context: EvaluationContext
  ): RenderNode {
    const { variableContext, variableStore, decimalPlaces } = context;

    try {
      // Convert SmartPad variables to quantities
      const quantities = convertVariablesToQuantities(variableContext);

      // Evaluate the value (which contains the units expression) with units
      const valueStr = node.parsedValue.toString();
      const result = evaluateUnitsExpression(valueStr, quantities);

      if (result.error) {
        return {
          type: "error",
          line: node.line,
          originalRaw: node.raw,
          error: result.error,
          errorType: "runtime",
          displayText: `${node.variableName} = ${valueStr} ⚠️ ${result.error}`,
        };
      }

      // Store the result as a variable with complete units information
      const now = new Date();
      const existingVariable = variableStore.getVariable(node.variableName);
      const resultText = this.formatQuantity(result.quantity, decimalPlaces);

      const variable: Variable = {
        name: node.variableName,
        value: new NumberValue(result.quantity.value), // Numeric value for calculations
        rawValue: valueStr, // Original expression
        units: result.quantity.unit.toString(), // Unit string (e.g., "m", "kg", "°C")
        quantity: result.quantity, // CRITICAL: Store complete Quantity object with dimensional info
        createdAt: existingVariable?.createdAt || now,
        updatedAt: now,
      };

      const success = variableStore.setVariableWithMetadata(variable);

      if (!success.success) {
        return {
          type: "error",
          line: node.line,
          originalRaw: node.raw,
          error: success.error || "Failed to store variable",
          errorType: "runtime",
          displayText: `${node.variableName} = ${valueStr} ⚠️ Variable storage error`,
        };
      }

      // Format the result with units
      const displayText = `${node.variableName} = ${resultText}`;

      return {
        type: "combined",
        line: node.line,
        originalRaw: node.raw,
        variableName: node.variableName,
        expression: valueStr,
        result: resultText,
        displayText,
      };
    } catch (error) {
      return {
        type: "error",
        line: node.line,
        originalRaw: node.raw,
        error: `Units evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        errorType: "runtime",
        displayText: `${node.raw} ⚠️ Units evaluation error`,
      };
    }
  }

  /**
   * Format a quantity for display with appropriate precision
   */
  private formatQuantity(quantity: Quantity, decimalPlaces: number): string {
    // Format the numeric value
    const value = Number.isInteger(quantity.value)
      ? quantity.value
      : Number(parseFloat(quantity.value.toFixed(decimalPlaces)).toString());
    const formattedValue = value % 1 === 0 ? value.toString() : value.toString();

    // Format with units
    const unitStr = quantity.unit.toString();

    if (unitStr === "1") {
      return formattedValue; // dimensionless
    }

    return `${formattedValue} ${unitStr}`;
  }
}
