import { parseVariableAssignmentWithOptionalEvaluation } from "../parsing/variableParser";
import type { VariableBaselineComparison } from "../state/variableBaselineStore";

export const resolveBaselineVariableName = (
  sourceText: string,
): string | null => {
  const assignment = parseVariableAssignmentWithOptionalEvaluation(sourceText);
  return assignment.isValid && assignment.variableName
    ? assignment.variableName.trim()
    : null;
};

export const formatBaselineDeltaLabel = (
  comparison: VariableBaselineComparison,
): string => {
  if (!comparison.changed) return "same";
  if (comparison.typeChanged) return "type changed";
  if (comparison.percentDelta === null) return "changed";
  const delta = comparison.percentDelta;
  const rounded = Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1);
  return `${delta > 0 ? "+" : ""}${rounded}%`;
};
