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

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Default to INFO level (no detailed DEBUG traces in tests)
let currentLogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel) {
  currentLogLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

export interface TraceStep {
  id: string;
  timestamp: number;
  step: string;
  evaluator: string;
  input: any;
  output: any;
  preConditions: string[];
  postConditions: string[];
  metadata: Record<string, any>;
}

export interface TraceResult {
  traceId: string;
  steps: TraceStep[];
  finalResult: any;
  summary: {
    totalSteps: number;
    evaluatorsUsed: string[];
    evaluatorsSkipped: string[];
    errors: string[];
    warnings: string[];
  };
}

class TracingSystem {
  private static instance: TracingSystem;
  private traces: Map<string, TraceResult> = new Map();
  private enabled: boolean = true;
  private debugMode: boolean = process.env.NODE_ENV === "test";

  static getInstance(): TracingSystem {
    if (!TracingSystem.instance) {
      TracingSystem.instance = new TracingSystem();
    }
    return TracingSystem.instance;
  }

  startTrace(expression: string): string {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trace: TraceResult = {
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

  addStep(traceId: string, step: Omit<TraceStep, "id" | "timestamp">): void {
    if (!this.enabled) return;

    const trace = this.traces.get(traceId);
    if (!trace) return;

    const fullStep: TraceStep = {
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

  markEvaluatorUsed(traceId: string, evaluator: string): void {
    const trace = this.traces.get(traceId);
    if (trace && !trace.summary.evaluatorsUsed.includes(evaluator)) {
      trace.summary.evaluatorsUsed.push(evaluator);
    }
  }

  markEvaluatorSkipped(traceId: string, evaluator: string, reason: string): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.summary.evaluatorsSkipped.push(`${evaluator} (${reason})`);
    }
  }

  addError(traceId: string, error: string): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.summary.errors.push(error);
    }
  }

  addWarning(traceId: string, warning: string): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      trace.summary.warnings.push(warning);
    }
  }

  endTrace(traceId: string, finalResult: any): TraceResult {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

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

  getTrace(traceId: string): TraceResult | undefined {
    return this.traces.get(traceId);
  }

  clearTraces(): void {
    this.traces.clear();
  }
}

export const tracer = TracingSystem.getInstance();

// Design by Contract helpers
export function requireContract(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Pre-condition failed: ${message}`);
  }
}

export function ensure(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Post-condition failed: ${message}`);
  }
}

export function invariant(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Invariant failed: ${message}`);
  }
}
