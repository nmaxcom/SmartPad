/**
 * Date Math Evaluator Tests
 */

import { parseLine } from "../../src/parsing/astParser";
import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { Variable } from "../../src/state/types";
import { DateValue } from "../../src/types";

const createContext = (
  lineNumber = 1,
  variableContext?: Map<string, Variable>
): EvaluationContext => {
  const variableStore = new ReactiveVariableStore();
  const contextMap = variableContext ?? new Map<string, Variable>();
  return {
    variableStore,
    variableContext: contextMap,
    lineNumber,
    decimalPlaces: 6,
  };
};

describe("Date Math Evaluator", () => {
  test("should render a date literal", () => {
    const node = parseLine("2024-06-05 =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2024-06-05 => 2024-06-05");
    }
  });

  test("should carry end-of-month for month addition", () => {
    const node = parseLine("2024-01-31 + 1 month =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2024-01-31 + 1 month => 2024-02-29");
    }
  });

  test("should add days exactly", () => {
    const node = parseLine("2024-01-31 + 30 days =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2024-01-31 + 30 days => 2024-03-01");
    }
  });

  test("should handle business days", () => {
    const node = parseLine("2024-11-25 + 5 business days =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2024-11-25 + 5 business days => 2024-12-02");
    }
  });

  test("should compute date differences", () => {
    const node = parseLine("2024-06-30 - 2024-06-01 =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toMatch(/2024-06-30 - 2024-06-01 => 29\s*days/i);
    }
  });

  test("should convert date differences into months", () => {
    const node = parseLine("2024-06-30 - 2024-06-01 in months =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toMatch(/0\.966667\s*months/);
    }
  });

  test("should convert time zones with offsets", () => {
    const node = parseLine("2024-06-05 17:00 UTC in +05:00 =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe(
        "2024-06-05 17:00 UTC in +05:00 => 2024-06-05 22:00 +05:00"
      );
    }
  });

  test("should convert time zones for date variables with offsets", () => {
    const meeting = DateValue.parse("2024-06-05 10:00 UTC");
    expect(meeting).not.toBeNull();
    const variableContext = new Map<string, Variable>([
      [
        "meeting",
        {
          name: "meeting",
          value: meeting as DateValue,
          rawValue: "2024-06-05 10:00 UTC",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const node = parseLine("meeting in +05:00 =>", 1);
    const result = defaultRegistry.evaluate(node, createContext(1, variableContext));
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe(
        "meeting in +05:00 => 2024-06-05 15:00 +05:00"
      );
    }
  });

  test("should render date variables as dates", () => {
    const meeting = DateValue.parse("2024-06-05 17:00 UTC");
    expect(meeting).not.toBeNull();
    const variableContext = new Map<string, Variable>([
      [
        "meeting",
        {
          name: "meeting",
          value: meeting as DateValue,
          rawValue: "2024-06-05 17:00 UTC",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const node = parseLine("meeting =>", 1);
    const result = defaultRegistry.evaluate(node, createContext(1, variableContext));
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe(
        "meeting => 2024-06-05 17:00 UTC"
      );
    }
  });

  test("should error on date arithmetic without a duration unit", () => {
    const dateValue = DateValue.parse("2002-03-02");
    expect(dateValue).not.toBeNull();
    const variableContext = new Map<string, Variable>([
      [
        "date",
        {
          name: "date",
          value: dateValue as DateValue,
          rawValue: "2002-03-02",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const node = parseLine("total = date + 2 =>", 1);
    const result = defaultRegistry.evaluate(node, createContext(1, variableContext));
    expect(result?.type).toBe("error");
    if (result?.type === "error") {
      expect(result.error).toContain("Cannot add date");
    }
  });

  test("should reject invalid date literals", () => {
    const node = parseLine("3/2/20024 =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("error");
    if (result?.type === "error") {
      expect(result.error).toMatch(/Invalid date/i);
    }
  });

  test("should handle month carry across non-leap year", () => {
    const node = parseLine("2023-01-31 + 1 month =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2023-01-31 + 1 month => 2023-02-28");
    }
  });

  test("should handle leap day year addition", () => {
    const node = parseLine("2024-02-29 + 1 year =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2024-02-29 + 1 year => 2025-02-28");
    }
  });

  test("should skip weekends for business days", () => {
    const node = parseLine("2024-11-29 + 1 business day =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2024-11-29 + 1 business day => 2024-12-02");
    }
  });

  test("should allow negative business days", () => {
    const node = parseLine("2024-12-02 - 1 business day =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("2024-12-02 - 1 business day => 2024-11-29");
    }
  });

  test("should reject time additions on date-only values", () => {
    const node = parseLine("2024-06-05 + 2 hours =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("error");
    if (result?.type === "error") {
      expect(result.displayText).toContain("Cannot add time to a date-only value");
    }
  });

  test("should handle combined assignment with date math", () => {
    const node = parseLine("deadline = 2024-06-05 + 2 months =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.displayText).toBe(
        "deadline = 2024-06-05 + 2 months => 2024-08-05"
      );
    }
  });

  test("should parse locale numeric dates when locale is configured", () => {
    const node = parseLine("06/05/2024 =>", 1);
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = defaultRegistry.evaluate(node, context);
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toBe("06/05/2024 => 2024-05-06");
    }
  });

  test("should parse locale numeric dates when locale is unset", () => {
    const node = parseLine("06/05/2024 =>", 1);
    const result = defaultRegistry.evaluate(node, createContext());
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.displayText).toMatch(/^06\/05\/2024 => 2024-\d{2}-\d{2}$/);
    }
  });
});
