import { parseLine } from "../../src/parsing/astParser";
import { defaultRegistry } from "../../src/eval";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import {
  UnitsNetTokenType,
  evaluateUnitsNetExpression,
  tokenizeWithUnitsNet,
} from "../../src/units/unitsnetEvaluator";

function createContext() {
  return {
    variableStore: new ReactiveVariableStore(),
    variableContext: new Map<string, Variable>(),
    functionStore: new Map(),
    equationStore: [] as any[],
    lineNumber: 1,
    decimalPlaces: 6,
  };
}

function syncVariables(context: ReturnType<typeof createContext>) {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
}

function evaluateLine(line: string, context: ReturnType<typeof createContext>, lineNumber: number) {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore || []);
  syncVariables(context);
  return result;
}

describe("Implicit multiplication and compact rate-duration behavior", () => {
  describe("implicit multiplication adjacency", () => {
    test.each([
      ["2(3+4)=>", /14\b/],
      ["(2+3)(4+5)=>", /45\b/],
      ["2(3+4)(5+6)=>", /154\b/],
      ["2((3+4))=>", /14\b/],
      ["(-2)(3+4)=>", /-14\b/],
      ["3(2+4)=>", /18\b/],
      ["2(3+4)^2=>", /98\b/],
      ["(1+2)(3+4)(5+6)=>", /231\b/],
      ["2 ( 3 + 4 ) =>", /14\b/],
      ["(2+3)(4+5)+(1+1)=>", /47\b/],
      ["sqrt(16)(2)=>", /8\b/],
      ["(2+3)(4+5)/(3)=>", /15\b/],
    ])("evaluates %s", (line, expectedPattern) => {
      const context = createContext();
      const result = evaluateLine(line, context, 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(String(result.result)).toMatch(expectedPattern);
      }
    });

    test("keeps explicit multiplication behavior unchanged", () => {
      const context = createContext();
      const result = evaluateLine("2*(3+4)=>", context, 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(String(result.result)).toBe("14");
      }
    });

    test("does not reinterpret variable function-call syntax as implicit multiplication", () => {
      const context = createContext();
      const assignment = evaluateLine("x=2", context, 1);
      expect(assignment?.type).toBe("variable");

      const result = evaluateLine("x(3+4)=>", context, 2);
      expect(result?.type).toBe("error");
      if (result?.type === "error") {
        expect(result.error).toMatch(/Undefined function: x/);
      }
    });

    test("persists implicit multiplication in combined assignments", () => {
      const context = createContext();
      const combined = evaluateLine("total=(2+3)(4+5)=>", context, 1);
      expect(combined?.type).toBe("combined");
      if (combined?.type === "combined") {
        expect(String(combined.result)).toBe("45");
      }

      const reference = evaluateLine("total=>", context, 2);
      expect(reference?.type).toBe("mathResult");
      if (reference?.type === "mathResult") {
        expect(String(reference.result)).toBe("45");
      }
    });
  });

  describe("compact rate-duration parsing", () => {
    test.each([
      ["9L/min*18min=>", /162\s*L/i],
      ["9L/min * 18min=>", /162\s*L/i],
      ["9L/min*18 min=>", /162\s*L/i],
      ["10m/s*2s=>", /20\s*m\b/i],
      ["10m/s^2*2s=>", /20\s*m\/s/i],
      ["2kg*m/s^2=>", /2\s*N\b/i],
      ["9L/min*18=>", /162\s*L\/min/i],
      ["(9L/min)*18min=>", /162\s*L/i],
      ["9L/min*18min/3=>", /54\s*L/i],
      ["(9L/min*18min) to m\^3=>", /0\.162\s*m\^3/i],
      ["2N*m=>", /2\s*J\b|2\s*N\*m/i],
      ["1kg*m/s\^2 to N=>", /1\s*N\b/i],
    ])("evaluates %s", (line, expectedPattern) => {
      const context = createContext();
      const result = evaluateLine(line, context, 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(String(result.result)).toMatch(expectedPattern);
      }
    });

    test("tokenizer splits compact rate-duration into arithmetic tokens", () => {
      const tokens = tokenizeWithUnitsNet("9L/min*18min");
      expect(tokens.map((token) => token.type)).toEqual([
        UnitsNetTokenType.QUANTITY,
        UnitsNetTokenType.OPERATOR,
        UnitsNetTokenType.QUANTITY,
        UnitsNetTokenType.EOF,
      ]);
      expect(tokens[0].value).toBe("9 L/min");
      expect(tokens[1].value).toBe("*");
      expect(tokens[2].value).toBe("18 min");
    });

    test("tokenizer keeps compound unit multipliers inside a single quantity token", () => {
      const tokens = tokenizeWithUnitsNet("2N*m");
      expect(tokens[0].type).toBe(UnitsNetTokenType.QUANTITY);
      expect(tokens[0].value).toBe("2 N*m");
      expect(tokens[1].type).toBe(UnitsNetTokenType.EOF);
    });

    test("compact and spaced rate-duration expressions resolve to same value", () => {
      const compact = evaluateUnitsNetExpression("9L/min*18min");
      const spaced = evaluateUnitsNetExpression("9L/min * 18 min");

      expect(compact.error).toBeUndefined();
      expect(spaced.error).toBeUndefined();
      expect(compact.value.getType()).toBe("unit");
      expect(spaced.value.getType()).toBe("unit");

      expect(compact.value.getNumericValue()).toBeCloseTo(spaced.value.getNumericValue(), 10);
      expect((compact.value as any).getUnit()).toBe((spaced.value as any).getUnit());
    });
  });

  describe("targeted temporary-edge regressions", () => {
    test("case 3 number-parentheses is fixed", () => {
      const context = createContext();
      const result = evaluateLine("2(3+4)=>", context, 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(String(result.result)).toBe("14");
      }
    });

    test("case 4 grouped adjacency is fixed", () => {
      const context = createContext();
      const result = evaluateLine("(2+3)(4+5)=>", context, 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(String(result.result)).toBe("45");
      }
    });

    test("case 23 compact unit rate-duration is fixed", () => {
      const context = createContext();
      const result = evaluateLine("9L/min*18min=>", context, 1);
      expect(result?.type).toBe("mathResult");
      if (result?.type === "mathResult") {
        expect(String(result.result)).toBe("162 L");
      }
    });
  });
});
