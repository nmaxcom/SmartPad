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

const evaluateExecutableTemplate = (template: string) => {
  const lines = template.split("\n");
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
  const outputs = new Map<string, string>();
  let connectedViews = 0;
  let plotSeries: any = null;

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

    if (result && "result" in result) {
      outputs.set(raw.trim(), String((result as any).result ?? ""));
    }

    if (result && isPlotViewRenderNode(result)) {
      if (result.status !== "connected") {
        failures.push(`line ${lineNumber}: "${raw}" -> disconnected: ${result.message}`);
      } else {
        connectedViews += 1;
        plotSeries = result as any;
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

  return { failures, incompleteWrappers, connectedViews, plotSeries, outputs };
};

describe("Investment template", () => {
  test("contains complete investment, fees, Spanish tax, ROI, and chart examples", () => {
    expect(INVESTMENT_TEMPLATE).toContain("market = 7%");
    expect(INVESTMENT_TEMPLATE).toContain("fundfee = 0.35%");
    expect(INVESTMENT_TEMPLATE).toContain("platformfee = 0.15%");
    expect(INVESTMENT_TEMPLATE).toContain("taxlow = 19%");
    expect(INVESTMENT_TEMPLATE).not.toContain("annual return = annual as %");
    expect(INVESTMENT_TEMPLATE).toContain("wealth(year)");
    expect(INVESTMENT_TEMPLATE).toContain("netwealth(year)");
    expect(INVESTMENT_TEMPLATE).toContain("@view plot y=wealth,netwealth");
    expect(INVESTMENT_TEMPLATE).toContain("gross roi now = roi(horizon) as % =>");
  });

  test("evaluates executable lines and keeps critical wrappers numeric and complete", () => {
    const { failures, incompleteWrappers, connectedViews, plotSeries } =
      evaluateExecutableTemplate(INVESTMENT_TEMPLATE);

    const grossSeries = plotSeries?.series?.find((series: any) =>
      (series.label ?? "").startsWith("wealth")
    );
    const netSeries = plotSeries?.series?.find((series: any) =>
      (series.label ?? "").startsWith("netwealth")
    );
    expect(grossSeries).toBeTruthy();
    expect(netSeries).toBeTruthy();
    const grossValues = (grossSeries?.data || [])
      .map((point: any) => point.y)
      .filter((value: unknown): value is number => typeof value === "number");
    const netValues = (netSeries?.data || [])
      .map((point: any) => point.y)
      .filter((value: unknown): value is number => typeof value === "number");
    expect(grossValues.length).toBeGreaterThan(5);
    expect(netValues.length).toBeGreaterThan(5);
    expect(Math.max(...grossValues) - Math.min(...grossValues)).toBeGreaterThan(100000);
    expect(Math.max(...netValues) - Math.min(...netValues)).toBeGreaterThan(70000);

    expect(failures).toEqual([]);
    expect(incompleteWrappers).toEqual([]);
    expect(connectedViews).toBe(1);
  });

  test("keeps percentage literals and decimal rates interchangeable", () => {
    const decimalTemplate = INVESTMENT_TEMPLATE
      .replace("market = 7%", "market = 0.07")
      .replace("fundfee = 0.35%", "fundfee = 0.0035")
      .replace("platformfee = 0.15%", "platformfee = 0.0015")
      .replace("taxlow = 19%", "taxlow = 0.19")
      .replace("taxmid = 21%", "taxmid = 0.21")
      .replace("taxhigh = 23%", "taxhigh = 0.23")
      .replace("charttax = 21%", "charttax = 0.21")
      .replace("low = 4% - fundfee - platformfee", "low = 0.04 - fundfee - platformfee")
      .replace("base = 7% - fundfee - platformfee", "base = 0.07 - fundfee - platformfee")
      .replace("high = 9% - fundfee - platformfee", "high = 0.09 - fundfee - platformfee");

    const percentResult = evaluateExecutableTemplate(INVESTMENT_TEMPLATE);
    const decimalResult = evaluateExecutableTemplate(decimalTemplate);

    expect(percentResult.failures).toEqual([]);
    expect(percentResult.incompleteWrappers).toEqual([]);
    expect(percentResult.connectedViews).toBe(1);
    expect(percentResult.outputs.get("value before tax = wealth(horizon) =>")).toBe(
      decimalResult.outputs.get("value before tax = wealth(horizon) =>")
    );
    expect(percentResult.outputs.get("net value = value before tax - tax due =>")).toBe(
      decimalResult.outputs.get("net value = value before tax - tax due =>")
    );
  });
});
