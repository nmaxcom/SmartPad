import React, { useState } from "react";
import Editor, { EditorProvider } from "./components/Editor";
import { VariableProvider } from "./state";
import { SettingsProvider, useSettingsContext } from "./state/SettingsContext";
import AppHeader from "./components/Layout/AppHeader";
import VariablePanel from "./components/VariablePanel/VariablePanel";
import TemplatePanel from "./components/VariablePanel/TemplatePanel";
import SaveLoadButtons from "./components/VariablePanel/SaveLoadButtons";
import { SettingsModal } from "./components/ui/SettingsModal";
import { SettingsPanel } from "./components/ui/SettingsPanel";
import { tracer, setLogLevel, LogLevel } from "./eval/tracing";

// Expose tracing system to browser console for debugging
// Usage examples:
// - window.smartpadTracer.enableVerboseLogging() - See all trace steps
// - window.smartpadTracer.enableInfoLogging() - See summaries only
// - window.smartpadTracer.getCurrentLevel() - Check current log level
// - window.smartpadTracer.clearTraces() - Clear accumulated traces
declare global {
  interface Window {
    smartpadTracer: {
      tracer: typeof tracer;
      setLogLevel: typeof setLogLevel;
      LogLevel: typeof LogLevel;
      getLogLevel: () => LogLevel;
      enableVerboseLogging: () => void;
      enableInfoLogging: () => void;
      enableWarningLogging: () => void;
      enableErrorOnlyLogging: () => void;
      clearTraces: () => void;
      getCurrentLevel: () => string;
    };
  }
}

// Initialize global tracer access
window.smartpadTracer = {
  tracer,
  setLogLevel,
  LogLevel,
  getLogLevel: () => LogLevel.INFO, // Default getter
  // Helper functions for easy debugging
  enableVerboseLogging: () => setLogLevel(LogLevel.DEBUG),
  enableInfoLogging: () => setLogLevel(LogLevel.INFO),
  enableWarningLogging: () => setLogLevel(LogLevel.WARN),
  enableErrorOnlyLogging: () => setLogLevel(LogLevel.ERROR),
  clearTraces: () => tracer.clearTraces(),
  getCurrentLevel: () => {
    const level = LogLevel.INFO; // This should get the actual current level
    const names = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    return names[level] || 'UNKNOWN';
  }
};

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings } = useSettingsContext();

  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);

  // Show sidebar only if at least one panel is enabled
  const showSidebar =
    settings.showVariablePanel || settings.showTemplatePanel || settings.showSettingsPanel;
  const layoutClassName = showSidebar ? "app-layout has-right-panel" : "app-layout";
  const sheetList = ["Q4 Budget Plan", "Commute Analysis", "Physics Lab 01"];
  const appClassName = [
    "app",
    settings.showResultPulse ? "results-pulse-on" : "results-pulse-off",
    settings.showResultDelta ? "results-delta-on" : "results-delta-off",
    settings.showResultBorders ? "results-borders-on" : "results-borders-off",
    settings.showResultBackground ? "results-bg-on" : "results-bg-off",
    settings.showErrorBorders ? "errors-borders-on" : "errors-borders-off",
    settings.showErrorBackground ? "errors-bg-on" : "errors-bg-off",
  ].join(" ");

  return (
    <div className={appClassName}>
      <VariableProvider>
        <EditorProvider>
          <AppHeader onSettingsClick={handleOpenSettings} />
          <main className={layoutClassName}>
            <aside className="left-sidebar">
              <div className="left-sidebar-header panel-title">
                <span>My Sheets</span>
                <button type="button" aria-label="Create new sheet">
                  +
                </button>
              </div>
              <ul className="sheet-list">
                {sheetList.map((sheet, index) => (
                  <li key={sheet} className={index === 0 ? "sheet-item active" : "sheet-item"}>
                    <div className="sheet-title">
                      <span className="sheet-dot" aria-hidden="true" />
                      {sheet}
                    </div>
                    <span className="sheet-actions" aria-hidden="true">
                      ...
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
            <section className="editor-pane">
              <div className="editor-card-container">
                <Editor />
              </div>
            </section>
            {showSidebar && (
              <aside className="right-panel">
                <div className="sidebar-container">
                  {settings.showVariablePanel && (
                    <>
                      <VariablePanel />
                      <SaveLoadButtons />
                    </>
                  )}
                  {settings.showTemplatePanel && <TemplatePanel />}
                  {settings.showSettingsPanel && <SettingsPanel />}
                </div>
              </aside>
            )}
          </main>
          <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
        </EditorProvider>
      </VariableProvider>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
