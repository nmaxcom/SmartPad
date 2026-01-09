import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ListValue, DateValue } from "../../src/types";
import { DEFAULT_LIST_MAX_LENGTH, setListMaxLength } from "../../src/types/listConfig";

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
  if (!line.includes("=>") && result?.type === "variable") {
    return null;
  }
  return result;
};

describe("Date and time ranges", () => {
  beforeEach(() => {
    setListMaxLength(DEFAULT_LIST_MAX_LENGTH);
  });

  test("date ranges without an explicit step error out", () => {
    const context = createContext();
    const result = evaluateLine("period = 2026-01-01..2026-01-05 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("duration step");
  });

  test("explicit day step generates daily dates", () => {
    const context = createContext();
    evaluateLine("period = 2026-01-01..2026-01-05 step 1 day", context, 1);
    const variable = context.variableContext.get("period");
    expect(variable?.value).toBeInstanceOf(ListValue);
    const items = (variable?.value as ListValue).getItems();
    expect(items.map((item) => item.toString())).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
    ]);
  });

  test("weekly stepping preserves the weekday", () => {
    const context = createContext();
    evaluateLine("period = 2026-01-01..2026-02-01 step 1 week", context, 1);
    const variable = context.variableContext.get("period");
    expect(variable?.value).toBeInstanceOf(ListValue);
    const items = (variable?.value as ListValue).getItems();
    expect(items.map((item) => item.toString())).toEqual([
      "2026-01-01",
      "2026-01-08",
      "2026-01-15",
      "2026-01-22",
      "2026-01-29",
    ]);
  });

  test("monthly stepping holds the same day-of-month", () => {
    const context = createContext();
    evaluateLine("period = 2026-01-15..2026-05-15 step 1 month", context, 1);
    const variable = context.variableContext.get("period");
    expect(variable?.value).toBeInstanceOf(ListValue);
    const items = (variable?.value as ListValue).getItems();
    expect(items.map((item) => item.toString())).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
      "2026-05-15",
    ]);
  });

  test("month-end stepping clamps to the last valid day", () => {
    const context = createContext();
    evaluateLine("period = 2026-01-31..2026-05-31 step 1 month", context, 1);
    const variable = context.variableContext.get("period");
    expect(variable?.value).toBeInstanceOf(ListValue);
    const items = (variable?.value as ListValue).getItems();
    expect(items.map((item) => item.toString())).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  test("time ranges produce slots when supplied with a duration step", () => {
    const context = createContext();
    const result = evaluateLine(
      "slots = 2026-01-01 09:00..2026-01-01 11:00 step 30 min",
      context,
      1
    );
    expect(result).toBeNull();
    const variable = context.variableContext.get("slots");
    expect(variable?.value).toBeInstanceOf(ListValue);
    const items = (variable?.value as ListValue).getItems();
    expect(items).toHaveLength(5);
    const formatted = items.map((item) =>
      (item as DateValue).getDateTime().toFormat("HH:mm")
    );
    expect(formatted).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  test("datetime ranges respect the provided timezone", () => {
    const context = createContext();
    evaluateLine("slots = 2026-01-01 09:00 UTC..2026-01-01 12:00 UTC step 1 h", context, 1);
    const variable = context.variableContext.get("slots");
    expect(variable?.value).toBeInstanceOf(ListValue);
    const items = (variable?.value as ListValue).getItems();
    expect(items.map((item) => (item as DateValue).toString())).toEqual([
      "2026-01-01 09:00 UTC",
      "2026-01-01 10:00 UTC",
      "2026-01-01 11:00 UTC",
      "2026-01-01 12:00 UTC",
    ]);
  });

  test("inclusive endpoint when the step aligns exactly", () => {
    const context = createContext();
    evaluateLine("period = 2026-01-01 09:00..2026-01-01 10:00 step 40 min", context, 1);
    const variable = context.variableContext.get("period");
    expect(variable?.value).toBeInstanceOf(ListValue);
    const items = (variable?.value as ListValue).getItems();
    const formatted = items.map((item) =>
      (item as DateValue).getDateTime().toFormat("HH:mm")
    );
    expect(formatted).toEqual(["09:00", "09:40"]);
  });

  test("range guard applies to long intervals", () => {
    const context = createContext();
    const result = evaluateLine(
      "slots = 2026-01-01 09:00..2026-01-01 23:59 step 1 min =>",
      context,
      1
    );
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("range too large");
  });

  test("missing duration step for time ranges errors out", () => {
    const context = createContext();
    const result = evaluateLine("slots = 2026-01-01 09:00..2026-01-01 11:00 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("duration step");
  });

  test("non-duration step triggers a helpful error", () => {
    const context = createContext();
    const result = evaluateLine("period = 2026-01-01..2026-01-05 step 2 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("Invalid range step");
  });

  test("numeric ranges reject duration steps", () => {
    const context = createContext();
    const result = evaluateLine("1..10 step 1 day =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("Invalid range step");
  });

  test("invalid range expressions are normalized", () => {
    const context = createContext();
    const result = evaluateLine("2026-01-01....2026-01-05 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain(
      'Invalid range expression near "2026-01-01....2026-01-05"'
    );
  });

  test("ranges missing endpoints return range errors", () => {
    const context = createContext();
    const first = evaluateLine("2026-01-01.. step 1 day =>", context, 1);
    expect(first?.type).toBe("error");
    expect((first as any).displayText).toContain("Invalid range expression");

    const second = evaluateLine("..2026-01-05 step 1 day =>", context, 2);
    expect(second?.type).toBe("error");
    expect((second as any).displayText).toContain("Invalid range expression");
  });
});
