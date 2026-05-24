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
    expect(content).toContain("attendees base = 140");
    expect(title).toBe("Quick Tour");
    expect(makeActive).toBe(true);
  });

  test("includes the New stuff template for new plot and goal-seek features", () => {
    const createSheetFromContent = jest.fn().mockResolvedValue(undefined);
    (useSheetContext as jest.Mock).mockReturnValue({
      createSheetFromContent,
    });

    render(<TemplatePanel />);
    fireEvent.click(screen.getByRole("button", { name: /New stuff/i }));

    expect(createSheetFromContent).toHaveBeenCalledTimes(1);
    const [content, title, makeActive] = createSheetFromContent.mock.calls[0];
    expect(content).toContain("@view hist y=wait times size=md");
    expect(content).toContain("@view scatter x=study hours y=test score size=md");
    expect(content).toContain("@view plot x=time y=speed domain=0.25..6 size=md");
    expect(content).toContain("make take home = EUR 4000 by gross =>");
    expect(title).toBe("New stuff");
    expect(makeActive).toBe(true);
  });
});
