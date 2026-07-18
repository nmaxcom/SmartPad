import React, { useEffect, useMemo, useState } from "react";
import { useVariables } from "../../state";
import { useSheetContext } from "../../state/SheetContext";
import { useSettingsContext } from "../../state/SettingsContext";
import {
  classifyVariableRole,
  clearVariableBaseline,
  compareVariableWithBaseline,
  createVariableBaselineEntry,
  getFiniteNumericValue,
  loadVariableBaseline,
  saveVariableBaseline,
  type VariableBaselineSnapshot,
} from "../../state/variableBaselineStore";
import { getDateLocaleEffective } from "../../types/DateValue";
import { sanitizeReferencePlaceholdersForDisplay } from "../../references/referenceIds";
import "./VariablePanel.css";

function VariablePanel() {
  const { variables } = useVariables();
  const { activeSheetId } = useSheetContext();
  const { settings } = useSettingsContext();
  const [baseline, setBaseline] = useState<VariableBaselineSnapshot | null>(
    null,
  );
  const displayOptions = {
    precision: settings.decimalPlaces,
    scientificUpperThreshold: Math.pow(10, settings.scientificUpperExponent),
    scientificLowerThreshold: Math.pow(10, settings.scientificLowerExponent),
    scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
    dateFormat: settings.dateDisplayFormat,
    dateLocale: getDateLocaleEffective(),
    groupThousands: settings.groupThousands,
  };

  // Convert the Map to an array for easier rendering
  const variableList = useMemo(
    () => Array.from(variables.entries()),
    [variables],
  );
  const hasCapturableVariables = variableList.some(
    ([, variable]) => getFiniteNumericValue(variable) !== null,
  );

  useEffect(() => {
    setBaseline(activeSheetId ? loadVariableBaseline(activeSheetId) : null);
  }, [activeSheetId]);

  // Helper function to format variable values using SemanticValue's toString()
  const formatVariableValue = (variable: any) => {
    if (variable.value?.toString) {
      return sanitizeReferencePlaceholdersForDisplay(
        variable.value.toString(displayOptions),
      );
    }
    return sanitizeReferencePlaceholdersForDisplay(String(variable.value));
  };

  // Helper function to get the display value for computed values in the panel
  const getComputedDisplayValue = (variable: any) => {
    if (variable.value?.toString) {
      return sanitizeReferencePlaceholdersForDisplay(
        variable.value.toString(displayOptions),
      );
    }
    return sanitizeReferencePlaceholdersForDisplay(String(variable.value));
  };

  const captureBaseline = () => {
    if (!activeSheetId) return;
    const entries = Object.fromEntries(
      variableList.flatMap(([name, variable]) => {
        const entry = createVariableBaselineEntry(
          variable,
          formatVariableValue(variable),
        );
        return entry ? [[name, entry] as const] : [];
      }),
    );
    if (Object.keys(entries).length === 0) return;
    const snapshot: VariableBaselineSnapshot = {
      capturedAt: Date.now(),
      entries,
    };
    saveVariableBaseline(activeSheetId, snapshot);
    setBaseline(snapshot);
  };

  const removeBaseline = () => {
    if (!activeSheetId) return;
    clearVariableBaseline(activeSheetId);
    setBaseline(null);
  };

  const comparisons = useMemo(() => {
    if (!baseline) return new Map();
    return new Map(
      variableList.flatMap(([name, variable]) => {
        const baselineEntry = baseline.entries[name];
        if (!baselineEntry) return [];
        const comparison = compareVariableWithBaseline(baselineEntry, variable);
        return comparison ? [[name, comparison] as const] : [];
      }),
    );
  }, [baseline, variableList]);

  const changedCount = Array.from(comparisons.values()).filter(
    (comparison) => comparison.changed,
  ).length;

  const formatPercentDelta = (delta: number): string => {
    const rounded = Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1);
    return `${delta > 0 ? "+" : ""}${rounded}%`;
  };

  return (
    <aside className="variable-panel" data-testid="variable-panel">
      <div className="variable-panel-header">
        <h2 className="panel-title">Variables</h2>
        {!baseline ? (
          <button
            type="button"
            className="variable-baseline-primary"
            onClick={captureBaseline}
            disabled={!activeSheetId || !hasCapturableVariables}
          >
            Set baseline
          </button>
        ) : null}
      </div>

      {baseline ? (
        <div
          className="variable-baseline-bar"
          data-testid="variable-baseline-bar"
        >
          <div className="variable-baseline-status">
            <span className="variable-baseline-dot" aria-hidden="true" />
            <span>Compared with baseline</span>
            <span className="variable-baseline-count">
              {changedCount} changed
            </span>
          </div>
          <div className="variable-baseline-actions">
            <button
              type="button"
              onClick={captureBaseline}
              aria-label="Update baseline"
            >
              Update
            </button>
            <button
              type="button"
              onClick={removeBaseline}
              aria-label="Clear baseline"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <p className="variable-baseline-hint">Capture, scrub, compare.</p>
      )}

      <div className="panel-content">
        {variableList.length > 0 ? (
          <ul className="variable-list">
            {variableList.map(([name, variable]) => {
              const numericValue = getFiniteNumericValue(variable);
              const role =
                numericValue === null
                  ? null
                  : classifyVariableRole(variable.rawValue || "");
              const baselineEntry = baseline?.entries[name];
              const comparison = comparisons.get(name);
              const deltaLabel = !comparison?.changed
                ? "same"
                : comparison.typeChanged
                  ? "type changed"
                  : comparison.percentDelta === null
                    ? "changed"
                    : formatPercentDelta(comparison.percentDelta);

              return (
                <li
                  key={name}
                  className={`variable-item${role ? ` variable-item-${role}` : ""}${
                    comparison?.changed ? " is-baseline-changed" : ""
                  }`}
                >
                  <div className="variable-info">
                    <div className="variable-name-group">
                      <span className="variable-name">{name}</span>
                      {role ? (
                        <span className={`variable-role variable-role-${role}`}>
                          {role}
                        </span>
                      ) : null}
                    </div>
                    <div className="variable-values">
                      {variable.rawValue &&
                      variable.rawValue !==
                        variable.value.toString(displayOptions) ? (
                        <>
                          <span className="variable-raw-value">
                            {sanitizeReferencePlaceholdersForDisplay(
                              variable.rawValue,
                            )}
                          </span>
                          <span className="variable-equals">=</span>
                          <span className="variable-computed-value">
                            <span className="variable-value">
                              {getComputedDisplayValue(variable)}
                            </span>
                            <span
                              className={`variable-type variable-type-${variable.value.getType()}`}
                            >
                              {variable.value.getType()}
                            </span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="variable-value">
                            {formatVariableValue(variable)}
                          </span>
                          <span
                            className={`variable-type variable-type-${variable.value.getType()}`}
                          >
                            {variable.value.getType()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {baselineEntry && comparison ? (
                    <div className="variable-baseline-comparison">
                      <span className="variable-baseline-previous">
                        Base {baselineEntry.displayValue}
                      </span>
                      <span
                        className={`variable-baseline-delta is-${comparison.direction}`}
                        aria-label={
                          comparison.changed
                            ? `${name} changed ${deltaLabel} from baseline`
                            : `${name} is unchanged from baseline`
                        }
                      >
                        {deltaLabel}
                      </span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-message">No variables defined yet.</p>
        )}
      </div>
    </aside>
  );
}

export default VariablePanel;
