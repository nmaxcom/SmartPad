import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { isPlotViewRenderNode } from "../../src/eval/renderNodes";
import { parseLine } from "../../src/parsing/astParser";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { NEW_STUFF_TEMPLATE } from "../../src/templates/visualInsightsTemplate";

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

describe("New stuff template", () => {
  test("contains every new plot and goal-seek affordance example", () => {
    expect(NEW_STUFF_TEMPLATE).toContain("@view plot x=time y=speed");
    expect(NEW_STUFF_TEMPLATE).toContain("@view plot x=radius y=area now");
    expect(NEW_STUFF_TEMPLATE).toContain('@view plot x=x y="x^3 + 4"');
    expect(NEW_STUFF_TEMPLATE).toContain("@view plot x=promo spend y=forecast revenue");
    expect(NEW_STUFF_TEMPLATE).toContain("@view plot x=price delta y=forecast revenue");
    expect(NEW_STUFF_TEMPLATE).toContain("@view hist y=wait times");
    expect(NEW_STUFF_TEMPLATE).toContain("@view hist y=same wait");
    expect(NEW_STUFF_TEMPLATE).toContain("@view scatter x=study hours y=test score");
    expect(NEW_STUFF_TEMPLATE).toContain("@view scatter x=daily spend y=ticket sales");
    expect(NEW_STUFF_TEMPLATE).toContain("gross = 3000 EUR");
    expect(NEW_STUFF_TEMPLATE).toContain("make take home = 4000 EUR by gross =>");
    expect(NEW_STUFF_TEMPLATE).toContain(
      "make goal fund = 20000 EUR by monthly saving =>"
    );
    expect(NEW_STUFF_TEMPLATE).toContain("edge tiny = 9.99e-5 s");
  });

  test("evaluates executable lines and connects every @view", () => {
    const lines = NEW_STUFF_TEMPLATE.split("\n");
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
    expect(connectedViews).toBe(10);
  });
});
