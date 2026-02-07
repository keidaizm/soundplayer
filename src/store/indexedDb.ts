import type { MixState, SoundClip } from "./soundStore";

const DB_NAME = "soundplayer-db";
const DB_VERSION = 1;
const CLIP_STORE = "clips";
const MIX_STORE = "mix";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CLIP_STORE)) {
        db.createObjectStore(CLIP_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(MIX_STORE)) {
        db.createObjectStore(MIX_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function waitForTx(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllClips(): Promise<SoundClip[]> {
  const db = await openDb();
  const tx = db.transaction(CLIP_STORE, "readonly");
  const store = tx.objectStore(CLIP_STORE);
  const clips = await wrapRequest(store.getAll());
  await waitForTx(tx);
  db.close();
  return clips as SoundClip[];
}

export async function addClip(clip: SoundClip): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CLIP_STORE, "readwrite");
  tx.objectStore(CLIP_STORE).put(clip);
  await waitForTx(tx);
  db.close();
}

export async function deleteClip(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CLIP_STORE, "readwrite");
  tx.objectStore(CLIP_STORE).delete(id);
  await waitForTx(tx);
  db.close();
}

export async function saveMixState(state: MixState): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(MIX_STORE, "readwrite");
  tx.objectStore(MIX_STORE).put({ key: "state", value: state });
  await waitForTx(tx);
  db.close();
}

export async function loadMixState(): Promise<MixState | null> {
  const db = await openDb();
  const tx = db.transaction(MIX_STORE, "readonly");
  const record = await wrapRequest(tx.objectStore(MIX_STORE).get("state"));
  await waitForTx(tx);
  db.close();
  if (!record) {
    return null;
  }
  return (record as { value: MixState }).value;
}
