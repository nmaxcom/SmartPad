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
});
