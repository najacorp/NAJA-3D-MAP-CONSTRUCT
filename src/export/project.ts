// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
import { loadModel } from '../assets/import';
import { materials, prepareMaterials, type Collision, type Editor, type Piece, type TextureSlot } from '../scene/Editor';
import type { AssetRecord } from '../assets/types';
type MaterialData = { color: string; emission: string; metalness: number; roughness: number; opacity: number };
type ProjectPiece = { id: string; path: string; assetId: string; textures?: Partial<Record<TextureSlot, string>>; position: number[]; rotation: number[]; scale: number[]; collision: Collision; materials: MaterialData[] };
type ProjectAsset = { id: string; path: string; name: string; size: number; modified: number; data: string };
type Project = { format: 'naja'; version: 1; assets: ProjectAsset[]; pieces: ProjectPiece[]; settings: { snapStep: number; angleStep: number; snapEnabled: boolean } };
function encode(bytes: ArrayBuffer): string { const input = new Uint8Array(bytes); let result = ''; for (let i = 0; i < input.length; i += 32768) result += String.fromCharCode(...input.subarray(i, i + 32768)); return btoa(result); }
function decode(value: string): ArrayBuffer { const raw = atob(value); const bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); return bytes.buffer; }
export function serializeProject(editor: Editor): string {
  const assets = new Map<AssetRecord, ProjectAsset>();
  const pieces = editor.pieces.map(p => {
    if (!assets.has(p.asset)) assets.set(p.asset, {id:String(assets.size), path:p.asset.path, name:p.asset.name, size:p.asset.size, modified:p.asset.modified, data:encode(p.asset.data)});
    return {id:p.id, path:p.asset.path, assetId:assets.get(p.asset)!.id, textures:p.textures, position:p.root.position.toArray(), rotation:[p.root.rotation.x,p.root.rotation.y,p.root.rotation.z], scale:p.root.scale.toArray(), collision:p.collision,
      materials:materials(p.root).map(m => ({color:`#${m.color.getHexString()}`, emission:`#${m.emissive.getHexString()}`, metalness:m.metalness, roughness:m.roughness, opacity:m.opacity}))};
  });
  const project: Project = {format:'naja',version:1,assets:[...assets.values()],pieces,settings:{snapStep:editor.snapStep,angleStep:editor.angleStep,snapEnabled:editor.snapEnabled}};
  return JSON.stringify(project, null, 2);
}
function vector(value: unknown): value is number[] { return Array.isArray(value) && value.length === 3 && value.every(v => typeof v === 'number' && Number.isFinite(v)); }
export async function parseProject(text: string): Promise<{pieces: Piece[]; settings: Project['settings']}> {
  const data: Project = JSON.parse(text);
  if (!data || data.format !== 'naja' || data.version !== 1 || !Array.isArray(data.assets) || !Array.isArray(data.pieces) || !data.settings || !Number.isFinite(data.settings.snapStep) || data.settings.snapStep <= 0 || !Number.isFinite(data.settings.angleStep) || data.settings.angleStep <= 0 || typeof data.settings.snapEnabled !== 'boolean') throw new Error('Invalid NAJA project');
  const assets = new Map<string, AssetRecord>();
  for (const a of data.assets) {
    if (!a || typeof a.id !== 'string' || typeof a.path !== 'string' || !/\.(glb|obj)$/i.test(a.path) || typeof a.data !== 'string' || assets.has(a.id)) throw new Error('Invalid project asset');
    assets.set(a.id, {path:a.path,name:typeof a.name === 'string' ? a.name : a.path.split('/').pop()!,size:Number(a.size)||0,modified:Number(a.modified)||0,data:decode(a.data),thumbnail:null});
  }
  const pieces: Piece[] = []; const ids = new Set<string>();
  const prototypes = new Map<AssetRecord, THREE.Group>();
  for (const p of data.pieces) {
    const asset = assets.get(p.assetId);
    if (!asset || typeof p.id !== 'string' || ids.has(p.id) || !vector(p.position) || !vector(p.rotation) || !vector(p.scale) || !['none','box','convex','mesh'].includes(p.collision) || !Array.isArray(p.materials)) throw new Error('Invalid project piece');
    ids.add(p.id);
    let prototype = prototypes.get(asset);
    if (!prototype) { prototype = await loadModel(asset.path, asset.data); prototypes.set(asset, prototype); }
    const root = prototype.clone(true) as THREE.Group; prepareMaterials(root);
    root.position.fromArray(p.position); root.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]); root.scale.fromArray(p.scale);
    const list = materials(root);
    if (p.materials.length !== list.length) throw new Error('Invalid material count');
    p.materials.forEach((m, i) => {
      if (!/^#[0-9a-f]{6}$/i.test(m.color) || !/^#[0-9a-f]{6}$/i.test(m.emission) || ![m.metalness,m.roughness,m.opacity].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error('Invalid material');
      list[i].color.set(m.color); list[i].emissive.set(m.emission); list[i].metalness = m.metalness; list[i].roughness = m.roughness; list[i].opacity = m.opacity; list[i].transparent = m.opacity < 1;
    });
    if (p.textures) for (const [slot, data] of Object.entries(p.textures)) {
      if (!['map','normalMap','roughnessMap'].includes(slot) || typeof data !== 'string' || !data.startsWith('data:image/')) throw new Error('Invalid texture');
      const texture = await new THREE.TextureLoader().loadAsync(data); if (slot === 'map') texture.colorSpace = THREE.SRGBColorSpace;
      for (const m of list) { m[slot as TextureSlot] = texture; m.needsUpdate = true; }
    }
    pieces.push({id:p.id,asset,root,collision:p.collision,textures:p.textures});
  }
  return {pieces, settings:data.settings};
}
export function download(blob: Blob, name: string) { const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
