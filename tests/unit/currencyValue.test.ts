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

  test("parses currency amounts without commas", () => {
    const usd = CurrencyValue.fromString("$1000");
    expect(usd.getNumericValue()).toBe(1000);

    const eur = CurrencyValue.fromString("€2500.5");
    expect(eur.getNumericValue()).toBe(2500.5);

    const chf = CurrencyValue.fromString("1234 CHF");
    expect(chf.getNumericValue()).toBe(1234);
  });

  test("parses currency amounts with trailing symbols", () => {
    const usd = CurrencyValue.fromString("100$");
    expect(usd.getNumericValue()).toBe(100);

    const eur = CurrencyValue.fromString("250.5€");
    expect(eur.getNumericValue()).toBe(250.5);
  });

  test("parses ISO currency codes", () => {
    const eurSuffix = CurrencyValue.fromString("20 EUR");
    expect(eurSuffix.getNumericValue()).toBe(20);
    expect(eurSuffix.toString()).toBe("20 EUR");

    const usdPrefix = CurrencyValue.fromString("USD 15.5");
    expect(usdPrefix.getNumericValue()).toBe(15.5);
    expect(usdPrefix.toString()).toBe("15.5 USD");
  });

  test("parses negative currency amounts", () => {
    const usd = CurrencyValue.fromString("-$1,250.50");
    expect(usd.getNumericValue()).toBe(-1250.5);

    const eur = CurrencyValue.fromString("-250.5€");
    expect(eur.getNumericValue()).toBe(-250.5);
  });

  test("formats whole currency amounts without decimals", () => {
    expect(new CurrencyValue("$", 995).toString()).toBe("$995");
    expect(new CurrencyValue("$", 1000).toString()).toBe("$1000");
    expect(new CurrencyValue("€", 1000).toString()).toBe("€1000");
  });

  test("formats fractional currency amounts without trailing zeros", () => {
    expect(new CurrencyValue("$", 995.5).toString()).toBe("$995.5");
    expect(new CurrencyValue("$", 995.25).toString()).toBe("$995.25");
  });

  test("SemanticParsers detects currency values", () => {
    const parsed = SemanticParsers.parse("$1,000");
    expect(parsed).not.toBeNull();
    expect(parsed?.getType()).toBe("currency");

    const parsedPlain = SemanticParsers.parse("$1000");
    expect(parsedPlain).not.toBeNull();
    expect(parsedPlain?.getType()).toBe("currency");

    const parsedSuffix = SemanticParsers.parse("100$");
    expect(parsedSuffix).not.toBeNull();
    expect(parsedSuffix?.getType()).toBe("currency");

    const parsedCode = SemanticParsers.parse("EUR 120");
    expect(parsedCode).not.toBeNull();
    expect(parsedCode?.getType()).toBe("currency");
  });

  test("SemanticParsers detects currency rates with units", () => {
    const parsed = SemanticParsers.parse("$8/m^2");
    expect(parsed).not.toBeNull();
    expect(parsed?.getType()).toBe("currencyUnit");
    expect(parsed?.toString()).toBe("$8/m^2");

    const parsedPer = SemanticParsers.parse("$8 per m^2");
    expect(parsedPer).not.toBeNull();
    expect(parsedPer?.getType()).toBe("currencyUnit");
    expect(parsedPer?.toString()).toBe("$8/m^2");
  });
});
