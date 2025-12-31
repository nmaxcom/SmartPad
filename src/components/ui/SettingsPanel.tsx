import React, { useCallback } from "react";
import { useSettingsContext } from "../../state/SettingsContext";
import { SettingsSections } from "./SettingsSections";
import "./SettingsPanel.css";

export function SettingsPanel() {
  const { resetSettings } = useSettingsContext();

  const handleReset = useCallback(() => {
    if (window.confirm("Reset all settings to defaults?")) {
      resetSettings();
    }
  }, [resetSettings]);

  return (
    <div className="settings-modal settings-panel" aria-label="Settings panel">
      <div className="settings-header settings-panel-header">
        <h2 className="settings-title">Settings</h2>
      </div>
      <div className="settings-content settings-panel-content">
        <SettingsSections />
      </div>
      <div className="settings-footer settings-panel-footer">
        <button className="settings-btn settings-btn-secondary" onClick={handleReset}>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
