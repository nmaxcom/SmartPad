import React, { useCallback } from "react";
import { useSettingsContext } from "../../state/SettingsContext";
import { getDateLocaleDetected, getDateLocaleEffective } from "../../types/DateValue";

export function SettingsSections() {
  const { settings, updateSetting } = useSettingsContext();
  const detectedLocale = getDateLocaleDetected();
  const effectiveLocale = getDateLocaleEffective();
  const isCustomLocale = settings.dateLocaleMode === "custom";

  const handleDecimalPlacesChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(0, Math.min(10, value));
      updateSetting("decimalPlaces", clampedValue);
    },
    [updateSetting]
  );
  const handleGroupThousandsToggle = useCallback(
    (value: boolean) => {
      updateSetting("groupThousands", value);
    },
    [updateSetting]
  );

  const handleScientificUpperChange = useCallback(
    (value: number) => {
      const safeValue = Number.isFinite(value)
        ? Math.round(value)
        : settings.scientificUpperExponent;
      updateSetting("scientificUpperExponent", safeValue);
    },
    [updateSetting, settings.scientificUpperExponent]
  );

  const handleScientificLowerChange = useCallback(
    (value: number) => {
      const safeValue = Number.isFinite(value)
        ? Math.round(value)
        : settings.scientificLowerExponent;
      updateSetting("scientificLowerExponent", safeValue);
    },
    [updateSetting, settings.scientificLowerExponent]
  );

  return (
    <>
      <div className="settings-section">
        <h3 className="settings-section-title">Display Options</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="decimal-places" className="settings-label">
              Decimal Places
            </label>
            <p className="settings-description">
              Number of decimal places to show in results and variable panel (0-10). If a non-zero
              value would round to 0, SmartPad forces scientific notation instead.
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

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="group-thousands" className="settings-label">
              Group thousands with commas
            </label>
            <p className="settings-description">
              Insert comma separators (e.g., 1,234,567) in standard notation results for readability.
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="group-thousands"
                type="checkbox"
                checked={settings.groupThousands}
                onChange={(e) => handleGroupThousandsToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="scientific-upper-exponent" className="settings-label">
              Scientific Upper Exponent (10^N)
            </label>
            <p className="settings-description">
              Use scientific notation when values are at or above 10^N
            </p>
          </div>
          <div className="settings-control">
            <input
              id="scientific-upper-exponent"
              type="number"
              step="1"
              value={settings.scientificUpperExponent}
              onChange={(e) => handleScientificUpperChange(parseFloat(e.target.value))}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="scientific-lower-exponent" className="settings-label">
              Scientific Lower Exponent (10^N)
            </label>
            <p className="settings-description">
              Use scientific notation when values are below 10^N
            </p>
          </div>
          <div className="settings-control">
            <input
              id="scientific-lower-exponent"
              type="number"
              step="1"
              value={settings.scientificLowerExponent}
              onChange={(e) => handleScientificLowerChange(parseFloat(e.target.value))}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="scientific-trim-zeros" className="settings-label">
              Trim Scientific Trailing Zeros
            </label>
            <p className="settings-description">
              When enabled, 5.000e+3 renders as 5e+3. Disable to keep fixed mantissa decimals.
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="scientific-trim-zeros"
                type="checkbox"
                checked={settings.scientificTrimTrailingZeros}
                onChange={(e) => updateSetting("scientificTrimTrailingZeros", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Date Parsing</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="date-locale-mode" className="settings-label">
              Date Locale
            </label>
            <p className="settings-description">
              Detected locale: {detectedLocale}. Using: {effectiveLocale}.
            </p>
          </div>
          <div className="settings-control">
            <select
              id="date-locale-mode"
              value={settings.dateLocaleMode}
              onChange={(e) =>
                updateSetting(
                  "dateLocaleMode",
                  e.target.value === "custom" ? "custom" : "system"
                )
              }
              className="settings-select"
            >
              <option value="system">System default</option>
              <option value="custom">Custom override</option>
            </select>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="date-display-format" className="settings-label">
              Date Display Format
            </label>
            <p className="settings-description">
              Choose between ISO (YYYY-MM-DD) or locale-style formatting.
            </p>
          </div>
          <div className="settings-control">
            <select
              id="date-display-format"
              value={settings.dateDisplayFormat}
              onChange={(e) =>
                updateSetting(
                  "dateDisplayFormat",
                  e.target.value === "locale" ? "locale" : "iso"
                )
              }
              className="settings-select"
            >
              <option value="iso">ISO (YYYY-MM-DD)</option>
              <option value="locale">Locale format</option>
            </select>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="date-locale-override" className="settings-label">
              Locale Override
            </label>
            <p className="settings-description">
              Use a BCP 47 locale code (example: en-US, en-GB). Only affects numeric
              dates like 06/05/2024.
            </p>
          </div>
          <div className="settings-control">
            <input
              id="date-locale-override"
              type="text"
              value={settings.dateLocaleOverride}
              onChange={(e) => updateSetting("dateLocaleOverride", e.target.value)}
              className="settings-text-input"
              disabled={!isCustomLocale}
              placeholder="en-US"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Results Feedback</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="show-result-pulse" className="settings-label">
              Flash on Result Change
            </label>
            <p className="settings-description">
              Brief pulse animation when a result value updates
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="show-result-pulse"
                type="checkbox"
                checked={settings.showResultPulse}
                onChange={(e) => updateSetting("showResultPulse", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="show-result-delta" className="settings-label">
              Delta Badge
            </label>
            <p className="settings-description">
              Show the change amount beside updated results
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="show-result-delta"
                type="checkbox"
                checked={settings.showResultDelta}
                onChange={(e) => updateSetting("showResultDelta", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="show-result-borders" className="settings-label">
              Result Borders
            </label>
            <p className="settings-description">
              Toggle the border outline around results
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="show-result-borders"
                type="checkbox"
                checked={settings.showResultBorders}
                onChange={(e) => updateSetting("showResultBorders", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="show-result-background" className="settings-label">
              Result Backgrounds
            </label>
            <p className="settings-description">
              Toggle the filled background behind results
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="show-result-background"
                type="checkbox"
                checked={settings.showResultBackground}
                onChange={(e) => updateSetting("showResultBackground", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="show-error-borders" className="settings-label">
              Error Borders
            </label>
            <p className="settings-description">
              Toggle the border outline around errors
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="show-error-borders"
                type="checkbox"
                checked={settings.showErrorBorders}
                onChange={(e) => updateSetting("showErrorBorders", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="show-error-background" className="settings-label">
              Error Backgrounds
            </label>
            <p className="settings-description">
              Toggle the filled background behind errors
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="show-error-background"
                type="checkbox"
                checked={settings.showErrorBackground}
                onChange={(e) => updateSetting("showErrorBackground", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
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

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor="show-settings-panel" className="settings-label">
              Show Settings Panel
            </label>
            <p className="settings-description">
              Keep settings visible next to the editor
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id="show-settings-panel"
                type="checkbox"
                checked={settings.showSettingsPanel}
                onChange={(e) => updateSetting("showSettingsPanel", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
