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
    expect(content).toContain("make take home = 4000 EUR by gross =>");
    expect(title).toBe("New stuff");
    expect(makeActive).toBe(true);
  });

  test("includes the dedicated Goal Seek template", () => {
    const createSheetFromContent = jest.fn().mockResolvedValue(undefined);
    (useSheetContext as jest.Mock).mockReturnValue({
      createSheetFromContent,
    });

    render(<TemplatePanel />);
    fireEvent.click(screen.getByRole("button", { name: /Goal Seek/i }));

    expect(createSheetFromContent).toHaveBeenCalledTimes(1);
    const [content, title, makeActive] = createSheetFromContent.mock.calls[0];
    expect(content).toContain("make checkout total = 150 EUR by items =>");
    expect(content).toContain("make runway = 12 month by monthly burn =>");
    expect(content).toContain("make target distance / target time = 100 km/h by target time =>");
    expect(title).toBe("Goal Seek");
    expect(makeActive).toBe(true);
  });

  test("includes the dedicated Investment Lab template", () => {
    const createSheetFromContent = jest.fn().mockResolvedValue(undefined);
    (useSheetContext as jest.Mock).mockReturnValue({
      createSheetFromContent,
    });

    render(<TemplatePanel />);
    fireEvent.click(screen.getByRole("button", { name: /Investment Lab/i }));

    expect(createSheetFromContent).toHaveBeenCalledTimes(1);
    const [content, title, makeActive] = createSheetFromContent.mock.calls[0];
    expect(content).toContain("market = 0.07");
    expect(content).toContain("taxlow = 0.19");
    expect(content).toContain("@view plot y=wealth,netwealth");
    expect(title).toBe("Investment Lab");
    expect(makeActive).toBe(true);
  });
});
