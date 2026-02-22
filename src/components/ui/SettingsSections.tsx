import React, { useCallback, useState } from "react";
import { useSettingsContext } from "../../state/SettingsContext";
import { DEFAULT_SETTINGS } from "../../state/settingsStore";
import {
  normalizeSyntaxThemeId,
  normalizeUIThemeId,
  SYNTAX_THEME_OPTIONS,
  UI_THEME_OPTIONS,
} from "../../styles/themeCatalog";
import { getDateLocaleDetected, getDateLocaleEffective } from "../../types/DateValue";
import { useFxStatus } from "../../hooks/useFxStatus";

interface SettingsSectionsProps {
  idPrefix?: string;
}

export function SettingsSections({ idPrefix = "settings" }: SettingsSectionsProps) {
  const { settings, updateSetting } = useSettingsContext();
  const fxStatus = useFxStatus();
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

  const handleListMaxLengthChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(5, Math.min(1000, Math.round(value)));
      updateSetting("listMaxLength", clampedValue);
    },
    [updateSetting]
  );

  const handleUiThemeChange = useCallback(
    (value: string) => {
      updateSetting("uiTheme", normalizeUIThemeId(value, DEFAULT_SETTINGS.uiTheme));
    },
    [updateSetting]
  );

  const handleSyntaxThemeChange = useCallback(
    (value: string) => {
      updateSetting("syntaxTheme", normalizeSyntaxThemeId(value, DEFAULT_SETTINGS.syntaxTheme));
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

  const [plotInputOverrides, setPlotInputOverrides] = useState<Record<string, string>>({});

  const setPlotInput = useCallback((key: string, value: string) => {
    setPlotInputOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearPlotInput = useCallback((key: string) => {
    setPlotInputOverrides((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const getPlotInputValue = (key: string, fallback: number) =>
    plotInputOverrides[key] ?? String(fallback);

  const handlePlotInputChange = useCallback(
    (key: string, raw: string, applyValue: (value: number) => void) => {
      setPlotInput(key, raw);
      if (!raw.trim()) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      applyValue(parsed);
    },
    [setPlotInput]
  );

  const handlePlotInputBlur = useCallback(
    (key: string) => {
      const raw = plotInputOverrides[key];
      if (raw === undefined) return;
      if (!raw.trim()) {
        clearPlotInput(key);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        clearPlotInput(key);
        return;
      }
      clearPlotInput(key);
    },
    [plotInputOverrides, clearPlotInput]
  );

  const handlePlotSampleCountChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(10, Math.min(2000, Math.round(value)));
      updateSetting("plotSampleCount", clampedValue);
    },
    [updateSetting]
  );

  const handlePlotScrubSampleCountChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(10, Math.min(1000, Math.round(value)));
      updateSetting("plotScrubSampleCount", clampedValue);
    },
    [updateSetting]
  );

  const handlePlotMinSamplesChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(10, Math.min(4000, Math.round(value)));
      updateSetting("plotMinSamples", clampedValue);
      if (clampedValue > settings.plotMaxSamples) {
        updateSetting("plotMaxSamples", clampedValue);
      }
    },
    [updateSetting, settings.plotMaxSamples]
  );

  const handlePlotMaxSamplesChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(10, Math.min(5000, Math.round(value)));
      updateSetting("plotMaxSamples", Math.max(clampedValue, settings.plotMinSamples));
    },
    [updateSetting, settings.plotMinSamples]
  );

  const handlePlotDomainExpansionChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(1, Math.min(100, value));
      updateSetting("plotDomainExpansion", clampedValue);
    },
    [updateSetting]
  );

  const handlePlotYViewPaddingChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(1, Math.min(50, value));
      updateSetting("plotYViewPadding", clampedValue);
    },
    [updateSetting]
  );

  const handlePlotYDomainPaddingChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(1, Math.min(200, value));
      updateSetting("plotYDomainPadding", clampedValue);
    },
    [updateSetting]
  );

  const handlePlotPanYDomainPaddingChange = useCallback(
    (value: number) => {
      const clampedValue = Math.max(1, Math.min(200, value));
      updateSetting("plotPanYDomainPadding", clampedValue);
    },
    [updateSetting]
  );

  return (
    <>
      <div className="settings-section">
        <h3 className="settings-section-title">Appearance</h3>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <p className="settings-label">Interface Theme</p>
            <p className="settings-description">
              Controls panels, surfaces, borders, and overall light/dark look.
            </p>
          </div>
          <div className="settings-control">
            <div className="theme-preview-grid" role="radiogroup" aria-label="Interface Theme">
              {UI_THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-preview-card ${settings.uiTheme === theme.id ? "is-active" : ""}`}
                  onClick={() => handleUiThemeChange(theme.id)}
                  aria-pressed={settings.uiTheme === theme.id}
                >
                  <div className="theme-preview-header">
                    <span className="theme-preview-name">{theme.label}</span>
                    <span className="theme-preview-tone">{theme.tone}</span>
                  </div>
                  <div className="theme-preview-swatches" aria-hidden="true">
                    {theme.preview.map((color, idx) => (
                      <span
                        key={`${theme.id}-preview-${idx}`}
                        className="theme-preview-swatch"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <p className="settings-label">Syntax Theme</p>
            <p className="settings-description">
              Controls token colors in the editor independently of interface theme.
            </p>
          </div>
          <div className="settings-control">
            <div className="theme-preview-grid" role="radiogroup" aria-label="Syntax Theme">
              {SYNTAX_THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-preview-card ${settings.syntaxTheme === theme.id ? "is-active" : ""}`}
                  onClick={() => handleSyntaxThemeChange(theme.id)}
                  aria-pressed={settings.syntaxTheme === theme.id}
                >
                  <div className="theme-preview-header">
                    <span className="theme-preview-name">{theme.label}</span>
                    <span className="theme-preview-tone">{theme.tone}</span>
                  </div>
                  <div className="theme-preview-swatches" aria-hidden="true">
                    {theme.preview.map((color, idx) => (
                      <span
                        key={`${theme.id}-preview-${idx}`}
                        className="theme-preview-swatch"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section settings-section--currency">
        <h3 className="settings-section-title">Display Options</h3>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-decimal-places`} className="settings-label">
              Decimal Places
            </label>
            <p className="settings-description">
              Number of decimal places to show in results and variable panel (0-10). If a non-zero
              value would round to 0, SmartPad forces scientific notation instead.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-decimal-places`}
              type="number"
              min="0"
              max="10"
              value={settings.decimalPlaces}
              onChange={(e) => handleDecimalPlacesChange(parseInt(e.target.value) || 0)}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-group-thousands`} className="settings-label">
              Group thousands with commas
            </label>
            <p className="settings-description">
              Insert comma separators (e.g., 1,234,567) in standard notation results for readability.
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-group-thousands`}
                type="checkbox"
                checked={settings.groupThousands}
                onChange={(e) => handleGroupThousandsToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-live-result-enabled`} className="settings-label">
              Live Result
            </label>
            <p className="settings-description">
              Show expression results while typing on lines without =&gt;. Live previews suppress
              errors until expressions are complete.
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-live-result-enabled`}
                type="checkbox"
                checked={settings.liveResultEnabled}
                onChange={(e) => updateSetting("liveResultEnabled", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-result-lane-enabled`} className="settings-label">
              Result Lane
            </label>
            <p className="settings-description">
              Align result chips into a consistent right-side lane on wide screens. SmartPad
              automatically falls back to inline chips on narrow screens.
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-result-lane-enabled`}
                type="checkbox"
                checked={settings.resultLaneEnabled}
                onChange={(e) => updateSetting("resultLaneEnabled", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-chip-insert-mode`} className="settings-label">
              Result chip drag/drop insert mode
            </label>
            <p className="settings-description">
              Choose what gets inserted when you drag a result chip: a live reference chip (keeps
              tracking updates) or the current plain value snapshot.
            </p>
          </div>
          <div className="settings-control">
            <select
              id={`${idPrefix}-chip-insert-mode`}
              value={settings.chipInsertMode}
              onChange={(e) =>
                updateSetting("chipInsertMode", e.target.value === "value" ? "value" : "reference")
              }
              className="settings-select"
            >
              <option value="reference">Insert reference chip</option>
              <option value="value">Insert plain value</option>
            </select>
          </div>
        </div>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-reference-text-export-mode`} className="settings-label">
              Reference text copy/export
            </label>
            <p className="settings-description">
              Preserve keeps stable SmartPad reference tokens in plain text. Readable flattens
              references to visible values.
            </p>
          </div>
          <div className="settings-control">
            <select
              id={`${idPrefix}-reference-text-export-mode`}
              value={settings.referenceTextExportMode}
              onChange={(e) =>
                updateSetting(
                  "referenceTextExportMode",
                  e.target.value === "readable" ? "readable" : "preserve"
                )
              }
              className="settings-select"
            >
              <option value="preserve">Preserve references</option>
              <option value="readable">Readable values</option>
            </select>
          </div>
        </div>

        <div className="settings-item settings-item-stack">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-list-max-length`} className="settings-label">
              Max items per list
            </label>
            <p className="settings-description">
              Cap the number of entries a list can contain before throwing an error.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-list-max-length`}
              type="number"
              min="5"
              max="1000"
              value={settings.listMaxLength}
              onChange={(e) => handleListMaxLengthChange(parseInt(e.target.value) || 0)}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-scientific-upper-exponent`} className="settings-label">
              Scientific Upper Exponent (10^N)
            </label>
            <p className="settings-description">
              Use scientific notation when values are at or above 10^N
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-scientific-upper-exponent`}
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
            <label htmlFor={`${idPrefix}-scientific-lower-exponent`} className="settings-label">
              Scientific Lower Exponent (10^N)
            </label>
            <p className="settings-description">
              Use scientific notation when values are below 10^N
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-scientific-lower-exponent`}
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
            <label htmlFor={`${idPrefix}-scientific-trim-zeros`} className="settings-label">
              Trim Scientific Trailing Zeros
            </label>
            <p className="settings-description">
              When enabled, 5.000e+3 renders as 5e+3. Disable to keep fixed mantissa decimals.
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-scientific-trim-zeros`}
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
            <label htmlFor={`${idPrefix}-date-locale-mode`} className="settings-label">
              Date Locale
            </label>
            <p className="settings-description">
              Detected locale: {detectedLocale}. Using: {effectiveLocale}.
            </p>
          </div>
          <div className="settings-control">
            <select
              id={`${idPrefix}-date-locale-mode`}
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
            <label htmlFor={`${idPrefix}-date-display-format`} className="settings-label">
              Date Display Format
            </label>
            <p className="settings-description">
              Choose between ISO (YYYY-MM-DD) or locale-style formatting.
            </p>
          </div>
          <div className="settings-control">
            <select
              id={`${idPrefix}-date-display-format`}
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
            <label htmlFor={`${idPrefix}-date-locale-override`} className="settings-label">
              Locale Override
            </label>
            <p className="settings-description">
              Use a BCP 47 locale code (example: en-US, en-GB). Only affects numeric
              dates like 06/05/2024.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-date-locale-override`}
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
        <h3 className="settings-section-title">Currency</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Live FX Status</label>
            <p className="settings-description">
              {fxStatus.provider === "offline" &&
                (fxStatus.source === "cache"
                  ? "Offline. Using cached FX rates."
                  : "Offline. FX rates unavailable.")}
              {fxStatus.provider !== "offline" &&
                "Live FX providers are synced. Green means active, dim means standby."}
            </p>
          </div>
          <div className="settings-control">
            {(
              [
                { id: "frankfurter", label: "Frankfurter", note: "Primary fiat rates" },
                { id: "ecb", label: "ECB", note: "Fallback fiat rates" },
                { id: "fawazahmed0", label: "Fawazahmed0", note: "Crypto + fallback rates" },
              ] as const
            ).map((provider) => {
              const state = fxStatus.providers?.[provider.id];
              const isActive =
                fxStatus.provider === provider.id || fxStatus.cryptoProvider === provider.id;
              return (
                <div key={provider.id} className="fx-status-item">
                  <div
                    className={`fx-status-indicator fx-status-${provider.id} ${isActive ? "is-active" : "is-inactive"}`}
                  >
                    <span className="fx-status-dot"></span>
                    <span className="fx-status-text">{provider.label}</span>
                  </div>
                  <div className="fx-status-meta">
                    {provider.note}
                    {state?.updatedAt && (
                      <> • Updated {new Date(state.updatedAt).toLocaleString()}</>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Results Feedback</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-show-result-pulse`} className="settings-label">
              Flash on Result Change
            </label>
            <p className="settings-description">
              Brief pulse animation when a result value updates
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-result-pulse`}
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
            <label htmlFor={`${idPrefix}-show-result-borders`} className="settings-label">
              Result Borders
            </label>
            <p className="settings-description">
              Toggle the border outline around results
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-result-borders`}
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
            <label htmlFor={`${idPrefix}-show-result-background`} className="settings-label">
              Result Backgrounds
            </label>
            <p className="settings-description">
              Toggle the filled background behind results
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-result-background`}
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
            <label htmlFor={`${idPrefix}-show-error-borders`} className="settings-label">
              Error Borders
            </label>
            <p className="settings-description">
              Toggle the border outline around errors
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-error-borders`}
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
            <label htmlFor={`${idPrefix}-show-error-background`} className="settings-label">
              Error Backgrounds
            </label>
            <p className="settings-description">
              Toggle the filled background behind errors
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-error-background`}
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
        <h3 className="settings-section-title">Plots</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-show-plot-details`} className="settings-label">
              Show Plot Details
            </label>
            <p className="settings-description">
              Toggle plot headers, controls, and metadata. Off = chart only.
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-plot-details`}
                type="checkbox"
                checked={settings.showPlotDetails}
                onChange={(e) => updateSetting("showPlotDetails", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-sample-count`} className="settings-label">
              Base sample count
            </label>
            <p className="settings-description">
              Number of samples per series for most plots. Higher = smoother curves, slower updates.
              Default: {DEFAULT_SETTINGS.plotSampleCount}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-sample-count`}
              type="number"
              min="10"
              max="2000"
              value={getPlotInputValue("plotSampleCount", settings.plotSampleCount)}
              onChange={(e) =>
                handlePlotInputChange("plotSampleCount", e.target.value, (value) =>
                  handlePlotSampleCountChange(Math.round(value))
                )
              }
              onBlur={() => handlePlotInputBlur("plotSampleCount")}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-scrub-sample-count`} className="settings-label">
              Scrub sample count
            </label>
            <p className="settings-description">
              Samples used while dragging numbers. Lower = faster scrubbing, higher = smoother.
              Default: {DEFAULT_SETTINGS.plotScrubSampleCount}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-scrub-sample-count`}
              type="number"
              min="10"
              max="1000"
              value={getPlotInputValue("plotScrubSampleCount", settings.plotScrubSampleCount)}
              onChange={(e) =>
                handlePlotInputChange("plotScrubSampleCount", e.target.value, (value) =>
                  handlePlotScrubSampleCountChange(Math.round(value))
                )
              }
              onBlur={() => handlePlotInputBlur("plotScrubSampleCount")}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-min-samples`} className="settings-label">
              Minimum samples (auto domain)
            </label>
            <p className="settings-description">
              Floor for sampling when the domain is auto-generated. Prevents jagged lines on wide ranges.
              Default: {DEFAULT_SETTINGS.plotMinSamples}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-min-samples`}
              type="number"
              min="10"
              max="4000"
              value={getPlotInputValue("plotMinSamples", settings.plotMinSamples)}
              onChange={(e) =>
                handlePlotInputChange("plotMinSamples", e.target.value, (value) =>
                  handlePlotMinSamplesChange(Math.round(value))
                )
              }
              onBlur={() => handlePlotInputBlur("plotMinSamples")}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-max-samples`} className="settings-label">
              Maximum samples (cap)
            </label>
            <p className="settings-description">
              Upper bound on samples after density scaling. Keeps huge plots responsive.
              Default: {DEFAULT_SETTINGS.plotMaxSamples}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-max-samples`}
              type="number"
              min="10"
              max="5000"
              value={getPlotInputValue("plotMaxSamples", settings.plotMaxSamples)}
              onChange={(e) =>
                handlePlotInputChange("plotMaxSamples", e.target.value, (value) =>
                  handlePlotMaxSamplesChange(Math.round(value))
                )
              }
              onBlur={() => handlePlotInputBlur("plotMaxSamples")}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-domain-expansion`} className="settings-label">
              Auto X domain expansion
            </label>
            <p className="settings-description">
              Multiplier for the auto X range around the current value. Larger = more panning room.
              Default: {DEFAULT_SETTINGS.plotDomainExpansion}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-domain-expansion`}
              type="number"
              step="0.5"
              min="1"
              max="100"
              value={getPlotInputValue("plotDomainExpansion", settings.plotDomainExpansion)}
              onChange={(e) =>
                handlePlotInputChange("plotDomainExpansion", e.target.value, (value) =>
                  handlePlotDomainExpansionChange(value)
                )
              }
              onBlur={() => handlePlotInputBlur("plotDomainExpansion")}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-y-view-padding`} className="settings-label">
              Auto Y view padding
            </label>
            <p className="settings-description">
              Expands the Y view around the data. 1 = tight fit, higher adds breathing room.
              Default: {DEFAULT_SETTINGS.plotYViewPadding}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-y-view-padding`}
              type="number"
              step="0.05"
              min="1"
              max="50"
              value={getPlotInputValue("plotYViewPadding", settings.plotYViewPadding)}
              onChange={(e) =>
                handlePlotInputChange("plotYViewPadding", e.target.value, (value) =>
                  handlePlotYViewPaddingChange(value)
                )
              }
              onBlur={() => handlePlotInputBlur("plotYViewPadding")}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-y-domain-padding`} className="settings-label">
              Auto Y domain padding
            </label>
            <p className="settings-description">
              Expands the Y domain beyond the view. Larger values allow more vertical panning.
              Default: {DEFAULT_SETTINGS.plotYDomainPadding}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-y-domain-padding`}
              type="number"
              step="0.5"
              min="1"
              max="200"
              value={getPlotInputValue("plotYDomainPadding", settings.plotYDomainPadding)}
              onChange={(e) =>
                handlePlotInputChange("plotYDomainPadding", e.target.value, (value) =>
                  handlePlotYDomainPaddingChange(value)
                )
              }
              onBlur={() => handlePlotInputBlur("plotYDomainPadding")}
              className="settings-number-input"
            />
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-plot-pan-y-domain-padding`} className="settings-label">
              Pan/zoom Y domain padding
            </label>
            <p className="settings-description">
              Extra headroom added to the Y domain after panning or zooming with auto domain on.
              Default: {DEFAULT_SETTINGS.plotPanYDomainPadding}.
            </p>
          </div>
          <div className="settings-control">
            <input
              id={`${idPrefix}-plot-pan-y-domain-padding`}
              type="number"
              step="0.5"
              min="1"
              max="200"
              value={getPlotInputValue("plotPanYDomainPadding", settings.plotPanYDomainPadding)}
              onChange={(e) =>
                handlePlotInputChange("plotPanYDomainPadding", e.target.value, (value) =>
                  handlePlotPanYDomainPaddingChange(value)
                )
              }
              onBlur={() => handlePlotInputBlur("plotPanYDomainPadding")}
              className="settings-number-input"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Layout</h3>

        <div className="settings-item">
          <div className="settings-item-info">
            <label htmlFor={`${idPrefix}-show-variable-panel`} className="settings-label">
              Show Variable Panel
            </label>
            <p className="settings-description">
              Display the panel showing all defined variables and their current values
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-variable-panel`}
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
            <label htmlFor={`${idPrefix}-show-template-panel`} className="settings-label">
              Show Template Panel
            </label>
            <p className="settings-description">
              Display the panel with quick template examples to get started
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-template-panel`}
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
            <label htmlFor={`${idPrefix}-show-settings-panel`} className="settings-label">
              Show Settings Panel
            </label>
            <p className="settings-description">
              Keep settings visible next to the editor
            </p>
          </div>
          <div className="settings-control">
            <label className="toggle-switch">
              <input
                id={`${idPrefix}-show-settings-panel`}
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
