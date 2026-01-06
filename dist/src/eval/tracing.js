"use strict";
/**
 * Structured Tracing with Accountability System
 *
 * This system provides foolproof debugging by tracking the complete "DNA" of every expression result.
 * Every evaluation step is logged with pre/post conditions, and results carry their complete history.
 *
 * LOG LEVELS:
 * - ERROR: Critical failures only
 * - WARN: Important issues that don't break functionality
 * - INFO: High-level operation summaries
 * - DEBUG: Detailed step-by-step traces (disabled in tests by default)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracer = exports.LogLevel = void 0;
exports.setLogLevel = setLogLevel;
exports.getLogLevel = getLogLevel;
exports.requireContract = requireContract;
exports.ensure = ensure;
exports.invariant = invariant;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Default to INFO level (no detailed DEBUG traces in tests)
let currentLogLevel = LogLevel.INFO;
function setLogLevel(level) {
    currentLogLevel = level;
}
function getLogLevel() {
    return currentLogLevel;
}
class TracingSystem {
    static instance;
    traces = new Map();
    enabled = true;
    debugMode = process.env.NODE_ENV === "test";
    static getInstance() {
        if (!TracingSystem.instance) {
            TracingSystem.instance = new TracingSystem();
        }
        return TracingSystem.instance;
    }
    startTrace(expression) {
        const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const trace = {
            traceId,
            steps: [],
            finalResult: null,
            summary: {
                totalSteps: 0,
                evaluatorsUsed: [],
                evaluatorsSkipped: [],
                errors: [],
                warnings: [],
            },
        };
        this.traces.set(traceId, trace);
        if (currentLogLevel >= LogLevel.DEBUG) {
            console.log(`🔍 TRACE START: ${traceId} for expression: "${expression}"`);
        }
        return traceId;
    }
    addStep(traceId, step) {
        if (!this.enabled)
            return;
        const trace = this.traces.get(traceId);
        if (!trace)
            return;
        const fullStep = {
            ...step,
            id: `${traceId}_step_${trace.steps.length}`,
            timestamp: Date.now(),
        };
        trace.steps.push(fullStep);
        trace.summary.totalSteps++;
        // Log the step with clear formatting (only at DEBUG level)
        if (currentLogLevel >= LogLevel.DEBUG) {
            console.log(`🔍 TRACE STEP: ${fullStep.step}`);
            console.log(`   Evaluator: ${fullStep.evaluator}`);
            console.log(`   Input: ${JSON.stringify(fullStep.input, null, 2)}`);
            console.log(`   Output: ${JSON.stringify(fullStep.output, null, 2)}`);
            console.log(`   Pre-conditions: ${fullStep.preConditions.join(", ")}`);
            console.log(`   Post-conditions: ${fullStep.postConditions.join(", ")}`);
            console.log(`   Metadata: ${JSON.stringify(fullStep.metadata, null, 2)}`);
            console.log("---");
        }
    }
    markEvaluatorUsed(traceId, evaluator) {
        const trace = this.traces.get(traceId);
        if (trace && !trace.summary.evaluatorsUsed.includes(evaluator)) {
            trace.summary.evaluatorsUsed.push(evaluator);
        }
    }
    markEvaluatorSkipped(traceId, evaluator, reason) {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.summary.evaluatorsSkipped.push(`${evaluator} (${reason})`);
        }
    }
    addError(traceId, error) {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.summary.errors.push(error);
        }
    }
    addWarning(traceId, warning) {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.summary.warnings.push(warning);
        }
    }
    endTrace(traceId, finalResult) {
        const trace = this.traces.get(traceId);
        if (!trace)
            throw new Error(`Trace ${traceId} not found`);
        trace.finalResult = finalResult;
        // Print comprehensive summary (only at DEBUG level)
        if (currentLogLevel >= LogLevel.DEBUG) {
            console.log(`🔍 TRACE END: ${traceId}`);
            console.log(`   Final Result: ${JSON.stringify(finalResult, null, 2)}`);
            console.log(`   Total Steps: ${trace.summary.totalSteps}`);
            console.log(`   Evaluators Used: ${trace.summary.evaluatorsUsed.join(", ")}`);
            console.log(`   Evaluators Skipped: ${trace.summary.evaluatorsSkipped.join(", ")}`);
            console.log(`   Errors: ${trace.summary.errors.join(", ")}`);
            console.log(`   Warnings: ${trace.summary.warnings.join(", ")}`);
            console.log("=====================================");
        }
        return trace;
    }
    getTrace(traceId) {
        return this.traces.get(traceId);
    }
    clearTraces() {
        this.traces.clear();
    }
}
exports.tracer = TracingSystem.getInstance();
// Design by Contract helpers
function requireContract(condition, message) {
    if (!condition) {
        throw new Error(`Pre-condition failed: ${message}`);
    }
}
function ensure(condition, message) {
    if (!condition) {
        throw new Error(`Post-condition failed: ${message}`);
    }
}
function invariant(condition, message) {
    if (!condition) {
        throw new Error(`Invariant failed: ${message}`);
    }
}
