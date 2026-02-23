import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  equationStore: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const syncVariables = (context: EvaluationContext) => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const evaluateLine = (
  line: string,
  context: EvaluationContext,
  lineNumber: number
) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  syncVariables(context);
  return result;
};

describe("Locale-aware date literals", () => {
  test("es-ES dates parse as ISO dates", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine("d = 01-02-2023 =>", context, 1);
    expect(result?.type).toBe("combined");
    expect((result as any).result).toContain("2023-02-01");
  });

  test("numeric slash dates parse when locale is unset", () => {
    const context = createContext();
    const result = evaluateLine("d = 06/05/2024 =>", context, 1);
    expect(result?.type).toBe("combined");
    const output = (result as any).result as string;
    expect(output).toMatch(/^2024-\d{2}-\d{2}$/);
    expect(output).not.toContain("Unsupported date format");
  });

  test("es-ES datetime values show timezone offsets instead of local", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine("dt = 01-02-2023 09:30 =>", context, 1);
    expect(result?.type).toBe("combined");
    expect((result as any).result).toContain("2023-02-01 09:30");
    expect((result as any).result).toContain("UTC");
    expect((result as any).result).not.toContain("local");
  });

  test("invalid es-ES value reports literal error", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine("d = 32-02-2023 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain('Invalid date literal "32-02-2023"');
  });

  test("range with es-ES dates still evaluates without solver errors", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine(
      "slots = 01-02-2023 09:00..03-02-2023 09:00 step 1 day =>",
      context,
      1
    );
    expect(result?.type).toBe("combined");
    const display = (result as any).result as string;
    expect(display).toContain("2023-02-01");
    expect(display).not.toContain("Cannot solve");
  });

  test("compact datetime lists suppress repeated dates", () => {
    const context = createContext();
    evaluateLine(
      "slots = 2026-01-01 09:00..2026-01-01 11:00 step 18 min",
      context,
      1
    );
    const result = evaluateLine("slots =>", context, 2);
    expect(result?.type).toBe("mathResult");
    const output = (result as any).result as string;
    expect(output).toContain("2026-01-01:");
    expect(output).toContain("09:00");
    expect(output).toContain("10:48");
    expect(output).toContain("UTC");
    expect(output).not.toContain("local");
  });

  test("compact datetime lists break on day changes", () => {
    const context = createContext();
    evaluateLine(
      "slots = 2026-01-01 23:30..2026-01-02 00:30 step 18 min",
      context,
      1
    );
    const result = evaluateLine("slots =>", context, 2);
    expect(result?.type).toBe("mathResult");
    const output = (result as any).result as string;
    expect(output).toContain("2026-01-01:");
    expect(output).toContain("; 2026-01-02:");
  });

  test("locale display format renders date-only results in locale style", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    context.dateDisplayFormat = "locale";
    const result = evaluateLine("d = 2024-06-05 =>", context, 1);
    expect(result?.type).toBe("combined");
    const output = (result as any).result as string;
    expect(output).toMatch(/05\/06\/2024/);
  });

  test("locale display format renders datetime results in locale style", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    context.dateDisplayFormat = "locale";
    const result = evaluateLine("meeting = 2024-06-05 17:00 UTC =>", context, 1);
    expect(result?.type).toBe("combined");
    const output = (result as any).result as string;
    expect(output).toMatch(/05\/06\/2024.*17:00.*UTC/);
  });
});
