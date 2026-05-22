const DB_NAME   = "toot-master-3000";
const STORE     = "custom-image";
const IMAGE_KEY = "current";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveImageBlob(blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, IMAGE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function loadImageBlob(): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(IMAGE_KEY);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

export async function clearImageBlob(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(IMAGE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
