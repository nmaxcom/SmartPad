/**
 * AST Pipeline Direct Tests
 *
 * Tests direct AST pipeline functionality including:
 * - Direct AST parsing and evaluation
 * - AST node manipulation
 * - Pipeline integration testing
 */

import { parseLine } from "../../src/parsing/astParser";
import { defaultRegistry } from "../../src/eval";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { Variable } from "../../src/state/types";

describe("AST Pipeline Direct Testing", () => {
  it("should correctly evaluate 2 + 3 =>", () => {
    console.log("=== Testing 2 + 3 => ===");

    // Parse the line
    const node = parseLine("2 + 3 =>", 1);
    console.log("Parsed node:", node);

    // Create evaluation context
    const reactiveStore = new ReactiveVariableStore();
    const variableContext = new Map<string, Variable>();

    const evaluationContext = {
      variableStore: reactiveStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    };

    // Evaluate
    const result = defaultRegistry.evaluate(node, evaluationContext);
    console.log("Evaluation result:", result);

    expect(result).toBeDefined();
    if (result && "displayText" in result) {
      console.log("Display text:", result.displayText);
      expect(result.displayText).toContain("5");
    }
  });

  it("should correctly evaluate scientific notation literals", () => {
    const node = parseLine("1e9 =>", 1);
    const reactiveStore = new ReactiveVariableStore();
    const variableContext = new Map<string, Variable>();

    const evaluationContext = {
      variableStore: reactiveStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    };

    const result = defaultRegistry.evaluate(node, evaluationContext);
    expect(result).toBeDefined();
    if (result && "displayText" in result) {
      expect(result.displayText).toContain("1000000000");
    }
  });

  it("should handle unary minus with exponentiation", () => {
    const reactiveStore = new ReactiveVariableStore();
    const variableContext = new Map<string, Variable>();
    const evaluationContext = {
      variableStore: reactiveStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    };

    const negBaseNode = parseLine("-5^3 =>", 1);
    const negBaseResult = defaultRegistry.evaluate(negBaseNode, evaluationContext);
    expect(negBaseResult).toBeDefined();
    if (negBaseResult && "type" in negBaseResult) {
      expect(negBaseResult.type).toBe("mathResult");
      if ("result" in negBaseResult) {
        expect(String(negBaseResult.result)).toContain("-125");
      }
    }

    const negExpNode = parseLine("5^-3 =>", 2);
    const negExpResult = defaultRegistry.evaluate(negExpNode, evaluationContext);
    expect(negExpResult).toBeDefined();
    if (negExpResult && "type" in negExpResult) {
      expect(negExpResult.type).toBe("mathResult");
      if ("result" in negExpResult) {
        expect(String(negExpResult.result)).toMatch(/0\.008|0\.008000/);
      }
    }
  });

  it("should handle multi-line scenario", () => {
    console.log("=== Testing multi-line scenario ===");

    const lines = ["x = 10", "y = 5", "2 + 3 =>"];
    const reactiveStore = new ReactiveVariableStore();

    lines.forEach((line, index) => {
      console.log(`\n--- Processing line ${index + 1}: "${line}" ---`);

      const node = parseLine(line, index + 1);
      console.log("Parsed node:", node);

      // Create fresh variable context for each line
      const variableContext = new Map<string, Variable>();
      reactiveStore.getAllVariables().forEach((variable) => {
        if (typeof variable.value === "number") {
          variableContext.set(variable.name, variable);
        }
      });

      const evaluationContext = {
        variableStore: reactiveStore,
        variableContext,
        lineNumber: index + 1,
        decimalPlaces: 6,
      };

      console.log("Available variables:", Array.from(variableContext.keys()));

      const result = defaultRegistry.evaluate(node, evaluationContext);
      console.log("Evaluation result:", result);

      if (result && "displayText" in result) {
        console.log("Display text:", result.displayText);
      }
    });
  });
});
