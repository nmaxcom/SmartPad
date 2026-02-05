import { CurrencyUnitValue, CurrencyValue } from "../../src/types";
import { convertCurrencyUnitValue, convertCurrencyValue } from "../../src/utils/currencyFx";
import { setFxRatesSnapshot } from "../../src/services/fxRates";

const makeContext = (variables: Array<{ name: string; value: CurrencyValue }> = []) =>
  ({
    variableContext: new Map(
      variables.map((variable) => [
        variable.name,
        {
          name: variable.name,
          value: variable.value,
          rawValue: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
    ),
  } as any);

describe("currency FX conversion", () => {
  beforeEach(() => {
    setFxRatesSnapshot({
      base: "EUR",
      rates: { USD: 1.25, GBP: 0.85 },
      provider: "frankfurter",
      fetchedAt: Date.now(),
    });
  });

  test("manual overrides take precedence over cached FX", () => {
    const context = makeContext([{ name: "EUR", value: new CurrencyValue("$", 2) }]);
    const value = new CurrencyValue("$", 100);
    const converted = convertCurrencyValue(value, "EUR", context) as CurrencyValue;
    expect(converted.getNumericValue()).toBeCloseTo(50);
    expect(converted.toString()).toBe("50 EUR");
  });

  test("uses cached FX rates when no manual override", () => {
    const context = makeContext();
    const value = new CurrencyValue("$", 100);
    const converted = convertCurrencyValue(value, "EUR", context) as CurrencyValue;
    expect(converted.getNumericValue()).toBeCloseTo(80);
    expect(converted.toString()).toBe("80 EUR");
  });

  test("converts currency units with FX and unit conversion", () => {
    const context = makeContext();
    const perHour = new CurrencyUnitValue("$", 10, "h", true);
    const converted = convertCurrencyUnitValue(
      perHour,
      "EUR",
      "day",
      "day",
      1,
      context
    ) as CurrencyUnitValue;
    expect(converted.getNumericValue()).toBeCloseTo(192);
    expect(converted.toString()).toBe("192 EUR/day");
  });
});
