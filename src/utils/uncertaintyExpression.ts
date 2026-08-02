export interface UncertaintyExpressionParts {
  center: string;
  tolerance: string;
}

/**
 * Splits one visible top-level `±` expression without guessing nested syntax.
 * SmartPad deliberately supports one uncertainty declaration at a time; derived
 * uncertainty is propagated by normal arithmetic after the value is stored.
 */
export const splitUncertaintyExpression = (
  expression: string
): UncertaintyExpressionParts | null => {
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let operatorIndex = -1;

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (char === quote && expression[index - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[") depth += 1;
    if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    if (char !== "±" || depth !== 0) continue;
    if (operatorIndex >= 0) return null;
    operatorIndex = index;
  }

  if (operatorIndex < 0) return null;
  const center = expression.slice(0, operatorIndex).trim();
  const tolerance = expression.slice(operatorIndex + 1).trim();
  if (!center || !tolerance) return null;
  return { center, tolerance };
};

export const containsUncertaintyExpression = (expression: string): boolean =>
  splitUncertaintyExpression(expression) !== null;
