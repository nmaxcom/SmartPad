import {
  extractTokensFromASTNode,
  tokenizeExpression,
} from "../../src/components/SemanticHighlightExtension";
import { parseLine } from "../../src/parsing/astParser";
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

  test("highlights solve as keyword and keeps target separated from in-clause", () => {
    const tokens = tokenizeExpression(
      "solve break_even_km in taxi base + taxi rate*break_even_km = rideshare base + rideshare rate*break_even_km",
      0,
      makeContext([
        "taxi base",
        "taxi rate",
        "rideshare base",
        "rideshare rate",
        "break_even_km",
      ]) as any
    );

    const solveToken = tokens.find((token) => token.text.toLowerCase() === "solve");
    const inToken = tokens.find((token) => token.text.toLowerCase() === "in");
    const targetToken = tokens.find((token) => token.text === "break_even_km");
    const mergedSolveClauseToken = tokens.find(
      (token) => token.type === "variable" && /solve\s+.+\s+in/i.test(token.text)
    );

    expect(solveToken?.type).toBe("keyword");
    expect(inToken?.type).toBe("keyword");
    expect(targetToken?.type).toBe("variable");
    expect(mergedSolveClauseToken).toBeUndefined();
  });

  test("does not classify solve as a function name before parens", () => {
    const tokens = tokenizeExpression("solve(x)", 0, makeContext(["x"]) as any);
    const solveToken = tokens.find((token) => token.text.toLowerCase() === "solve");
    expect(solveToken?.type).toBe("keyword");
    expect(tokens.some((token) => token.type === "function" && token.text.toLowerCase() === "solve")).toBe(
      false
    );
  });

  test("highlights goal-seek command tokens without swallowing variables", () => {
    const tokens = tokenizeExpression(
      "make take home = €4000 by gross",
      0,
      makeContext(["take home", "gross"]) as any
    );

    expect(tokens.find((token) => token.text === "make")?.type).toBe("keyword");
    expect(tokens.find((token) => token.text === "by")?.type).toBe("keyword");
    expect(tokens.find((token) => token.text === "take home")?.type).toBe("variable");
    expect(tokens.find((token) => token.text === "gross")?.type).toBe("variable");
    expect(tokens.find((token) => token.text === "€")?.type).toBe("currency");
  });

  test("highlights currency codes in conventional amount-code literals", () => {
    const tokens = tokenizeExpression("3000 EUR + EUR 4000", 0, new Map());
    const currencyTokens = tokens
      .filter((token) => token.type === "currency")
      .map((token) => token.text.toUpperCase());

    expect(currencyTokens).toEqual(["EUR", "EUR"]);
  });

  test("keeps currency codes currency-colored inside amount literals even when a same-named variable exists", () => {
    const tokens = tokenizeExpression("3000 EUR", 0, makeContext(["EUR"]) as any);
    expect(tokens.find((token) => token.text === "EUR")?.type).toBe("currency");
  });

  test("keeps compact amount-code literals currency-colored", () => {
    const tokens = tokenizeExpression("35430EUR + USD15", 0, makeContext(["EUR", "USD"]) as any);
    const currencyTokens = tokens
      .filter((token) => token.type === "currency")
      .map((token) => token.text.toUpperCase());

    expect(currencyTokens).toEqual(["EUR", "USD"]);
  });

  test("highlights @view keyword and variables inside view directives", () => {
    const ast = parseLine("@view plot x=time y=take home size=md", 1);
    const tokens = extractTokensFromASTNode(
      ast,
      makeContext(["time", "take home"]) as any
    );

    expect(tokens.find((token) => token.text === "@view")?.type).toBe("keyword");
    expect(tokens.find((token) => token.text === "plot")?.type).toBe("keyword");
    expect(tokens.find((token) => token.text === "time")?.type).toBe("variable");
    expect(tokens.find((token) => token.text === "take home")?.type).toBe("variable");
  });

  test("marks numbers inside function definitions as scrubbable", () => {
    const ast = parseLine("area(r) = PI * 3 * r^4 + 10", 1);
    const tokens = extractTokensFromASTNode(ast, makeContext(["r"]) as any);
    const scrubbable = tokens
      .filter((token) => token.type === "scrubbableNumber")
      .map((token) => token.text);

    expect(scrubbable).toEqual(["3", "4", "10"]);
    expect(tokens.find((token) => token.text === "r")?.type).toBe("variable");
  });
});
