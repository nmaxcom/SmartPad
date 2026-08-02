import { DisplayOptions, SemanticValue, SemanticValueTypes } from "../types";
import { Variable } from "../state/types";

export interface SubstitutionLensResult {
  expression: string;
  substitutedExpression: string;
  result: string;
  replacementCount: number;
}

const isIdentifierCharacter = (char: string | undefined): boolean =>
  !!char && /[A-Za-z0-9_]/.test(char);

const displayReplacement = (
  value: SemanticValue,
  options?: DisplayOptions
): string => {
  const display = value.toString(options);
  if (SemanticValueTypes.isUncertain(value)) return `(${display})`;
  return /^-/.test(display.trim()) ? `(${display})` : display;
};

export const buildSubstitutionLens = (
  expression: string,
  result: SemanticValue | string,
  variableContext: Map<string, Variable>,
  displayOptions?: DisplayOptions
): SubstitutionLensResult | null => {
  if (!expression.trim() || expression.length > 180) return null;
  const candidates = Array.from(variableContext.entries())
    .filter(([, variable]) => {
      const value = variable.value;
      return (
        value instanceof SemanticValue &&
        value.isNumeric() &&
        !SemanticValueTypes.isList(value) &&
        !SemanticValueTypes.isMatrix(value) &&
        !SemanticValueTypes.isTable(value)
      );
    })
    .sort(([left], [right]) => right.length - left.length);

  let output = "";
  let index = 0;
  let quote: '"' | "'" | null = null;
  let replacementCount = 0;

  while (index < expression.length) {
    const char = expression[index];
    if (quote) {
      output += char;
      if (char === quote && expression[index - 1] !== "\\") quote = null;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      index += 1;
      continue;
    }

    let matched = false;
    for (const [name, variable] of candidates) {
      if (!expression.startsWith(name, index)) continue;
      const before = expression[index - 1];
      const after = expression[index + name.length];
      if (isIdentifierCharacter(before) || isIdentifierCharacter(after)) continue;
      output += displayReplacement(variable.value, displayOptions);
      index += name.length;
      replacementCount += 1;
      matched = true;
      break;
    }
    if (!matched) {
      output += char;
      index += 1;
    }
  }

  if (replacementCount === 0 || replacementCount > 10 || output.length > 260) return null;
  const resultDisplay =
    result instanceof SemanticValue ? result.toString(displayOptions) : String(result);
  if (!resultDisplay.trim()) return null;
  return {
    expression,
    substitutedExpression: output,
    result: resultDisplay,
    replacementCount,
  };
};
