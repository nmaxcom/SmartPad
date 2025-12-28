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
import { ErrorValue, SemanticValueTypes, NumberValue } from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";

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
          const evalResult = parseAndEvaluateExpression(
            varNode.rawValue,
            context.variableContext
          );

          if (evalResult.error) {
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

          semanticValue = NumberValue.from(evalResult.value);
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
        context.decimalPlaces
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
    decimalPlaces: number
  ): VariableRenderNode {
    const valueString = value.toString({ precision: decimalPlaces });
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
}

export const defaultVariableEvaluatorV2 = new VariableEvaluatorV2();
