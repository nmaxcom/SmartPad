import { getSidebarPanelOrder } from "../../src/components/Layout/sidebarPanelOrder";

describe("sidebar panel ordering", () => {
  test("puts templates first when variable panel is also visible", () => {
    const order = getSidebarPanelOrder({
      showTemplatePanel: true,
      showVariablePanel: true,
      showSettingsPanel: false,
    });

    expect(order).toEqual(["template", "variable"]);
  });

  test("puts templates first when settings panel is also visible", () => {
    const order = getSidebarPanelOrder({
      showTemplatePanel: true,
      showVariablePanel: false,
      showSettingsPanel: true,
    });

    expect(order).toEqual(["template", "settings"]);
  });

  test("keeps template in normal slot when it is the only panel", () => {
    const order = getSidebarPanelOrder({
      showTemplatePanel: true,
      showVariablePanel: false,
      showSettingsPanel: false,
    });

    expect(order).toEqual(["template"]);
  });

  test("preserves variable/settings order when templates are hidden", () => {
    const order = getSidebarPanelOrder({
      showTemplatePanel: false,
      showVariablePanel: true,
      showSettingsPanel: true,
    });

    expect(order).toEqual(["variable", "settings"]);
  });
});
