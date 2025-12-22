/**
 * Unified Math Service
 * 
 * This service orchestrates the evaluation of expressions using Math.js:
 * 1. AST → semantics → lowering → Math.js expression + scope
 * 2. Math.js evaluation
 * 3. Wrap result in appropriate SemanticValue
 * 
 * It provides a single entry point for all mathematical evaluation,
 * leveraging the semantic type system and lowerers.
 */

import { 
  ExpressionNode, 
  CombinedAssignmentNode 
} from '../parsing/ast';
import { 
  SemanticValue, 
  ErrorValue 
} from '../types';
import { MathJsEngine } from './MathJsEngine';
import { PercentageLowerer } from '../lowering/percentageLowerer';
import { EvaluationContext } from '../eval';

/**
 * Unified service for mathematical evaluation
 */
export class UnifiedMathService {
  private mathEngine: MathJsEngine;
  
  constructor() {
    this.mathEngine = new MathJsEngine();
  }
  
  /**
   * Evaluate an expression node using the AST-first, semantic lowering approach
   * 
   * @param node The expression node to evaluate
   * @param context The evaluation context
   * @returns The evaluated result as a SemanticValue
   */
  evaluate(node: ExpressionNode | CombinedAssignmentNode, context: EvaluationContext): SemanticValue {
    try {
      // 1. Lower the AST to a Math.js expression
      const scope: Record<string, any> = {};
      const loweringResult = this.lowerExpression(node, scope, context);
      
      // 2. Build the complete scope from required variables
      this.buildScope(loweringResult.requiredVariables, scope, context);
      
      // 3. Evaluate with Math.js
      return this.mathEngine.evaluate(loweringResult.mathJsExpression, scope);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new ErrorValue('runtime', message);
    }
  }
  
  /**
   * Lower an AST node to a Math.js expression
   * 
   * @param node The AST node to lower
   * @param scope The scope object to populate
   * @param context The evaluation context
   * @returns The lowering result
   */
  private lowerExpression(
    node: ExpressionNode | CombinedAssignmentNode, 
    scope: Record<string, any>,
    context: EvaluationContext
  ) {
    // Apply percentage lowerer
    return PercentageLowerer.lower(node, scope);
    
    // In the future, we'll add more lowerers here:
    // - Units lowerer
    // - Currency lowerer
    // - etc.
  }
  
  /**
   * Build the Math.js scope from required variables
   * 
   * @param requiredVariables Set of variable names required for evaluation
   * @param scope The scope object to populate
   * @param context The evaluation context
   */
  private buildScope(
    requiredVariables: Set<string>,
    scope: Record<string, any>,
    context: EvaluationContext
  ): void {
    // Add all required variables to the scope
    requiredVariables.forEach(varName => {
      const variable = context.variableContext.get(varName);
      if (variable) {
        if (variable.value) {
          // Use the semantic value's numeric representation
          scope[varName] = variable.value.getNumericValue();
        }
      }
    });
  }
}
