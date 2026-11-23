// Tiny IndexedDB wrapper: book metadata + file blobs live on the device only.
const DB_NAME = 'urdu-reader';
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('books', { keyPath: 'id' });
      db.createObjectStore('files', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(stores, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let out;
    Promise.resolve(fn(...[].concat(stores).map((s) => t.objectStore(s)))).then((v) => (out = v));
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const listBooks = () => tx('books', 'readonly', (s) => wrap(s.getAll()));
export const getBook = (id) => tx('books', 'readonly', (s) => wrap(s.get(id)));
export const getFile = (id) => tx('files', 'readonly', (s) => wrap(s.get(id))).then((r) => r?.blob);

export const addBook = (meta, blob) =>
  tx(['books', 'files'], 'readwrite', (b, f) => { b.put(meta); f.put({ id: meta.id, blob }); });

export const updateBook = (id, patch) =>
  tx('books', 'readwrite', async (s) => {
    const cur = await wrap(s.get(id));
    if (cur) s.put({ ...cur, ...patch });
  });

export const deleteBook = (id) =>
  tx(['books', 'files'], 'readwrite', (b, f) => { b.delete(id); f.delete(id); });

export async function findByHash(hash) {
  return (await listBooks()).find((b) => b.hash === hash);
}
