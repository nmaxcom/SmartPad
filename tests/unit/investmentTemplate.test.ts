import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { isPlotViewRenderNode } from "../../src/eval/renderNodes";
import { parseLine } from "../../src/parsing/astParser";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { INVESTMENT_TEMPLATE } from "../../src/templates/investmentTemplate";

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

describe("Investment template", () => {
  test("contains complete investment, fees, Spanish tax, ROI, and chart examples", () => {
    expect(INVESTMENT_TEMPLATE).toContain("market = 0.07");
    expect(INVESTMENT_TEMPLATE).toContain("fundfee = 0.0035");
    expect(INVESTMENT_TEMPLATE).toContain("platformfee = 0.0015");
    expect(INVESTMENT_TEMPLATE).toContain("taxlow = 0.19");
    expect(INVESTMENT_TEMPLATE).toContain("wealth(x)");
    expect(INVESTMENT_TEMPLATE).toContain("@view plot y=wealth,netwealth");
    expect(INVESTMENT_TEMPLATE).toContain("gross roi now = roi(horizon) as % =>");
  });

  test("evaluates executable lines and keeps critical wrappers numeric and complete", () => {
    const lines = INVESTMENT_TEMPLATE.split("\n");
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
          const grossSeries = result.series?.find((series) =>
            (series.label ?? "").startsWith("wealth")
          );
          const netSeries = result.series?.find((series) =>
            (series.label ?? "").startsWith("netwealth")
          );
          expect(grossSeries).toBeTruthy();
          expect(netSeries).toBeTruthy();
          const grossValues = (grossSeries?.data || [])
            .map((point) => point.y)
            .filter((value): value is number => typeof value === "number");
          const netValues = (netSeries?.data || [])
            .map((point) => point.y)
            .filter((value): value is number => typeof value === "number");
          expect(grossValues.length).toBeGreaterThan(5);
          expect(netValues.length).toBeGreaterThan(5);
          expect(Math.max(...grossValues) - Math.min(...grossValues)).toBeGreaterThan(100000);
          expect(Math.max(...netValues) - Math.min(...netValues)).toBeGreaterThan(70000);
        }
      }

      if (
        raw.trim().match(
          /^(annual return|paid total|value before tax|gain before tax|gross roi now|chart tax|tax low due|tax mid due|tax high due|tax due|net value|net profit|after tax roi|target gross|value low|value base|value high)/
        ) &&
        result &&
        "result" in result
      ) {
        const output = String((result as any).result ?? "");
        if (
          /\b(start|monthly|horizon|market|fundfee|platformfee|annual|paid|wealth|gain|target net|growth|efftax|charttax|taxlow|taxmid|taxhigh|lowgain|midgain|highgain)\b/.test(
            output
          )
        ) {
          incompleteWrappers.push(`line ${lineNumber}: "${raw}" -> ${output}`);
        }
      }
    });

    expect(failures).toEqual([]);
    expect(incompleteWrappers).toEqual([]);
    expect(connectedViews).toBe(1);
  });
});
