// Storage with a "leave no trace" mode. In no-trace mode (default) progress lives in
// sessionStorage only; "Save on this device" uses localStorage. endSession() wipes
// everything this app could have written.
import type { Progress } from './resume';

export interface Settings { largeText: 0 | 1 | 2; contrast: boolean; plain: boolean; saveOnDevice: boolean }
export const defaultSettings = (): Settings => ({ largeText: 0, contrast: false, plain: false, saveOnDevice: false });

const KEY = 'sharesafe:v1';
interface Saved { settings: Settings; progress: Progress | null }

export function load(): Saved | null {
  for (const store of [safe(() => localStorage), safe(() => sessionStorage)]) {
    const raw = store && safe(() => store.getItem(KEY));
    if (raw) { try { return JSON.parse(raw) as Saved; } catch { /* ignore corrupt */ } }
  }
  return null;
}

export function save(settings: Settings, progress: Progress | null) {
  const data = JSON.stringify({ settings, progress });
  const ls = safe(() => localStorage), ss = safe(() => sessionStorage);
  if (settings.saveOnDevice) { safe(() => ls?.setItem(KEY, data)); safe(() => ss?.removeItem(KEY)); }
  else { safe(() => ss?.setItem(KEY, data)); safe(() => ls?.removeItem(KEY)); }
}

export interface WipeReport { storage: boolean; indexedDB: number; caches: number; serviceWorkers: number }

/** Wipe session/local storage, any IndexedDB databases, and (optionally) the offline copy. */
export async function endSession(removeOfflineCopy: boolean): Promise<WipeReport> {
  const report: WipeReport = { storage: true, indexedDB: 0, caches: 0, serviceWorkers: 0 };
  safe(() => localStorage.clear());
  safe(() => sessionStorage.clear());
  const idb = safe(() => indexedDB) as (IDBFactory & { databases?: () => Promise<{ name?: string }[]> }) | undefined;
  if (idb?.databases) {
    const dbs = await idb.databases().catch(() => []);
    for (const db of dbs) if (db.name) { idb.deleteDatabase(db.name); report.indexedDB++; }
  }
  if (removeOfflineCopy) {
    if ('caches' in self) {
      for (const k of await caches.keys()) { await caches.delete(k); report.caches++; }
    }
    if (navigator.serviceWorker?.getRegistrations) {
      for (const r of await navigator.serviceWorker.getRegistrations()) { await r.unregister(); report.serviceWorkers++; }
    }
  }
  return report;
}

function safe<T>(f: () => T): T | undefined { try { return f(); } catch { return undefined; } }
