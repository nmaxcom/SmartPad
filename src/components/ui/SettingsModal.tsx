import React, { useCallback, useEffect, useRef } from "react";
import { useSettingsContext } from "../../state/SettingsContext";
import "./SettingsModal.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Settings Modal Component
 * Provides settings configuration interface with modern UI
 */
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSetting, resetSettings } = useSettingsContext();
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Handle click outside modal
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Setup event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      // Focus the modal for accessibility
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  // Handle decimal places change
  const handleDecimalPlacesChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(0, Math.min(10, value)); // Limit to 0-10 decimal places
      updateSetting("decimalPlaces", clampedValue);
    },
    [updateSetting]
  );

  // Handle reset settings
  const handleReset = useCallback(() => {
    if (window.confirm("Reset all settings to defaults?")) {
      resetSettings();
    }
  }, [resetSettings]);

  if (!isOpen) return null;

  return (
    <div className="settings-modal-backdrop" onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className="settings-modal"
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="settings-header">
          <h2 id="settings-title" className="settings-title">
            Settings
          </h2>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Display Options</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <label htmlFor="decimal-places" className="settings-label">
                  Decimal Places
                </label>
                <p className="settings-description">
                  Number of decimal places to show in results and variable panel (0-10)
                </p>
              </div>
              <div className="settings-control">
                <input
                  id="decimal-places"
                  type="number"
                  min="0"
                  max="10"
                  value={settings.decimalPlaces}
                  onChange={(e) => handleDecimalPlacesChange(parseInt(e.target.value) || 0)}
                  className="settings-number-input"
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Layout</h3>

            <div className="settings-item">
              <div className="settings-item-info">
                <label htmlFor="show-variable-panel" className="settings-label">
                  Show Variable Panel
                </label>
                <p className="settings-description">
                  Display the panel showing all defined variables and their current values
                </p>
              </div>
              <div className="settings-control">
                <label className="toggle-switch">
                  <input
                    id="show-variable-panel"
                    type="checkbox"
                    checked={settings.showVariablePanel}
                    onChange={(e) => updateSetting("showVariablePanel", e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <label htmlFor="show-template-panel" className="settings-label">
                  Show Template Panel
                </label>
                <p className="settings-description">
                  Display the panel with quick template examples to get started
                </p>
              </div>
              <div className="settings-control">
                <label className="toggle-switch">
                  <input
                    id="show-template-panel"
                    type="checkbox"
                    checked={settings.showTemplatePanel}
                    onChange={(e) => updateSetting("showTemplatePanel", e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button className="settings-btn settings-btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="settings-btn settings-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
