import React, { useCallback, useEffect, useRef } from "react";
import { useSettingsContext } from "../../state/SettingsContext";
import { SettingsSections } from "./SettingsSections";
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
  const { resetSettings } = useSettingsContext();
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
          <SettingsSections idPrefix="settings-modal" />
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
