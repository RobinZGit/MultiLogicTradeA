/**
 * IndexedDB-хранилище архивных частей протокола live (сделки, вытесненные из RAM).
 */
(function (root) {
  "use strict";

  const DB_NAME = "multilogic-live-protocol-archive";
  const DB_VERSION = 1;
  const STORE = "chunks";
  let dbPromise = null;

  function requireIdb() {
    if (typeof indexedDB === "undefined") throw new Error("IndexedDB unavailable");
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    requireIdb();
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const st = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
          st.createIndex("sessionId", "sessionId", { unique: false });
          st.createIndex("tradingRunId", "tradingRunId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
      req.onblocked = () => reject(new Error("IndexedDB blocked"));
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
    return dbPromise;
  }

  function reqPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB request failed"));
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    });
  }

  /** @param {object} payload полный JSON протокола (archive: true). */
  async function putChunk(payload) {
    const db = await openDb();
    const record = {
      sessionId: String(payload.sessionId || payload.session?.sessionId || ""),
      tradingRunId: String(payload.tradingRunId || payload.session?.tradingRunId || ""),
      archivePart: payload.archivePart ?? 0,
      archivedAt: payload.exportedAt || new Date().toISOString(),
      mode: payload.mode || "",
      brokerId: String(payload.session?.brokerId || payload.brokerId || ""),
      payload
    };
    const tx = db.transaction(STORE, "readwrite");
    const id = await reqPromise(tx.objectStore(STORE).add(record));
    await txDone(tx);
    return id;
  }

  async function listBySession(sessionId) {
    if (!sessionId) return [];
    const db = await openDb();
    const tx = db.transaction(STORE, "readonly");
    const rows = await reqPromise(tx.objectStore(STORE).index("sessionId").getAll(String(sessionId)));
    await txDone(tx);
    return rows.sort((a, b) => (a.archivePart || 0) - (b.archivePart || 0));
  }

  async function summarizeSession(sessionId) {
    const rows = await listBySession(sessionId);
    let trades = 0;
    for (const row of rows) trades += row.payload?.trades?.length || 0;
    return { chunks: rows.length, trades };
  }

  async function deleteBySession(sessionId) {
    const rows = await listBySession(sessionId);
    if (!rows.length) return 0;
    const db = await openDb();
    const tx = db.transaction(STORE, "readwrite");
    const st = tx.objectStore(STORE);
    for (const row of rows) st.delete(row.id);
    await txDone(tx);
    return rows.length;
  }

  /** Объединить сделки всех частей сессии (по tradeId). */
  async function mergeTradesForSession(sessionId) {
    const rows = await listBySession(sessionId);
    const byId = new Map();
    for (const row of rows) {
      for (const t of row.payload?.trades || []) {
        if (t?.tradeId) byId.set(String(t.tradeId), t);
      }
    }
    return [...byId.values()].sort(
      (a, b) => (Date.parse(a.when || 0) || 0) - (Date.parse(b.when || 0) || 0)
    );
  }

  /** Последний sandbox-checkpoint из архива (для справки). */
  async function latestSandboxCheckpoint(sessionId) {
    const rows = await listBySession(sessionId);
    for (let i = rows.length - 1; i >= 0; i--) {
      const cp = rows[i].payload?.sandboxCheckpoint;
      if (cp) return cp;
    }
    return null;
  }

  root.MultiLogicLiveProtocolArchive = {
    DB_NAME,
    putChunk,
    listBySession,
    summarizeSession,
    deleteBySession,
    mergeTradesForSession,
    latestSandboxCheckpoint
  };
})(typeof window !== "undefined" ? window : globalThis);
