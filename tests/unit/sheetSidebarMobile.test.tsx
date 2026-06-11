import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  const renameSheet = jest.fn();
  const trashSheet = jest.fn();
  const restoreSheet = jest.fn();
  const anchorClick = jest.fn();
  const createObjectURL = jest.fn(() => "blob:smartpad-test");
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(anchorClick);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
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
        {
          id: "sheet-3",
          title: "Archived",
          content: "# Archived",
          is_trashed: true,
        },
      ],
      activeSheetId: "sheet-1",
      createSheet,
      createSheetFromContent: jest.fn(),
      setActiveSheetId,
      renameSheet,
      trashSheet,
      restoreSheet,
      emptyTrash: jest.fn(),
      reorderSheets: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const openDrawer = () => {
    render(<SheetSidebar />);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Current sheet\s+Plotting Lab/i,
      }),
    );
    const panel = document.getElementById("sheet-navigation-panel") as HTMLElement;
    expect(panel.className).toContain("is-mobile-open");
    return panel;
  };

  test("opens a compact mobile sheet drawer and closes it after choosing a sheet", () => {
    const panel = openDrawer();

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

  test("keeps the drawer open when renaming a sheet from its action button", async () => {
    const panel = openDrawer();
    const renameButton = within(panel).getByRole("button", { name: "Rename Budget" });

    fireEvent.mouseDown(renameButton);
    fireEvent.click(renameButton);

    expect(setActiveSheetId).not.toHaveBeenCalled();
    expect(panel.className).toContain("is-mobile-open");

    const input = within(panel).getByDisplayValue("Budget");
    fireEvent.change(input, { target: { value: "Budget 2026" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(renameSheet).toHaveBeenCalledWith("sheet-2", "Budget 2026");
    });
  });

  test("keeps the drawer open when downloading a sheet from its action button", () => {
    const panel = openDrawer();
    const downloadButton = within(panel).getByRole("button", { name: "Download Budget" });

    fireEvent.mouseDown(downloadButton);
    fireEvent.click(downloadButton);

    expect(setActiveSheetId).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:smartpad-test");
    expect(panel.className).toContain("is-mobile-open");
  });

  test("keeps the drawer open when moving a sheet to trash from its action button", () => {
    const panel = openDrawer();
    const trashButton = within(panel).getByRole("button", { name: "Move Budget to trash" });

    fireEvent.mouseDown(trashButton);
    fireEvent.click(trashButton);

    expect(setActiveSheetId).not.toHaveBeenCalled();
    expect(trashSheet).toHaveBeenCalledWith("sheet-2");
    expect(panel.className).toContain("is-mobile-open");
  });

  test("keeps the drawer open when restoring a sheet from trash view", () => {
    const panel = openDrawer();

    fireEvent.click(within(panel).getByRole("button", { name: "Trash" }));
    const restoreButton = within(panel).getByRole("button", { name: "Restore Archived" });
    fireEvent.mouseDown(restoreButton);
    fireEvent.click(restoreButton);

    expect(restoreSheet).toHaveBeenCalledWith("sheet-3");
    expect(panel.className).toContain("is-mobile-open");
  });
});
