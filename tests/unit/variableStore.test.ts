/**
 * Variable Store Tests
 *
 * Tests variable state management including:
 * - Variable creation and updates
 * - Helper functions (get, set, delete, clear)
 * - Phrase-based variable names
 * - Timestamp tracking
 */

import { ReactiveVariableStore } from "../../src/state/variableStore";
import { NumberValue } from "../../src/types";

describe("Variable Store", () => {
  let store: ReactiveVariableStore;

  beforeEach(() => {
    store = new ReactiveVariableStore();
  });

  test("should set and get a variable", () => {
    const result = store.setVariable("price", "10.5");
    expect(result.success).toBe(true);

    const variable = store.getVariable("price");
    expect(variable?.name).toBe("price");
    expect(variable?.value.getNumericValue()).toBe(10.5);
  });

  test("should handle phrase-based variable names", () => {
    store.setVariable("my password", "2929");
    const variable = store.getVariable("my password");
    expect(variable?.name).toBe("my password");
    expect(variable?.value.getNumericValue()).toBe(2929);
  });

  test("should update an existing variable", () => {
    store.setVariable("price", "10.5");
    const beforeUpdate = store.getVariable("price");

    store.setVariable("price", "15.99");
    const updated = store.getVariable("price");

    expect(updated?.value.getNumericValue()).toBe(15.99);
    expect(updated?.createdAt).toEqual(beforeUpdate?.createdAt);
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeUpdate?.updatedAt.getTime() || 0
    );
  });

  test("should delete existing variable", () => {
    store.setVariable("price", "10.5");
    expect(store.hasVariable("price")).toBe(true);

    const deleted = store.deleteVariable("price");
    expect(deleted).toBe(true);
    expect(store.hasVariable("price")).toBe(false);
  });

  test("should return false when deleting non-existent variable", () => {
    const deleted = store.deleteVariable("nonexistent");
    expect(deleted).toBe(false);
  });

  test("should clear all variables", () => {
    store.setVariable("price", "10.5");
    store.setVariable("total cost", "150.5");

    expect(store.getAllVariables()).toHaveLength(2);
    store.clearVariables();

    expect(store.getAllVariables()).toHaveLength(0);
  });

  test("should return all variables", () => {
    store.setVariable("price", "10.5");
    store.setVariable("my password", "2929");
    store.setVariable("total cost", "150.5");

    const variables = store.getAllVariables();
    const names = variables.map((v) => v.name);
    expect(variables).toHaveLength(3);
    expect(names).toContain("price");
    expect(names).toContain("my password");
    expect(names).toContain("total cost");
  });

  test("should support setting semantic values directly", () => {
    const result = store.setVariableWithSemanticValue("pi", new NumberValue(3.14159), "3.14159");
    expect(result.success).toBe(true);

    const variable = store.getVariable("pi");
    expect(variable?.value.getNumericValue()).toBeCloseTo(3.14159, 5);
  });

  test("should parse currency values without commas as currency", () => {
    store.setVariable("bill total", "$1000");
    const variable = store.getVariable("bill total");
    expect(variable?.value.getType()).toBe("currency");
    expect(variable?.value.toString()).toBe("$1000");
  });

  test("should handle large, small, and zero values", () => {
    store.setVariable("large", Number.MAX_SAFE_INTEGER.toString());
    store.setVariable("small", Number.MIN_SAFE_INTEGER.toString());
    store.setVariable("zero", "0");

    expect(store.getVariable("large")?.value.getNumericValue()).toBe(Number.MAX_SAFE_INTEGER);
    expect(store.getVariable("small")?.value.getNumericValue()).toBe(Number.MIN_SAFE_INTEGER);
    expect(store.getVariable("zero")?.value.getNumericValue()).toBe(0);
  });
});
