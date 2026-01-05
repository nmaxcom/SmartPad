/**
 * Reactive Variable Store Tests
 *
 * Tests reactive variable state management including:
 * - Variable storage and retrieval
 * - Dependency tracking and updates
 * - Reactive updates when dependencies change
 * - Error propagation through dependency chains
 */

import { ReactiveVariableStore } from "../../src/state/variableStore";
import { ErrorValue, SymbolicValue } from "../../src/types";

describe("ReactiveVariableStore", () => {
  let store: ReactiveVariableStore;

  beforeEach(() => {
    store = new ReactiveVariableStore();
  });

  it("should store and retrieve simple numeric variables", () => {
    const result = store.setVariable("a", "10");
    expect(result.success).toBe(true);

    const variable = store.getVariable("a");
    expect(variable?.value.getNumericValue()).toBe(10);
  });

  it("should handle expression-based variables", () => {
    store.setVariable("a", "10");
    store.setVariable("b", "a * 2");

    const variableB = store.getVariable("b");
    expect(variableB?.value.getNumericValue()).toBe(20);
  });

  it("should update dependent variables when a dependency changes", () => {
    store.setVariable("a", "10");
    store.setVariable("b", "a * 2");

    // Change 'a' and verify 'b' updates
    store.setVariable("a", "5");

    const variableA = store.getVariable("a");
    const variableB = store.getVariable("b");

    expect(variableA?.value.getNumericValue()).toBe(5);
    expect(variableB?.value.getNumericValue()).toBe(10); // 5 * 2
  });

  it("should handle chained dependencies", () => {
    store.setVariable("a", "10");
    store.setVariable("b", "a + 5");
    store.setVariable("c", "b * 2");

    const variableC = store.getVariable("c");
    expect(variableC?.value.getNumericValue()).toBe(30); // (10 + 5) * 2

    // Change the root and verify propagation
    store.setVariable("a", "20");

    const updatedA = store.getVariable("a");
    const updatedB = store.getVariable("b");
    const updatedC = store.getVariable("c");

    expect(updatedA?.value.getNumericValue()).toBe(20);
    expect(updatedB?.value.getNumericValue()).toBe(25); // 20 + 5
    expect(updatedC?.value.getNumericValue()).toBe(50); // 25 * 2
  });

  it("should detect and handle circular dependencies", () => {
    store.setVariable("a", "b");
    const result = store.setVariable("b", "a");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Circular dependency detected");

    const variableB = store.getVariable("b");
    expect(variableB?.value).toBeInstanceOf(ErrorValue);
    expect((variableB?.value as ErrorValue).getMessage()).toContain("Circular dependency");
  });

  it("should handle complex expressions", () => {
    store.setVariable("a", "10");
    store.setVariable("b", "5");
    store.setVariable("c", "(a + b) * 2 - 3");

    const variableC = store.getVariable("c");
    expect(variableC?.value.getNumericValue()).toBe(27); // (10 + 5) * 2 - 3
  });

  it("should keep symbolic expressions when variables are undefined", () => {
    store.setVariable("a", "undefined_var + 5");

    const variable = store.getVariable("a");
    expect(variable?.value).toBeInstanceOf(SymbolicValue);
    expect(variable?.value.toString()).toContain("undefined_var + 5");
  });

  it("should provide correct variable values for calculations", () => {
    store.setVariable("a", "10");
    store.setVariable("b", "not_a_number");

    expect(store.getVariableValue("a")).toBe(10);
    expect(store.getVariableValue("b")).toBeNull(); // Error case
    expect(store.getVariableValue("nonexistent")).toBeNull(); // Non-existent
  });

  it("should handle variable deletion", () => {
    store.setVariable("a", "10");
    expect(store.hasVariable("a")).toBe(true);

    const deleted = store.deleteVariable("a");
    expect(deleted).toBe(true);
    expect(store.hasVariable("a")).toBe(false);

    const deletedAgain = store.deleteVariable("a");
    expect(deletedAgain).toBe(false);
  });

  it("should clear all variables", () => {
    store.setVariable("a", "10");
    store.setVariable("b", "20");

    expect(store.getAllVariables()).toHaveLength(2);

    store.clearVariables();

    expect(store.getAllVariables()).toHaveLength(0);
    expect(store.hasVariable("a")).toBe(false);
    expect(store.hasVariable("b")).toBe(false);
  });

  it("should maintain creation and update timestamps", () => {
    const beforeCreate = new Date();
    store.setVariable("a", "10");
    const afterCreate = new Date();

    const variable = store.getVariable("a");
    expect(variable?.createdAt).toBeDefined();
    expect(variable?.updatedAt).toBeDefined();
    expect(variable?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(variable?.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // Update and check timestamp changes
    const originalCreatedAt = variable?.createdAt;
    const beforeUpdate = new Date();
    store.setVariable("a", "20");
    const afterUpdate = new Date();

    const updatedVariable = store.getVariable("a");
    expect(updatedVariable?.createdAt).toEqual(originalCreatedAt); // Should not change
    expect(updatedVariable?.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    expect(updatedVariable?.updatedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
  });
});
