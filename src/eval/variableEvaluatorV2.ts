/**
 * @file Variable Evaluator V2 - Semantic Type Version
 * @description Updated variable evaluator that works with semantic types.
 * Much simpler than the original - no type detection needed since values
 * are already parsed into SemanticValues during AST creation.
 */

import {
  ASTNode,
  VariableAssignmentNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import {
  RenderNode,
  VariableRenderNode,
  ErrorRenderNode,
} from "./renderNodes";
import { ErrorValue, SemanticValue, SemanticValueTypes, NumberValue, DisplayOptions, SymbolicValue, createListResult } from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { SimpleExpressionParser } from "./expressionEvaluatorV2";

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
    
    try {
      // Debug logging
      console.log('VariableEvaluatorV2: Processing variable assignment:', {
        variableName: varNode.variableName,
        rawValue: varNode.rawValue,
        parsedValue: varNode.parsedValue,
        parsedValueType: varNode.parsedValue?.getType()
      });
      
      // The value is already parsed as a SemanticValue!
      let semanticValue = varNode.parsedValue;
      
      // Check if parsing resulted in an error
      if (SemanticValueTypes.isError(semanticValue)) {
      const errorValue = semanticValue as ErrorValue;
      if (varNode.variableName === "vals") {
        console.log("vals error type:", errorValue.getErrorType());
      }

      if (SemanticValueTypes.isList(semanticValue)) {
        const resolvedList = this.resolveListSymbols(semanticValue, context);
        if (SemanticValueTypes.isError(resolvedList)) {
          return this.createErrorNode(
            (resolvedList as ErrorValue).getMessage(),
            varNode.variableName,
            context.lineNumber
          );
        }
        semanticValue = resolvedList;
      }

        // If this looks like a non-literal expression, try evaluating it numerically
        if (errorValue.getErrorType() === "parse" && varNode.rawValue) {
          let resolvedValue: import("../types").SemanticValue | null = null;

          const listValue = this.evaluateListLiteralExpressions(
            varNode.rawValue,
            context
          );
          if (listValue) {
            if (SemanticValueTypes.isError(listValue)) {
              return this.createErrorNode(
                (listValue as ErrorValue).getMessage(),
                varNode.variableName,
                context.lineNumber
              );
            }
            resolvedValue = listValue;
          } else {
            try {
              resolvedValue = SimpleExpressionParser.parseComponents(
                parseExpressionComponents(varNode.rawValue),
                context
              );
            } catch (parseError) {
              resolvedValue = ErrorValue.parseError(
                parseError instanceof Error ? parseError.message : String(parseError)
              );
            }

            if (!resolvedValue || SemanticValueTypes.isError(resolvedValue)) {
              const evalResult = parseAndEvaluateExpression(
                varNode.rawValue,
                context.variableContext
              );

              if (evalResult.error) {
                if (/Undefined variable|not defined/i.test(evalResult.error)) {
                  resolvedValue = SymbolicValue.from(varNode.rawValue);
                } else {
                  console.warn(
                    "VariableEvaluatorV2: Expression evaluation error:",
                    evalResult.error
                  );
                  return this.createErrorNode(
                    `Invalid variable value: ${evalResult.error}`,
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
          console.warn(
            "VariableEvaluatorV2: Semantic value is an error:",
            errorValue.getMessage()
          );
          return this.createErrorNode(
            `Invalid variable value: ${errorValue.getMessage()}`,
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
    return createListResult(items);
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
}

export const defaultVariableEvaluatorV2 = new VariableEvaluatorV2();
