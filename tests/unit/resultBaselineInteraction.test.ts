import {
  formatBaselineDeltaLabel,
  resolveBaselineVariableName,
} from "../../src/components/resultBaselineInteraction";
import type { VariableBaselineComparison } from "../../src/state/variableBaselineStore";

const comparison = (
  overrides: Partial<VariableBaselineComparison>,
): VariableBaselineComparison => ({
  changed: true,
  direction: "up",
  percentDelta: 25,
  typeChanged: false,
  ...overrides,
});

describe("result-menu baseline interaction", () => {
  test("resolves assignment names from live and explicit-result source lines", () => {
    expect(resolveBaselineVariableName("ticket price = 32 EUR")).toBe(
      "ticket price",
    );
    expect(
      resolveBaselineVariableName(
        "profit = attendees * ticket price - venue cost =>",
      ),
    ).toBe("profit");
    expect(resolveBaselineVariableName("profit + tax =>")).toBeNull();
  });

  test("formats compact, honest delta labels", () => {
    expect(formatBaselineDeltaLabel(comparison({ percentDelta: 25 }))).toBe(
      "+25%",
    );
    expect(
      formatBaselineDeltaLabel(
        comparison({ direction: "down", percentDelta: -4.25 }),
      ),
    ).toBe("-4.3%");
    expect(
      formatBaselineDeltaLabel(
        comparison({ changed: false, direction: "same", percentDelta: 0 }),
      ),
    ).toBe("same");
    expect(
      formatBaselineDeltaLabel(
        comparison({
          direction: "same",
          typeChanged: true,
          percentDelta: null,
        }),
      ),
    ).toBe("type changed");
    expect(formatBaselineDeltaLabel(comparison({ percentDelta: null }))).toBe(
      "changed",
    );
  });
});
