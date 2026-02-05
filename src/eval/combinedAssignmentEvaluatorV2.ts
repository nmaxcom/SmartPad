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
  ExpressionComponent,
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
  CurrencyValue,
  CurrencySymbol,
  DurationValue,
  DisplayOptions,
  SemanticParsers,
  SemanticValue,
  SemanticValueTypes,
  SymbolicValue,
  createListResult,
  ListValue,
} from "../types";
import type { DurationUnit } from "../types/DurationValue";
import { inferListDelimiter, splitTopLevelCommas } from "../utils/listExpression";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { SimpleExpressionParser } from "./expressionEvaluatorV2";
import { isAggregatorExpression } from "./aggregatorUtils";
import { rewriteLocaleDateLiterals } from "../utils/localeDateNormalization";
import {
  containsRangeOperatorOutsideString,
  isValidRangeExpressionCandidate,
  normalizeRangeErrorMessage,
} from "../utils/rangeExpression";
import { attemptPerUnitConversion } from "./unitConversionUtils";
import { extractConversionSuffix } from "../utils/conversionSuffix";
import {
  convertCurrencyUnitValue,
  convertCurrencyValue,
  normalizeCurrencyTargetSymbol,
} from "../utils/currencyFx";

const durationUnitByVariableName: Record<string, DurationUnit> = {
  "business day": "businessDay",
  "business days": "businessDay",
  year: "year",
  years: "year",
  month: "month",
  months: "month",
  week: "week",
  weeks: "week",
  day: "day",
  days: "day",
  hour: "hour",
  hours: "hour",
  minute: "minute",
  minutes: "minute",
  second: "second",
  seconds: "second",
  millisecond: "millisecond",
  milliseconds: "millisecond",
};

const normalizeDurationVariableName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

const isBareNumberLiteral = (value: string): boolean =>
  /^\s*[+-]?\d+(?:\.\d+)?\s*$/.test(value);

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
    const normalized = rewriteLocaleDateLiterals(combNode.expression, context.dateLocale);
    if (normalized.errors.length > 0) {
      return this.createErrorNode(
        normalized.errors[0],
        combNode.variableName,
        combNode.expression,
        context.lineNumber
      );
    }
    const hasRangeOperator = containsRangeOperatorOutsideString(
      normalized.expression
    );
    if (hasRangeOperator && !isValidRangeExpressionCandidate(normalized.expression)) {
      return this.createErrorNode(
        `Invalid range expression near "${combNode.expression}"`,
        combNode.variableName,
        combNode.expression,
        context.lineNumber
      );
    }
    const conversion = this.extractConversionSuffix(normalized.expression);
    const expression = conversion ? conversion.baseExpression : normalized.expression;
    const components = this.parseComponents(expression);
    
    try {
      let listCandidate = this.tryBuildListFromExpression(expression, context);
      if (conversion && listCandidate && SemanticValueTypes.isError(listCandidate)) {
        const looseItems = this.tryBuildListItems(expression, context);
        if (looseItems && !(looseItems instanceof ErrorValue)) {
          const convertedItems: SemanticValue[] = [];
          let conversionError: ErrorValue | null = null;
          for (const item of looseItems) {
            const converted = this.applyUnitConversion(
              item,
              conversion.target,
              conversion.keyword,
              context
            );
            if (SemanticValueTypes.isError(converted)) {
              conversionError = converted as ErrorValue;
              break;
            }
            convertedItems.push(converted);
          }
          listCandidate = conversionError
            ? conversionError
            : createListResult(
                convertedItems,
                inferListDelimiter(expression)
              );
        }
      }
      if (listCandidate && SemanticValueTypes.isError(listCandidate)) {
        return this.createErrorNode(
          hasRangeOperator
            ? normalizeRangeErrorMessage(
                combNode.expression,
                (listCandidate as ErrorValue).getMessage()
              )
            : (listCandidate as ErrorValue).getMessage(),
          combNode.variableName,
          combNode.expression,
          context.lineNumber
        );
      }

      let semanticValue: SemanticValue | null = listCandidate;

      if (!semanticValue) {
        semanticValue =
          this.resolveVariableReference(expression, context) ||
          SemanticParsers.parse(expression);

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
            if (/Undefined variable|not defined/i.test(evalResult.error)) {
              semanticValue = SymbolicValue.from(expression);
            } else {
              return this.createErrorNode(
                hasRangeOperator
                  ? normalizeRangeErrorMessage(
                      combNode.expression,
                      evalResult.error
                    )
                  : evalResult.error,
                combNode.variableName,
                combNode.expression,
                context.lineNumber
              );
            }
          }
          if (!semanticValue) {
            semanticValue = NumberValue.from(evalResult.value);
          }
        }
      }

      if (!conversion && semanticValue instanceof NumberValue && isBareNumberLiteral(expression)) {
        const normalizedVarName = normalizeDurationVariableName(combNode.variableName);
        const durationUnit = durationUnitByVariableName[normalizedVarName];
        if (durationUnit) {
          semanticValue = new DurationValue({ [durationUnit]: semanticValue.getNumericValue() });
        }
      }

      if (conversion) {
        semanticValue = this.applyUnitConversion(
          semanticValue,
          conversion.target,
          conversion.keyword,
          context
        );
      }

      if (SemanticValueTypes.isError(semanticValue)) {
        const errorMessage = (semanticValue as ErrorValue).getMessage();
        return this.createErrorNode(
          hasRangeOperator
            ? normalizeRangeErrorMessage(combNode.expression, errorMessage)
            : errorMessage,
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
          hasRangeOperator
            ? normalizeRangeErrorMessage(
                combNode.expression,
                result.error || "Failed to set variable"
              )
            : result.error || "Failed to set variable",
          combNode.variableName,
          combNode.expression,
          context.lineNumber
        );
      }
      
      // Create combined render node that shows both assignment and result
      const baseDisplayOptions = this.getDisplayOptions(context);
      const displayOptions = {
        ...baseDisplayOptions,
        preferBaseUnit: false,
        forceUnit: !!conversion,
        precision: isAggregatorExpression(expression)
          ? 4
          : baseDisplayOptions.precision,
      };
      const displayValue = SemanticValueTypes.isSymbolic(semanticValue)
        ? this.substituteKnownValues(expression, context, displayOptions)
        : semanticValue.toString(displayOptions);

      return this.createCombinedRenderNode(
        combNode.variableName,
        combNode.expression,
        semanticValue,
        displayValue,
        context.lineNumber,
        combNode.raw
      );
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorNode(
        hasRangeOperator
          ? normalizeRangeErrorMessage(combNode.expression, message)
          : message,
        combNode.variableName,
        combNode.expression,
        context.lineNumber
      );
    }
  }
  
  /**
   * Create a combined render node showing assignment and result
   */
  private createCombinedRenderNode(
    variableName: string,
    expression: string,
    value: import("../types").SemanticValue,
    displayValue: string,
    lineNumber: number,
    originalRaw: string
  ): CombinedRenderNode {
    const displayText = `${variableName} = ${expression} => ${displayValue}`;
    
    return {
      type: "combined",
      variableName,
      expression,
      result: displayValue,
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
    return extractConversionSuffix(expression);
  }

  private applyUnitConversion(
    value: SemanticValue,
    target: string,
    keyword: string,
    context: EvaluationContext
  ): SemanticValue {
    const parsed = this.parseConversionTarget(target);
    if (!parsed) {
      return ErrorValue.semanticError(`Expected unit after '${keyword}'`);
    }

    if (SemanticValueTypes.isList(value)) {
      const listValue = value as ListValue;
      const convertedItems: SemanticValue[] = [];
      for (const item of listValue.getItems()) {
        const converted = this.applyUnitConversion(item, target, keyword, context);
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
      const currencyValue = value as CurrencyUnitValue;
      if (!parsed.unit && !parsed.symbol) {
        return ErrorValue.semanticError("Cannot convert non-unit value");
      }
      const targetUnit = parsed.unit || currencyValue.getUnit();
      const displayUnit = targetUnit;
      const targetSymbol = parsed.symbol
        ? (parsed.symbol as CurrencySymbol)
        : (currencyValue.getSymbol() as CurrencySymbol);
      return convertCurrencyUnitValue(
        currencyValue,
        targetSymbol,
        targetUnit,
        displayUnit,
        1,
        context
      );
    }

    if (value.getType() === "currency") {
      const currencyValue = value as CurrencyValue;
      if (!parsed.symbol) {
        return ErrorValue.semanticError("Cannot convert non-unit value");
      }
      return convertCurrencyValue(
        currencyValue,
        parsed.symbol as CurrencySymbol,
        context
      );
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
      symbol = normalizeCurrencyTargetSymbol(symbolMatch[1]) ?? undefined;
      raw = symbolMatch[2].trim();
    } else {
      const codeMatch = raw.match(/^([A-Za-z]{3})\b(.*)$/);
      if (codeMatch) {
        const normalized = normalizeCurrencyTargetSymbol(codeMatch[1]);
        if (normalized) {
          symbol = normalized;
          raw = codeMatch[2].trim();
        }
      }
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

      const resolved = this.evaluateListSegment(trimmed, context);
      if (!resolved) {
        return null;
      }
      if (SemanticValueTypes.isError(resolved)) {
        return resolved;
      }
      items.push(resolved);
    }

    return createListResult(items, inferListDelimiter(expression));
  }

  private tryBuildListItems(
    expression: string,
    context: EvaluationContext
  ): SemanticValue[] | ErrorValue | null {
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

      const resolved = this.evaluateListSegment(trimmed, context);
      if (!resolved) {
        return null;
      }
      if (SemanticValueTypes.isError(resolved)) {
        return resolved;
      }
      items.push(resolved);
    }

    return items;
  }

  private evaluateListSegment(
    segment: string,
    context: EvaluationContext
  ): SemanticValue | null {
    const trimmed = segment.trim();
    if (!trimmed) {
      return null;
    }

    const literal = SemanticParsers.parse(trimmed);
    if (literal) {
      return literal;
    }

    const variable = this.resolveVariableReference(trimmed, context);
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

  private substituteKnownValues(
    expression: string,
    context: EvaluationContext,
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

    context.variableContext.forEach((variable, name) => {
      const value = variable.value;
      if (!value || SemanticValueTypes.isSymbolic(value) || SemanticValueTypes.isError(value)) {
        return;
      }
      substitutions.set(name.replace(/\s+/g, " ").trim(), formatValue(value));
    });

    context.variableStore.getAllVariables().forEach((variable) => {
      const value = variable.value;
      if (!value || SemanticValueTypes.isSymbolic(value) || SemanticValueTypes.isError(value)) {
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

export const defaultCombinedAssignmentEvaluatorV2 = new CombinedAssignmentEvaluatorV2();
