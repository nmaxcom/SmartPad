import React, { useState } from "react";
import Editor, { EditorProvider } from "./components/Editor";
import { VariableProvider } from "./state";
import { SettingsProvider } from "./state/SettingsContext";
import AppHeader from "./components/Layout/AppHeader";
import AppContainer from "./components/Layout/AppContainer";
import VariablePanel from "./components/VariablePanel/VariablePanel";
import TemplatePanel from "./components/VariablePanel/TemplatePanel";
import SaveLoadButtons from "./components/VariablePanel/SaveLoadButtons";
import { SettingsModal } from "./components/ui/SettingsModal";
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

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);

  return (
    <div className="app">
      <SettingsProvider>
        <VariableProvider>
          <EditorProvider>
            <AppHeader onSettingsClick={handleOpenSettings} />
            <main className="app-main">
              <AppContainer className="main-grid-layout">
                <div className="editor-card-container">
                  <Editor />
                </div>
                <div className="sidebar-container">
                  <VariablePanel />
                  <SaveLoadButtons />
                  <TemplatePanel />
                </div>
              </AppContainer>
            </main>
            <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
          </EditorProvider>
        </VariableProvider>
      </SettingsProvider>
    </div>
  );
}

export default App;
