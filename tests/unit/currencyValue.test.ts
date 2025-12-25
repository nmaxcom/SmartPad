import { CurrencyValue, SemanticParsers } from "../../src/types";

describe("CurrencyValue", () => {
  test("parses comma-separated currency amounts", () => {
    const usd = CurrencyValue.fromString("$1,000");
    expect(usd.getNumericValue()).toBe(1000);

    const eur = CurrencyValue.fromString("€12,345.67");
    expect(eur.getNumericValue()).toBe(12345.67);

    const chf = CurrencyValue.fromString("1,234 CHF");
    expect(chf.getNumericValue()).toBe(1234);
  });

  test("SemanticParsers detects comma-separated currency", () => {
    const parsed = SemanticParsers.parse("$1,000");
    expect(parsed).not.toBeNull();
    expect(parsed?.getType()).toBe("currency");
  });
});
