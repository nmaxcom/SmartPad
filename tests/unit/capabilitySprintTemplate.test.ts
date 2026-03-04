import { selectPastePayload } from "../../src/components/pasteTransforms";
import { normalizeTemplateTriggers } from "../../src/components/VariablePanel/templateTriggerNormalization";
import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { CAPABILITY_SPRINT_TEMPLATE } from "../../src/templates/capabilitySprintTemplate";
import { recordEquationFromNode } from "../../src/solve/equationStore";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  equationStore: [],
  astNodes: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const syncVariables = (context: EvaluationContext) => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const evaluateLine = (line: string, context: EvaluationContext, lineNumber: number) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  syncVariables(context);
  return result;
};

describe("Capability Sprint template", () => {
  test("stays within the condensed 40-80 line target", () => {
    const lineCount = CAPABILITY_SPRINT_TEMPLATE.split("\n").length;
    expect(lineCount).toBeGreaterThanOrEqual(40);
    expect(lineCount).toBeLessThanOrEqual(80);
  });

  test("evaluates normalized executable lines without parse/runtime errors", () => {
    const normalized = normalizeTemplateTriggers("capability-sprint", CAPABILITY_SPRINT_TEMPLATE);
    const lines = normalized.split("\n");
    const context = createContext();
    const executable = lines
      .map((raw, index) => ({ raw, lineNumber: index + 1 }))
      .filter(({ raw }) => {
        const line = raw.trim();
        return line.length > 0 && !line.startsWith("#");
      });

    context.astNodes = executable.map(({ raw, lineNumber }) => parseLine(raw, lineNumber));

    const failures: string[] = [];
    executable.forEach(({ raw, lineNumber }, index) => {
      const node = context.astNodes?.[index];
      context.lineNumber = lineNumber;
      const result = defaultRegistry.evaluate(node!, context);
      recordEquationFromNode(node!, context.equationStore ?? []);
      syncVariables(context);

      if (result?.type === "error") {
        const message = (result as any).displayText || (result as any).error || "unknown error";
        failures.push(`line ${lineNumber}: "${raw}" -> ${String(message)}`);
      }
    });

    expect(failures).toEqual([]);
  });

  test("prefers plain text for multiline paste payload when markdown is flattened", () => {
    const flattenedMarkdown = CAPABILITY_SPRINT_TEMPLATE.replace(/\n+/g, " ");
    const selected = selectPastePayload(flattenedMarkdown, CAPABILITY_SPRINT_TEMPLATE);

    expect(selected).toBe(CAPABILITY_SPRINT_TEMPLATE);
  });

  test("taxi crossover example yields sensible break-even and trip comparisons", () => {
    const context = createContext();

    evaluateLine("taxi base = 6", context, 1);
    evaluateLine("taxi rate = 0.85", context, 2);
    evaluateLine("rideshare base = 2", context, 3);
    evaluateLine("rideshare rate = 1.45", context, 4);
    evaluateLine(
      "crossover balance = taxi base - rideshare base - (rideshare rate - taxi rate)*break_even_km",
      context,
      5
    );
    evaluateLine("crossover balance => 0", context, 6);

    const breakEven = evaluateLine("break_even_km =>", context, 7);
    expect(breakEven?.type).toBe("mathResult");
    expect(parseFloat((breakEven as any).result)).toBeCloseTo(6.666667, 5);

    const taxiShort = evaluateLine("taxi base + taxi rate*4 =>", context, 8);
    const rideshareShort = evaluateLine("rideshare base + rideshare rate*4 =>", context, 9);
    expect(parseFloat((taxiShort as any).result)).toBeCloseTo(9.4, 5);
    expect(parseFloat((rideshareShort as any).result)).toBeCloseTo(7.8, 5);
    expect(parseFloat((taxiShort as any).result)).toBeGreaterThan(
      parseFloat((rideshareShort as any).result)
    );

    const taxiLong = evaluateLine("taxi base + taxi rate*9 =>", context, 10);
    const rideshareLong = evaluateLine("rideshare base + rideshare rate*9 =>", context, 11);
    expect(parseFloat((taxiLong as any).result)).toBeCloseTo(13.65, 5);
    expect(parseFloat((rideshareLong as any).result)).toBeCloseTo(15.05, 5);
    expect(parseFloat((taxiLong as any).result)).toBeLessThan(
      parseFloat((rideshareLong as any).result)
    );
  });
});
