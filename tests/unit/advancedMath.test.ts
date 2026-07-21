import { defaultRegistry, type EvaluationContext } from "../../src/eval";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { ComplexValue, MatrixValue, SymbolicValue } from "../../src/types";

const context = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  equationStore: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const evaluate = (line: string, state: EvaluationContext, lineNumber: number) => {
  state.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(parseLine(line, lineNumber), state);
  state.variableContext = new Map(
    state.variableStore.getAllVariables().map((variable) => [variable.name, variable])
  );
  return result as any;
};

describe("advanced mathematics", () => {
  test("stores matrices and supports core linear algebra", () => {
    const state = context();
    evaluate("A = [[1, 2], [3, 4]]", state, 1);
    expect(state.variableContext.get("A")?.value).toBeInstanceOf(MatrixValue);
    expect(evaluate("det(A) =>", state, 2).result).toBe("-2");
    expect(evaluate("transpose(A) =>", state, 3).result).toBe("[1, 3; 2, 4]");
    expect(evaluate("inv(A) =>", state, 4).result).toBe("[-2, 1; 1.5, -0.5]");
    expect(evaluate("A^2 =>", state, 5).result).toBe("[7, 10; 15, 22]");
    expect(evaluate("trace(A) =>", state, 6).result).toBe("5");
    expect(evaluate("rows(A) =>", state, 7).result).toBe("2");
    expect(evaluate("cols(A) =>", state, 8).result).toBe("2");
  });

  test("solves linear systems and returns eigenvalues", () => {
    const state = context();
    evaluate("A = [[2, 1], [1, 3]]", state, 1);
    evaluate("b = [[5], [7]]", state, 2);
    expect(evaluate("linsolve(A, b) =>", state, 3).result).toBe("[1.6; 1.8]");
    const eigenvalues = evaluate("eigenvalues(A) =>", state, 4).result;
    expect(eigenvalues.split(", ").map(Number).sort()).toEqual([
      1.381966,
      3.618034,
    ]);
  });

  test("supports complex literals and reusable complex variables", () => {
    const state = context();
    evaluate("z = 3 + 4i", state, 1);
    expect(state.variableContext.get("z")?.value).toBeInstanceOf(ComplexValue);
    expect(evaluate("z * (2 - i) =>", state, 2).result).toBe("10 + 5i");
    expect(evaluate("conj(z) =>", state, 3).result).toBe("3 - 4i");
    expect(evaluate("abs(z) =>", state, 4).result).toBe("5");
    expect(evaluate("re(z) =>", state, 5).result).toBe("3");
    expect(evaluate("im(z) =>", state, 6).result).toBe("4");
  });

  test("simplifies, expands, factors, derives, integrates, substitutes, and finds roots", () => {
    const state = context();
    expect(evaluate("simplify((x + x) / 2) =>", state, 1).result).toBe("x");
    expect(evaluate("expand((x + 1)^3) =>", state, 2).result).toBe("1 + 3 * x + 3 * x ^ 2 + x ^ 3");
    expect(evaluate("factor(x^2 - 5*x + 6) =>", state, 3).result).toBe("(-2 + x) * (-3 + x)");
    expect(evaluate("derive(x^3 + sin(x), x) =>", state, 4).result).toBe("3 * x ^ 2 + cos(x)");
    expect(evaluate("integrate(2*x, x) =>", state, 5).result).toBe("x ^ 2");
    expect(evaluate("substitute(x^2 + 1, x, 3) =>", state, 6).result).toBe("10");
    expect(evaluate("roots(x^2 - 5*x + 6, x) =>", state, 7).result).toBe("2, 3");
  });

  test("stores symbolic results for reuse", () => {
    const state = context();
    evaluate("f = expand((x + 1)^2)", state, 1);
    expect(state.variableContext.get("f")?.value).toBeInstanceOf(SymbolicValue);
    expect(evaluate("derive(f, x) =>", state, 2).result).toBe("2 + 2 * x");
  });

  test("keeps normal scalar arithmetic on the existing path", () => {
    const state = context();
    expect(evaluate("2 + 3 =>", state, 1).result).toBe("5");
  });
});
