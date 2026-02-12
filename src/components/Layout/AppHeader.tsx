import React from "react";
import { useSettingsContext } from "../../state/SettingsContext";
import "./AppHeader.css";

interface AppHeaderProps {
  onSettingsClick?: () => void;
}

const BUG_REPORT_URL = "https://github.com/nmaxcom/SmartPad/issues/new?template=bug_report.yml";
const DOCS_URL = `${import.meta.env.BASE_URL}docs/`;

type PanelToggleKey = "showVariablePanel" | "showTemplatePanel" | "showSettingsPanel";

const panelToggles: Array<{ key: PanelToggleKey; icon: string; label: string }> = [
  {
    key: "showVariablePanel",
    icon: "fa-file-code",
    label: "Toggle Variables",
  },
  {
    key: "showTemplatePanel",
    icon: "fa-table",
    label: "Toggle Templates",
  },
  {
    key: "showSettingsPanel",
    icon: "fa-tools",
    label: "Toggle Inspector",
  },
];

function AppHeader({ onSettingsClick }: AppHeaderProps) {
  const { settings, updateSetting } = useSettingsContext();

  return (
    <header className="app-header header-container">
      <div className="logo">
        <i className="fas fa-terminal logo-icon" aria-hidden="true" />
        SmartPad
      </div>

      <div className="header-controls">
        <div className="toggles-group toggle-glow-icons" role="group" aria-label="Panels">
          {panelToggles.map((toggle) => {
            const active = settings[toggle.key];

            return (
              <button
                key={toggle.key}
                className={active ? "active" : ""}
                title={toggle.label}
                aria-label={toggle.label}
                aria-pressed={active}
                type="button"
                onClick={() => updateSetting(toggle.key, !settings[toggle.key])}
              >
                <i className={`fas ${toggle.icon}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        {onSettingsClick && (
          <button
            className="header-settings-btn"
            onClick={onSettingsClick}
            aria-label="Open Settings"
            title="Open Settings"
            type="button"
          >
            <i className="fas fa-cog" aria-hidden="true" />
          </button>
        )}

        <a
          className="header-docs-btn"
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Open documentation"
          title="Open documentation"
        >
          <i className="fas fa-book-open" aria-hidden="true" />
          <span>Docs</span>
        </a>

        <a
          className="header-report-bug-btn"
          href={BUG_REPORT_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Report a bug"
          title="Report a bug"
        >
          <i className="fas fa-bug" aria-hidden="true" />
          <span>Report bug</span>
        </a>
      </div>
    </header>
  );
}

export default AppHeader;
