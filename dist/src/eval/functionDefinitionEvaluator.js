"use strict";
/**
 * @file Function Definition Evaluator
 * @description Registers user-defined functions in the evaluation context.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultFunctionDefinitionEvaluator = exports.FunctionDefinitionEvaluator = void 0;
const ast_1 = require("../parsing/ast");
class FunctionDefinitionEvaluator {
    canHandle(node) {
        return (0, ast_1.isFunctionDefinitionNode)(node);
    }
    evaluate(node, context) {
        if (!(0, ast_1.isFunctionDefinitionNode)(node)) {
            return null;
        }
        const def = node;
        const normalizedName = def.functionName.replace(/\s+/g, " ").trim();
        if (!context.functionStore) {
            context.functionStore = new Map();
        }
        if (context.functionStore.has(normalizedName)) {
            console.warn(`Function redefined: ${normalizedName}`);
        }
        context.functionStore.set(normalizedName, def);
        const renderNode = {
            type: "text",
            content: def.raw,
            line: def.line,
            originalRaw: def.raw,
        };
        return renderNode;
    }
}
exports.FunctionDefinitionEvaluator = FunctionDefinitionEvaluator;
exports.defaultFunctionDefinitionEvaluator = new FunctionDefinitionEvaluator();
