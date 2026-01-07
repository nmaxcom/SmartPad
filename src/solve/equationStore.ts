import {
  ASTNode,
  ExpressionNode,
  isExpressionNode,
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
    return;
  }

  if (isExpressionNode(node) && node.raw.includes("=>")) {
    const [leftRaw, rightRaw] = node.raw.split("=>");
    const left = leftRaw?.trim();
    const right = rightRaw?.trim();
    if (!left || !right) return;
    if (!isVariableReference(left)) return;
    equations.push({
      line: node.line,
      variableName: normalizeVariableName(left),
      expression: `${left} = ${right}`,
    });
  }
};

const isVariableReference = (expr: string): boolean => /^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(expr.trim());
