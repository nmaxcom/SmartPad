import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SheetSidebar } from "../../src/App";
import { useEditorContext } from "../../src/components/Editor";
import { useSettingsContext } from "../../src/state/SettingsContext";
import { useSheetContext } from "../../src/state/SheetContext";

jest.mock("../../src/components/Editor", () => ({
  __esModule: true,
  default: () => null,
  EditorProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useEditorContext: jest.fn(),
}));

jest.mock("../../src/components/Layout/AppHeader", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../src/components/VariablePanel/VariablePanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../src/components/VariablePanel/TemplatePanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../src/components/ui/SettingsPanel", () => ({
  SettingsPanel: () => null,
}));

jest.mock("../../src/components/ui/SettingsModal", () => ({
  SettingsModal: () => null,
}));

jest.mock("../../src/state/SettingsContext", () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSettingsContext: jest.fn(),
}));

jest.mock("../../src/state/SheetContext", () => ({
  SheetProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSheetContext: jest.fn(),
}));

describe("SheetSidebar mobile navigation", () => {
  const createSheet = jest.fn();
  const setActiveSheetId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditorContext as jest.Mock).mockReturnValue({ editor: null });
    (useSettingsContext as jest.Mock).mockReturnValue({
      settings: { referenceTextExportMode: "preserve" },
    });
    (useSheetContext as jest.Mock).mockReturnValue({
      sheets: [
        {
          id: "sheet-1",
          title: "Plotting Lab",
          content: "# Plotting Lab",
          is_trashed: false,
        },
        {
          id: "sheet-2",
          title: "Budget",
          content: "# Budget",
          is_trashed: false,
        },
      ],
      activeSheetId: "sheet-1",
      createSheet,
      createSheetFromContent: jest.fn(),
      setActiveSheetId,
      renameSheet: jest.fn(),
      trashSheet: jest.fn(),
      restoreSheet: jest.fn(),
      emptyTrash: jest.fn(),
      reorderSheets: jest.fn(),
    });
  });

  test("opens a compact mobile sheet drawer and closes it after choosing a sheet", () => {
    render(<SheetSidebar />);

    const picker = screen.getByRole("button", {
      name: /Current sheet\s+Plotting Lab/i,
    });
    const panel = document.getElementById("sheet-navigation-panel");

    expect(panel?.className).toBe("left-sidebar");
    fireEvent.click(picker);

    expect(
      document.getElementById("sheet-navigation-panel")?.className,
    ).toContain("is-mobile-open");
    expect(
      screen.getAllByRole("button", { name: /Close sheet navigation/i }).length,
    ).toBeGreaterThan(0);

    fireEvent.mouseDown(within(panel as HTMLElement).getByText("Budget"));

    expect(setActiveSheetId).toHaveBeenCalledWith("sheet-2");
    expect(
      document.getElementById("sheet-navigation-panel")?.className,
    ).not.toContain("is-mobile-open");
  });

  test("keeps sheet creation available from the compact mobile bar", () => {
    render(<SheetSidebar />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Create new sheet" })[0],
    );

    expect(createSheet).toHaveBeenCalledTimes(1);
  });
});
