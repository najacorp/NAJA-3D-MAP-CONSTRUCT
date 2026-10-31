// SPDX-License-Identifier: GPL-3.0-only
export interface AssetRecord {
  path: string;
  name: string;
  size: number;
  modified: number;
  data: ArrayBuffer;
  thumbnail: string | null;
}
export interface ImportFile { file: File; path: string }
export interface ImportError { path: string; message: string }
export function isModelFile(path: string): boolean { return /\.(glb|obj)$/i.test(path); }
export function folderOf(path: string): string { return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''; }
export function filterAssets(assets: AssetRecord[], query: string, folder: string): AssetRecord[] {
  const search = query.trim().toLocaleLowerCase();
  return assets.filter(asset => (!folder || asset.path.startsWith(`${folder}/`)) && asset.path.toLocaleLowerCase().includes(search));
}
