import {
  getAutocompleteContext,
  getAutocompleteSuggestions,
} from "../../src/components/autocomplete/suggestions";
import type { FunctionDefinitionNode } from "../../src/parsing/ast";
import type { Variable } from "../../src/state/types";

const variable = (name: string, rawValue: string, type: string): Variable =>
  ({
    name,
    rawValue,
    value: {
      getType: () => type,
      toString: () => rawValue,
    },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  }) as unknown as Variable;

const functionDef = (name: string, params: string[]): FunctionDefinitionNode =>
  ({
    type: "functionDefinition",
    line: 1,
    raw: `${name}(${params.join(", ")}) = 1`,
    functionName: name,
    params: params.map((param) => ({ name: param })),
    expression: "1",
    components: [],
  }) as FunctionDefinitionNode;

const variables = new Map<string, Variable>([
  ["monthly subscription revenue", variable("monthly subscription revenue", "$1200", "currency")],
  ["tax rate", variable("tax rate", "21%", "percentage")],
  ["years", variable("years", "1, 2, 3", "list")],
  ["price", variable("price", "$10", "currency")],
  ["roi", variable("roi", "44%", "percentage")],
  ["roi tax", variable("roi tax", "21%", "percentage")],
  ["seed", variable("seed", "35430 EUR", "currency")],
]);

const functions = new Map<string, FunctionDefinitionNode>([
  ["compound", functionDef("compound", ["principal", "rate", "years"])],
  ["area", functionDef("area", ["radius"])],
]);

describe("autocomplete suggestions", () => {
  test("detects phrase variable query after an expression separator", () => {
    const context = getAutocompleteContext("total = monthly sub", "total = monthly sub".length);

    expect(context).toMatchObject({
      type: "expression",
      query: "monthly sub",
      replaceFrom: "total = ".length,
      replaceTo: "total = monthly sub".length,
    });
  });

  test("suggests phrase variables by token prefix", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "total = monthly sub",
      cursorOffset: "total = monthly sub".length,
      variables,
      functions,
    });

    expect(suggestions[0]).toMatchObject({
      kind: "variable",
      label: "monthly subscription revenue",
      insertText: "monthly subscription revenue",
    });
  });

  test("suggests phrase variables by acronym", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "total = msr",
      cursorOffset: "total = msr".length,
      variables,
      functions,
    });

    expect(suggestions[0]?.label).toBe("monthly subscription revenue");
  });

  test("suggests functions with signatures and call insertion", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "growth = comp",
      cursorOffset: "growth = comp".length,
      variables,
      functions,
    });

    expect(suggestions[0]).toMatchObject({
      kind: "function",
      label: "compound(principal, rate, years)",
      insertText: "compound(",
    });
  });

  test("filters @view x suggestions to scalar-compatible variables", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "@view plot x=pr",
      cursorOffset: "@view plot x=pr".length,
      variables,
      functions,
    });

    expect(suggestions.map((suggestion) => suggestion.label)).not.toContain("years");
    expect(suggestions.map((suggestion) => suggestion.label)).toContain("price");
  });

  test("filters @view values suggestions to list variables", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "@view hist values=ye",
      cursorOffset: "@view hist values=ye".length,
      variables,
      functions,
    });

    expect(suggestions[0]).toMatchObject({
      kind: "variable",
      label: "years",
    });
  });

  test("suggests units after conversion keywords", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "distance to k",
      cursorOffset: "distance to k".length,
      variables,
      functions,
    });

    expect(suggestions.some((suggestion) => suggestion.kind === "unit" && suggestion.label === "km")).toBe(
      true
    );
  });

  test("does not keep suggesting an exact variable after a trailing space", () => {
    const localVariables = new Map<string, Variable>([
      ["roi", variable("roi", "44%", "percentage")],
    ]);
    const suggestions = getAutocompleteSuggestions({
      lineText: "win = roi ",
      cursorOffset: "win = roi ".length,
      variables: localVariables,
      functions,
    });

    expect(suggestions.map((suggestion) => suggestion.label)).not.toContain("roi");
  });

  test("keeps suggesting phrase continuations after a trailing space", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "win = roi ",
      cursorOffset: "win = roi ".length,
      variables,
      functions,
    });

    expect(suggestions.map((suggestion) => suggestion.label)).toContain("roi tax");
  });

  test("suggests currency targets for currency conversions", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "seed in U",
      cursorOffset: "seed in U".length,
      variables,
      functions,
    });

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "currency", label: "USD" }),
        expect.objectContaining({ kind: "currency", label: "USDT" }),
      ])
    );
    expect(suggestions.some((suggestion) => suggestion.kind === "unit" && suggestion.label === "µm")).toBe(
      false
    );
  });

  test("suggests view directives after at-sign", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "@v",
      cursorOffset: "@v".length,
      variables,
      functions,
    });

    expect(suggestions.map((suggestion) => suggestion.label)).toEqual(
      expect.arrayContaining(["@view plot", "@view hist", "@view scatter"])
    );
  });

  test("does not suggest inside markdown comments", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "# tax",
      cursorOffset: "# tax".length,
      variables,
      functions,
    });

    expect(suggestions).toEqual([]);
  });

  test("does not suggest while editing the left side of an existing assignment", () => {
    const suggestions = getAutocompleteSuggestions({
      lineText: "tax r = 21%",
      cursorOffset: "tax r".length,
      variables,
      functions,
    });

    expect(suggestions).toEqual([]);
  });
});
