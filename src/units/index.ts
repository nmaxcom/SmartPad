/**
 * Units Module for SmartPad
 *
 * Exports all units-related functionality for dimensional analysis
 * and unit conversion in SmartPad expressions.
 *
 * Now includes both legacy units system and new unitsnet-js integration.
 */

// Core definitions (legacy)
export type { Dimension, UnitDefinition } from "./definitions";

export {
  UnitRegistry,
  createDimension,
  DIMENSIONS,
  dimensionsEqual,
  multiplyDimensions,
  divideDimensions,
  powerDimension,
  formatDimension,
  defaultUnitRegistry,
} from "./definitions";

// Quantity and composite units (legacy)
export type { UnitComponent } from "./quantity";

export { Quantity, CompositeUnit, UnitParser } from "./quantity";

// Units-aware math evaluator (legacy)
export type { UnitsToken, UnitsResult } from "./unitsEvaluator";

export {
  UnitsTokenType,
  tokenizeWithUnits,
  UnitsParser,
  evaluateUnitsExpression,
  expressionContainsUnits,
} from "./unitsEvaluator";

// AST evaluator for SmartPad integration (legacy)
export type { UnitsRenderNode } from "./astEvaluator";

export { UnitsExpressionEvaluator } from "./astEvaluator";

// NEW: UnitsNet.js integration
export {
  SmartPadQuantity,
  UnitsNetParser,
  UnitsNetMathEvaluator,
  MATHEMATICAL_CONSTANTS,
} from "./unitsnetAdapter";

export type { UnitsNetToken, UnitsNetResult } from "./unitsnetEvaluator";

export {
  UnitsNetTokenType,
  tokenizeWithUnitsNet,
  evaluateUnitsNetExpression,
  expressionContainsUnitsNet,
} from "./unitsnetEvaluator";

export type { UnitsNetRenderNode } from "./unitsnetAstEvaluator";

export { UnitsNetExpressionEvaluator } from "./unitsnetAstEvaluator";
