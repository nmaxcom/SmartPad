/**
 * @file List expression helpers
 * @description Utilities for detecting and splitting top-level comma-separated expressions.
 */

/**
 * Split a string on top-level commas (ignoring commas inside parentheses/brackets/braces).
 */
export function splitTopLevelCommas(input: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let buffer = "";

  for (const char of input) {
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
    }

    if (char === "," && depth === 0) {
      segments.push(buffer);
      buffer = "";
      continue;
    }

    buffer += char;
  }

  segments.push(buffer);
  return segments;
}

/**
 * Pick a delimiter string that matches the spacing of the source expression.
 */
export function inferListDelimiter(expression: string): string {
  return /,\s+/.test(expression) ? ", " : ",";
}
