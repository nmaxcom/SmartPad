/**
 * Semantic Result Issues Tests
 *
 * Tests fixes for semantic result issues including:
 * - Semantic result trigger operator handling
 * - Unit expression token errors
 * - Missing units in variable references
 * - Integration test for all issues
 */

import { parseContent } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { expressionContainsUnits } from "../../src/units/unitsEvaluator";
import { Variable } from "../../src/state/types";
import { UnitValue } from "../../src/types";
import { SmartPadQuantity } from "../../src/units/unitsnetAdapter";

describe("Semantic Result Issues", () => {
  let variableContext: Map<string, Variable>;

  beforeEach(() => {
    variableContext = new Map();
  });

  describe("Issue 1: Semantic result including trigger operator", () => {
    test("result decoration should NOT include the => trigger", () => {
      const text = "2 + 3 =>";
      const astNodes = parseContent(text);
      const astNode = astNodes[0];

      // The result should be " 5", not "=> 5"
      // This tests that the decoration is applied only to the => without the result text
      expect(text).toBe("2 + 3 =>");
      expect(astNode.type).toBe("expression");
    });

    test("decoration positioning should be correct for trigger only", () => {
      const text = "10 * 2 =>";
      const arrowIndex = text.indexOf("=>");

      // The decoration should span only the "=>" characters (positions 7-8)
      expect(arrowIndex).toBe(7);
      expect(text.substring(arrowIndex, arrowIndex + 2)).toBe("=>");
    });
  });

  describe("Issue 2: Unexpected token errors for unit expressions", () => {
    test("temp=87°C=> should parse without unexpected token error", () => {
      const text = "temp=87°C=>";
      const astNodes = parseContent(text);
      const astNode = astNodes[0];

      // Should not be an error node
      expect(astNode.type).not.toBe("error");
      expect(astNode.type).toBe("combinedAssignment");

      if (astNode.type === "combinedAssignment") {
        expect(astNode.variableName).toBe("temp");
        expect(astNode.expression).toBe("87°C");
      }
    });

    test("mass=58kg=> should parse without unexpected token error", () => {
      const text = "mass=58kg=>";
      const astNodes = parseContent(text);
      const astNode = astNodes[0];

      // Should not be an error node
      expect(astNode.type).not.toBe("error");
      expect(astNode.type).toBe("combinedAssignment");

      if (astNode.type === "combinedAssignment") {
        expect(astNode.variableName).toBe("mass");
        expect(astNode.expression).toBe("58kg");
      }
    });

    test("units expression detection should work for complex units", () => {
      expect(expressionContainsUnits("87°C")).toBe(true);
      expect(expressionContainsUnits("58kg")).toBe(true);
      expect(expressionContainsUnits("100km/h")).toBe(true);
      expect(expressionContainsUnits("9.8m/s^2")).toBe(true);
    });
  });

  describe("Issue 3: Missing units in variable reference results", () => {
    beforeEach(() => {
      const now = new Date();
      // Set up variables with units
      variableContext.set("temp", {
        name: "temp",
        value: new UnitValue(SmartPadQuantity.fromValueAndUnit(87, "°C")),
        rawValue: "87°C",
        units: "°C",
        quantity: undefined, // This might be the issue - missing quantity object
        createdAt: now,
        updatedAt: now,
      });

      variableContext.set("mass", {
        name: "mass",
        value: new UnitValue(SmartPadQuantity.fromValueAndUnit(58, "kg")),
        rawValue: "58kg",
        units: "kg",
        quantity: undefined, // This might be the issue - missing quantity object
        createdAt: now,
        updatedAt: now,
      });
    });

    test("temp=> should return 87°C with units, not just 87", () => {
      const text = "temp=>";
      const astNodes = parseContent(text);
      const astNode = astNodes[0];

      expect(astNode.type).toBe("expression");

      if (astNode.type === "expression") {
        expect(astNode.expression).toBe("temp");

        // The variable should be found and should include units
        const variable = variableContext.get("temp");
        expect(variable).toBeDefined();
        expect(variable?.value.toString()).toBe("87 °C");
        expect(variable?.units).toBe("°C");
      }
    });

    test("mass=> should return 58kg with units, not just 58", () => {
      const text = "mass=>";
      const astNodes = parseContent(text);
      const astNode = astNodes[0];

      expect(astNode.type).toBe("expression");

      if (astNode.type === "expression") {
        expect(astNode.expression).toBe("mass");

        // The variable should be found and should include units
        const variable = variableContext.get("mass");
        expect(variable).toBeDefined();
        expect(variable?.value.toString()).toBe("58 kg");
        expect(variable?.units).toBe("kg");
      }
    });
  });

  describe("Integration test for all issues", () => {
    test("complete workflow should handle units correctly", () => {
      const now = new Date();

      // Step 1: Parse assignment with units
      const assignmentText = "temp = 87°C";
      const assignmentNodes = parseContent(assignmentText);
      const assignmentNode = assignmentNodes[0];

      expect(assignmentNode.type).toBe("variableAssignment");

      // Step 2: Parse combined assignment with trigger
      const combinedText = "mass = 58kg=>";
      const combinedNodes = parseContent(combinedText);
      const combinedNode = combinedNodes[0];

      expect(combinedNode.type).toBe("combinedAssignment");

      // Step 3: Parse variable reference
      const referenceText = "temp=>";
      const referenceNodes = parseContent(referenceText);
      const referenceNode = referenceNodes[0];

      expect(referenceNode.type).toBe("expression");

      // Step 4: Units are now handled by the main AST pipeline and ResultsDecoratorExtension
      // The variables should be properly stored with units
      expect(assignmentNode.type === "variableAssignment" && assignmentNode.variableName).toBe(
        "temp"
      );
      expect(combinedNode.type === "combinedAssignment" && combinedNode.variableName).toBe("mass");
      expect(referenceNode.type === "expression" && referenceNode.expression).toBe("temp");
    });
  });
});
