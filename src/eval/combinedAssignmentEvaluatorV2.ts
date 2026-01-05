/**
 * @file Combined Assignment Evaluator V2 - Semantic Type Version
 * @description Handles combined assignment expressions like "x = 100 =>"
 * where a variable is assigned and its result is shown immediately.
 * 
 * This evaluator works with semantic types and processes both the assignment
 * and the evaluation display in one operation.
 */

import {
  ASTNode,
  CombinedAssignmentNode,
  isCombinedAssignmentNode,
} from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import {
  RenderNode,
  CombinedRenderNode,
  ErrorRenderNode,
} from "./renderNodes";
import {
  ErrorValue,
  NumberValue,
  UnitValue,
  CurrencyUnitValue,
  DisplayOptions,
  SemanticParsers,
  SemanticValue,
  SemanticValueTypes,
} from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { SimpleExpressionParser } from "./expressionEvaluatorV2";

/**
 * Evaluator for combined assignment operations with semantic types
 * Handles expressions like "speed = 100 m/s =>"
 */
export class CombinedAssignmentEvaluatorV2 implements NodeEvaluator {
  /**
   * Check if this evaluator can handle the node
   */
  canHandle(node: ASTNode): boolean {
    return isCombinedAssignmentNode(node);
  }
  
  /**
   * Evaluate combined assignment and display
   * This does both: store the variable AND show the result
   */
  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isCombinedAssignmentNode(node)) {
      return null;
    }
    
    const combNode = node as CombinedAssignmentNode;
    const conversion = this.extractConversionSuffix(combNode.expression);
    const expression = conversion ? conversion.baseExpression : combNode.expression;
    const components = conversion ? this.parseComponents(expression) : combNode.components;
    
    try {
      // Debug logging
      console.log('CombinedAssignmentEvaluatorV2: Processing combined assignment:', {
        variableName: combNode.variableName,
        expression,
        raw: combNode.raw
      });
      
      // Parse the expression as a semantic value when it's a literal,
      // otherwise evaluate via semantic component parsing.
      let semanticValue =
        SemanticParsers.parse(expression) ||
        this.resolveVariableReference(expression, context);

      if (!semanticValue && components.length > 0) {
        semanticValue = SimpleExpressionParser.parseComponents(
          components,
          context
        );
      }

      if (!semanticValue) {
        semanticValue = SimpleExpressionParser.parseArithmetic(
          expression,
          context
        );
      }

      if (!semanticValue) {
        const evalResult = parseAndEvaluateExpression(
          expression,
          context.variableContext
        );
        if (evalResult.error) {
          console.warn(
            "CombinedAssignmentEvaluatorV2: Expression evaluation error:",
            evalResult.error
          );
          return this.createErrorNode(
            evalResult.error,
            combNode.variableName,
            combNode.expression,
            context.lineNumber
          );
        }
        semanticValue = NumberValue.from(evalResult.value);
      }

      if (conversion) {
        semanticValue = this.applyUnitConversion(semanticValue, conversion.target, conversion.keyword);
      }

      if (SemanticValueTypes.isError(semanticValue)) {
        const errorMessage = (semanticValue as ErrorValue).getMessage();
        return this.createErrorNode(
          errorMessage,
          combNode.variableName,
          combNode.expression,
          context.lineNumber
        );
      }
      
      // Store the variable with its semantic value
      const result = context.variableStore.setVariableWithSemanticValue(
        combNode.variableName,
        semanticValue,
        combNode.expression // Use expression as raw value
      );
      
      if (!result.success) {
        return this.createErrorNode(
          result.error || "Failed to set variable",
          combNode.variableName,
          combNode.expression,
          context.lineNumber
        );
      }
      
      // Create combined render node that shows both assignment and result
      return this.createCombinedRenderNode(
        combNode.variableName,
        combNode.expression,
        semanticValue,
        context.lineNumber,
        combNode.raw,
        this.getDisplayOptions(context)
      );
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorNode(message, combNode.variableName, combNode.expression, context.lineNumber);
    }
  }
  
  /**
   * Create a combined render node showing assignment and result
   */
  private createCombinedRenderNode(
    variableName: string,
    expression: string,
    value: import("../types").SemanticValue,
    lineNumber: number,
    originalRaw: string,
    displayOptions: DisplayOptions
  ): CombinedRenderNode {
    const valueString = value.toString(displayOptions);
    const displayText = `${variableName} = ${expression} => ${valueString}`;
    
    return {
      type: "combined",
      variableName,
      expression,
      result: valueString,
      displayText,
      line: lineNumber,
      originalRaw,
    };
  }
  
  /**
   * Create an error render node
   */
  private createErrorNode(
    message: string,
    variableName: string,
    expression: string,
    lineNumber: number
  ): ErrorRenderNode {
    return {
      type: "error",
      error: message,
      errorType: "runtime",
      displayText: `${variableName} = ${expression} => ⚠️ ${message}`,
      line: lineNumber,
      originalRaw: `${variableName} = ${expression} =>`,
    };
  }

  private resolveVariableReference(
    expression: string,
    context: EvaluationContext
  ): SemanticValue | null {
    const trimmed = expression.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(trimmed)) {
      return null;
    }

    const normalized = trimmed.replace(/\s+/g, " ").trim();
    const variable = context.variableContext.get(normalized);
    if (!variable) {
      return null;
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

  private parseComponents(expression: string): import("../parsing/ast").ExpressionComponent[] {
    try {
      return parseExpressionComponents(expression);
    } catch {
      return [];
    }
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
}

export const defaultCombinedAssignmentEvaluatorV2 = new CombinedAssignmentEvaluatorV2();
