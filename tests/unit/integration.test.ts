/**
 * Units Integration Tests
 *
 * Tests integration between units system and AST pipeline including:
 * - Expression parsing with units
 * - Combined assignments with units
 * - Variable integration with units
 * - Evaluator prioritization
 * - Complex physics calculations
 * - Unit conversion workflows
 */

import { parseLine, parseContent } from "../../src/parsing/astParser";
import { evaluateUnitsExpression } from "../../src/units/unitsEvaluator";
import { Quantity } from "../../src/units/quantity";
import {
  isExpressionNode,
  isCombinedAssignmentNode,
  isVariableAssignmentNode,
} from "../../src/parsing/ast";
import { UnitsExpressionEvaluator } from "../../src/units/astEvaluator";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { EvaluationContext } from "../../src/eval/registry";
import { Variable } from "../../src/state/types";
import { NumberValue } from "../../src/types";

describe("Units Integration with AST Pipeline", () => {
  let unitsEvaluator: UnitsExpressionEvaluator;
  let variableStore: ReactiveVariableStore;

  beforeEach(() => {
    unitsEvaluator = new UnitsExpressionEvaluator();
    variableStore = new ReactiveVariableStore();
  });

  const createContext = (variables: Map<string, Variable> = new Map()): EvaluationContext => ({
    variableStore,
    variableContext: variables,
    lineNumber: 1,
    decimalPlaces: 6,
  });

  describe("Expression Parsing and Evaluation", () => {
    test("should parse and evaluate simple unit expressions", () => {
      const astNode = parseLine("10 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        expect(unitsEvaluator.canHandle(astNode)).toBe(true);

        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          expect(result.displayText).toBe("10 m => 10 m");
        }
      }
    });

    test("should parse and evaluate unit arithmetic", () => {
      const astNode = parseLine("10 m + 5 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        expect(unitsEvaluator.canHandle(astNode)).toBe(true);

        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          expect(result.displayText).toBe("10 m + 5 m => 15 m");
        }
      }
    });

    test("should parse and evaluate area calculations", () => {
      const astNode = parseLine("10 m * 5 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          expect(result.displayText).toBe("10 m * 5 m => 50 m^2");
        }
      }
    });

    test("should parse and evaluate velocity calculations", () => {
      const astNode = parseLine("100 m / 10 s =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          expect(result.displayText).toBe("100 m / 10 s => 10 m/s");
        }
      }
    });

    test("should handle dimensional analysis errors", () => {
      const astNode = parseLine("10 m + 5 kg =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("error");
        if (result?.type === "error") {
          expect(result.error).toContain("incompatible dimensions");
        }
      }
    });
  });

  describe("Combined Assignment with Units", () => {
    test("should parse and evaluate combined assignments with units", () => {
      const astNode = parseLine("length = 10 m =>", 1);

      expect(isCombinedAssignmentNode(astNode)).toBe(true);
      if (isCombinedAssignmentNode(astNode)) {
        expect(unitsEvaluator.canHandle(astNode)).toBe(true);

        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("combined");
        if (result?.type === "combined") {
          expect(result.displayText).toBe("length = 10 m => 10 m");
          expect(result.variableName).toBe("length");
        }
      }
    });

    test("should store variables from unit calculations", () => {
      const astNode = parseLine("area = 10 m * 5 m =>", 1);

      expect(isCombinedAssignmentNode(astNode)).toBe(true);
      if (isCombinedAssignmentNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("combined");

        // Check that the variable was stored (numeric value)
        const storedVariable = variableStore.getVariable("area");
        expect(storedVariable).toBeDefined();
        expect(storedVariable?.value.getNumericValue()).toBe(50);
      }
    });
  });

  describe("Variable Integration", () => {
    test("should use variables in unit expressions", () => {
      // First, set up some variables
      const variables = new Map<string, Variable>([
        [
          "width",
          {
            name: "width",
            value: new NumberValue(5),
            rawValue: "5",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        [
          "height",
          {
            name: "height",
            value: new NumberValue(10),
            rawValue: "10",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      ]);

      const astNode = parseLine("width * height * 2 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext(variables));
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          // width (5) * height (10) * 2 m = 100 m (dimensionless * dimensionless * length = length)
          expect(result.displayText).toBe("width * height * 2 m => 100 m");
        }
      }
    });

    // CRITICAL TEST: This verifies our fix for the exact user issue
    test("should handle simple variable assignments with units (without =>)", () => {
      const astNode = parseLine("time = 100s", 1);

      expect(isVariableAssignmentNode(astNode)).toBe(true);
      if (isVariableAssignmentNode(astNode)) {
        // CRITICAL: UnitsEvaluator should now handle this since it's registered first
        expect(unitsEvaluator.canHandle(astNode)).toBe(true);

        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("combined"); // Units evaluator returns combined type
        if (result?.type === "combined") {
          expect(result.displayText).toBe("time = 100 s");
          expect(result.variableName).toBe("time");
        }

        // Verify the variable was stored correctly
        const storedVariable = variableStore.getVariable("time");
        expect(storedVariable).toBeDefined();
        expect(storedVariable?.value.getNumericValue()).toBe(100); // Numeric value extracted from 100s
      }
    });

    test("should handle variable assignments with different units", () => {
      const testCases = [
        { input: "mass = 50kg", expectedValue: 50, expectedDisplay: "mass = 50 kg" },
        { input: "distance = 10m", expectedValue: 10, expectedDisplay: "distance = 10 m" },
        { input: "temperature = 25°C", expectedValue: 25, expectedDisplay: "temperature = 25 °C" },
      ];

      testCases.forEach(({ input, expectedValue, expectedDisplay }) => {
        const astNode = parseLine(input, 1);
        expect(isVariableAssignmentNode(astNode)).toBe(true);

        if (isVariableAssignmentNode(astNode)) {
          expect(unitsEvaluator.canHandle(astNode)).toBe(true);

          const result = unitsEvaluator.evaluate(astNode, createContext());
          expect(result?.type).toBe("combined");

          if (result?.type === "combined") {
            expect(result.displayText).toBe(expectedDisplay);

            // Extract variable name from input
            const varName = input.split("=")[0].trim();
            const storedVariable = variableStore.getVariable(varName);
            expect(storedVariable?.value.getNumericValue()).toBe(expectedValue);
          }
        }
      });
    });

    test("should work for both syntaxes: with and without =>", () => {
      // Test without => (the user's problem case)
      const withoutArrow = parseLine("speed = 60km", 1);
      expect(isVariableAssignmentNode(withoutArrow)).toBe(true);
      expect(unitsEvaluator.canHandle(withoutArrow)).toBe(true);

      const resultWithout = unitsEvaluator.evaluate(withoutArrow, createContext());
      expect(resultWithout?.type).toBe("combined");

      // Test with => (was already working)
      const withArrow = parseLine("speed2 = 60km =>", 1);
      expect(isCombinedAssignmentNode(withArrow)).toBe(true);
      expect(unitsEvaluator.canHandle(withArrow)).toBe(true);

      const resultWith = unitsEvaluator.evaluate(withArrow, createContext());
      expect(resultWith?.type).toBe("combined");

      // Both should store the same numeric value
      const speed1 = variableStore.getVariable("speed");
      const speed2 = variableStore.getVariable("speed2");
      expect(speed1?.value.getNumericValue()).toBe(60);
      expect(speed2?.value.getNumericValue()).toBe(60);
    });

    test("should store complete units information for variable panel display", () => {
      const astNode = parseLine("time = 100s", 1);

      expect(isVariableAssignmentNode(astNode)).toBe(true);
      if (isVariableAssignmentNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("combined");

        // Verify the variable was stored with complete units information
        const storedVariable = variableStore.getVariable("time");
        expect(storedVariable).toBeDefined();
        expect(storedVariable?.value.getNumericValue()).toBe(100); // Numeric value for calculations
        expect(storedVariable?.units).toBe("s"); // Unit string
        expect(storedVariable?.quantity?.toString()).toBe("100 s"); // Formatted display
        expect(storedVariable?.rawValue).toBe("100s"); // Original expression
      }
    });

    test("should store units information for complex unit expressions", () => {
      const testCases = [
        {
          input: "distance = 100m",
          expectedValue: 100,
          expectedUnits: "m",
          expectedDisplay: "100 m",
        },
        {
          input: "mass = 2.5kg",
          expectedValue: 2.5,
          expectedUnits: "kg",
          expectedDisplay: "2.5 kg",
        },
        {
          input: "temperature = 25°C",
          expectedValue: 25,
          expectedUnits: "°C",
          expectedDisplay: "25 °C",
        },
      ];

      testCases.forEach(({ input, expectedValue, expectedUnits, expectedDisplay }) => {
        const astNode = parseLine(input, 1);
        expect(isVariableAssignmentNode(astNode)).toBe(true);

        if (isVariableAssignmentNode(astNode)) {
          const result = unitsEvaluator.evaluate(astNode, createContext());
          expect(result?.type).toBe("combined");

          const varName = input.split("=")[0].trim();
          const storedVariable = variableStore.getVariable(varName);

          expect(storedVariable?.value.getNumericValue()).toBe(expectedValue);
          expect(storedVariable?.units).toBe(expectedUnits);
          expect(storedVariable?.quantity?.toString()).toBe(expectedDisplay);
        }
      });
    });

    test("should preserve dimensional context in variable calculations", () => {
      // Create a temperature variable
      const tempNode = parseLine("temperature = 100°C", 1);
      expect(isVariableAssignmentNode(tempNode)).toBe(true);

      if (isVariableAssignmentNode(tempNode)) {
        unitsEvaluator.evaluate(tempNode, createContext());

        // Verify the variable has full dimensional information
        const tempVar = variableStore.getVariable("temperature");
        expect(tempVar?.value.getNumericValue()).toBe(100);
        expect(tempVar?.units).toBe("°C");
        expect(tempVar?.quantity).toBeDefined();
        expect(tempVar?.quantity?.toString()).toBe("100 °C");
      }

      // Now use that variable in a calculation - it should preserve units
      const calcNode = parseLine("temperature + 50°C =>", 1);
      expect(isExpressionNode(calcNode)).toBe(true);

      if (isExpressionNode(calcNode)) {
        // Get current variables for the calculation context
        const variables = new Map<string, Variable>();
        variableStore.getAllVariables().forEach((v) => variables.set(v.name, v));

        const result = unitsEvaluator.evaluate(calcNode, createContext(variables));
        expect(result?.type).toBe("mathResult");

        if (result?.type === "mathResult") {
          // The result should be 150°C, proving dimensional context was preserved
          expect(result.displayText).toBe("temperature + 50°C => 150 °C");
        }
      }
    });

    test("should handle physics calculations with stored unit variables", () => {
      // Store some physics variables
      const massNode = parseLine("mass = 10kg", 1);
      const accelerationNode = parseLine("acceleration = 9.8m", 1); // Simplified units

      unitsEvaluator.evaluate(massNode, createContext());
      unitsEvaluator.evaluate(accelerationNode, createContext());

      // Now calculate force using these variables
      const forceCalc = parseLine("mass * acceleration =>", 1);
      expect(isExpressionNode(forceCalc)).toBe(true);

      if (isExpressionNode(forceCalc)) {
        const variables = new Map<string, Variable>();
        variableStore.getAllVariables().forEach((v) => variables.set(v.name, v));

        const result = unitsEvaluator.evaluate(forceCalc, createContext(variables));
        expect(result?.type).toBe("mathResult");

        if (result?.type === "mathResult") {
          // Should get 98 kg*m, proving both variables maintained their units
          expect(result.displayText).toBe("mass * acceleration => 98 kg*m");
        }
      }
    });

    test("should handle temperature variable assignment correctly (208°C case)", () => {
      const tempNode = parseLine("j = 208°C", 1);
      expect(isVariableAssignmentNode(tempNode)).toBe(true);

      if (isVariableAssignmentNode(tempNode)) {
        // Check if the units evaluator can handle it
        expect(unitsEvaluator.canHandle(tempNode)).toBe(true);

        const result = unitsEvaluator.evaluate(tempNode, createContext());
        expect(result?.type).toBe("combined");

        // Verify the variable was stored with complete units information
        const storedVariable = variableStore.getVariable("j");
        expect(storedVariable).toBeDefined();
        expect(storedVariable?.value.getNumericValue()).toBe(208); // Numeric value
        expect(storedVariable?.units).toBe("°C"); // Unit string
        expect(storedVariable?.quantity?.toString()).toBe("208 °C"); // Full display
        expect(storedVariable?.quantity).toBeDefined(); // Quantity object
      }
    });
  });

  describe("Evaluator Prioritization", () => {
    test("should handle units expressions when they contain units", () => {
      const unitsNode = parseLine("10 m + 5 m =>", 1);
      const regularNode = parseLine("10 + 5 =>", 1);

      // Units expression should be handled by UnitsEvaluator
      expect(unitsEvaluator.canHandle(unitsNode)).toBe(true);

      // Regular expression should NOT be handled by UnitsEvaluator
      expect(unitsEvaluator.canHandle(regularNode)).toBe(false);
    });

    test("should not interfere with regular expressions", () => {
      const regularNode = parseLine("2 + 3 =>", 1);

      expect(isExpressionNode(regularNode)).toBe(true);
      expect(unitsEvaluator.canHandle(regularNode)).toBe(false);
    });
  });

  describe("Complex Physics Calculations", () => {
    test("should handle force calculations", () => {
      // F = ma (simplified for testing)
      const astNode = parseLine("10 kg * 9.8 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          expect(result.displayText).toBe("10 kg * 9.8 m => 98 kg*m");
        }
      }
    });

    test("should handle energy calculations", () => {
      // E = 0.5 * m * v^2 (simplified)
      const astNode = parseLine("0.5 * 10 kg * 20 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          expect(result.displayText).toBe("0.5 * 10 kg * 20 m => 100 kg*m");
        }
      }
    });
  });

  describe("Unit Conversion", () => {
    test("should handle metric conversions", () => {
      const astNode = parseLine("1 km + 500 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          expect(result.displayText).toBe("1 km + 500 m => 1.5 km");
        }
      }
    });

    test("should handle imperial to metric", () => {
      const astNode = parseLine("1 ft + 1 m =>", 1);

      expect(isExpressionNode(astNode)).toBe(true);
      if (isExpressionNode(astNode)) {
        const result = unitsEvaluator.evaluate(astNode, createContext());
        expect(result?.type).toBe("mathResult");
        if (result?.type === "mathResult") {
          // 1 ft (0.3048 m) + 1 m = 1.3048 m, displayed in ft
          expect(result.displayText).toContain("ft");
        }
      }
    });
  });
});
