"use strict";
/**
 * Units Module for SmartPad
 *
 * Exports all units-related functionality for dimensional analysis
 * and unit conversion in SmartPad expressions.
 *
 * Now includes both legacy units system and new unitsnet-js integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitsNetExpressionEvaluator = exports.expressionContainsUnitsNet = exports.evaluateUnitsNetExpression = exports.tokenizeWithUnitsNet = exports.UnitsNetTokenType = exports.MATHEMATICAL_CONSTANTS = exports.UnitsNetMathEvaluator = exports.UnitsNetParser = exports.SmartPadQuantity = exports.UnitsExpressionEvaluator = exports.expressionContainsUnits = exports.evaluateUnitsExpression = exports.UnitsParser = exports.tokenizeWithUnits = exports.UnitsTokenType = exports.UnitParser = exports.CompositeUnit = exports.Quantity = exports.defaultUnitRegistry = exports.formatDimension = exports.powerDimension = exports.divideDimensions = exports.multiplyDimensions = exports.dimensionsEqual = exports.DIMENSIONS = exports.createDimension = exports.UnitRegistry = void 0;
var definitions_1 = require("./definitions");
Object.defineProperty(exports, "UnitRegistry", { enumerable: true, get: function () { return definitions_1.UnitRegistry; } });
Object.defineProperty(exports, "createDimension", { enumerable: true, get: function () { return definitions_1.createDimension; } });
Object.defineProperty(exports, "DIMENSIONS", { enumerable: true, get: function () { return definitions_1.DIMENSIONS; } });
Object.defineProperty(exports, "dimensionsEqual", { enumerable: true, get: function () { return definitions_1.dimensionsEqual; } });
Object.defineProperty(exports, "multiplyDimensions", { enumerable: true, get: function () { return definitions_1.multiplyDimensions; } });
Object.defineProperty(exports, "divideDimensions", { enumerable: true, get: function () { return definitions_1.divideDimensions; } });
Object.defineProperty(exports, "powerDimension", { enumerable: true, get: function () { return definitions_1.powerDimension; } });
Object.defineProperty(exports, "formatDimension", { enumerable: true, get: function () { return definitions_1.formatDimension; } });
Object.defineProperty(exports, "defaultUnitRegistry", { enumerable: true, get: function () { return definitions_1.defaultUnitRegistry; } });
var quantity_1 = require("./quantity");
Object.defineProperty(exports, "Quantity", { enumerable: true, get: function () { return quantity_1.Quantity; } });
Object.defineProperty(exports, "CompositeUnit", { enumerable: true, get: function () { return quantity_1.CompositeUnit; } });
Object.defineProperty(exports, "UnitParser", { enumerable: true, get: function () { return quantity_1.UnitParser; } });
var unitsEvaluator_1 = require("./unitsEvaluator");
Object.defineProperty(exports, "UnitsTokenType", { enumerable: true, get: function () { return unitsEvaluator_1.UnitsTokenType; } });
Object.defineProperty(exports, "tokenizeWithUnits", { enumerable: true, get: function () { return unitsEvaluator_1.tokenizeWithUnits; } });
Object.defineProperty(exports, "UnitsParser", { enumerable: true, get: function () { return unitsEvaluator_1.UnitsParser; } });
Object.defineProperty(exports, "evaluateUnitsExpression", { enumerable: true, get: function () { return unitsEvaluator_1.evaluateUnitsExpression; } });
Object.defineProperty(exports, "expressionContainsUnits", { enumerable: true, get: function () { return unitsEvaluator_1.expressionContainsUnits; } });
var astEvaluator_1 = require("./astEvaluator");
Object.defineProperty(exports, "UnitsExpressionEvaluator", { enumerable: true, get: function () { return astEvaluator_1.UnitsExpressionEvaluator; } });
// NEW: UnitsNet.js integration
var unitsnetAdapter_1 = require("./unitsnetAdapter");
Object.defineProperty(exports, "SmartPadQuantity", { enumerable: true, get: function () { return unitsnetAdapter_1.SmartPadQuantity; } });
Object.defineProperty(exports, "UnitsNetParser", { enumerable: true, get: function () { return unitsnetAdapter_1.UnitsNetParser; } });
Object.defineProperty(exports, "UnitsNetMathEvaluator", { enumerable: true, get: function () { return unitsnetAdapter_1.UnitsNetMathEvaluator; } });
Object.defineProperty(exports, "MATHEMATICAL_CONSTANTS", { enumerable: true, get: function () { return unitsnetAdapter_1.MATHEMATICAL_CONSTANTS; } });
var unitsnetEvaluator_1 = require("./unitsnetEvaluator");
Object.defineProperty(exports, "UnitsNetTokenType", { enumerable: true, get: function () { return unitsnetEvaluator_1.UnitsNetTokenType; } });
Object.defineProperty(exports, "tokenizeWithUnitsNet", { enumerable: true, get: function () { return unitsnetEvaluator_1.tokenizeWithUnitsNet; } });
Object.defineProperty(exports, "evaluateUnitsNetExpression", { enumerable: true, get: function () { return unitsnetEvaluator_1.evaluateUnitsNetExpression; } });
Object.defineProperty(exports, "expressionContainsUnitsNet", { enumerable: true, get: function () { return unitsnetEvaluator_1.expressionContainsUnitsNet; } });
var unitsnetAstEvaluator_1 = require("./unitsnetAstEvaluator");
Object.defineProperty(exports, "UnitsNetExpressionEvaluator", { enumerable: true, get: function () { return unitsnetAstEvaluator_1.UnitsNetExpressionEvaluator; } });
