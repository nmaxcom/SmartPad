import { normalizeTemplateTriggers } from "../../src/components/VariablePanel/templateTriggerNormalization";
import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { GOAL_SEEK_TEMPLATE } from "../../src/templates/goalSeekTemplate";

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

describe("Goal Seek template", () => {
  test("progresses from simple to richer one-variable goal-seek examples", () => {
    expect(GOAL_SEEK_TEMPLATE).toContain("make checkout total = 150 EUR by items =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("make average speed = 90 km/h by drive time =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("make take home = 4000 EUR by gross pay =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("make runway = 12 month by monthly burn =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("make gross profit = 9000 EUR by price =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("make projected signups = 850 by ad spend =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("make usable range = 420 km by efficiency =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("make brew ratio = 16 by coffee =>");
    expect(GOAL_SEEK_TEMPLATE).toContain(
      "make target distance / target time = 100 km/h by target time =>"
    );
  });

  test("normalization keeps goal-seek triggers and removes optional result triggers", () => {
    const normalized = normalizeTemplateTriggers("goal-seek", GOAL_SEEK_TEMPLATE);

    expect(normalized).toContain("make checkout total = 150 EUR by items =>");
    expect(normalized).toContain("make brew ratio = 16 by coffee =>");
    expect(normalized).toContain("checkout total = unit price * items + shipping");
    expect(normalized).not.toContain("checkout total = unit price * items + shipping =>");
  });

  test("evaluates normalized executable lines without parse/runtime errors", () => {
    const normalized = normalizeTemplateTriggers("goal-seek", GOAL_SEEK_TEMPLATE);
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
    let goalSeekResults = 0;
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
      if (raw.trim().startsWith("make ") && result?.type === "mathResult") {
        goalSeekResults += 1;
      }
    });

    expect(failures).toEqual([]);
    expect(goalSeekResults).toBe(9);
  });
});
