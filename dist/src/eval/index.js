"use strict";
/**
 * @file Evaluation Module Index
 * @description This file serves as the central hub for the evaluation-related logic of SmartPad.
 * It exports all necessary components, including the different types of evaluators and the main registry.
 * It also handles the initial setup of the default evaluator registry, defining the priority
 * in which different types of expressions are handled.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultErrorEvaluator = exports.ErrorEvaluator = exports.defaultCommentEvaluator = exports.CommentEvaluator = exports.defaultPlainTextEvaluator = exports.PlainTextEvaluator = exports.defaultRegistry = exports.EvaluatorRegistry = void 0;
exports.setupDefaultEvaluators = setupDefaultEvaluators;
// Export all evaluators
var registry_1 = require("./registry");
Object.defineProperty(exports, "EvaluatorRegistry", { enumerable: true, get: function () { return registry_1.EvaluatorRegistry; } });
Object.defineProperty(exports, "defaultRegistry", { enumerable: true, get: function () { return registry_1.defaultRegistry; } });
var plainTextEvaluator_1 = require("./plainTextEvaluator");
Object.defineProperty(exports, "PlainTextEvaluator", { enumerable: true, get: function () { return plainTextEvaluator_1.PlainTextEvaluator; } });
Object.defineProperty(exports, "defaultPlainTextEvaluator", { enumerable: true, get: function () { return plainTextEvaluator_1.defaultPlainTextEvaluator; } });
var commentEvaluator_1 = require("./commentEvaluator");
Object.defineProperty(exports, "CommentEvaluator", { enumerable: true, get: function () { return commentEvaluator_1.CommentEvaluator; } });
Object.defineProperty(exports, "defaultCommentEvaluator", { enumerable: true, get: function () { return commentEvaluator_1.defaultCommentEvaluator; } });
var errorEvaluator_1 = require("./errorEvaluator");
Object.defineProperty(exports, "ErrorEvaluator", { enumerable: true, get: function () { return errorEvaluator_1.ErrorEvaluator; } });
Object.defineProperty(exports, "defaultErrorEvaluator", { enumerable: true, get: function () { return errorEvaluator_1.defaultErrorEvaluator; } });
// Export render nodes
__exportStar(require("./renderNodes"), exports);
// Import everything for setup
const registry_2 = require("./registry");
const plainTextEvaluator_2 = require("./plainTextEvaluator");
const commentEvaluator_2 = require("./commentEvaluator");
const errorEvaluator_2 = require("./errorEvaluator");
// Import V2 evaluators
const percentageEvaluatorV2_1 = require("./percentageEvaluatorV2");
const variableEvaluatorV2_1 = require("./variableEvaluatorV2");
const expressionEvaluatorV2_1 = require("./expressionEvaluatorV2");
const combinedAssignmentEvaluatorV2_1 = require("./combinedAssignmentEvaluatorV2");
const unitsnetAstEvaluator_1 = require("../units/unitsnetAstEvaluator");
const functionDefinitionEvaluator_1 = require("./functionDefinitionEvaluator");
const dateMathEvaluator_1 = require("./dateMathEvaluator");
const solveEvaluator_1 = require("./solveEvaluator");
/**
 * Sets up the V2 evaluator registry with semantic-aware evaluators.
 * This replaces regex-based type detection with proper semantic types.
 */
function setupDefaultEvaluators() {
    registry_2.defaultRegistry.clear();
    // Register comment evaluator first - comments should be handled before any parsing
    registry_2.defaultRegistry.register(commentEvaluator_2.defaultCommentEvaluator);
    // Create V2 evaluator instances (semantic-aware)
    const percentageEvaluatorV2 = new percentageEvaluatorV2_1.PercentageExpressionEvaluatorV2();
    const dateMathEvaluator = new dateMathEvaluator_1.DateMathEvaluator();
    const solveEvaluator = new solveEvaluator_1.SolveEvaluator();
    const unitsNetEvaluator = new unitsnetAstEvaluator_1.UnitsNetExpressionEvaluator();
    const combinedAssignmentEvaluatorV2 = new combinedAssignmentEvaluatorV2_1.CombinedAssignmentEvaluatorV2();
    const variableEvaluatorV2 = new variableEvaluatorV2_1.VariableEvaluatorV2();
    const expressionEvaluatorV2 = new expressionEvaluatorV2_1.ExpressionEvaluatorV2();
    const functionDefinitionEvaluator = new functionDefinitionEvaluator_1.FunctionDefinitionEvaluator();
    // Register V2 evaluators in order of priority
    // Percentage evaluator first - handles complex percentage operations
    registry_2.defaultRegistry.register(percentageEvaluatorV2);
    // Date math evaluator - handles date/time expressions before units
    registry_2.defaultRegistry.register(dateMathEvaluator);
    // Solve evaluator - handles explicit solve and implicit unknowns before units
    registry_2.defaultRegistry.register(solveEvaluator);
    // UnitsNet evaluator - handles unit-aware and identifier-based expressions
    registry_2.defaultRegistry.register(unitsNetEvaluator);
    // Combined assignment evaluator - handles "x = 100 =>" patterns
    registry_2.defaultRegistry.register(combinedAssignmentEvaluatorV2);
    // Function definition evaluator - registers user-defined functions
    registry_2.defaultRegistry.register(functionDefinitionEvaluator);
    // Variable evaluator - handles variable assignments (now much simpler!)
    registry_2.defaultRegistry.register(variableEvaluatorV2);
    // Expression evaluator - handles simple arithmetic and literals  
    registry_2.defaultRegistry.register(expressionEvaluatorV2);
    // Keep fallback evaluators
    registry_2.defaultRegistry.register(errorEvaluator_2.defaultErrorEvaluator);
    registry_2.defaultRegistry.register(plainTextEvaluator_2.defaultPlainTextEvaluator);
    console.log("🎯 SmartPad V2: Semantic type evaluators initialized");
}
// Initialize the V2 registry by default
setupDefaultEvaluators();
// Expose setup function for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.setupV2Evaluators = setupDefaultEvaluators;
}
