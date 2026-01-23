/**
 * @file Variable Evaluator V2 - Semantic Type Version
 * @description Updated variable evaluator that works with semantic types.
 * Much simpler than the original - no type detection needed since values
 * are already parsed into SemanticValues during AST creation.
 */

import {
  ASTNode,
  ExpressionComponent,
  VariableAssignmentNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import {
  RenderNode,
  VariableRenderNode,
  ErrorRenderNode,
} from "./renderNodes";
import {
  ErrorValue,
  SemanticValue,
  SemanticValueTypes,
  NumberValue,
  DisplayOptions,
  SymbolicValue,
  createListResult,
  UnitValue,
  CurrencyValue,
  CurrencySymbol,
  SemanticParsers,
} from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { SimpleExpressionParser } from "./expressionEvaluatorV2";
import { expressionContainsUnitsNet } from "../units/unitsnetEvaluator";
import { inferListDelimiter } from "../utils/listExpression";
import { rewriteLocaleDateLiterals } from "../utils/localeDateNormalization";
import { attemptPerUnitConversion } from "./unitConversionUtils";
import { extractConversionSuffix } from "../utils/conversionSuffix";
import {
  containsRangeOperatorOutsideString,
  isValidRangeExpressionCandidate,
  normalizeRangeErrorMessage,
} from "../utils/rangeExpression";

/**
 * Semantic-aware variable evaluator
 * Handles variable assignments where values are already parsed into SemanticValues
 */
export class VariableEvaluatorV2 implements NodeEvaluator {
  /**
   * Check if this evaluator can handle the node
   * Simply checks for variable assignment nodes
   */
  canHandle(node: ASTNode): boolean {
    return isVariableAssignmentNode(node);
  }
  
  /**
   * Evaluate variable assignment
   * Much simpler now - just store the pre-parsed semantic value
   */
  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (!isVariableAssignmentNode(node)) {
      return null;
    }
    
    const varNode = node as VariableAssignmentNode;
    
    const originalRawValue = varNode.rawValue || "";
    const normalized = rewriteLocaleDateLiterals(originalRawValue, context.dateLocale);
    if (normalized.errors.length > 0) {
      return this.createErrorNode(
        normalized.errors[0],
        varNode.variableName,
        context.lineNumber
      );
    }
    const normalizedRawValue = normalized.expression;
    const conversion = this.extractConversionSuffix(normalizedRawValue);
    const expressionRawValue = conversion
      ? conversion.baseExpression
      : normalizedRawValue;
    const hasRangeOperator =
      containsRangeOperatorOutsideString(expressionRawValue);
    if (hasRangeOperator && !isValidRangeExpressionCandidate(expressionRawValue)) {
      return this.createErrorNode(
        `Invalid range expression near "${originalRawValue}"`,
        varNode.variableName,
        context.lineNumber
      );
    }

    const thousandCommaPattern = /^[\$€£¥₹₿]\s*\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*$/;
    if (thousandCommaPattern.test(normalizedRawValue)) {
      return this.createErrorNode(
        "Cannot create list: incompatible units",
        varNode.variableName,
        context.lineNumber
      );
    }

    if (this.shouldDeferToUnitsNet(varNode, context, expressionRawValue)) {
      return null;
    }
    
    try {
      // The value is already parsed as a SemanticValue!
      let semanticValue = varNode.parsedValue;

      if (semanticValue instanceof UnitValue && expressionRawValue) {
        const reparsed = SemanticParsers.parse(expressionRawValue);
        if (reparsed && !SemanticValueTypes.isError(reparsed) && reparsed.getType() === "unit") {
          semanticValue = reparsed;
        }
      }
      
      // Check if parsing resulted in an error
      if (SemanticValueTypes.isError(semanticValue)) {
        const errorValue = semanticValue as ErrorValue;

      if (SemanticValueTypes.isList(semanticValue)) {
        const resolvedList = this.resolveListSymbols(semanticValue, context);
        if (SemanticValueTypes.isError(resolvedList)) {
          return this.createErrorNode(
            hasRangeOperator
              ? normalizeRangeErrorMessage(
                  originalRawValue,
                  (resolvedList as ErrorValue).getMessage()
                )
              : (resolvedList as ErrorValue).getMessage(),
            varNode.variableName,
            context.lineNumber
          );
        }
        semanticValue = resolvedList;
      }

        // If this looks like a non-literal expression, try evaluating it numerically
        if (errorValue.getErrorType() === "parse" && expressionRawValue) {
          let resolvedValue: import("../types").SemanticValue | null = null;

          let listValue = this.evaluateListLiteralExpressions(
            expressionRawValue,
            context
          );
          if (conversion && listValue && SemanticValueTypes.isError(listValue)) {
            const looseItems = this.evaluateListLiteralItems(
              expressionRawValue,
              context
            );
            if (looseItems && !(looseItems instanceof ErrorValue)) {
              const convertedItems: SemanticValue[] = [];
              let conversionError: ErrorValue | null = null;
              for (const item of looseItems) {
                const converted = this.applyUnitConversion(
                  item,
                  conversion.target,
                  conversion.keyword
                );
                if (SemanticValueTypes.isError(converted)) {
                  conversionError = converted as ErrorValue;
                  break;
                }
                convertedItems.push(converted);
              }
              listValue = conversionError
                ? conversionError
                : createListResult(
                    convertedItems,
                    inferListDelimiter(expressionRawValue)
                  );
            }
          }
          if (listValue) {
            if (SemanticValueTypes.isError(listValue)) {
              return this.createErrorNode(
                hasRangeOperator
                  ? normalizeRangeErrorMessage(
                      originalRawValue,
                      (listValue as ErrorValue).getMessage()
                    )
                  : (listValue as ErrorValue).getMessage(),
                varNode.variableName,
                context.lineNumber
              );
            }
            resolvedValue = listValue;
          } else {
            try {
              resolvedValue = SimpleExpressionParser.parseComponents(
              parseExpressionComponents(expressionRawValue),
              context
            );
            } catch (parseError) {
              resolvedValue = ErrorValue.parseError(
                parseError instanceof Error ? parseError.message : String(parseError)
              );
            }

            if (!resolvedValue || SemanticValueTypes.isError(resolvedValue)) {
                const evalResult = parseAndEvaluateExpression(
                  expressionRawValue,
                  context.variableContext
                );

              if (evalResult.error) {
                if (/Undefined variable|not defined/i.test(evalResult.error)) {
                  resolvedValue = SymbolicValue.from(expressionRawValue);
                } else {
                  return this.createErrorNode(
                    hasRangeOperator
                      ? normalizeRangeErrorMessage(
                          originalRawValue,
                          evalResult.error
                        )
                      : `Invalid variable value: ${evalResult.error}`,
                    varNode.variableName,
                    context.lineNumber
                  );
                }
              }

              if (!resolvedValue || SemanticValueTypes.isError(resolvedValue)) {
                resolvedValue = NumberValue.from(evalResult.value);
              }
            }
          }

          if (resolvedValue) {
            semanticValue = resolvedValue;
          }
        } else {
          return this.createErrorNode(
            hasRangeOperator
              ? normalizeRangeErrorMessage(
                  originalRawValue,
                  errorValue.getMessage()
                )
              : `Invalid variable value: ${errorValue.getMessage()}`,
            varNode.variableName,
            context.lineNumber
          );
        }
      }
      
      if (SemanticValueTypes.isSymbolic(semanticValue)) {
        const identifier = semanticValue.toString().trim();
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
          const referencedVariable = context.variableContext.get(identifier);
          if (referencedVariable?.value instanceof SemanticValue) {
            semanticValue = referencedVariable.value;
          }
        }
      }

      if (
        SemanticValueTypes.isSymbolic(semanticValue) &&
        expressionRawValue &&
        expressionRawValue.includes("..")
      ) {
        const evaluated = this.evaluateExpressionComponentsFromRaw(
          expressionRawValue,
          context
        );
        if (evaluated) {
          semanticValue = evaluated;
        }
      }

      if (conversion) {
        const converted = this.applyUnitConversion(
          semanticValue,
          conversion.target,
          conversion.keyword
        );
        if (SemanticValueTypes.isError(converted)) {
          return this.createErrorNode(
            (converted as ErrorValue).getMessage(),
            varNode.variableName,
            context.lineNumber
          );
        }
        semanticValue = converted;
      }

      // Store the variable with its semantic value
      const result = context.variableStore.setVariableWithSemanticValue(
        varNode.variableName,
        semanticValue,
        varNode.rawValue
      );
      
      if (!result.success) {
        return this.createErrorNode(
          result.error || "Failed to set variable",
          varNode.variableName,
          context.lineNumber
        );
      }
      
      // Create render node showing the assignment
      return this.createVariableRenderNode(
        varNode.variableName,
        semanticValue,
        context.lineNumber,
        varNode.raw,
        this.getDisplayOptions(context)
      );
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorNode(message, varNode.variableName, context.lineNumber);
    }
  }

  private resolveListSymbols(
    listValue: SemanticValue,
    context: EvaluationContext
  ): SemanticValue {
    if (!SemanticValueTypes.isList(listValue)) {
      return listValue;
    }
    const list = listValue as import("../types").ListValue;
    const items: SemanticValue[] = [];
    for (const item of list.getItems()) {
      if (SemanticValueTypes.isSymbolic(item)) {
        const name = item.toString().trim();
        const variable = context.variableContext.get(name);
        const value = variable?.value;
        if (value instanceof SemanticValue) {
          items.push(value);
          continue;
        }
        return ErrorValue.semanticError(`Undefined variable: ${name}`);
      }
      items.push(item);
    }
    return createListResult(items, list.getDelimiter());
  }

  private shouldDeferToUnitsNet(
    node: VariableAssignmentNode,
    context: EvaluationContext,
    normalizedExpression?: string
  ): boolean {
    const parsedValue = node.parsedValue;
    if (parsedValue && !SemanticValueTypes.isError(parsedValue)) {
      return false;
    }

    const expression =
      normalizedExpression?.trim() ||
      (node.rawValue || node.parsedValue?.toString() || "").trim();
    if (expression.includes(",")) {
      return false;
    }
    if (expression.includes("..")) {
      return false;
    }
    if (!expression) {
      return false;
    }
    if (/[$€£¥₹₿]/.test(expression) || /\b(CHF|CAD|AUD)\b/.test(expression)) {
      return false;
    }

    if (expressionContainsUnitsNet(expression)) {
      return true;
    }

    const normalizedExpr = expression.replace(/\s+/g, " ").trim();
    if (!normalizedExpr) {
      return false;
    }

    for (const [name, variable] of context.variableContext.entries()) {
      const normalizedName = name.replace(/\s+/g, " ").trim();
      if (!normalizedName) {
        continue;
      }
      if (!normalizedExpr.includes(normalizedName)) {
        continue;
      }
      const value = variable.value;
      if (value instanceof UnitValue) {
        return true;
      }
    }

    return false;
  }
  
  /**
   * Create a variable render node
   */
  private createVariableRenderNode(
    variableName: string,
    value: import("../types").SemanticValue,
    lineNumber: number,
    originalRaw: string,
    displayOptions: DisplayOptions
  ): VariableRenderNode {
    const valueString = value.toString(displayOptions);
    const displayText = `${variableName} = ${valueString}`;
    
    return {
      type: "variable",
      variableName,
      value: valueString,
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
    lineNumber: number
  ): ErrorRenderNode {
    return {
      type: "error",
      error: message,
      errorType: "runtime",
      displayText: `${variableName} => ⚠️ ${message}`,
      line: lineNumber,
      originalRaw: variableName,
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

  private evaluateListLiteralExpressions(
    rawValue: string,
    context: EvaluationContext
  ): SemanticValue | null {
    const parts = this.splitCommaSeparatedParts(rawValue);
    if (parts.length <= 1) {
      return null;
    }
    const items: SemanticValue[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const components = parseExpressionComponents(trimmed);
      const evaluated = SimpleExpressionParser.parseComponents(components, context);
      if (!evaluated || SemanticValueTypes.isError(evaluated)) {
        return null;
      }
      items.push(evaluated);
    }
    if (items.length === 0) {
      return null;
    }
    return createListResult(items, inferListDelimiter(rawValue));
  }

  private evaluateListLiteralItems(
    rawValue: string,
    context: EvaluationContext
  ): SemanticValue[] | ErrorValue | null {
    const parts = this.splitCommaSeparatedParts(rawValue);
    if (parts.length <= 1) {
      return null;
    }
    const items: SemanticValue[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const components = parseExpressionComponents(trimmed);
      const evaluated = SimpleExpressionParser.parseComponents(components, context);
      if (!evaluated || SemanticValueTypes.isError(evaluated)) {
        return evaluated as ErrorValue;
      }
      items.push(evaluated);
    }
    if (items.length === 0) {
      return null;
    }
    return items;
  }

  private extractConversionSuffix(
    expression: string
  ): { baseExpression: string; target: string; keyword: string } | null {
    return extractConversionSuffix(expression);
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
      if (symbol) {
        return { unit: "", symbol };
      }
      return null;
    }

    return { unit, symbol };
  }

  private applyUnitConversion(
    value: SemanticValue,
    target: string,
    keyword: string
  ): SemanticValue {
    const parsed = this.parseConversionTarget(target);
    if (!parsed) {
      return ErrorValue.semanticError(`Expected unit after '${keyword}'`);
    }

    if (SemanticValueTypes.isList(value)) {
      const listValue = value as import("../types").ListValue;
      const convertedItems: SemanticValue[] = [];
      for (const item of listValue.getItems()) {
        const converted = this.applyUnitConversion(item, target, keyword);
        if (SemanticValueTypes.isError(converted)) {
          return converted;
        }
        convertedItems.push(converted);
      }
      return createListResult(convertedItems, listValue.getDelimiter());
    }

    if (value.getType() === "unit") {
      if (!parsed.unit) {
        return ErrorValue.semanticError("Cannot convert non-unit value");
      }
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
      if (!parsed.unit) {
        return ErrorValue.semanticError("Cannot convert non-unit value");
      }
      const currencyValue = value as import("../types").CurrencyUnitValue;
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

    if (value.getType() === "currency") {
      const currencyValue = value as CurrencyValue;
      if (!parsed.symbol || parsed.symbol !== currencyValue.getSymbol()) {
        return ErrorValue.semanticError("Cannot convert between different currencies");
      }
      return currencyValue;
    }

    if (value.getType() === "number") {
      const numeric = value.getNumericValue();
      if (parsed.symbol) {
        return new CurrencyValue(parsed.symbol as CurrencySymbol, numeric);
      }
      if (parsed.unit) {
        return UnitValue.fromValueAndUnit(numeric, parsed.unit);
      }
    }

    return ErrorValue.semanticError("Cannot convert non-unit value");
  }

  private splitCommaSeparatedParts(rawValue: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = "";

    for (const char of rawValue) {
      if (char === "(" || char === "[") {
        depth += 1;
      } else if (char === ")" || char === "]") {
        depth = Math.max(0, depth - 1);
      }
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

    return parts;
  }

  private evaluateExpressionComponentsFromRaw(
    rawValue: string,
    context: EvaluationContext
  ): SemanticValue | null {
    if (!rawValue) {
      return null;
    }
    let components: ExpressionComponent[] = [];
    try {
      components = parseExpressionComponents(rawValue);
    } catch (_) {
      return null;
    }
    if (components.length === 0) {
      return null;
    }
    const evaluated = SimpleExpressionParser.parseComponents(components, context);
    if (!evaluated || SemanticValueTypes.isError(evaluated)) {
      return null;
    }
    return evaluated;
  }
}

export const defaultVariableEvaluatorV2 = new VariableEvaluatorV2();
