export interface SheetRecord {
  id: string;
  title: string;
  content: string;
  last_modified: number;
  is_trashed: boolean;
  order: number;
}

const DB_NAME = "smartpad-db";
const STORE_NAME = "sheets";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("is_trashed", "is_trashed", { unique: false });
        store.createIndex("last_modified", "last_modified", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = fn(store);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllSheets(): Promise<SheetRecord[]> {
  return runTransaction("readonly", (store) => store.getAll());
}

export async function getSheet(id: string): Promise<SheetRecord | undefined> {
  return runTransaction("readonly", (store) => store.get(id));
}

export async function putSheet(record: SheetRecord): Promise<void> {
  await runTransaction("readwrite", (store) => store.put(record));
}

export async function deleteSheet(id: string): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(id));
}

export function generateSheetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
