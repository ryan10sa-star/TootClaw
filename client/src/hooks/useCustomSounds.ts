import { useState, useEffect, useCallback } from "react";
import { saveSoundBlob, loadSoundBlob, deleteSoundBlob } from "../lib/soundStore";

export interface CustomRecording {
  id        : string;
  label     : string;
  createdAt : string;
  url       : string;   // ephemeral object URL
}

interface StoredMeta {
  id        : string;
  label     : string;
  createdAt : string;
}

const META_KEY     = "toot-master-3000-sounds-meta";
const SELECTED_KEY = "toot-master-3000-selected-sound";
const MAX_RECORDINGS = 10;

function readMeta(): StoredMeta[] {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? "[]"); } catch { return []; }
}
function writeMeta(meta: StoredMeta[]) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

/** Read selected sound ID without React (for SneakAttack module-level use). */
export function readSelectedSoundId(): string | null {
  return localStorage.getItem(SELECTED_KEY);
}

export function useCustomSounds() {
  const [recordings, setRecordings] = useState<CustomRecording[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_KEY)
  );

  /* On mount: load all blobs from IndexedDB and create object URLs */
  useEffect(() => {
    const meta = readMeta();
    let cancelled = false;
    Promise.all(
      meta.map(async (m) => {
        const blob = await loadSoundBlob(m.id).catch(() => null);
        if (!blob) return null;
        return { ...m, url: URL.createObjectURL(blob) } as CustomRecording;
      })
    ).then((results) => {
      if (cancelled) return;
      const valid = results.filter(Boolean) as CustomRecording[];
      setRecordings(valid);
      // Sync meta to only include blobs that still exist
      writeMeta(valid.map(({ id, label, createdAt }) => ({ id, label, createdAt })));
    });
    return () => { cancelled = true; };
  }, []);

  /* Revoke all object URLs on unmount */
  useEffect(() => {
    return () => { recordings.forEach((r) => URL.revokeObjectURL(r.url)); };
  }, []); // intentionally only on unmount

  const saveRecording = useCallback(async (blob: Blob, label: string) => {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await saveSoundBlob(id, blob);

    const meta = readMeta();
    const newMeta: StoredMeta = { id, label, createdAt: new Date().toISOString() };
    const updated = [newMeta, ...meta].slice(0, MAX_RECORDINGS);
    writeMeta(updated);

    const url = URL.createObjectURL(blob);
    setRecordings((prev) => [{ id, label, createdAt: newMeta.createdAt, url }, ...prev].slice(0, MAX_RECORDINGS));
  }, []);

  const deleteRecording = useCallback(async (id: string) => {
    await deleteSoundBlob(id);
    writeMeta(readMeta().filter((m) => m.id !== id));
    setRecordings((prev) => {
      const r = prev.find((x) => x.id === id);
      if (r) URL.revokeObjectURL(r.url);
      return prev.filter((x) => x.id !== id);
    });
    setSelectedId((prev) => {
      if (prev === id) { localStorage.removeItem(SELECTED_KEY); return null; }
      return prev;
    });
  }, []);

  const selectSound = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) localStorage.setItem(SELECTED_KEY, id);
    else localStorage.removeItem(SELECTED_KEY);
  }, []);

  const selectedUrl = recordings.find((r) => r.id === selectedId)?.url ?? null;

  return { recordings, selectedId, selectedUrl, saveRecording, deleteRecording, selectSound };
}
