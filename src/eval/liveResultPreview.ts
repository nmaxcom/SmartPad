import type { ExpressionComponent, FunctionDefinitionNode } from "../parsing/ast";
import type { Variable } from "../state/types";
import { defaultUnitRegistry } from "../units/definitions";

export type LiveResultSuppressionReason =
  | "plaintext"
  | "incomplete"
  | "error"
  | "unresolved";

export interface LiveResultMetrics {
  live_result_evaluated_total: number;
  live_result_rendered_total: number;
  live_result_suppressed_plaintext_total: number;
  live_result_suppressed_incomplete_total: number;
  live_result_suppressed_error_total: number;
  live_result_suppressed_unresolved_total: number;
  live_result_eval_ms_total: number;
  live_result_eval_ms_count: number;
  live_result_eval_ms_avg: number;
}

const metricsState: Omit<LiveResultMetrics, "live_result_eval_ms_avg"> = {
  live_result_evaluated_total: 0,
  live_result_rendered_total: 0,
  live_result_suppressed_plaintext_total: 0,
  live_result_suppressed_incomplete_total: 0,
  live_result_suppressed_error_total: 0,
  live_result_suppressed_unresolved_total: 0,
  live_result_eval_ms_total: 0,
  live_result_eval_ms_count: 0,
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasIdentifierBoundaryMatch = (input: string, identifier: string): boolean => {
  if (!identifier) return false;
  const pattern = new RegExp(
    `(^|[\\s+\\-*/^%()=<>!,])${escapeRegExp(identifier)}($|[\\s+\\-*/^%()=<>!,])`
  );
  return pattern.test(input);
};

const LIVE_WORD_OPERATOR_REGEX = /\b(of|off|on|to|in|as|is|per)\b/i;

export const isLikelyLiveExpression = (
  line: string,
  variableContext: Map<string, Variable>,
  functionStore: Map<string, FunctionDefinitionNode>
): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("@")) {
    return false;
  }
  if (trimmed.includes("=>")) return false;
  if (/\bsolve\b/i.test(trimmed)) return false;
  if (trimmed.includes("=")) return false;

  if (/\d/.test(trimmed)) return true;
  if (/[+\-*/^%()]/.test(trimmed)) return true;
  if (LIVE_WORD_OPERATOR_REGEX.test(trimmed)) return true;
  if (/\b(PI|E)\b/.test(trimmed)) return true;

  const hasKnownVariable = Array.from(variableContext.keys()).some((name) =>
    hasIdentifierBoundaryMatch(trimmed, name)
  );
  if (hasKnownVariable) return true;

  const hasKnownFunctionCall = Array.from(functionStore.keys()).some((name) =>
    new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`).test(trimmed)
  );
  return hasKnownFunctionCall;
};

export const shouldShowLiveForAssignmentValue = (
  rawValue: string,
  variableContext: Map<string, Variable>,
  functionStore: Map<string, FunctionDefinitionNode>
): boolean => {
  const trimmed = rawValue.trim();
  if (!trimmed) return false;

  const hasMathOperators = /[+\-*/^()]/.test(trimmed);
  if (hasMathOperators) return true;

  const hasLanguageOperators = LIVE_WORD_OPERATOR_REGEX.test(trimmed);
  if (hasLanguageOperators) return true;

  const hasKnownVariable = Array.from(variableContext.keys()).some((name) =>
    hasIdentifierBoundaryMatch(trimmed, name)
  );
  if (hasKnownVariable) return true;

  const hasKnownFunctionCall = Array.from(functionStore.keys()).some((name) =>
    new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`).test(trimmed)
  );
  if (hasKnownFunctionCall) return true;

  return false;
};

export const shouldBypassUnresolvedLiveGuard = (expression: string): boolean =>
  LIVE_WORD_OPERATOR_REGEX.test(expression);

const collectVariableNames = (components: ExpressionComponent[]): Set<string> => {
  const names = new Set<string>();
  const visit = (items: ExpressionComponent[]) => {
    items.forEach((component) => {
      if (component.type === "variable" || component.type === "resultReference") {
        names.add(component.value);
      }
      if (component.type === "listAccess" && component.access) {
        visit([component.access.base]);
        if (component.access.indexComponents) {
          visit(component.access.indexComponents);
        }
        if (component.access.startComponents) {
          visit(component.access.startComponents);
        }
        if (component.access.endComponents) {
          visit(component.access.endComponents);
        }
      }
      if (component.type === "function" && component.args) {
        component.args.forEach((arg) => visit(arg.components));
      } else if (component.children && component.children.length > 0) {
        visit(component.children);
      }
    });
  };
  visit(components);
  return names;
};

export const hasUnresolvedLiveIdentifiers = (
  components: ExpressionComponent[],
  variableContext: Map<string, Variable>
): boolean => {
  const names = collectVariableNames(components);
  for (const name of names) {
    if (!name) continue;
    if (variableContext.has(name)) continue;
    if (name === "PI" || name === "E") continue;
    if (defaultUnitRegistry.isBuiltinSymbol(name)) continue;
    return true;
  }
  return false;
};

export const recordLiveResultEvaluation = (durationMs: number): void => {
  metricsState.live_result_evaluated_total += 1;
  metricsState.live_result_eval_ms_total += durationMs;
  metricsState.live_result_eval_ms_count += 1;
};

export const recordLiveResultRendered = (): void => {
  metricsState.live_result_rendered_total += 1;
};

export const recordLiveResultSuppressed = (
  reason: LiveResultSuppressionReason
): void => {
  switch (reason) {
    case "plaintext":
      metricsState.live_result_suppressed_plaintext_total += 1;
      break;
    case "incomplete":
      metricsState.live_result_suppressed_incomplete_total += 1;
      break;
    case "error":
      metricsState.live_result_suppressed_error_total += 1;
      break;
    case "unresolved":
      metricsState.live_result_suppressed_unresolved_total += 1;
      break;
    default:
      break;
  }
};

export const resetLiveResultMetrics = (): void => {
  metricsState.live_result_evaluated_total = 0;
  metricsState.live_result_rendered_total = 0;
  metricsState.live_result_suppressed_plaintext_total = 0;
  metricsState.live_result_suppressed_incomplete_total = 0;
  metricsState.live_result_suppressed_error_total = 0;
  metricsState.live_result_suppressed_unresolved_total = 0;
  metricsState.live_result_eval_ms_total = 0;
  metricsState.live_result_eval_ms_count = 0;
};

export const getLiveResultMetrics = (): LiveResultMetrics => {
  const avg =
    metricsState.live_result_eval_ms_count > 0
      ? metricsState.live_result_eval_ms_total / metricsState.live_result_eval_ms_count
      : 0;
  return {
    ...metricsState,
    live_result_eval_ms_avg: avg,
  };
};
