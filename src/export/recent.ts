// SPDX-License-Identifier: GPL-3.0-only
export interface RecentProject { id: string; name: string; text: string; savedAt: number }
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('naja-projects-v1',1);
    request.onupgradeneeded = () => request.result.createObjectStore('recent',{keyPath:'id'});
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); request.onblocked = () => reject(new Error('Database blocked'));
  });
}
export async function recentProjects(): Promise<RecentProject[]> {
  const db = await database();
  try { return await new Promise((resolve,reject) => { const request = db.transaction('recent').objectStore('recent').getAll(); request.onsuccess = () => resolve((request.result as RecentProject[]).sort((a,b)=>b.savedAt-a.savedAt)); request.onerror=()=>reject(request.error); }); } finally { db.close(); }
}
export async function rememberProject(name: string, text: string): Promise<RecentProject[]> {
  const existing = await recentProjects();
  const entry: RecentProject = {id:name,name,text,savedAt:Date.now()};
  const db = await database();
  try { await new Promise<void>((resolve,reject) => { const tx=db.transaction('recent','readwrite'), store=tx.objectStore('recent'); store.put(entry); for (const old of existing.filter(p=>p.id!==name).slice(4)) store.delete(old.id); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error); }); } finally { db.close(); }
  return recentProjects();
}
