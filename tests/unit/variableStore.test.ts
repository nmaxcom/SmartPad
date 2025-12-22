/**
 * Variable Store Tests
 *
 * Tests variable state management including:
 * - Variable creation and updates
 * - State reducer operations
 * - Helper functions (get, set, delete, clear)
 * - Phrase-based variable names
 * - Timestamp tracking
 */

import {
  createVariableState,
  variableReducer,
  setVariable,
  getVariable,
  deleteVariable,
  clearVariables,
  hasVariable,
  getAllVariables,
} from "../../src/state/variableStore";
import { Variable, VariableState, VariableAction } from "../../src/state/types";

describe("Variable Store", () => {
  describe("createVariableState", () => {
    test("should create initial empty state", () => {
      const state = createVariableState();
      expect(state.variables).toBeInstanceOf(Map);
      expect(state.variables.size).toBe(0);
    });
  });

  describe("variableReducer", () => {
    let initialState: VariableState;

    beforeEach(() => {
      initialState = createVariableState();
    });

    test("should handle SET_VARIABLE action for new variable", () => {
      const action: VariableAction = {
        type: "SET_VARIABLE",
        payload: { name: "price", value: 10.5 },
      };

      const newState = variableReducer(initialState, action);

      expect(newState.variables.has("price")).toBe(true);
      const variable = newState.variables.get("price");
      expect(variable?.name).toBe("price");
      expect(variable?.value).toBe(10.5);
      expect(variable?.createdAt).toBeInstanceOf(Date);
      expect(variable?.updatedAt).toBeInstanceOf(Date);
    });

    test("should handle SET_VARIABLE action for phrase-based variable", () => {
      const action: VariableAction = {
        type: "SET_VARIABLE",
        payload: { name: "my password", value: 2929 },
      };

      const newState = variableReducer(initialState, action);

      expect(newState.variables.has("my password")).toBe(true);
      const variable = newState.variables.get("my password");
      expect(variable?.name).toBe("my password");
      expect(variable?.value).toBe(2929);
    });

    test("should handle SET_VARIABLE action for updating existing variable", () => {
      // First set a variable
      const setState = variableReducer(initialState, {
        type: "SET_VARIABLE",
        payload: { name: "price", value: 10.5 },
      });

      // Then update it
      const updateAction: VariableAction = {
        type: "SET_VARIABLE",
        payload: { name: "price", value: 15.99 },
      };

      const newState = variableReducer(setState, updateAction);

      expect(newState.variables.has("price")).toBe(true);
      const variable = newState.variables.get("price");
      expect(variable?.value).toBe(15.99);
      expect(variable?.updatedAt).toBeInstanceOf(Date);
      // Should maintain the same createdAt
      expect(variable?.createdAt).toEqual(setState.variables.get("price")?.createdAt);
    });

    test("should handle DELETE_VARIABLE action", () => {
      // First set a variable
      const setState = variableReducer(initialState, {
        type: "SET_VARIABLE",
        payload: { name: "price", value: 10.5 },
      });

      const deleteAction: VariableAction = {
        type: "DELETE_VARIABLE",
        payload: { name: "price" },
      };

      const newState = variableReducer(setState, deleteAction);

      expect(newState.variables.has("price")).toBe(false);
      expect(newState.variables.size).toBe(0);
    });

    test("should handle DELETE_VARIABLE action for non-existent variable", () => {
      const deleteAction: VariableAction = {
        type: "DELETE_VARIABLE",
        payload: { name: "nonexistent" },
      };

      const newState = variableReducer(initialState, deleteAction);

      expect(newState).toEqual(initialState);
    });

    test("should handle CLEAR_VARIABLES action", () => {
      // First set multiple variables
      let state = variableReducer(initialState, {
        type: "SET_VARIABLE",
        payload: { name: "price", value: 10.5 },
      });
      state = variableReducer(state, {
        type: "SET_VARIABLE",
        payload: { name: "total cost", value: 150.5 },
      });

      const clearAction: VariableAction = { type: "CLEAR_VARIABLES" };
      const newState = variableReducer(state, clearAction);

      expect(newState.variables.size).toBe(0);
    });
  });

  describe("Helper Functions", () => {
    let state: VariableState;

    beforeEach(() => {
      state = createVariableState();
      state = setVariable(state, "price", 10.5);
      state = setVariable(state, "my password", 2929);
      state = setVariable(state, "total cost", 150.5);
    });

    describe("setVariable", () => {
      test("should set a new variable", () => {
        const newState = setVariable(state, "tax rate", 0.08);

        expect(hasVariable(newState, "tax rate")).toBe(true);
        const variable = getVariable(newState, "tax rate");
        expect(variable?.value).toBe(0.08);
      });

      test("should update existing variable", () => {
        const newState = setVariable(state, "price", 25.99);

        const variable = getVariable(newState, "price");
        expect(variable?.value).toBe(25.99);
      });

      test("should handle negative numbers", () => {
        const newState = setVariable(state, "temperature", -5.2);

        const variable = getVariable(newState, "temperature");
        expect(variable?.value).toBe(-5.2);
      });

      test("should handle zero", () => {
        const newState = setVariable(state, "zero", 0);

        const variable = getVariable(newState, "zero");
        expect(variable?.value).toBe(0);
      });
    });

    describe("getVariable", () => {
      test("should return existing variable", () => {
        const variable = getVariable(state, "price");

        expect(variable).toBeDefined();
        expect(variable?.name).toBe("price");
        expect(variable?.value).toBe(10.5);
      });

      test("should return undefined for non-existent variable", () => {
        const variable = getVariable(state, "nonexistent");

        expect(variable).toBeUndefined();
      });

      test("should handle phrase-based variable names", () => {
        const variable = getVariable(state, "my password");

        expect(variable).toBeDefined();
        expect(variable?.value).toBe(2929);
      });
    });

    describe("deleteVariable", () => {
      test("should delete existing variable and return true", () => {
        const result = deleteVariable(state, "price");

        expect(result.success).toBe(true);
        expect(hasVariable(result.state, "price")).toBe(false);
      });

      test("should return false for non-existent variable", () => {
        const result = deleteVariable(state, "nonexistent");

        expect(result.success).toBe(false);
        expect(result.state).toEqual(state);
      });
    });

    describe("hasVariable", () => {
      test("should return true for existing variable", () => {
        expect(hasVariable(state, "price")).toBe(true);
        expect(hasVariable(state, "my password")).toBe(true);
      });

      test("should return false for non-existent variable", () => {
        expect(hasVariable(state, "nonexistent")).toBe(false);
      });
    });

    describe("getAllVariables", () => {
      test("should return all variables as array", () => {
        const variables = getAllVariables(state);

        expect(variables).toHaveLength(3);
        expect(variables.map((v) => v.name)).toContain("price");
        expect(variables.map((v) => v.name)).toContain("my password");
        expect(variables.map((v) => v.name)).toContain("total cost");
      });

      test("should return empty array for empty state", () => {
        const emptyState = createVariableState();
        const variables = getAllVariables(emptyState);

        expect(variables).toHaveLength(0);
      });
    });

    describe("clearVariables", () => {
      test("should clear all variables", () => {
        const newState = clearVariables(state);

        expect(newState.variables.size).toBe(0);
        expect(getAllVariables(newState)).toHaveLength(0);
      });
    });
  });

  describe("Edge Cases", () => {
    test("should handle very large numbers", () => {
      const state = createVariableState();
      const newState = setVariable(state, "large", Number.MAX_SAFE_INTEGER);

      const variable = getVariable(newState, "large");
      expect(variable?.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    test("should handle very small numbers", () => {
      const state = createVariableState();
      const newState = setVariable(state, "small", Number.MIN_SAFE_INTEGER);

      const variable = getVariable(newState, "small");
      expect(variable?.value).toBe(Number.MIN_SAFE_INTEGER);
    });

    test("should handle decimal precision", () => {
      const state = createVariableState();
      const newState = setVariable(state, "pi", 3.14159265359);

      const variable = getVariable(newState, "pi");
      expect(variable?.value).toBe(3.14159265359);
    });
  });
});
