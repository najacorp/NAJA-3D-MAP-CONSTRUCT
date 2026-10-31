// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { ImportFile } from './types';

/** Preserve paths from folders selected with the native directory picker. */
export function filesFromList(files: FileList | File[]): ImportFile[] {
  return Array.from(files, file => ({ file, path: file.webkitRelativePath || file.name }));
}
async function entryFiles(entry: FileSystemEntry, parent = ''): Promise<ImportFile[]> {
  const path = parent ? `${parent}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    return [{ file, path }];
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    children.push(...batch);
  }
  const nested = await Promise.all(children.map(child => entryFiles(child, path)));
  return nested.flat();
}
export async function filesFromDrop(data: DataTransfer): Promise<ImportFile[]> {
  const entries = Array.from(data.items, item => item.webkitGetAsEntry?.()).filter((entry): entry is FileSystemEntry => !!entry);
  if (!entries.length) return filesFromList(data.files);
  return (await Promise.all(entries.map(entry => entryFiles(entry)))).flat();
}
export async function loadModel(path: string, data: ArrayBuffer): Promise<THREE.Group> {
  let model: THREE.Object3D;
  if (/\.glb$/i.test(path)) {
    // GLB resources must be embedded; reject external URLs rather than fetching arbitrary paths.
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => { if (!url.startsWith('blob:') && !url.startsWith('data:')) throw new Error('External GLB resources are not supported'); return url; });
    model = (await new GLTFLoader(manager).parseAsync(data, '')).scene;
  } else if (/\.obj$/i.test(path)) {
    model = new OBJLoader().parse(new TextDecoder().decode(data));
  } else throw new Error('Unsupported file type');
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty() || !Number.isFinite(bounds.min.x) || !Number.isFinite(bounds.max.x)) throw new Error('Model has no valid geometry');
  const center = bounds.getCenter(new THREE.Vector3());
  const wrapper = new THREE.Group();
  model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
  wrapper.add(model);
  wrapper.name = path.split('/').pop() || path;
  return wrapper;
}
export function disposeModel(model: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  model.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
    material.dispose();
  }
}
