import React from "react";
import { useVariables } from "../../state";
import { useSettingsContext } from "../../state/SettingsContext";
import { formatResult } from "../../parsing/expressionParser";
import "./VariablePanel.css";

function VariablePanel() {
  const { variables } = useVariables();
  const { settings } = useSettingsContext();

  // Convert the Map to an array for easier rendering
  const variableList = Array.from(variables.entries());

  // Helper function to format variable values using SemanticValue's toString()
  const formatVariableValue = (variable: any) => {
    if (variable.value?.toString) {
      return variable.value.toString({ precision: settings.decimalPlaces });
    }
    return String(variable.value);
  };

  // Helper function to get the display value for computed values in the panel
  const getComputedDisplayValue = (variable: any) => {
    if (variable.value?.toString) {
      return variable.value.toString({ precision: settings.decimalPlaces });
    }
    return String(variable.value);
  };

  return (
    <aside className="variable-panel" data-testid="variable-panel">
      <h2 className="panel-title">Variables</h2>

      <div className="panel-content">
        {variableList.length > 0 ? (
          <ul className="variable-list">
            {variableList.map(([name, variable]) => (
              <li key={name} className="variable-item">
                <div className="variable-info">
                  <span className="variable-name">{name}</span>
                  <div className="variable-values">
                    {variable.rawValue && variable.rawValue !== variable.value?.toString() ? (
                      <>
                        <span className="variable-raw-value">{variable.rawValue}</span>
                        <span className="variable-equals">=</span>
                        <span className="variable-computed-value">
                          {(() => {
                            if (variable.value?.toString) {
                              const value = variable.value.toString({ precision: settings.decimalPlaces });
                              const type = variable.value.getType();
                              return (
                                <>
                                  <span className="variable-value">{value}</span>
                                  <span className={`variable-type variable-type-${type}`}>
                                    {type}
                                  </span>
                                </>
                              );
                            }
                            return String(variable.value);
                          })()}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="variable-value">{formatVariableValue(variable)}</span>
                        {variable.value?.getType && (
                          <span className={`variable-type variable-type-${variable.value.getType()}`}>
                            {variable.value.getType()}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-message">No variables defined yet.</p>
        )}
      </div>
    </aside>
  );
}

export default VariablePanel;
