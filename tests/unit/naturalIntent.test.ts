import { interpretNaturalIntent } from "../../src/intent/naturalIntent";

const context = {
  targetName: "profit",
  variableNames: ["customers", "price", "fixed costs", "profit"],
};

describe("natural SmartPad intent compiler", () => {
  test.each([
    ["plot profit against price", "@view plot x=price y=profit size=md"],
    ["grafica profit según price", "@view plot x=price y=profit size=md"],
    [
      "qué price necesito para profit = 5000 EUR",
      "make profit = 5000 EUR by price =>",
    ],
    ["convert profit to USD", "profit to USD =>"],
    ["convierte profit a EUR", "profit to EUR =>"],
    ["pon price a 75 EUR", "price = 75 EUR"],
  ])("compiles %s to visible canonical syntax", (query, syntax) => {
    expect(interpretNaturalIntent(query, context)?.syntax).toBe(syntax);
  });

  test("declines ambiguous prose instead of inventing syntax", () => {
    expect(interpretNaturalIntent("make this better", context)).toBeNull();
  });
});
