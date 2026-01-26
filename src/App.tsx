import React, { useMemo, useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import Editor, { EditorProvider } from "./components/Editor";
import { VariableProvider } from "./state";
import { SettingsProvider, useSettingsContext } from "./state/SettingsContext";
import { SheetProvider, useSheetContext } from "./state/SheetContext";
import AppHeader from "./components/Layout/AppHeader";
import VariablePanel from "./components/VariablePanel/VariablePanel";
import TemplatePanel from "./components/VariablePanel/TemplatePanel";
import { SettingsModal } from "./components/ui/SettingsModal";
import { SettingsPanel } from "./components/ui/SettingsPanel";
import SheetSync from "./components/SheetSync";
import { tracer, setLogLevel, LogLevel } from "./eval/tracing";
import { DEFAULT_SHEET_TITLE, deriveTitleFromContent } from "./utils/sheetTitle";

const SHEET_DRAG_TYPE = "application/x-smartpad-sheet";

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
  const appClassName = [
    "app",
    settings.showResultPulse ? "results-pulse-on" : "results-pulse-off",
    settings.showResultDelta ? "results-delta-on" : "results-delta-off",
    settings.showResultBorders ? "results-borders-on" : "results-borders-off",
    settings.showResultBackground ? "results-bg-on" : "results-bg-off",
    settings.showErrorBorders ? "errors-borders-on" : "errors-borders-off",
    settings.showErrorBackground ? "errors-bg-on" : "errors-bg-off",
    settings.showPlotDetails ? "plot-details-on" : "plot-details-off",
  ].join(" ");

  return (
    <div className={appClassName}>
      <VariableProvider>
        <SheetProvider>
          <EditorProvider>
            <SheetSync />
            <AppHeader onSettingsClick={handleOpenSettings} />
            <main className={layoutClassName}>
              <SheetSidebar />
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
        </SheetProvider>
      </VariableProvider>
    </div>
  );
}

function SheetSidebar() {
  const {
    sheets,
    activeSheetId,
    createSheet,
    createSheetFromContent,
    setActiveSheetId,
    renameSheet,
    trashSheet,
    restoreSheet,
    emptyTrash,
    reorderSheets,
  } = useSheetContext();
  const [isTrashView, setIsTrashView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [suppressHover, setSuppressHover] = useState(false);

  const activeList = useMemo(
    () => sheets.filter((sheet) => sheet.is_trashed === isTrashView),
    [isTrashView, sheets]
  );

  const handleRenameStart = (id: string, title: string) => {
    setEditingId(id);
    setEditingValue(title);
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const handleRenameCommit = async () => {
    if (!editingId) return;
    await renameSheet(editingId, editingValue.trim() || DEFAULT_SHEET_TITLE);
    setEditingId(null);
    setEditingValue("");
  };

  const sanitizeFilename = (title: string) => {
    const safe = title.replace(/[^\w\s-]/g, "").trim();
    return safe ? safe.replace(/\s+/g, "_") : "smartpad";
  };

  const downloadSheet = (title: string, content: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(title)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const activeSheets = sheets.filter((sheet) => !sheet.is_trashed);
    activeSheets.forEach((sheet) => {
      const filename = `${sanitizeFilename(sheet.title)}.md`;
      zip.file(filename, sheet.content || "");
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smartpad-sheets.zip";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importMarkdownContent = useCallback(
    async (content: string, filename?: string) => {
      const inferredTitle = filename || deriveTitleFromContent(content);
      await createSheetFromContent(content, inferredTitle);
    },
    [createSheetFromContent]
  );

  const handleImportFile = useCallback(async (file: File) => {
    const name = file.name || "";
    if (name.toLowerCase().endsWith(".md")) {
      const content = await file.text();
      const title = name.replace(/\.md$/i, "");
      await importMarkdownContent(content, title);
      return;
    }

    if (name.toLowerCase().endsWith(".zip")) {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files);
      for (const entry of entries) {
        if (entry.dir) continue;
        if (!entry.name.toLowerCase().endsWith(".md")) continue;
        const content = await entry.async("string");
        const baseName = entry.name.split("/").pop() || entry.name;
        const title = baseName.replace(/\.md$/i, "");
        await importMarkdownContent(content, title);
      }
    }
  }, [importMarkdownContent]);

  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (draggingId || event.dataTransfer?.types?.includes(SHEET_DRAG_TYPE)) {
        return;
      }
      setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (draggingId || event.dataTransfer?.types?.includes(SHEET_DRAG_TYPE)) {
        return;
      }
      if ((event.target as HTMLElement)?.classList?.contains("drop-overlay")) {
        setIsDragging(false);
      }
      if (event.relatedTarget === null) {
        setIsDragging(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      if (draggingId || event.dataTransfer?.types?.includes(SHEET_DRAG_TYPE)) {
        return;
      }
      setIsDragging(false);
      const files = event.dataTransfer?.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        handleImportFile(file);
      });
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [draggingId, handleImportFile]);

  useEffect(() => {
    if (!suppressHover) return;
    const handleMove = () => {
      setSuppressHover(false);
    };
    window.addEventListener("mousemove", handleMove, { once: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
    };
  }, [suppressHover]);

  const handleReorder = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ids = activeList.map((sheet) => sheet.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    ids.splice(sourceIndex, 1);
    ids.splice(targetIndex, 0, sourceId);
    await reorderSheets(ids);
  };

  return (
    <aside className="left-sidebar">
      <div className="left-sidebar-header panel-title">
        <span>{isTrashView ? "Trash" : "My Sheets"}</span>
        {!isTrashView && (
          <button type="button" aria-label="Create new sheet" onClick={createSheet}>
            +
          </button>
        )}
      </div>
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">Drop .md or .zip files to import</div>
        </div>
      )}
      <ul className={suppressHover ? "sheet-list suppress-hover" : "sheet-list"}>
        {activeList.map((sheet) => (
          <li
            key={sheet.id}
            className={[
              "sheet-item",
              sheet.id === activeSheetId ? "active" : "",
              draggingId === sheet.id ? "dragging" : "",
              dragOverId === sheet.id && draggingId && draggingId !== sheet.id ? "drag-over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              if (!isTrashView) {
                setActiveSheetId(sheet.id);
              }
            }}
            draggable={!isTrashView}
            onDragStart={(event) => {
              if (isTrashView) return;
              event.dataTransfer.setData(SHEET_DRAG_TYPE, sheet.id);
              event.dataTransfer.setData("text/plain", sheet.id);
              event.dataTransfer.effectAllowed = "move";
              setIsDragging(false);
              setDraggingId(sheet.id);
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverId(null);
              setIsDragging(false);
              setSuppressHover(true);
            }}
            onDragOver={(event) => {
              if (isTrashView) return;
              if (!draggingId && !event.dataTransfer?.types?.includes(SHEET_DRAG_TYPE)) return;
              event.preventDefault();
              event.stopPropagation();
              setDragOverId(sheet.id);
            }}
            onDrop={(event) => {
              if (isTrashView) return;
              event.preventDefault();
              event.stopPropagation();
              const sourceId =
                event.dataTransfer.getData(SHEET_DRAG_TYPE) || event.dataTransfer.getData("text/plain");
              handleReorder(sourceId, sheet.id);
              setDraggingId(null);
              setDragOverId(null);
              setSuppressHover(true);
            }}
          >
            <div className="sheet-title">
              {editingId === sheet.id ? (
                <input
                  className="sheet-title-input"
                  value={editingValue}
                  onChange={(event) => setEditingValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleRenameCommit();
                    }
                    if (event.key === "Escape") {
                      handleRenameCancel();
                    }
                  }}
                  onBlur={handleRenameCancel}
                  autoFocus
                />
              ) : (
                <span className="sheet-title-text">{sheet.title}</span>
              )}
            </div>
            <span className="sheet-actions">
              {isTrashView ? (
                <button
                  type="button"
                  className="sheet-action-button"
                  aria-label={`Restore ${sheet.title}`}
                  title="Restore"
                  onClick={(event) => {
                    event.stopPropagation();
                    restoreSheet(sheet.id);
                  }}
                >
                  <i className="fas fa-undo" aria-hidden="true" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="sheet-action-button"
                    aria-label={`Rename ${sheet.title}`}
                    title="Rename"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRenameStart(sheet.id, sheet.title);
                    }}
                  >
                    <i className="fas fa-pen" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="sheet-action-button"
                    aria-label={`Download ${sheet.title}`}
                    title="Download"
                    onClick={(event) => {
                      event.stopPropagation();
                      downloadSheet(sheet.title, sheet.content);
                    }}
                  >
                    <i className="fas fa-download" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="sheet-action-button"
                    aria-label={`Move ${sheet.title} to trash`}
                    title="Move to Trash"
                    onClick={(event) => {
                      event.stopPropagation();
                      trashSheet(sheet.id);
                    }}
                  >
                    <i className="fas fa-trash" aria-hidden="true" />
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
        {activeList.length === 0 && (
          <li className="sheet-item sheet-empty">
            <span className="sheet-title-text">No sheets</span>
          </li>
        )}
      </ul>
      <div className="left-sidebar-footer">
        {isTrashView ? (
          <>
            <button type="button" className="sidebar-link" onClick={() => setIsTrashView(false)}>
              <i className="fas fa-arrow-left" aria-hidden="true" />
              Back
            </button>
            <button type="button" className="sidebar-button" onClick={emptyTrash}>
              <i className="fas fa-trash" aria-hidden="true" />
              Empty Trash
            </button>
          </>
        ) : (
          <>
            <button type="button" className="sidebar-link" onClick={() => setIsTrashView(true)}>
              <i className="fas fa-trash" aria-hidden="true" />
              Trash
            </button>
            <button type="button" className="sidebar-button" onClick={downloadAll}>
              <i className="fas fa-file-zipper" aria-hidden="true" />
              Download All
            </button>
          </>
        )}
      </div>
    </aside>
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
