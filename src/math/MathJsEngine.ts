/**
 * Math.js Engine Wrapper
 * 
 * This module provides a thin wrapper around Math.js for expression evaluation.
 * It handles configuration, evaluation, and wrapping results in SemanticValue types.
 */

import { create, all, MathJsStatic } from 'mathjs';
import { 
  SemanticValue, 
  NumberValue, 
  ErrorValue 
} from '../types';

/**
 * Wrapper for Math.js library
 */
export class MathJsEngine {
  private math: MathJsStatic;
  
  constructor() {
    this.math = create(all);
    this.configureMath();
  }
  
  /**
   * Configure Math.js settings
   */
  private configureMath() {
    this.math.config({
      number: 'number', // Use JavaScript numbers for performance
      precision: 14,    // Precision for BigNumber mode if needed
      epsilon: 1e-12    // Small number comparison threshold
    });
  }
  
  /**
   * Evaluate a Math.js expression with the given scope
   * 
   * @param expression The Math.js-compatible expression string
   * @param scope The variable scope for evaluation
   * @returns The evaluated result as a SemanticValue
   */
  evaluate(expression: string, scope: Record<string, any>): SemanticValue {
    try {
      const result = this.math.evaluate(expression, scope);
      
      // Convert the result to a SemanticValue
      if (typeof result === 'number') {
        return new NumberValue(result);
      } else if (result === undefined) {
        return new ErrorValue('Expression resulted in undefined');
      } else {
        // For other types (matrices, complex numbers, etc.)
        // We'll need to add more conversions as needed
        return new NumberValue(Number(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new ErrorValue('runtime', `Math.js error: ${message}`);
    }
  }
}
