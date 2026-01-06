"use strict";
/**
 * Evaluator Registry for SmartPad
 *
 * This registry manages evaluation plugins that process AST nodes and convert them
 * into render nodes. It provides a plugin-based architecture for extensibility.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRegistry = exports.EvaluatorRegistry = void 0;
const tracing_1 = require("./tracing");
// Legacy logger - kept for backward compatibility but replaced by tracing system
const logger = {
    warn: (event, data) => console.warn(`⚠️ ${event}:`, data),
    error: (event, data) => console.error(`❌ ${event}:`, data),
};
/**
 * Registry for managing node evaluators
 */
class EvaluatorRegistry {
    evaluators = [];
    /**
     * Register a new evaluator
     */
    register(evaluator) {
        this.evaluators.push(evaluator);
    }
    /**
     * Unregister an evaluator
     */
    unregister(evaluator) {
        const index = this.evaluators.indexOf(evaluator);
        if (index >= 0) {
            this.evaluators.splice(index, 1);
        }
    }
    /**
     * Evaluate an AST node to a render node with comprehensive tracing
     */
    evaluate(node, context) {
        // Start tracing for this evaluation
        const expression = node.raw || node.expression || node.value || JSON.stringify(node);
        const traceId = tracing_1.tracer.startTrace(expression);
        try {
            // Pre-condition: node must be valid
            (0, tracing_1.requireContract)(!!(node && typeof node === "object"), "Node must be a valid object");
            (0, tracing_1.requireContract)(!!node.type, "Node must have a type");
            let result = null;
            let evaluatorUsed = false;
            // Try each evaluator with full tracing
            for (const evaluator of this.evaluators) {
                const evaluatorName = evaluator.constructor.name;
                // Trace the canHandle check
                const canHandle = evaluator.canHandle(node);
                tracing_1.tracer.addStep(traceId, {
                    step: "canHandle_check",
                    evaluator: evaluatorName,
                    input: {
                        nodeType: node.type,
                        nodeContent: node.raw || node.expression || node.value,
                    },
                    output: { canHandle },
                    preConditions: ["Node is valid", "Evaluator is registered"],
                    postConditions: ["canHandle returns boolean"],
                    metadata: { evaluatorIndex: this.evaluators.indexOf(evaluator) },
                });
                if (canHandle) {
                    // Trace the evaluation attempt
                    tracing_1.tracer.addStep(traceId, {
                        step: "evaluation_attempt",
                        evaluator: evaluatorName,
                        input: {
                            node,
                            context: {
                                lineNumber: context.lineNumber,
                                variableCount: context.variableContext.size,
                            },
                        },
                        output: null, // Will be set after evaluation
                        preConditions: ["canHandle returned true", "Node is valid", "Context is valid"],
                        postConditions: ["Returns RenderNode or null", "No exceptions thrown"],
                        metadata: { evaluatorIndex: this.evaluators.indexOf(evaluator) },
                    });
                    try {
                        const evalResult = evaluator.evaluate(node, context);
                        if (evalResult === null) {
                            tracing_1.tracer.addStep(traceId, {
                                step: "evaluation_skipped",
                                evaluator: evaluatorName,
                                input: {
                                    node,
                                    context: {
                                        lineNumber: context.lineNumber,
                                        variableCount: context.variableContext.size,
                                    },
                                },
                                output: null,
                                preConditions: ["evaluate method called successfully"],
                                postConditions: ["Evaluator returned null to decline handling"],
                                metadata: { evaluatorIndex: this.evaluators.indexOf(evaluator) },
                            });
                            tracing_1.tracer.markEvaluatorSkipped(traceId, evaluatorName, "evaluate returned null");
                            continue;
                        }
                        result = evalResult;
                        evaluatorUsed = true;
                        // Trace successful evaluation
                        tracing_1.tracer.addStep(traceId, {
                            step: "evaluation_success",
                            evaluator: evaluatorName,
                            input: {
                                node,
                                context: {
                                    lineNumber: context.lineNumber,
                                    variableCount: context.variableContext.size,
                                },
                            },
                            output: result,
                            preConditions: ["evaluate method called successfully"],
                            postConditions: ["Result is RenderNode or null", "Result has correct structure"],
                            metadata: {
                                resultType: result?.type,
                                evaluatorIndex: this.evaluators.indexOf(evaluator),
                            },
                        });
                        tracing_1.tracer.markEvaluatorUsed(traceId, evaluatorName);
                        break; // Found handler, stop trying others
                    }
                    catch (error) {
                        // Trace evaluation error
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        tracing_1.tracer.addStep(traceId, {
                            step: "evaluation_error",
                            evaluator: evaluatorName,
                            input: {
                                node,
                                context: {
                                    lineNumber: context.lineNumber,
                                    variableCount: context.variableContext.size,
                                },
                            },
                            output: { error: errorMessage },
                            preConditions: ["evaluate method was called"],
                            postConditions: ["Exception was thrown"],
                            metadata: {
                                errorType: error instanceof Error ? error.constructor.name : "Unknown",
                                evaluatorIndex: this.evaluators.indexOf(evaluator),
                            },
                        });
                        tracing_1.tracer.addError(traceId, `${evaluatorName}: ${errorMessage}`);
                        // Create error render node
                        result = {
                            type: "error",
                            line: node.line,
                            originalRaw: node.raw,
                            error: `Evaluation error in ${evaluatorName}: ${errorMessage}`,
                            errorType: "runtime",
                            displayText: `${node.raw} ⚠️ ${evaluatorName} error`,
                        };
                        break;
                    }
                }
                else {
                    // Trace skipped evaluator
                    tracing_1.tracer.markEvaluatorSkipped(traceId, evaluatorName, "canHandle returned false");
                }
            }
            // If no evaluator handled it
            if (!evaluatorUsed) {
                tracing_1.tracer.addStep(traceId, {
                    step: "no_handler_found",
                    evaluator: "none",
                    input: { nodeType: node.type, evaluatorCount: this.evaluators.length },
                    output: null,
                    preConditions: ["All evaluators were tried"],
                    postConditions: ["No evaluator could handle the node"],
                    metadata: {
                        evaluatorNames: this.evaluators.map((e) => e.constructor.name),
                        nodeType: node.type,
                    },
                });
                tracing_1.tracer.addWarning(traceId, `No evaluator could handle node type: ${node.type}`);
            }
            // Post-condition: result should be valid
            (0, tracing_1.ensure)(result === null || !!(result && typeof result === "object" && result.type), "Result must be null or valid RenderNode");
            // End trace and return result
            tracing_1.tracer.endTrace(traceId, result);
            return result;
        }
        catch (error) {
            // Handle any unexpected errors in the tracing system itself
            const errorMessage = error instanceof Error ? error.message : String(error);
            tracing_1.tracer.addError(traceId, `Tracing system error: ${errorMessage}`);
            tracing_1.tracer.endTrace(traceId, null);
            logger.error("Registry.evaluate.tracingError", {
                traceId,
                error: errorMessage,
                nodeType: node.type,
            });
            return null;
        }
    }
    /**
     * Get all registered evaluators
     */
    getEvaluators() {
        return [...this.evaluators];
    }
    /**
     * Clear all registered evaluators
     */
    clear() {
        this.evaluators = [];
    }
    /**
     * Enable/disable logging for debugging
     */
    static enableLogging() {
        // Tracing system is always enabled for debugging
        console.log("🔍 Tracing system enabled");
    }
    static disableLogging() {
        // Tracing system is always enabled for debugging
        console.log("🔍 Tracing system remains enabled for debugging");
    }
}
exports.EvaluatorRegistry = EvaluatorRegistry;
/**
 * Default registry instance
 */
exports.defaultRegistry = new EvaluatorRegistry();
