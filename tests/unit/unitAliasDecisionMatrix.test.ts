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

const evaluateLine = (line: string, context: EvaluationContext, lineNumber: number) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  syncVariables(context);
  return result;
};

const expectMathResult = (result: ReturnType<typeof evaluateLine>): string => {
  expect(result).toBeTruthy();
  expect(["mathResult", "combined", "variable"]).toContain(result?.type);
  return (result as any).result ?? (result as any).value;
};

describe("Unit alias product decision matrix", () => {
  describe("1. Basic Alias & Time Conversions", () => {
    test("user-defined definitions substitute correctly and labels are preserved", () => {
      const context = createContext();
      evaluateLine("workweek = 40 h", context, 1);

      const hours = expectMathResult(evaluateLine("2 workweeks to h =>", context, 2));
      expect(hours).toMatch(/80\s*h/);

      const inWeeks = expectMathResult(evaluateLine("80 h in workweeks =>", context, 3));
      expect(inWeeks).toMatch(/2\s*workweeks/);

      evaluateLine("shift = 8 h", context, 4);
      evaluateLine("pay = $25/h", context, 5);
      const payPerShift = expectMathResult(evaluateLine("pay to $/shift =>", context, 6));
      expect(payPerShift).toMatch(/\$?200\s*\/\s*shift/);
    });
  });

  describe("2. Plurals and Singulars", () => {
    test("recognizes plural alias and pluralizes output based on value", () => {
      const context = createContext();
      evaluateLine("box = 12 unit", context, 1);

      const boxes = expectMathResult(evaluateLine("5 boxes =>", context, 2));
      expect(boxes).toMatch(/5\s*boxes/);

      const toBoxes = expectMathResult(evaluateLine("24 units to box =>", context, 3));
      expect(toBoxes).toMatch(/2\s*boxes/);

      const toBox = expectMathResult(evaluateLine("12 units to box =>", context, 4));
      expect(toBox).toMatch(/1\s*box/);
    });
  });

  describe("3. Phrase Variables and Structural Parsing", () => {
    test("supports phrase variables in units and avoids breaking on 'to'/'in' inside names", () => {
      const context = createContext();
      evaluateLine("large serving = 500 g", context, 1);
      const servings = expectMathResult(evaluateLine("3 large servings to kg =>", context, 2));
      expect(servings).toMatch(/1\.5\s*kg/);

      evaluateLine("distance to office = 15 km", context, 3);
      const meters = expectMathResult(evaluateLine("distance to office in m =>", context, 4));
      expect(meters).toMatch(/15,?000\s*m/);

      evaluateLine("time to write = 10 h", context, 5);
      evaluateLine("workday = 5 h", context, 6);
      const days = expectMathResult(evaluateLine("time to write in workdays =>", context, 7));
      expect(days).toMatch(/2\s*workdays/);
    });
  });

  describe("4. Ratio Reasoning and Countables", () => {
    test("keeps countable labels in outputs", () => {
      const context = createContext();
      evaluateLine("household = 4 person", context, 1);
      evaluateLine("rent = $2400/month", context, 2);

      const perPerson = expectMathResult(evaluateLine("rent / household =>", context, 3));
      expect(perPerson).toMatch(/\$?600/);
      expect(perPerson).toMatch(/person/);
      expect(perPerson).toMatch(/month/);

      evaluateLine("Mreq = 1,000,000 request", context, 4);
      evaluateLine("api cost = $0.10 / Mreq", context, 5);
      evaluateLine("traffic = 50 Mreq/month", context, 6);
      const total = expectMathResult(evaluateLine("api cost * traffic =>", context, 7));
      expect(total).toMatch(/\$?5/);
      expect(total).toMatch(/month/);
    });
  });

  describe("5. Scaled Reporting (Business Metrics)", () => {
    test("handles explicit scaling in conversion targets", () => {
      const context = createContext();
      evaluateLine("defects = 14 defect", context, 1);
      evaluateLine("production = 2000 unit", context, 2);
      evaluateLine("rate = defects / production", context, 3);

      const scaled = expectMathResult(evaluateLine("rate to defect/(1000 unit) =>", context, 4));
      expect(scaled).toMatch(/7\s*defect/);
      expect(scaled).toMatch(/1000\s*unit/);
    });
  });

  describe("6. Creative & Domain-Specific Scenarios", () => {
    test("supports chemistry, content creation, and finance examples", () => {
      const context = createContext();
      evaluateLine("intensity = 0.45 kgCO2 / kWh", context, 1);
      evaluateLine("usage = 120 kWh", context, 2);
      const emissions = expectMathResult(evaluateLine("usage * intensity =>", context, 3));
      expect(emissions).toMatch(/54\s*kgCO2/);

      evaluateLine("writing speed = 800 words/h", context, 4);
      evaluateLine("blog post = 2400 words", context, 5);
      const duration = expectMathResult(evaluateLine("blog post / writing speed =>", context, 6));
      expect(duration).toMatch(/3\s*h/);

      evaluateLine("batch = 12 cookies", context, 7);
      evaluateLine("flour per batch = 250 g", context, 8);
      evaluateLine("need = 30 cookies", context, 9);
      const flour = expectMathResult(
        evaluateLine("flour per batch * (need / batch) =>", context, 10)
      );
      expect(flour).toMatch(/625\s*g/);
    });
  });

  describe("7. Edge Cases & Stress Tests", () => {
    test("nested aliases resolve through multiple steps", () => {
      const context = createContext();
      evaluateLine("workday = 8 h", context, 1);
      evaluateLine("workweek = 5 workday", context, 2);
      const result = expectMathResult(evaluateLine("1 workweek to h =>", context, 3));
      expect(result).toMatch(/40\s*h/);
    });

    test("shadowing built-ins respects user-defined month", () => {
      const context = createContext();
      evaluateLine("month = 20 workday", context, 1);
      evaluateLine("workday = 8 h", context, 2);
      const result = expectMathResult(evaluateLine("1 month to h =>", context, 3));
      expect(result).toMatch(/160\s*h/);
    });

    test("dimensionless cancellation drops unit labels", () => {
      const context = createContext();
      evaluateLine("dozen = 12 unit", context, 1);
      const result = expectMathResult(evaluateLine("36 unit / dozen =>", context, 2));
      expect(result).toMatch(/^3(\.0+)?$/);
    });

    test("case sensitivity preserves SI meaning", () => {
      const context = createContext();
      evaluateLine("M = 1,000,000 unit", context, 1);
      const km = expectMathResult(evaluateLine("1000 m to km =>", context, 2));
      expect(km).toMatch(/1\s*km/);
      const mega = expectMathResult(evaluateLine("2 M to unit =>", context, 3));
      expect(mega).toMatch(/2,?000,?000\s*unit/);
    });

    test("dimensional mismatches surface conversion errors", () => {
      const context = createContext();
      evaluateLine("length = 10 m", context, 1);
      const result = evaluateLine("length to kg =>", context, 2);
      expect(result?.type).toBe("error");
      expect((result as any).error).toMatch(/Cannot convert/i);
    });

    test("circular aliases are detected and blocked", () => {
      const context = createContext();
      evaluateLine("a = 2 b", context, 1);
      evaluateLine("b = 1 a", context, 2);
      const result = evaluateLine("1 a =>", context, 3);
      expect(result?.type).toBe("error");
      expect((result as any).error).toMatch(/Circular unit alias detected/i);
    });
  });
});
