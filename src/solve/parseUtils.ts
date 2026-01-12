export type SolveEquation = {
  left: string;
  right: string;
};

export const isVariableReferenceExpression = (expr: string): boolean =>
  /^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(expr.trim());

export const splitTopLevelEquation = (input: string): SolveEquation | null => {
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "=" && depth === 0) {
      const left = input.slice(0, i).trim();
      const right = input.slice(i + 1).trim();
      if (!left || !right) return null;
      return { left, right };
    }
  }
  return null;
};
