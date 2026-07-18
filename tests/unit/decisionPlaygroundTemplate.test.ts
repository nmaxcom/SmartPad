import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { DECISION_PLAYGROUND_TEMPLATE } from "../../src/templates/decisionPlaygroundTemplate";

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

describe("Decision Playground template", () => {
  test("evaluates every executable line without parse or runtime errors", () => {
    const context = createContext();
    const executable = DECISION_PLAYGROUND_TEMPLATE.split("\n")
      .map((raw, index) => ({ raw, lineNumber: index + 1 }))
      .filter(({ raw }) => {
        const line = raw.trim();
        return line.length > 0 && !line.startsWith("#");
      });

    context.astNodes = executable.map(({ raw, lineNumber }) =>
      parseLine(raw, lineNumber),
    );

    const failures: string[] = [];
    executable.forEach(({ raw, lineNumber }, index) => {
      const node = context.astNodes?.[index];
      context.lineNumber = lineNumber;
      const result = defaultRegistry.evaluate(node!, context);
      recordEquationFromNode(node!, context.equationStore ?? []);
      syncVariables(context);

      if (result?.type === "error") {
        const message =
          (result as any).displayText ||
          (result as any).error ||
          "unknown error";
        failures.push(`line ${lineNumber}: "${raw}" -> ${String(message)}`);
      }
    });

    expect(failures).toEqual([]);
  });

  test("keeps one clear first move plus live plot and goal-seek prompts", () => {
    expect(DECISION_PLAYGROUND_TEMPLATE).toContain(
      "First move: Set baseline in Variables, then drag 32",
    );
    expect(DECISION_PLAYGROUND_TEMPLATE).toContain(
      "@view plot x=ticket price y=profit domain=20..65 size=md",
    );
    expect(DECISION_PLAYGROUND_TEMPLATE).toContain(
      "make profit = 2500 EUR by ticket price =>",
    );
  });
});
