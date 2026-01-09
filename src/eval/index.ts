/**
 * @file Evaluation Module Index
 * @description This file serves as the central hub for the evaluation-related logic of SmartPad.
 * It exports all necessary components, including the different types of evaluators and the main registry.
 * It also handles the initial setup of the default evaluator registry, defining the priority
 * in which different types of expressions are handled.
 */

// Export all evaluators
export { EvaluatorRegistry, defaultRegistry } from "./registry";
export type { NodeEvaluator, EvaluationContext } from "./registry";
export { PlainTextEvaluator, defaultPlainTextEvaluator } from "./plainTextEvaluator";
export { CommentEvaluator, defaultCommentEvaluator } from "./commentEvaluator";
export { ErrorEvaluator, defaultErrorEvaluator } from "./errorEvaluator";


// Export render nodes
export * from "./renderNodes";

// Import everything for setup
import { defaultRegistry } from "./registry";
import { defaultPlainTextEvaluator } from "./plainTextEvaluator";
import { defaultCommentEvaluator } from "./commentEvaluator";
import { defaultErrorEvaluator } from "./errorEvaluator";


// Import V2 evaluators
import { PercentageExpressionEvaluatorV2 } from "./percentageEvaluatorV2";
import { RangeExpressionEvaluator } from "./rangeExpressionEvaluator";
import { VariableEvaluatorV2 } from "./variableEvaluatorV2";
import { ExpressionEvaluatorV2 } from "./expressionEvaluatorV2";
import { CombinedAssignmentEvaluatorV2 } from "./combinedAssignmentEvaluatorV2";
import { UnitsNetExpressionEvaluator } from "../units/unitsnetAstEvaluator";
import { FunctionDefinitionEvaluator } from "./functionDefinitionEvaluator";
import { DateMathEvaluator } from "./dateMathEvaluator";
import { SolveEvaluator } from "./solveEvaluator";

/**
 * Sets up the V2 evaluator registry with semantic-aware evaluators.
 * This replaces regex-based type detection with proper semantic types.
 */
export function setupDefaultEvaluators(): void {
  defaultRegistry.clear();

  // Register comment evaluator first - comments should be handled before any parsing
  defaultRegistry.register(defaultCommentEvaluator);

  // Create V2 evaluator instances (semantic-aware)
  const percentageEvaluatorV2 = new PercentageExpressionEvaluatorV2();
  const rangeExpressionEvaluator = new RangeExpressionEvaluator();
  const dateMathEvaluator = new DateMathEvaluator();
  const solveEvaluator = new SolveEvaluator();
  const unitsNetEvaluator = new UnitsNetExpressionEvaluator();
  const combinedAssignmentEvaluatorV2 = new CombinedAssignmentEvaluatorV2();
  const variableEvaluatorV2 = new VariableEvaluatorV2();
  const expressionEvaluatorV2 = new ExpressionEvaluatorV2();
  const functionDefinitionEvaluator = new FunctionDefinitionEvaluator();

  // Register V2 evaluators in order of priority
  // Percentage evaluator first - handles complex percentage operations
  defaultRegistry.register(percentageEvaluatorV2);

  // Range evaluator must own .. expressions before others
  defaultRegistry.register(rangeExpressionEvaluator);

  // Date math evaluator - handles date/time expressions before units
  defaultRegistry.register(dateMathEvaluator);

  // Solve evaluator - handles explicit solve and implicit unknowns before units
  defaultRegistry.register(solveEvaluator);
  
  // Combined assignment evaluator - handles "x = 100 =>" patterns
  defaultRegistry.register(combinedAssignmentEvaluatorV2);
  
  // Variable evaluator - handles variable assignments (now much simpler!)
  defaultRegistry.register(variableEvaluatorV2);

  // UnitsNet evaluator - handles unit-aware and identifier-based expressions
  defaultRegistry.register(unitsNetEvaluator);

  // Function definition evaluator - registers user-defined functions
  defaultRegistry.register(functionDefinitionEvaluator);
  
  // Expression evaluator - handles simple arithmetic and literals  
  defaultRegistry.register(expressionEvaluatorV2);
  
  // Keep fallback evaluators
  defaultRegistry.register(defaultErrorEvaluator);
  defaultRegistry.register(defaultPlainTextEvaluator);
  
  console.log("🎯 SmartPad V2: Semantic type evaluators initialized");
}



// Initialize the V2 registry by default
setupDefaultEvaluators();

// Expose setup function for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).setupV2Evaluators = setupDefaultEvaluators;
}
