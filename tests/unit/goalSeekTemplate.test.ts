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
    expect(GOAL_SEEK_TEMPLATE).toContain("wealth(y) = seed * mult^y");
    expect(GOAL_SEEK_TEMPLATE).toContain("net_wealth(y) = wealth(y) * (1 - tax)");
    expect(GOAL_SEEK_TEMPLATE).toContain("@view plot y=wealth,net_wealth");
    expect(GOAL_SEEK_TEMPLATE).toContain("make mult^years = need growth by years =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("= target by monthly =>");
    expect(GOAL_SEEK_TEMPLATE).toContain("= target by seed =>");
  });

  test("normalization keeps goal-seek triggers and removes optional result triggers", () => {
    const normalized = normalizeTemplateTriggers("goal-seek", GOAL_SEEK_TEMPLATE);

    expect(normalized).toContain("make checkout total = 150 EUR by items =>");
    expect(normalized).toContain("make brew ratio = 16 by coffee =>");
    expect(normalized).toContain("make mult^years = need growth by years =>");
    expect(normalized).toContain("checkout total = unit price * items + shipping");
    expect(normalized).not.toContain("checkout total = unit price * items + shipping =>");
    expect(normalized).toContain("wealth now = wealth(years)");
    expect(normalized).not.toContain("wealth now = wealth(years) =>");
    expect(normalized).toContain("net now = net_wealth(years)");
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
    const incompleteWrappers: string[] = [];
    let goalSeekResults = 0;
    let investingPlot: any = null;
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
      if (
        raw.trim().match(/^(wealth now|tax due|net now|need growth|make mult\^years)/) &&
        result &&
        "result" in result
      ) {
        const output = String((result as any).result ?? "");
        if (/\b(seed|monthly|rate|tax|target|need growth|wealth now|mult)\b/.test(output)) {
          incompleteWrappers.push(`line ${lineNumber}: "${raw}" -> ${output}`);
        }
      }
      if (raw.trim().startsWith("make ") && result?.type === "mathResult") {
        goalSeekResults += 1;
      }
      if (raw.trim().startsWith("@view plot y=wealth,net_wealth")) {
        investingPlot = result;
      }
    });

    expect(failures).toEqual([]);
    expect(incompleteWrappers).toEqual([]);
    expect(goalSeekResults).toBe(12);
    expect(investingPlot?.type).toBe("plotView");
    expect(investingPlot?.status).toBe("connected");
    const wealthSeries = investingPlot?.series?.find((series: any) => series.label === "wealth(y)");
    const netSeries = investingPlot?.series?.find((series: any) => series.label === "net_wealth(y)");
    const wealthValues = (wealthSeries?.data || [])
      .map((point: any) => point.y)
      .filter((value: unknown): value is number => typeof value === "number");
    const netValues = (netSeries?.data || [])
      .map((point: any) => point.y)
      .filter((value: unknown): value is number => typeof value === "number");
    expect(Math.max(...wealthValues) - Math.min(...wealthValues)).toBeGreaterThan(100000);
    expect(Math.max(...netValues) - Math.min(...netValues)).toBeGreaterThan(70000);
  });

  test("shows distance over declared duration in the user's compound speed unit", () => {
    const context = createContext();
    const lines = [
      "route = 120 km",
      "drive time = 2 h",
      "average speed = route / drive time",
    ];

    let result: any;
    lines.forEach((raw, index) => {
      const node = parseLine(raw, index + 1);
      context.lineNumber = index + 1;
      result = defaultRegistry.evaluate(node, context);
      recordEquationFromNode(node, context.equationStore ?? []);
      syncVariables(context);
    });

    expect(result?.type).toBe("combined");
    expect(result.result).toBe("60 km/h");
  });
});
