import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { deriveTitleFromContent, applyTitleToContent, DEFAULT_SHEET_TITLE } from "../utils/sheetTitle";
import { SheetRecord, deleteSheet, generateSheetId, getAllSheets, getSheet, putSheet } from "../storage/sheetsDb";

interface SheetContextValue {
  sheets: SheetRecord[];
  activeSheetId: string | null;
  activeSheet: SheetRecord | null;
  isLoading: boolean;
  createSheet: () => Promise<void>;
  createSheetFromContent: (content: string, suggestedTitle?: string, makeActive?: boolean) => Promise<void>;
  setActiveSheetId: (id: string) => void;
  updateSheetContent: (id: string, content: string) => Promise<void>;
  renameSheet: (id: string, title: string) => Promise<void>;
  trashSheet: (id: string) => Promise<void>;
  restoreSheet: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  reorderSheets: (orderedIds: string[]) => Promise<void>;
}

const SheetContext = createContext<SheetContextValue | null>(null);

const CHANNEL_NAME = "smartpad-sheets";
const ACTIVE_SHEET_STORAGE_KEY = "smartpad-active-sheet-id";

const loadActiveSheetId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_SHEET_STORAGE_KEY);
  } catch {
    return null;
  }
};

const persistActiveSheetId = (id: string | null) => {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SHEET_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SHEET_STORAGE_KEY);
    }
  } catch {}
};

function sortSheets(a: SheetRecord, b: SheetRecord): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  return b.last_modified - a.last_modified;
}

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [sheets, setSheets] = useState<SheetRecord[]>([]);
  const [activeSheetId, setActiveSheetIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const clientIdRef = useRef<string>(generateSheetId());
  const setActiveSheetId = useCallback((id: string) => {
    setActiveSheetIdState(id);
    persistActiveSheetId(id);
  }, []);

  const upsertSheet = useCallback((record: SheetRecord) => {
    setSheets((prev) => {
      const existingIndex = prev.findIndex((sheet) => sheet.id === record.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = record;
        return next.sort(sortSheets);
      }
      return [...prev, record].sort(sortSheets);
    });
  }, []);

  const removeSheet = useCallback((id: string) => {
    setSheets((prev) => prev.filter((sheet) => sheet.id !== id));
  }, []);

  const ensureUniqueTitle = useCallback(
    (title: string, excludeId?: string): string => {
      const existingTitles = new Set(
        sheets
          .filter((sheet) => sheet.id !== excludeId)
          .map((sheet) => sheet.title.trim())
      );

      if (!existingTitles.has(title)) {
        return title;
      }

      let counter = 1;
      let candidate = `${title} (${counter})`;
      while (existingTitles.has(candidate)) {
        counter += 1;
        candidate = `${title} (${counter})`;
      }
      return candidate;
    },
    [sheets]
  );

  const saveSheetRecord = useCallback(
    async (record: SheetRecord, broadcast: boolean) => {
      await putSheet(record);
      upsertSheet(record);
      if (broadcast && channelRef.current) {
        channelRef.current.postMessage({
          type: "sheet-updated",
          id: record.id,
          source: clientIdRef.current,
        });
      }
    },
    [upsertSheet]
  );

  const getNextOrder = useCallback(() => {
    if (sheets.length === 0) return 0;
    return Math.max(...sheets.map((sheet) => sheet.order ?? 0)) + 1;
  }, [sheets]);

  const createSheet = useCallback(async () => {
    const id = generateSheetId();
    const now = Date.now();
    const record: SheetRecord = {
      id,
      title: DEFAULT_SHEET_TITLE,
      content: "",
      last_modified: now,
      is_trashed: false,
      order: getNextOrder(),
    };
    await saveSheetRecord(record, true);
    setActiveSheetId(id);
  }, [getNextOrder, saveSheetRecord]);

  const createSheetFromContent = useCallback(
    async (content: string, suggestedTitle?: string, makeActive = false) => {
      const derived = deriveTitleFromContent(content);
      const baseTitle = suggestedTitle?.trim() || derived;
      const uniqueTitle = ensureUniqueTitle(baseTitle);
      const normalizedContent =
        baseTitle !== uniqueTitle || derived !== uniqueTitle
          ? applyTitleToContent(content, uniqueTitle)
          : content;
      const id = generateSheetId();
      const now = Date.now();
      const record: SheetRecord = {
        id,
        title: uniqueTitle,
        content: normalizedContent,
        last_modified: now,
        is_trashed: false,
        order: getNextOrder(),
      };
      await saveSheetRecord(record, true);
      if (makeActive) {
        setActiveSheetId(id);
      }
    },
    [ensureUniqueTitle, getNextOrder, saveSheetRecord]
  );

  const updateSheetContent = useCallback(
    async (id: string, content: string) => {
      const existing = sheets.find((sheet) => sheet.id === id) || (await getSheet(id));
      if (!existing) return;
      const title = deriveTitleFromContent(content);
      const record: SheetRecord = {
        ...existing,
        title,
        content,
        last_modified: Date.now(),
      };
      await saveSheetRecord(record, true);
    },
    [sheets, saveSheetRecord]
  );

  const renameSheet = useCallback(
    async (id: string, title: string) => {
      const existing = sheets.find((sheet) => sheet.id === id) || (await getSheet(id));
      if (!existing) return;
      const normalizedTitle = ensureUniqueTitle(title.trim() || DEFAULT_SHEET_TITLE, id);
      const content = applyTitleToContent(existing.content, normalizedTitle);
      const record: SheetRecord = {
        ...existing,
        title: normalizedTitle,
        content,
        last_modified: Date.now(),
      };
      await saveSheetRecord(record, true);
    },
    [ensureUniqueTitle, sheets, saveSheetRecord]
  );

  const trashSheet = useCallback(
    async (id: string) => {
      const existing = sheets.find((sheet) => sheet.id === id) || (await getSheet(id));
      if (!existing) return;
      const record: SheetRecord = {
        ...existing,
        is_trashed: true,
        last_modified: Date.now(),
      };
      await saveSheetRecord(record, true);
      if (activeSheetId === id) {
        const remaining = sheets.filter((sheet) => !sheet.is_trashed && sheet.id !== id);
        if (remaining.length > 0) {
          setActiveSheetId(remaining[0].id);
        } else {
          await createSheet();
        }
      }
    },
    [activeSheetId, createSheet, sheets, saveSheetRecord]
  );

  const restoreSheet = useCallback(
    async (id: string) => {
      const existing = sheets.find((sheet) => sheet.id === id) || (await getSheet(id));
      if (!existing) return;
      const record: SheetRecord = {
        ...existing,
        is_trashed: false,
        last_modified: Date.now(),
      };
      await saveSheetRecord(record, true);
    },
    [sheets, saveSheetRecord]
  );

  const emptyTrash = useCallback(async () => {
    const trashed = sheets.filter((sheet) => sheet.is_trashed);
    await Promise.all(trashed.map((sheet) => deleteSheet(sheet.id)));
    trashed.forEach((sheet) => removeSheet(sheet.id));
  }, [removeSheet, sheets]);

  const reorderSheets = useCallback(
    async (orderedIds: string[]) => {
      const next = new Map(orderedIds.map((id, index) => [id, index]));
      const updates = sheets
        .filter((sheet) => next.has(sheet.id))
        .map((sheet) => ({
          ...sheet,
          order: next.get(sheet.id) ?? sheet.order,
        }));
      await Promise.all(updates.map((sheet) => saveSheetRecord(sheet, true)));
    },
    [sheets, saveSheetRecord]
  );

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const records = await getAllSheets();
      if (!isMounted) return;
      if (records.length === 0) {
        const id = generateSheetId();
        const now = Date.now();
        const record: SheetRecord = {
          id,
          title: DEFAULT_SHEET_TITLE,
          content: "",
          last_modified: now,
          is_trashed: false,
          order: 0,
        };
        await saveSheetRecord(record, true);
        setActiveSheetId(id);
        setIsLoading(false);
        return;
      }
      let needsOrderUpdate = false;
      const withOrder = records.map((sheet, index) => {
        if (typeof sheet.order === "number") return sheet;
        needsOrderUpdate = true;
        return { ...sheet, order: index };
      });
      if (needsOrderUpdate) {
        await Promise.all(withOrder.map((sheet) => putSheet(sheet)));
      }
      const sorted = [...withOrder].sort(sortSheets);
      setSheets(sorted);
      const storedActiveId = loadActiveSheetId();
      const storedActive =
        storedActiveId && sorted.find((sheet) => sheet.id === storedActiveId && !sheet.is_trashed);
      const firstActive = sorted.find((sheet) => !sheet.is_trashed) || sorted[0];
      if (storedActive) {
        setActiveSheetId(storedActive.id);
      } else if (firstActive) {
        setActiveSheetId(firstActive.id);
      } else {
        setActiveSheetIdState(null);
        persistActiveSheetId(null);
      }
      setIsLoading(false);
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [saveSheetRecord]);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = async (event) => {
      const { type, id, source } = event.data || {};
      if (type !== "sheet-updated" || source === clientIdRef.current) return;
      const record = await getSheet(id);
      if (!record) return;
      await saveSheetRecord(record, false);
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [saveSheetRecord]);

  const activeSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === activeSheetId) || null,
    [activeSheetId, sheets]
  );

  const value = useMemo<SheetContextValue>(
    () => ({
      sheets,
      activeSheetId,
      activeSheet,
      isLoading,
      createSheet,
      createSheetFromContent,
      setActiveSheetId,
      updateSheetContent,
      renameSheet,
      trashSheet,
      restoreSheet,
      emptyTrash,
      reorderSheets,
    }),
    [
      sheets,
      activeSheetId,
      activeSheet,
      isLoading,
      createSheet,
      createSheetFromContent,
      updateSheetContent,
      renameSheet,
      trashSheet,
      restoreSheet,
      emptyTrash,
      reorderSheets,
      setActiveSheetId,
    ]
  );

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

export function useSheetContext(): SheetContextValue {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error("useSheetContext must be used within a SheetProvider");
  }
  return context;
}
