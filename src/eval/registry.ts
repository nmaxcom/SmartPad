/**
 * Evaluator Registry for SmartPad
 *
 * This registry manages evaluation plugins that process AST nodes and convert them
 * into render nodes. It provides a plugin-based architecture for extensibility.
 */

import { ASTNode, FunctionDefinitionNode } from "../parsing/ast";
import { RenderNode } from "./renderNodes";
import { ReactiveVariableStore } from "../state/variableStore";
import { Variable } from "../state/types";
import { tracer, requireContract, ensure } from "./tracing";
import type { EquationEntry } from "../solve/equationStore";
import { applyDynamicUnitAliases } from "../units/unitAliases";

// Legacy logger - kept for backward compatibility but replaced by tracing system
const logger = {
  warn: (event: string, data: Record<string, any>) => console.warn(`⚠️ ${event}:`, data),
  error: (event: string, data: Record<string, any>) => console.error(`❌ ${event}:`, data),
};

/**
 * Context provided to evaluators for processing nodes
 */
export interface EvaluationContext {
  variableStore: ReactiveVariableStore;
  variableContext: Map<string, Variable>;
  functionStore?: Map<string, FunctionDefinitionNode>;
  equationStore?: EquationEntry[];
  astNodes?: ASTNode[];
  lineNumber: number;
  decimalPlaces: number;
  implicitUnitSymbols?: boolean;
  scientificUpperThreshold?: number;
  scientificLowerThreshold?: number;
  scientificTrimTrailingZeros?: boolean;
  groupThousands?: boolean;
  dateDisplayFormat?: 'iso' | 'locale';
  dateLocale?: string;
  functionCallDepth?: number;
}

/**
 * Interface for node evaluators
 */
export interface NodeEvaluator {
  canHandle(node: ASTNode): boolean;
  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null;
}

/**
 * Registry for managing node evaluators
 */
export class EvaluatorRegistry {
  private evaluators: NodeEvaluator[] = [];

  /**
   * Register a new evaluator
   */
  register(evaluator: NodeEvaluator): void {
    this.evaluators.push(evaluator);
  }

  /**
   * Unregister an evaluator
   */
  unregister(evaluator: NodeEvaluator): void {
    const index = this.evaluators.indexOf(evaluator);
    if (index >= 0) {
      this.evaluators.splice(index, 1);
    }
  }

  /**
   * Evaluate an AST node to a render node with comprehensive tracing
   */
  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    // Start tracing for this evaluation
    const expression =
      (node as any).raw || (node as any).expression || (node as any).value || JSON.stringify(node);
    const traceId = tracer.startTrace(expression);

    try {
      applyDynamicUnitAliases(context.variableContext);
      // Pre-condition: node must be valid
      requireContract(!!(node && typeof node === "object"), "Node must be a valid object");
      requireContract(!!node.type, "Node must have a type");

      let result: RenderNode | null = null;
      let evaluatorUsed = false;

      // Try each evaluator with full tracing
      for (const evaluator of this.evaluators) {
        const evaluatorName = evaluator.constructor.name;
        
        // Trace the canHandle check
        const canHandle = evaluator.canHandle(node);
        tracer.addStep(traceId, {
          step: "canHandle_check",
          evaluator: evaluatorName,
          input: {
            nodeType: node.type,
            nodeContent: (node as any).raw || (node as any).expression || (node as any).value,
          },
          output: { canHandle },
          preConditions: ["Node is valid", "Evaluator is registered"],
          postConditions: ["canHandle returns boolean"],
          metadata: { evaluatorIndex: this.evaluators.indexOf(evaluator) },
        });

        if (canHandle) {
          // Trace the evaluation attempt
          tracer.addStep(traceId, {
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
              tracer.addStep(traceId, {
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
              tracer.markEvaluatorSkipped(traceId, evaluatorName, "evaluate returned null");
              continue;
            }

            result = evalResult;
            evaluatorUsed = true;

            // Trace successful evaluation
            tracer.addStep(traceId, {
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

            tracer.markEvaluatorUsed(traceId, evaluatorName);
            break; // Found handler, stop trying others
          } catch (error) {
            // Trace evaluation error
            const errorMessage = error instanceof Error ? error.message : String(error);
            tracer.addStep(traceId, {
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

            tracer.addError(traceId, `${evaluatorName}: ${errorMessage}`);

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
        } else {
          // Trace skipped evaluator
          tracer.markEvaluatorSkipped(traceId, evaluatorName, "canHandle returned false");
        }
      }

      // If no evaluator handled it
      if (!evaluatorUsed) {
        tracer.addStep(traceId, {
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

        tracer.addWarning(traceId, `No evaluator could handle node type: ${node.type}`);
      }

      // Post-condition: result should be valid
      ensure(
        result === null || !!(result && typeof result === "object" && result.type),
        "Result must be null or valid RenderNode"
      );

      // End trace and return result
      tracer.endTrace(traceId, result);
      return result;
    } catch (error) {
      // Handle any unexpected errors in the tracing system itself
      const errorMessage = error instanceof Error ? error.message : String(error);
      tracer.addError(traceId, `Tracing system error: ${errorMessage}`);
      tracer.endTrace(traceId, null);

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
  getEvaluators(): NodeEvaluator[] {
    return [...this.evaluators];
  }

  /**
   * Clear all registered evaluators
   */
  clear(): void {
    this.evaluators = [];
  }

  /**
   * Enable/disable logging for debugging
   */
  static enableLogging(): void {
    // Tracing system is always enabled for debugging
    console.log("🔍 Tracing system enabled");
  }

  static disableLogging(): void {
    // Tracing system is always enabled for debugging
    console.log("🔍 Tracing system remains enabled for debugging");
  }
}

/**
 * Default registry instance
 */
export const defaultRegistry = new EvaluatorRegistry();
