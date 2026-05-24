import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { isPlotViewRenderNode } from "../../src/eval/renderNodes";
import { parseLine } from "../../src/parsing/astParser";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { VISUAL_INSIGHTS_TEMPLATE } from "../../src/templates/visualInsightsTemplate";

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

describe("Visual Insights template", () => {
  test("contains every new plot affordance example", () => {
    expect(VISUAL_INSIGHTS_TEMPLATE).toContain("@view plot x=time y=speed");
    expect(VISUAL_INSIGHTS_TEMPLATE).toContain("@view plot x=promo spend y=forecast revenue");
    expect(VISUAL_INSIGHTS_TEMPLATE).toContain("@view plot x=price delta y=forecast revenue");
    expect(VISUAL_INSIGHTS_TEMPLATE).toContain("@view hist y=wait times");
    expect(VISUAL_INSIGHTS_TEMPLATE).toContain("@view hist y=same wait");
    expect(VISUAL_INSIGHTS_TEMPLATE).toContain("@view scatter x=study hours y=test score");
    expect(VISUAL_INSIGHTS_TEMPLATE).toContain("@view scatter x=daily spend y=ticket sales");
  });

  test("evaluates executable lines and connects every @view", () => {
    const lines = VISUAL_INSIGHTS_TEMPLATE.split("\n");
    const context = createContext();
    const executable = lines
      .map((raw, index) => ({ raw, lineNumber: index + 1 }))
      .filter(({ raw }) => {
        const line = raw.trim();
        return line.length > 0 && !line.startsWith("#");
      });

    context.astNodes = executable.map(({ raw, lineNumber }) => parseLine(raw, lineNumber));

    const failures: string[] = [];
    let connectedViews = 0;
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
      if (result && isPlotViewRenderNode(result)) {
        if (result.status !== "connected") {
          failures.push(`line ${lineNumber}: "${raw}" -> disconnected: ${result.message}`);
        } else {
          connectedViews += 1;
        }
      }
    });

    expect(failures).toEqual([]);
    expect(connectedViews).toBe(8);
  });
});
