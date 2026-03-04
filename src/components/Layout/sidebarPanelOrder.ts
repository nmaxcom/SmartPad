export type SidebarPanelKey = "template" | "variable" | "settings";

export interface SidebarPanelVisibility {
  showTemplatePanel: boolean;
  showVariablePanel: boolean;
  showSettingsPanel: boolean;
}

export const getSidebarPanelOrder = ({
  showTemplatePanel,
  showVariablePanel,
  showSettingsPanel,
}: SidebarPanelVisibility): SidebarPanelKey[] => {
  const visible: SidebarPanelKey[] = [];

  if (showTemplatePanel && (showVariablePanel || showSettingsPanel)) {
    visible.push("template");
  }

  if (showVariablePanel) {
    visible.push("variable");
  }

  if (showTemplatePanel && !visible.includes("template")) {
    visible.push("template");
  }

  if (showSettingsPanel) {
    visible.push("settings");
  }

  return visible;
};
