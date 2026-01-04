import React from "react";
import "./AppHeader.css";

interface AppHeaderProps {
  onSettingsClick?: () => void;
}

function AppHeader({ onSettingsClick }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="header-content">
        <img className="header-icon" src="/smartpad.png" alt="SmartPad" />
        <h1 className="header-title">SmartPad</h1>
      </div>
      {onSettingsClick && (
        <button
          className="settings-button"
          onClick={onSettingsClick}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙️
        </button>
      )}
    </header>
  );
}

export default AppHeader;
