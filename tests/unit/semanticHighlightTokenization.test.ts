import { tokenizeExpression } from "../../src/components/SemanticHighlightExtension";
import { NumberValue } from "../../src/types";

const makeContext = (names: string[]): Map<string, any> =>
  new Map(
    names.map((name) => [
      name,
      {
        name,
        value: NumberValue.from(1),
        rawValue: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  );

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

  test("highlights where as keyword in where predicates", () => {
    const tokens = tokenizeExpression(
      "supply quotes where > $1900",
      0,
      makeContext(["supply quotes"]) as any
    );
    const whereToken = tokens.find((token) => token.text.toLowerCase() === "where");
    expect(whereToken?.type).toBe("keyword");
  });

  test("keeps explicit where variable references as variables", () => {
    const tokens = tokenizeExpression("where + 1", 0, makeContext(["where"]) as any);
    const whereToken = tokens.find((token) => token.text.toLowerCase() === "where");
    expect(whereToken?.type).toBe("variable");
  });

  test("keeps on as a keyword for percentage phrases", () => {
    const tokens = tokenizeExpression(
      "service fee on ticket list",
      0,
      makeContext(["service fee", "ticket list"]) as any
    );
    const onToken = tokens.find((token) => token.text.toLowerCase() === "on");
    expect(onToken?.type).toBe("keyword");
  });

  test("does not classify keyword-like operators as function names before parens", () => {
    const tokens = tokenizeExpression(
      "service fee on (promo off ticket list)",
      0,
      makeContext(["service fee", "promo", "ticket list"]) as any
    );
    const onToken = tokens.find((token) => token.text.toLowerCase() === "on");
    expect(onToken?.type).toBe("keyword");
    expect(tokens.some((token) => token.type === "function" && token.text.toLowerCase() === "on")).toBe(
      false
    );
  });

  test("keeps on/off/where as keywords in operator positions even if similarly named variables exist", () => {
    const tokens = tokenizeExpression(
      "service fee on (promo off ticket list) + supply quotes where > $1900",
      0,
      makeContext([
        "service fee",
        "promo",
        "ticket list",
        "supply quotes",
        "on",
        "off",
        "where",
      ]) as any
    );

    const onToken = tokens.find((token) => token.text.toLowerCase() === "on");
    const offToken = tokens.find((token) => token.text.toLowerCase() === "off");
    const whereToken = tokens.find((token) => token.text.toLowerCase() === "where");
    expect(onToken?.type).toBe("keyword");
    expect(offToken?.type).toBe("keyword");
    expect(whereToken?.type).toBe("keyword");
  });
});
