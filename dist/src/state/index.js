"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactiveVariableStore = exports.useVariableContext = exports.VariableProvider = exports.useVariables = void 0;
// Main API exports
var useVariables_1 = require("./useVariables");
Object.defineProperty(exports, "useVariables", { enumerable: true, get: function () { return useVariables_1.useVariables; } });
var VariableContext_1 = require("./VariableContext");
Object.defineProperty(exports, "VariableProvider", { enumerable: true, get: function () { return VariableContext_1.VariableProvider; } });
Object.defineProperty(exports, "useVariableContext", { enumerable: true, get: function () { return VariableContext_1.useVariableContext; } });
// Core utilities (for advanced use cases)
var variableStore_1 = require("./variableStore");
Object.defineProperty(exports, "ReactiveVariableStore", { enumerable: true, get: function () { return variableStore_1.ReactiveVariableStore; } });
