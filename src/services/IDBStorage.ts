const STORE = 'content_store';
const getDB = () => new Promise<IDBDatabase>((r, e) => {
  const req = indexedDB.open('lumina_reader_db', 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => r(req.result);
  req.onerror = () => e(req.error);
});
const doTx = async (mode: IDBTransactionMode, cb: (s: IDBObjectStore) => IDBRequest) => {
  const db = await getDB();
  return new Promise<any>((r, e) => {
    const tx = db.transaction(STORE, mode);
    const req = cb(tx.objectStore(STORE));
    tx.oncomplete = () => r(req.result ?? null);
    tx.onerror = () => e(tx.error);
  });
};
export const IDBStorage = {
  setItem: (k: string, v: any) => doTx('readwrite', s => s.put(v, k)),
  getItem: <T>(k: string): Promise<T | null> => doTx('readonly', s => s.get(k)),
  removeItem: (k: string) => doTx('readwrite', s => s.delete(k))
};
