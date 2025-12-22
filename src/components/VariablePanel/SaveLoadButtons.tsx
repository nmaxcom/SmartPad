import React, { useState, useRef, useEffect } from "react";
import { useEditorContext } from "../Editor";
import "./SaveLoadButtons.css";

const STORAGE_KEY = "smartpad-saves";

interface SaveSlot {
  id: string;
  name: string;
  content: string;
  timestamp: number;
}

export default function SaveLoadButtons() {
  const { editor, setSmartPadContent } = useEditorContext();
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const loadButtonRef = useRef<HTMLDivElement>(null);
  const saveDialogRef = useRef<HTMLDivElement>(null);

  // Load saves from localStorage on mount
  useEffect(() => {
    const savedSaves = localStorage.getItem(STORAGE_KEY);
    if (savedSaves) {
      try {
        setSaves(JSON.parse(savedSaves));
      } catch (e) {
        console.error("Failed to parse saved saves:", e);
      }
    }
  }, []);

  // Save saves to localStorage whenever saves change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  }, [saves]);

  // Close load menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loadButtonRef.current && !loadButtonRef.current.contains(event.target as Node)) {
        setIsLoadMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close save dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saveDialogRef.current && !saveDialogRef.current.contains(event.target as Node)) {
        setIsSaveDialogOpen(false);
        setSaveName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = () => {
    if (!editor) return;
    
    const content = editor.getText();
    if (!content.trim()) return;

    setIsSaveDialogOpen(true);
  };

  const confirmSave = () => {
    if (!editor || !saveName.trim()) return;
    
    const content = editor.getText();
    const now = Date.now();
    const newSave: SaveSlot = {
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: saveName.trim(),
      content,
      timestamp: now,
    };

    setSaves(prev => {
      // Add new save to the beginning
      const updatedSaves = [newSave, ...prev];
      
      // Keep only the 10 most recent saves
      return updatedSaves.slice(0, 10);
    });
    

    
    setIsSaveDialogOpen(false);
    setSaveName("");
  };

  const handleLoad = (save: SaveSlot) => {
    setSmartPadContent(save.content);
    
    // Ensure evaluation runs after insertion (same as TemplatePanel)
    try {
      window.dispatchEvent(new Event('forceEvaluation'));
    } catch {}
    
    setIsLoadMenuOpen(false);
  };

  const handleDelete = (saveId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSaves(prev => prev.filter(s => s.id !== saveId));
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="save-load-buttons">
      {/* Save Button */}
      <button 
        onClick={handleSave}
        className="save-button"
        aria-label="Save current content with a name"
        title="Save current content with a name"
      >
        <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17,21 17,13 7,13 7,21"/>
          <polyline points="7,3 7,8 15,8"/>
        </svg>
        Save
      </button>

      {/* Load Button with Hover Menu */}
      <div className="load-button-container" ref={loadButtonRef}>
        <button 
          onClick={() => setIsLoadMenuOpen(!isLoadMenuOpen)}
          className={`load-button ${isLoadMenuOpen ? 'active' : ''}`}
          aria-label="Load a saved state"
          title="Load a saved state"
        >
          <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Load
          <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,9 12,15 18,9"/>
          </svg>
        </button>

        {/* Load Menu */}
        {isLoadMenuOpen && (
          <div className="load-menu">
            {saves.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="empty-icon">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <span>No saved states</span>
                <small>Save some content to get started</small>
              </div>
            ) : (
              <>
                <div className="menu-header">
                  <span>Saved States</span>
                  <small>{saves.length} slot{saves.length !== 1 ? 's' : ''}</small>
                </div>
                <div className="save-slots">
                  {saves.map((save) => (
                    <div 
                      key={save.id} 
                      className="save-slot"
                      onClick={() => handleLoad(save)}
                    >
                      <div className="slot-info">
                        <span className="slot-name">{save.name}</span>
                        <span className="slot-time">{formatTimestamp(save.timestamp)}</span>
                      </div>
                      <button 
                        className="delete-slot"
                        onClick={(e) => handleDelete(save.id, e)}
                        aria-label={`Delete ${save.name}`}
                        title={`Delete ${save.name}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {isSaveDialogOpen && (
        <div className="save-dialog-overlay">
          <div className="save-dialog" ref={saveDialogRef}>
            <div className="dialog-header">
              <h3>Save Current State</h3>
              <button 
                className="close-dialog"
                onClick={() => {
                  setIsSaveDialogOpen(false);
                  setSaveName("");
                }}
                aria-label="Close dialog"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="dialog-content">
              <label htmlFor="save-name">Give this save a name:</label>
              <input
                id="save-name"
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., 'Login flow test', 'Error case 1'"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmSave();
                  if (e.key === 'Escape') {
                    setIsSaveDialogOpen(false);
                    setSaveName("");
                  }
                }}
              />
            </div>
            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setIsSaveDialogOpen(false);
                  setSaveName("");
                }}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={confirmSave}
                disabled={!saveName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
