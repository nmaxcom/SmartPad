import {
  ASTNode,
  isVariableAssignmentNode,
  isCombinedAssignmentNode,
} from "../parsing/ast";

export interface EquationEntry {
  line: number;
  variableName: string;
  expression: string;
}

export const normalizeVariableName = (name: string): string =>
  name.replace(/\s+/g, " ").trim();

export const recordEquationFromNode = (node: ASTNode, equations: EquationEntry[]): void => {
  if (isVariableAssignmentNode(node)) {
    const expression = node.rawValue?.trim();
    if (!expression) return;
    equations.push({
      line: node.line,
      variableName: normalizeVariableName(node.variableName),
      expression,
    });
    return;
  }

  if (isCombinedAssignmentNode(node)) {
    const expression = node.expression?.trim();
    if (!expression) return;
    equations.push({
      line: node.line,
      variableName: normalizeVariableName(node.variableName),
      expression,
    });
  }
};
