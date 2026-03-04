import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TemplatePanel from "../../src/components/VariablePanel/TemplatePanel";
import { useSheetContext } from "../../src/state/SheetContext";

jest.mock("../../src/components/VariablePanel/TemplatePanel.css", () => ({}), { virtual: true });
jest.mock("../../src/state/SheetContext", () => ({
  useSheetContext: jest.fn(),
}));

describe("TemplatePanel", () => {
  test("creates a new active sheet from template content", () => {
    const createSheetFromContent = jest.fn().mockResolvedValue(undefined);
    (useSheetContext as jest.Mock).mockReturnValue({
      createSheetFromContent,
    });

    render(<TemplatePanel />);
    fireEvent.click(screen.getByRole("button", { name: /Quick Tour/i }));

    expect(createSheetFromContent).toHaveBeenCalledTimes(1);
    const [content, title, makeActive] = createSheetFromContent.mock.calls[0];
    expect(typeof content).toBe("string");
    expect(content).toContain("guests base = 120");
    expect(title).toBe("Quick Tour");
    expect(makeActive).toBe(true);
  });
});
