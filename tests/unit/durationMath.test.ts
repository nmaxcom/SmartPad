import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";

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
  return result;
};

describe("Duration and time math", () => {
  test("duration literals normalize and display consistently", () => {
    const context = createContext();
    const cases: Array<[string, string]> = [
      ["2hours 1min =>", "2 h 1 min"],
      ["-2hours 1min =>", "-2 h 1 min"],
      ["-2hours + 1min =>", "-1 h 59 min"],
      ["125s =>", "2 min 5 s"],
      ["-90min =>", "-1 h 30 min"],
      ["1h 90min =>", "2 h 30 min"],
      ["-3h 15min =>", "-3 h 15 min"],
      ["-3h + 15min =>", "-2 h 45 min"],
      ["-3h - 15min =>", "-3 h 15 min"],
      ["2h1min =>", "2 h 1 min"],
      ["1h -30min =>", "30 min"],
    ];

    cases.forEach(([input, expected], index) => {
      const result = evaluateLine(input, context, index + 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(result.result).toBe(expected);
      }
    });
  });

  test("time literals are parsed as clock times", () => {
    const context = createContext();
    const simple = evaluateLine("19:30 =>", context, 1);
    expect(simple?.type).toBe("mathResult");
    if (simple?.type === "mathResult") {
      expect(simple.result).toBe("19:30");
    }

    const withSeconds = evaluateLine("07:05:09 =>", context, 2);
    expect(withSeconds?.type).toBe("mathResult");
    if (withSeconds?.type === "mathResult") {
      expect(withSeconds.result).toBe("07:05:09");
    }
  });

  test("time arithmetic with durations handles rollover", () => {
    const context = createContext();
    const forward = evaluateLine("19:30 + 5h 20min 3s =>", context, 1);
    expect(forward?.type).toBe("mathResult");
    if (forward?.type === "mathResult") {
      expect(forward.result).toBe("00:50:03 (+1 day)");
    }

    const backward = evaluateLine("00:10 - 45min =>", context, 2);
    expect(backward?.type).toBe("mathResult");
    if (backward?.type === "mathResult") {
      expect(backward.result).toBe("23:25 (-1 day)");
    }

    const seconds = evaluateLine("23:59:30 + 90s =>", context, 3);
    expect(seconds?.type).toBe("mathResult");
    if (seconds?.type === "mathResult") {
      expect(seconds.result).toBe("00:01:00 (+1 day)");
    }
  });

  test("time differences return durations", () => {
    const context = createContext();
    const forward = evaluateLine("19:30 - 18:00 =>", context, 1);
    expect(forward?.type).toBe("mathResult");
    if (forward?.type === "mathResult") {
      expect(forward.result).toBe("1 h 30 min");
    }

    const backward = evaluateLine("18:00 - 19:30 =>", context, 2);
    expect(backward?.type).toBe("mathResult");
    if (backward?.type === "mathResult") {
      expect(backward.result).toBe("-1 h 30 min");
    }
  });

  test("time plus time errors with guidance", () => {
    const context = createContext();
    const result = evaluateLine("19:30 + 18:00 =>", context, 1);
    expect(result?.type).toBe("error");
    if (result?.type === "error") {
      expect(result.displayText).toContain("Cannot add two clock times");
    }
  });

  test("bare numeric assignments to duration-named variables behave as durations", () => {
    const context = createContext();

    evaluateLine("years = 10", context, 1);
    const yearsVar = context.variableStore.getVariable("years");
    expect(yearsVar?.value.getType()).toBe("duration");

    evaluateLine("rent per month = $1800/month", context, 2);
    evaluateLine("rent total = rent per month * 12 * years", context, 3);
    const rentTotal = context.variableStore.getVariable("rent total");
    expect(rentTotal?.value.getType()).toBe("currency");

    evaluateLine("down payment = $40000", context, 4);
    evaluateLine("mortgage per month = $2200/month", context, 5);
    evaluateLine("own total = down payment + mortgage per month * 12 * years", context, 6);
    const ownTotal = context.variableStore.getVariable("own total");
    expect(ownTotal?.value.getType()).toBe("currency");
  });

  test("duration-based year exponent uses the year count", () => {
    const context = createContext();

    evaluateLine("principal = $12000", context, 1);
    evaluateLine("annual return = 7%", context, 2);
    evaluateLine("years = 15", context, 3);
    const result = evaluateLine(
      "future value = principal * (1 + annual return)^years =>",
      context,
      4
    );
    expect(result?.type).toBe("combined");

    const futureValue = context.variableStore.getVariable("future value");
    expect(futureValue?.value.getType()).toBe("currency");
    expect(futureValue?.value.getNumericValue()).toBeCloseTo(33108.378489, 3);
  });

  test("date plus time combines into a datetime", () => {
    const context = createContext();
    const result = evaluateLine("2025-04-01 + 19:30 =>", context, 1);
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toContain("2025-04-01 19:30");
    }
  });

  test("datetime arithmetic accepts duration phrases and locale dates", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine("01/04/2025 19:30 - 2hours 1min =>", context, 1);
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toContain("2025-04-01 17:29");
    }
  });

  test("datetime arithmetic with duration rolls across days", () => {
    const context = createContext();
    const cases: Array<[string, string]> = [
      ["2025-04-01 00:10 - 45min =>", "2025-03-31 23:25"],
      ["2025-04-01 19:30 + 1h 90min =>", "2025-04-01 22:00"],
      ["2025-04-01 19:30 + 24h =>", "2025-04-02 19:30"],
    ];

    cases.forEach(([input, expected], index) => {
      const result = evaluateLine(input, context, index + 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(result.result).toContain(expected);
      }
    });
  });

  test("datetime differences return durations", () => {
    const context = createContext();
    const result = evaluateLine(
      "2025-04-01 19:30 - 2025-04-01 17:29 =>",
      context,
      1
    );
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("2 h 1 min");
    }
  });

  test("duration conversions return scalar units", () => {
    const context = createContext();
    const cases: Array<[string, string]> = [
      ["3h 7min 12s to min =>", "187.2 min"],
      ["125s to min =>", "2.083333 min"],
      ["2 days 3h to h =>", "51 h"],
      ["1h to s =>", "3600 s"],
      ["21 months to weeks =>", "90 weeks"],
      ["1 year in days =>", "365 days"],
    ];

    cases.forEach(([input, expected], index) => {
      const result = evaluateLine(input, context, index + 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(result.result).toBe(expected);
      }
    });
  });

  test("duration display preserves single-unit inputs", () => {
    const context = createContext();
    const result = evaluateLine("time = 10473 h =>", context, 1);
    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.result).toBe("10473 h");
    }
  });

  test("currency per hour multiplies with duration hours", () => {
    const context = createContext();
    evaluateLine("time = 10473 h", context, 1);
    evaluateLine("floor = $20/h * time", context, 2);
    const floor = context.variableStore.getVariable("floor");
    expect(floor?.value.getType()).toBe("currency");
    expect(floor?.value.getNumericValue()).toBeCloseTo(209460, 5);
  });

  test("currency per day multiplies with duration days", () => {
    const context = createContext();
    evaluateLine("time = 227 days", context, 1);
    evaluateLine("cafe price = $5.25/day", context, 2);
    evaluateLine("cafe total = cafe price * time", context, 3);
    const cafeTotal = context.variableStore.getVariable("cafe total");
    expect(cafeTotal?.value.getType()).toBe("currency");
    expect(cafeTotal?.value.getNumericValue()).toBeCloseTo(1191.75, 5);
  });
});
