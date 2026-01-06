"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedMathService = void 0;
const types_1 = require("../types");
const MathJsEngine_1 = require("./MathJsEngine");
const percentageLowerer_1 = require("../lowering/percentageLowerer");
/**
 * Unified service for mathematical evaluation
 */
class UnifiedMathService {
    mathEngine;
    constructor() {
        this.mathEngine = new MathJsEngine_1.MathJsEngine();
    }
    /**
     * Evaluate an expression node using the AST-first, semantic lowering approach
     *
     * @param node The expression node to evaluate
     * @param context The evaluation context
     * @returns The evaluated result as a SemanticValue
     */
    evaluate(node, context) {
        try {
            // 1. Lower the AST to a Math.js expression
            const scope = {};
            const loweringResult = this.lowerExpression(node, scope, context);
            // 2. Build the complete scope from required variables
            this.buildScope(loweringResult.requiredVariables, scope, context);
            // 3. Evaluate with Math.js
            return this.mathEngine.evaluate(loweringResult.mathJsExpression, scope);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return new types_1.ErrorValue('runtime', message);
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
    lowerExpression(node, scope, context) {
        // Apply percentage lowerer
        return percentageLowerer_1.PercentageLowerer.lower(node, scope);
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
    buildScope(requiredVariables, scope, context) {
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
exports.UnifiedMathService = UnifiedMathService;
