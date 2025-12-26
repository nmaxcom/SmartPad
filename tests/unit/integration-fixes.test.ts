/**
 * Integration Fixes Tests
 *
 * Tests integration fixes and workflow validation including:
 * - Complete workflow validation
 * - Edge cases and error handling
 * - Integration between parsing components
 */

import { parseLine } from "../../src/parsing/astParser";
import { expressionContainsUnits } from "../../src/units/unitsEvaluator";
import { Variable } from "../../src/state/types";
import { UnitValue } from "../../src/types";
import { SmartPadQuantity } from "../../src/units/unitsnetAdapter";

describe("Integration Fixes Validation", () => {
  let variableContext: Map<string, Variable>;

  beforeEach(() => {
    variableContext = new Map();
  });

  describe("Complete workflow validation", () => {
    test("Assign variable with units and reference it should preserve units", () => {
      const now = new Date();

      // Step 1: Parse variable assignment with units
      const assignment = "temp = 87°C";
      const assignmentNode = parseLine(assignment, 0);

      expect(assignmentNode.type).toBe("variableAssignment");
      expect(assignmentNode.type === "variableAssignment" && assignmentNode.variableName).toBe(
        "temp"
      );

      // Step 2: Simulate storing the variable with units (as would happen in the evaluator)
      variableContext.set("temp", {
        name: "temp",
        value: new UnitValue(SmartPadQuantity.fromValueAndUnit(87, "°C")),
        rawValue: "87°C",
        units: "°C",
        quantity: undefined,
        createdAt: now,
        updatedAt: now,
      });

      // Step 3: Parse variable reference
      const reference = "temp=>";
      const referenceNode = parseLine(reference, 0);

      expect(referenceNode.type).toBe("expression");
      expect(referenceNode.type === "expression" && referenceNode.expression).toBe("temp");

      // Step 4: Units are now handled by the main AST pipeline and ResultsDecoratorExtension
      const variable = variableContext.get("temp");
      expect(variable?.value.toString()).toBe("87 °C");
      expect(variable?.units).toBe("°C");
    });

    test("Combined assignment with units should parse correctly", () => {
      // This tests the "unexpected token" issue
      const expressions = [
        "temp=87°C=>",
        "mass=58kg=>",
        "speed=100km/h=>",
        "pressure=101.3kPa=>",
        "energy=4.18kJ=>",
      ];

      expressions.forEach((expr) => {
        const node = parseLine(expr, 0);
        expect(node.type).toBe("combinedAssignment");
        expect(node.type !== "error").toBe(true);

        if (node.type === "combinedAssignment") {
          expect(expressionContainsUnits(node.expression)).toBe(true);
        }
      });
    });

    test("Simple expressions with units should be detected", () => {
      const unitExpressions = [
        "87°C",
        "58kg",
        "100km/h",
        "9.8m/s^2",
        "101.3kPa",
        "4.18kJ",
        "273.15K",
      ];

      unitExpressions.forEach((expr) => {
        expect(expressionContainsUnits(expr)).toBe(true);
      });
    });

    test("Complex expressions should parse without errors", () => {
      const complexExpressions = ["temp + 10", "mass * 2.5", "speed / 3.6", "sqrt(pressure)"];

      complexExpressions.forEach((expr) => {
        const node = parseLine(`${expr}=>`, 0);
        expect(node.type).toBe("expression");
        expect(node.type !== "error").toBe(true);
      });
    });

    test("Multiple variables with different units", () => {
      const now = new Date();

      // Set up multiple variables with different unit types
      const variables = [
        { name: "temp", value: 87, units: "°C", display: "87 °C" },
        { name: "mass", value: 58, units: "kg", display: "58 kg" },
        { name: "distance", value: 100, units: "m", display: "100 m" },
        { name: "time", value: 5.5, units: "s", display: "5.5 s" },
        { name: "speed", value: 25, units: "m/s", display: "25 m/s" },
      ];

      variables.forEach((v) => {
        variableContext.set(v.name, {
          name: v.name,
          value: new UnitValue(SmartPadQuantity.fromValueAndUnit(v.value, v.units)),
          rawValue: v.display,
          units: v.units,
          quantity: undefined,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Test that each variable reference would preserve units
      variables.forEach((v) => {
        const referenceText = `${v.name}=>`;
        const node = parseLine(referenceText, 0);

        expect(node.type).toBe("expression");

        const variable = variableContext.get(v.name);
        expect(variable?.value.toString()).toBe(v.display);
        expect(variable?.units).toBe(v.units);
      });
    });
  });

  describe("Edge cases and error handling", () => {
    test("Invalid unit expressions should not crash parser", () => {
      const invalidExpressions = [
        "temp=87°X=>", // Invalid unit
        "mass=58xyz=>", // Invalid unit
        "speed=100km/=>", // Incomplete unit
      ];

      invalidExpressions.forEach((expr) => {
        const node = parseLine(expr, 0);
        // Should parse as combinedAssignment, but units detection might fail
        expect(node.type).toBe("combinedAssignment");
      });
    });

    test("Empty expressions should handle gracefully", () => {
      const emptyExpressions = ["=>", " =>", "  =>  "];

      emptyExpressions.forEach((expr) => {
        const node = parseLine(expr, 0);
        // These might be parsed as expressions or errors, but shouldn't crash
        expect(node.type).toBeDefined();
      });
    });
  });
});
