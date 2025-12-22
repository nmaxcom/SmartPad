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
import { NumberValue, SemanticParsers } from "../types";
import { parseAndEvaluateExpression } from "../parsing/expressionParser";

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
    
    try {
      // Debug logging
      console.log('CombinedAssignmentEvaluatorV2: Processing combined assignment:', {
        variableName: combNode.variableName,
        expression: combNode.expression,
        raw: combNode.raw
      });
      
      // Parse the expression as a semantic value when it's a literal,
      // otherwise fall back to numeric evaluation with variable substitution.
      let semanticValue = SemanticParsers.parse(combNode.expression);
      if (!semanticValue) {
        const evalResult = parseAndEvaluateExpression(combNode.expression, context.variableContext);
        if (evalResult.error) {
          console.warn('CombinedAssignmentEvaluatorV2: Expression evaluation error:', evalResult.error);
          return this.createErrorNode(
            evalResult.error,
            combNode.variableName,
            combNode.expression,
            context.lineNumber
          );
        }
        semanticValue = NumberValue.from(evalResult.value);
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
        combNode.raw
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
    originalRaw: string
  ): CombinedRenderNode {
    const valueString = value.toString();
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
}

export const defaultCombinedAssignmentEvaluatorV2 = new CombinedAssignmentEvaluatorV2();
