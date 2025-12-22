import React from "react";
import "./AppHeader.css";

interface AppHeaderProps {
  onSettingsClick?: () => void;
}

function AppHeader({ onSettingsClick }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="header-title">SmartPad</h1>
        <p className="header-subtitle">
          Text-based calculator with real-time mathematical calculations
        </p>
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
