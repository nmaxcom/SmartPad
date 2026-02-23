import { tokenizeExpression } from "../../src/components/SemanticHighlightExtension";

describe("Semantic highlight tokenization", () => {
  test("does not mark grouped numeric literals as scrubbable", () => {
    const tokens = tokenizeExpression("2,000 + 1", 0, new Map());
    const scrubbable = tokens
      .filter((token) => token.type === "scrubbableNumber")
      .map((token) => token.text);

    expect(scrubbable).toEqual(["1"]);
    expect(tokens.some((token) => token.type === "number" && token.text === "2,000")).toBe(true);
  });

  test("keeps plain numeric literals scrubbable", () => {
    const tokens = tokenizeExpression("2000 + 1", 0, new Map());
    const scrubbable = tokens
      .filter((token) => token.type === "scrubbableNumber")
      .map((token) => token.text);

    expect(scrubbable).toEqual(["2000", "1"]);
  });
});
