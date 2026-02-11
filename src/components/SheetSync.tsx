import { useEffect, useRef } from "react";
import { EditorState } from "@tiptap/pm/state";
import { useEditorContext } from "./Editor";
import { useSheetContext } from "../state/SheetContext";
import { getSmartPadText } from "./editorText";

const SAVE_DEBOUNCE_MS = 200;
const RICH_DOC_STORAGE_KEY_PREFIX = "smartpad-rich-doc:";

interface RichDocCachePayload {
  plainText: string;
  doc: Record<string, any>;
  updatedAt: number;
}

const getRichDocStorageKey = (sheetId: string): string =>
  `${RICH_DOC_STORAGE_KEY_PREFIX}${sheetId}`;

const loadRichDocCache = (sheetId: string): RichDocCachePayload | null => {
  try {
    const raw = localStorage.getItem(getRichDocStorageKey(sheetId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RichDocCachePayload;
    if (
      !parsed ||
      typeof parsed.plainText !== "string" ||
      !parsed.doc ||
      typeof parsed.doc !== "object"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveRichDocCache = (
  sheetId: string,
  plainText: string,
  doc: Record<string, any> | null | undefined
): void => {
  if (!doc) return;
  try {
    const payload: RichDocCachePayload = {
      plainText,
      doc,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getRichDocStorageKey(sheetId), JSON.stringify(payload));
  } catch {}
};

export default function SheetSync() {
  const { editor } = useEditorContext();
  const { activeSheet, updateSheetContent } = useSheetContext();
  const saveTimeoutRef = useRef<number | null>(null);
  const skipNextSaveRef = useRef(false);
  const prevSheetIdRef = useRef<string | null>(null);
  const lastSavedByIdRef = useRef<Map<string, string>>(new Map());
  const stateCacheRef = useRef<Map<string, { state: EditorState; content: string }>>(new Map());
  const scrollCacheRef = useRef<Map<string, number>>(new Map());

  const flushPendingSave = (sheetId: string, content: string) => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const lastSaved = lastSavedByIdRef.current.get(sheetId);
    if (lastSaved === content) return;
    updateSheetContent(sheetId, content);
    lastSavedByIdRef.current.set(sheetId, content);
  };

  const applyDocWithoutHistory = (docJson: Record<string, any>): boolean => {
    if (!editor) return false;
    try {
      const doc = editor.state.schema.nodeFromJSON(docJson);
      const nextState = EditorState.create({
        doc,
        schema: editor.state.schema,
        plugins: editor.state.plugins,
      });
      editor.view.updateState(nextState);
      try {
        window.dispatchEvent(new Event("forceEvaluation"));
      } catch {}
      return true;
    } catch {
      return false;
    }
  };

  const applyContentWithoutHistory = (content: string) => {
    if (!editor) return;
    const lines = content.split("\n");
    const docJson = {
      type: "doc",
      content: lines.map((line) =>
        line === ""
          ? { type: "paragraph" }
          : { type: "paragraph", content: [{ type: "text", text: line }] }
      ),
    };
    const doc = editor.state.schema.nodeFromJSON(docJson);
    const nextState = EditorState.create({
      doc,
      schema: editor.state.schema,
      plugins: editor.state.plugins,
    });
    editor.view.updateState(nextState);
    try {
      window.dispatchEvent(new Event("forceEvaluation"));
    } catch {}
  };

  useEffect(() => {
    if (!editor || !activeSheet) return;

    if (prevSheetIdRef.current && prevSheetIdRef.current !== activeSheet.id) {
      const currentContent = getSmartPadText(editor);
      const scrollTop = editor.view.dom.parentElement?.scrollTop ?? 0;
      scrollCacheRef.current.set(prevSheetIdRef.current, scrollTop);
      saveRichDocCache(prevSheetIdRef.current, currentContent, editor.getJSON());
      flushPendingSave(prevSheetIdRef.current, currentContent);
      stateCacheRef.current.set(prevSheetIdRef.current, {
        state: editor.state,
        content: currentContent,
      });
    }

    const cached = stateCacheRef.current.get(activeSheet.id);
    if (cached && cached.content === activeSheet.content) {
      skipNextSaveRef.current = true;
      lastSavedByIdRef.current.set(activeSheet.id, activeSheet.content);
      editor.view.updateState(cached.state);
      const nextScroll = scrollCacheRef.current.get(activeSheet.id) ?? 0;
      setTimeout(() => {
        const scroller = editor.view.dom.parentElement;
        if (scroller) scroller.scrollTop = nextScroll;
      }, 0);
      prevSheetIdRef.current = activeSheet.id;
      return;
    }

    const editorContent = getSmartPadText(editor);
    if (editorContent === activeSheet.content) {
      lastSavedByIdRef.current.set(activeSheet.id, activeSheet.content);
      const nextScroll = scrollCacheRef.current.get(activeSheet.id) ?? 0;
      setTimeout(() => {
        const scroller = editor.view.dom.parentElement;
        if (scroller) scroller.scrollTop = nextScroll;
      }, 0);
      prevSheetIdRef.current = activeSheet.id;
      return;
    }

    skipNextSaveRef.current = true;
    lastSavedByIdRef.current.set(activeSheet.id, activeSheet.content);
    const richCache = loadRichDocCache(activeSheet.id);
    const didApplyRichDoc =
      !!richCache &&
      (richCache.plainText === activeSheet.content ||
        richCache.updatedAt >= Number(activeSheet.last_modified || 0)) &&
      applyDocWithoutHistory(richCache.doc);
    if (!didApplyRichDoc) {
      applyContentWithoutHistory(activeSheet.content);
    }
    const nextScroll = scrollCacheRef.current.get(activeSheet.id) ?? 0;
    setTimeout(() => {
      const scroller = editor.view.dom.parentElement;
      if (scroller) scroller.scrollTop = nextScroll;
    }, 0);
    prevSheetIdRef.current = activeSheet.id;
  }, [activeSheet?.id, activeSheet?.content, editor]);

  useEffect(() => {
    if (!editor || !activeSheet) return;

    const handleUpdate = () => {
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false;
        return;
      }

      const content = getSmartPadText(editor);
      saveRichDocCache(activeSheet.id, content, editor.getJSON());
      const lastSaved = lastSavedByIdRef.current.get(activeSheet.id);
      if (content === lastSaved) {
        stateCacheRef.current.set(activeSheet.id, { state: editor.state, content });
        return;
      }

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        updateSheetContent(activeSheet.id, content);
        lastSavedByIdRef.current.set(activeSheet.id, content);
        stateCacheRef.current.set(activeSheet.id, { state: editor.state, content });
      }, SAVE_DEBOUNCE_MS);

      stateCacheRef.current.set(activeSheet.id, { state: editor.state, content });
    };

    const scroller = editor.view.dom.parentElement;
    const handleScroll = () => {
      if (!activeSheet) return;
      const scrollTop = scroller?.scrollTop ?? 0;
      scrollCacheRef.current.set(activeSheet.id, scrollTop);
    };

    editor.on("update", handleUpdate);
    scroller?.addEventListener("scroll", handleScroll, { passive: true });
    const flushOnLeave = () => {
      if (!activeSheet) return;
      const latest = getSmartPadText(editor);
      saveRichDocCache(activeSheet.id, latest, editor.getJSON());
      flushPendingSave(activeSheet.id, latest);
    };
    window.addEventListener("beforeunload", flushOnLeave);
    window.addEventListener("pagehide", flushOnLeave);
    return () => {
      editor.off("update", handleUpdate);
      scroller?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", flushOnLeave);
      window.removeEventListener("pagehide", flushOnLeave);
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeSheet?.id, editor, updateSheetContent]);

  return null;
}
