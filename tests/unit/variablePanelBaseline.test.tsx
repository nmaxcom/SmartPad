import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import VariablePanel from "../../src/components/VariablePanel/VariablePanel";
import { useVariables } from "../../src/state";
import { useSettingsContext } from "../../src/state/SettingsContext";
import { useSheetContext } from "../../src/state/SheetContext";
import type { Variable } from "../../src/state/types";
import { CurrencyValue } from "../../src/types/CurrencyValue";

jest.mock("../../src/components/VariablePanel/VariablePanel.css", () => ({}), {
  virtual: true,
});
jest.mock("../../src/state", () => ({ useVariables: jest.fn() }));
jest.mock("../../src/state/SettingsContext", () => ({
  useSettingsContext: jest.fn(),
}));
jest.mock("../../src/state/SheetContext", () => ({
  useSheetContext: jest.fn(),
}));

const variable = (
  name: string,
  rawValue: string,
  value: Variable["value"],
): Variable => ({
  name,
  rawValue,
  value,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const settings = {
  decimalPlaces: 2,
  scientificUpperExponent: 12,
  scientificLowerExponent: -4,
  scientificTrimTrailingZeros: true,
  dateDisplayFormat: "iso",
  groupThousands: true,
};

describe("VariablePanel baseline comparison", () => {
  let variables: Map<string, Variable>;

  beforeEach(() => {
    window.localStorage.clear();
    variables = new Map([
      [
        "ticket price",
        variable("ticket price", "32 EUR", new CurrencyValue("EUR", 32)),
      ],
      [
        "profit",
        variable(
          "profit",
          "attendees * ticket price",
          new CurrencyValue("EUR", 1000),
        ),
      ],
    ]);
    (useVariables as jest.Mock).mockImplementation(() => ({ variables }));
    (useSheetContext as jest.Mock).mockReturnValue({
      activeSheetId: "sheet-1",
    });
    (useSettingsContext as jest.Mock).mockReturnValue({ settings });
  });

  test("captures a baseline, labels inputs and derived values, then shows deltas", () => {
    const view = render(<VariablePanel />);

    expect(screen.getByText("Capture, scrub, compare.")).not.toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Set baseline",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(
      screen.getByText("ticket price").parentElement?.textContent,
    ).toContain("input");
    expect(screen.getByText("profit").parentElement?.textContent).toContain(
      "derived",
    );

    fireEvent.click(screen.getByRole("button", { name: "Set baseline" }));
    expect(screen.getByTestId("variable-baseline-bar").textContent).toContain(
      "0 changed",
    );
    expect(screen.getByText("Base 32 EUR")).not.toBeNull();
    expect(screen.getAllByText("same")).toHaveLength(2);
    expect(
      screen.getByLabelText("ticket price is unchanged from baseline"),
    ).not.toBeNull();

    variables = new Map([
      [
        "ticket price",
        variable("ticket price", "40 EUR", new CurrencyValue("EUR", 40)),
      ],
      [
        "profit",
        variable(
          "profit",
          "attendees * ticket price",
          new CurrencyValue("EUR", 1500),
        ),
      ],
    ]);
    view.rerender(<VariablePanel />);

    expect(screen.getByTestId("variable-baseline-bar").textContent).toContain(
      "2 changed",
    );
    expect(
      screen.getByLabelText("ticket price changed +25% from baseline"),
    ).not.toBeNull();
    expect(
      screen.getByLabelText("profit changed +50% from baseline"),
    ).not.toBeNull();
  });

  test("loads the sheet baseline after remount and can clear it", () => {
    const first = render(<VariablePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Set baseline" }));
    first.unmount();

    render(<VariablePanel />);
    expect(screen.getByTestId("variable-baseline-bar")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear baseline" }));

    expect(screen.queryByTestId("variable-baseline-bar")).toBeNull();
    expect(screen.getByRole("button", { name: "Set baseline" })).not.toBeNull();
  });
});
