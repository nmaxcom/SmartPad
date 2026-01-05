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
import { ErrorValue, SemanticValueTypes, NumberValue, DisplayOptions, SymbolicValue } from "../types";
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

        // If this looks like a non-literal expression, try evaluating it numerically
        if (errorValue.getErrorType() === "parse" && varNode.rawValue) {
          let resolvedValue: import("../types").SemanticValue | null;
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
              if (/Undefined variable/i.test(evalResult.error)) {
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
    };
  }
}

export const defaultVariableEvaluatorV2 = new VariableEvaluatorV2();
