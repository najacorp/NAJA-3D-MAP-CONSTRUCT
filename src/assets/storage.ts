// SPDX-License-Identifier: GPL-3.0-only
import type { AssetRecord } from './types';
const DB_NAME = 'naja-assets-v1';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets', { keyPath: 'path' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database is blocked'));
  });
}
export async function getAssets(): Promise<AssetRecord[]> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('assets').objectStore('assets').getAll();
      request.onsuccess = () => resolve(request.result as AssetRecord[]);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function saveAsset(asset: AssetRecord): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('assets', 'readwrite');
      tx.objectStore('assets').put(asset);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
    });
  } finally { db.close(); }
}
