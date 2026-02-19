const REQUIRED_TRIGGER_LINES: Record<string, Set<string>> = {
  "live-result-playground": new Set(["unknownVar + 1"]),
  "result-chip-graph": new Set(["subtotal = 120"]),
};

const shouldKeepExplicitTrigger = (
  templateId: string,
  expression: string,
  trailing: string
): boolean => {
  if (trailing.startsWith("⚠️")) return true;
  if (/\bsolve\b/i.test(expression)) return true;
  return REQUIRED_TRIGGER_LINES[templateId]?.has(expression) ?? false;
};

export const normalizeTemplateTriggers = (templateId: string, content: string): string =>
  content
    .split("\n")
    .map((line) => {
      if (!line.includes("=>")) return line;

      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
        return line;
      }

      const arrowIndex = line.indexOf("=>");
      const expression = line.slice(0, arrowIndex).trim();
      const trailing = line.slice(arrowIndex + 2).trim();

      if (shouldKeepExplicitTrigger(templateId, expression, trailing)) {
        return trailing ? `${expression} => ${trailing}` : `${expression} =>`;
      }

      return expression;
    })
    .join("\n");
