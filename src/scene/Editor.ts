// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { loadModel } from '../assets/import';
import { getAssets } from '../assets/storage';
import type { AssetRecord } from '../assets/types';
import { History, snap } from './history';
import { faceSnapDelta } from './faceSnap';
import { applyGroupDelta, type GroupEntry } from './group';

export type Collision = 'none' | 'box' | 'convex' | 'mesh';
export type Mode = 'select' | 'translate' | 'rotate' | 'scale';
export type TextureSlot = 'map' | 'normalMap' | 'roughnessMap';
export interface Piece { id: string; asset: AssetRecord; root: THREE.Group; collision: Collision; textures?: Partial<Record<TextureSlot, string>> }
export interface PieceInfo { id: string; name: string; assetPath: string; position: number[]; rotation: number[]; scale: number[]; dimensions: number[]; color: string; metalness: number; roughness: number; emission: string; opacity: number; collision: Collision }
interface Transform { position: number[]; rotation: number[]; scale: number[] }
function transform(object: THREE.Object3D): Transform { return {position: object.position.toArray(), rotation: [object.rotation.x, object.rotation.y, object.rotation.z], scale: object.scale.toArray()}; }
function applyTransform(object: THREE.Object3D, value: Transform) { object.position.fromArray(value.position); object.rotation.set(value.rotation[0], value.rotation[1], value.rotation[2]); object.scale.fromArray(value.scale); object.updateMatrixWorld(true); }
export function materials(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const result: THREE.MeshStandardMaterial[] = [];
  root.traverse(object => { if (object instanceof THREE.Mesh) { const list = Array.isArray(object.material) ? object.material : [object.material]; for (const m of list) if (m instanceof THREE.MeshStandardMaterial) result.push(m); } });
  return result;
}
export function prepareMaterials(root: THREE.Object3D) {
  root.traverse(object => { if (object instanceof THREE.Mesh) {
    const convert = (m: THREE.Material) => {
      if (m instanceof THREE.MeshStandardMaterial) return m.clone();
      const basic = m as THREE.MeshBasicMaterial;
      return new THREE.MeshStandardMaterial({color: basic.color?.clone() ?? new THREE.Color(0xaaaaaa), map: basic.map ?? null, transparent: m.transparent, opacity: m.opacity, side: m.side});
    };
    object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
  }});
}
export class Editor {
  pieces: Piece[] = [];
  selected: Piece[] = [];
  mode: Mode = 'select';
  snapEnabled = true;
  snapStep = 0.25;
  angleStep = 15;
  readonly history: History;
  readonly controls: TransformControls;
  private startTransform: Transform | null = null;
  private multiPivot = new THREE.Group();
  private groupGesture: { entries: (GroupEntry & { piece: Piece; before: Transform })[]; inverse: THREE.Matrix4 } | null = null;
  private spacePressed = false;
  private numericDrag: { piece: Piece; before: Transform } | null = null;
  private raycaster = new THREE.Raycaster();
  private helpers: THREE.BoxHelper[] = [];
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private pointer = new THREE.Vector2();
  constructor(private scene: THREE.Scene, private camera: THREE.Camera, private canvas: HTMLCanvasElement, private update: () => void, private setOrbitEnabled: (enabled: boolean) => void, private reportError: (error: unknown) => void, private batchesChanged: () => void) {
    this.history = new History(() => { this.batchesChanged(); update(); });
    this.controls = new TransformControls(camera, canvas);
    scene.add(this.controls.getHelper(), this.multiPivot);
    this.controls.addEventListener('dragging-changed', event => setOrbitEnabled(!event.value));
    this.controls.addEventListener('mouseDown', () => {
      if (this.selected.length === 1) this.startTransform = transform(this.selected[0].root);
      else if (this.selected.length > 1) {
        this.multiPivot.updateWorldMatrix(true, false);
        this.groupGesture = {inverse:this.multiPivot.matrixWorld.clone().invert(),entries:this.selected.map(piece => { piece.root.updateWorldMatrix(true,false); return {piece,root:piece.root,before:transform(piece.root),world:piece.root.matrixWorld.clone()}; })};
      }
    });
    this.controls.addEventListener('mouseUp', () => {
      const group = this.groupGesture; this.groupGesture = null;
      if (group) {
        if (this.mode === 'translate' && this.snapEnabled) {
          const box = new THREE.Box3(); for (const entry of group.entries) box.union(new THREE.Box3().setFromObject(entry.root));
          const selected = new Set(group.entries.map(entry => entry.piece));
          const delta = faceSnapDelta(box, this.pieces.filter(p => !selected.has(p)).map(p => new THREE.Box3().setFromObject(p.root)), Math.min(this.snapStep / 2, 0.15));
          for (const entry of group.entries) entry.root.position.add(delta);
        }
        const after = group.entries.map(entry => transform(entry.root));
        if (group.entries.some((entry,i) => JSON.stringify(entry.before) !== JSON.stringify(after[i]))) this.history.record({undo:()=>{ group.entries.forEach(entry=>applyTransform(entry.root,entry.before)); this.attach(); },redo:()=>{ group.entries.forEach((entry,i)=>applyTransform(entry.root,after[i])); this.attach(); }});
        this.attach(); this.update(); return;
      }
      const piece = this.selected[0], before = this.startTransform;
      this.startTransform = null;
      if (!piece || !before) return;
      if (this.mode === 'translate' && this.snapEnabled) this.snapFaces(piece);
      const after = transform(piece.root);
      if (JSON.stringify(before) !== JSON.stringify(after)) this.history.record({ undo: () => applyTransform(piece.root, before), redo: () => applyTransform(piece.root, after) });
    });
    this.controls.addEventListener('objectChange', () => { if (this.groupGesture) { if (this.mode === 'scale') { const values = this.multiPivot.scale.toArray(); const factor = values.reduce((best,value) => Math.abs(value-1) > Math.abs(best-1) ? value : best, 1); this.multiPivot.scale.setScalar(factor); } this.multiPivot.updateWorldMatrix(true,false); applyGroupDelta(this.groupGesture.entries,this.groupGesture.inverse,this.multiPivot.matrixWorld); } this.update(); });
    this.configureSnap();
    window.addEventListener('keydown', this.spaceDown); window.addEventListener('keyup', this.spaceUp); window.addEventListener('blur', this.spaceReset);
    canvas.addEventListener('pointerdown', this.selectPointer);
    canvas.addEventListener('dragover', this.dragOver);
    canvas.addEventListener('drop', this.drop);
  }
  configureSnap() {
    this.controls.setTranslationSnap(this.snapEnabled ? this.snapStep : null);
    this.controls.setRotationSnap(this.snapEnabled ? THREE.MathUtils.degToRad(this.angleStep) : null);
  }
  setMode(mode: Mode) { this.mode = mode; if (mode !== 'select') this.controls.setMode(mode); this.attach(); this.update(); }
  setSnap(enabled: boolean) { this.snapEnabled = enabled; this.configureSnap(); this.update(); }
  private attach() {
    this.batchesChanged();
    if (this.selected.length === 1 && this.mode !== 'select') this.controls.attach(this.selected[0].root);
    else if (this.selected.length > 1 && this.mode !== 'select') {
      const bounds = new THREE.Box3(); for (const piece of this.selected) bounds.union(new THREE.Box3().setFromObject(piece.root));
      this.multiPivot.position.copy(bounds.getCenter(new THREE.Vector3())); this.multiPivot.rotation.set(0,0,0); this.multiPivot.scale.set(1,1,1); this.multiPivot.updateMatrixWorld(true); this.controls.attach(this.multiPivot);
    } else this.controls.detach();
    for (const helper of this.helpers) { this.scene.remove(helper); helper.geometry.dispose(); (helper.material as THREE.Material).dispose(); }
    this.helpers = this.selected.map(p => { const helper = new THREE.BoxHelper(p.root, 0x2ee6a6); this.scene.add(helper); return helper; });
  }
  updateVisuals() { for (const helper of this.helpers) helper.update(); }
  private snapFaces(piece: Piece) { const box = new THREE.Box3().setFromObject(piece.root); const neighbours = this.pieces.filter(p => p !== piece).map(p => new THREE.Box3().setFromObject(p.root)); piece.root.position.add(faceSnapDelta(box, neighbours, Math.min(this.snapStep / 2, 0.15))); }

  private setRay(event: MouseEvent | DragEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }
  private spaceDown = (event: KeyboardEvent) => { if (event.code === 'Space') this.spacePressed = true; };
  private spaceUp = (event: KeyboardEvent) => { if (event.code === 'Space') this.spacePressed = false; };
  private spaceReset = () => { this.spacePressed = false; };
  private selectPointer = (event: PointerEvent) => {
    if (event.button !== 0 || this.spacePressed || this.controls.dragging || this.controls.axis) return;
    this.setRay(event);
    const hit = this.raycaster.intersectObjects(this.pieces.map(p => p.root), true)[0];
    const piece = hit && this.pieces.find(p => { let o: THREE.Object3D | null = hit.object; while (o) { if (o === p.root) return true; o = o.parent; } return false; });
    if (event.shiftKey && piece) this.selected = this.selected.includes(piece) ? this.selected.filter(p => p !== piece) : [...this.selected, piece];
    else this.selected = piece ? [piece] : [];
    this.attach(); this.update();
  };
  private dragOver = (event: DragEvent) => { if (event.dataTransfer?.types.includes('application/x-naja-asset')) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy'; } };
  private drop = (event: DragEvent) => {
    const path = event.dataTransfer?.getData('application/x-naja-asset');
    if (!path) return;
    event.preventDefault(); event.stopPropagation(); this.setRay(event);
    const point = this.raycaster.ray.intersectPlane(this.plane, new THREE.Vector3());
    if (point) void this.addAsset(path, point).catch(this.reportError);
  };
  async addAsset(path: string, point = new THREE.Vector3()) {
    const asset = (await getAssets()).find(item => item.path === path);
    if (!asset) throw new Error(`Asset not found: ${path}`);
    const root = await loadModel(asset.path, asset.data); prepareMaterials(root);
    if (this.snapEnabled) point.set(snap(point.x, this.snapStep), snap(point.y, this.snapStep), snap(point.z, this.snapStep));
    root.position.copy(point);
    const piece: Piece = { id: crypto.randomUUID(), asset, root, collision: 'none' };
    if (this.snapEnabled) this.snapFaces(piece);
    this.history.execute({ redo: () => { this.pieces.push(piece); this.scene.add(root); this.selected = [piece]; this.attach(); }, undo: () => { this.pieces = this.pieces.filter(p => p !== piece); this.scene.remove(root); this.selected = []; this.attach(); } });
  }
  removeSelected() {
    const pieces = [...this.selected]; if (!pieces.length) return;
    this.history.execute({ redo: () => { for (const p of pieces) this.scene.remove(p.root); this.pieces = this.pieces.filter(p => !pieces.includes(p)); this.selected = []; this.attach(); }, undo: () => { for (const p of pieces) { this.pieces.push(p); this.scene.add(p.root); } this.selected = pieces; this.attach(); } });
  }
  duplicateSelected() {
    const copies: Piece[] = this.selected.map(piece => {
      const root = piece.root.clone(true) as THREE.Group;
      root.traverse(object => { if (object.userData.najaInstanced) { object.visible = true; delete object.userData.najaInstanced; } });
      prepareMaterials(root); root.position.x += this.snapEnabled ? this.snapStep : 0.25;
      return { ...piece, id: crypto.randomUUID(), root, textures: {...piece.textures} };
    });
    if (!copies.length) return;
    this.history.execute({ redo: () => { for (const p of copies) { this.pieces.push(p); this.scene.add(p.root); } this.selected = copies; this.attach(); }, undo: () => { for (const p of copies) this.scene.remove(p.root); this.pieces = this.pieces.filter(p => !copies.includes(p)); this.selected = []; this.attach(); } });
  }
  selectedInfo(): PieceInfo | null {
    if (this.selected.length !== 1) return null;
    const p = this.selected[0], m = materials(p.root)[0], size = new THREE.Box3().setFromObject(p.root).getSize(new THREE.Vector3());
    return {id:p.id, name:p.root.name, assetPath:p.asset.path, position:p.root.position.toArray(), rotation:[p.root.rotation.x,p.root.rotation.y,p.root.rotation.z].map(THREE.MathUtils.radToDeg), scale:p.root.scale.toArray(), dimensions:size.toArray(), color:`#${m?.color.getHexString() ?? 'ffffff'}`, metalness:m?.metalness ?? 0, roughness:m?.roughness ?? 1, emission:`#${m?.emissive.getHexString() ?? '000000'}`, opacity:m?.opacity ?? 1, collision:p.collision};
  }
  beginNumericDrag() { const piece = this.selected.length === 1 ? this.selected[0] : undefined; this.numericDrag = piece ? {piece,before:transform(piece.root)} : null; }
  endNumericDrag() { const drag = this.numericDrag; this.numericDrag = null; if (!drag) return; const after = transform(drag.piece.root); if (JSON.stringify(drag.before) !== JSON.stringify(after)) this.history.record({undo:()=>applyTransform(drag.piece.root,drag.before),redo:()=>applyTransform(drag.piece.root,after)}); }
  setTransform(kind: 'position' | 'rotation' | 'scale' | 'dimensions', axis: number, value: number, locked = false, record = true) {
    const piece = this.selected[0]; if (!piece || !Number.isFinite(value)) return;
    const before = transform(piece.root), vector = kind === 'dimensions' ? 'scale' : kind;
    if (kind === 'dimensions') {
      const current = new THREE.Box3().setFromObject(piece.root).getSize(new THREE.Vector3()).getComponent(axis);
      if (current <= 0 || value <= 0) return;
      const previous = piece.root.scale.getComponent(axis);
      piece.root.scale.setComponent(axis, 0); piece.root.updateMatrixWorld(true);
      const base = new THREE.Box3().setFromObject(piece.root).getSize(new THREE.Vector3()).getComponent(axis);
      piece.root.scale.setComponent(axis, previous);
      const contribution = current - base;
      if (contribution <= 1e-9 || value < base) piece.root.scale.multiplyScalar(value / current);
      else piece.root.scale.setComponent(axis, previous * (value - base) / contribution);
    } else if (kind === 'rotation') { const angles = [piece.root.rotation.x, piece.root.rotation.y, piece.root.rotation.z]; angles[axis] = THREE.MathUtils.degToRad(value); piece.root.rotation.set(angles[0], angles[1], angles[2]); }
    else if (vector === 'position') piece.root.position.setComponent(axis, value);
    else if (vector === 'scale') {
      const old = piece.root.scale.getComponent(axis);
      if (locked && old !== 0) piece.root.scale.multiplyScalar(value / old); else piece.root.scale.setComponent(axis, value);
    }
    const after = transform(piece.root);
    if (record && JSON.stringify(before) !== JSON.stringify(after)) this.history.record({undo:()=>applyTransform(piece.root,before),redo:()=>applyTransform(piece.root,after)});
    else this.update();
  }
  setMaterial(field: 'color' | 'emission' | 'metalness' | 'roughness' | 'opacity', value: string | number) {
    const piece = this.selected[0]; if (!piece) return;
    const list = materials(piece.root);
    const old = list.map(m => field === 'color' ? m.color.getHexString() : field === 'emission' ? m.emissive.getHexString() : m[field]);
    const change = (m: THREE.MeshStandardMaterial, v: string | number) => {
      if (field === 'color') m.color.set(v); else if (field === 'emission') m.emissive.set(v); else { const n = Math.max(0,Math.min(1,Number(v))); m[field] = n; if (field === 'opacity') { m.transparent = n < 1; m.needsUpdate = true; } }
    };
    this.history.execute({redo:()=>list.forEach(m=>change(m,value)),undo:()=>list.forEach((m,i)=>change(m,typeof old[i] === 'string' ? `#${old[i]}` : old[i]))});
  }
  async setTexture(slot: TextureSlot, file: File, applyAll: boolean) {
    const selected = this.selected[0]; if (!selected) return;
    if (!file.type.startsWith('image/')) throw new Error('Unsupported image');
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
    const texture = await new THREE.TextureLoader().loadAsync(data); if (slot === 'map') texture.colorSpace = THREE.SRGBColorSpace;
    const targets = applyAll ? this.pieces.filter(p => p.asset.path === selected.asset.path) : [selected];
    const prior = targets.map(p => ({piece:p, data:p.textures?.[slot], maps:materials(p.root).map(m => m[slot])}));
    this.history.execute({redo:()=>{ for(const p of targets) { p.textures = {...p.textures,[slot]:data}; for (const m of materials(p.root)) { m[slot] = texture; m.needsUpdate = true; } } },undo:()=>{ for(const item of prior) { item.piece.textures = {...item.piece.textures}; if (item.data) item.piece.textures[slot] = item.data; else delete item.piece.textures[slot]; materials(item.piece.root).forEach((m,i)=>{m[slot]=item.maps[i];m.needsUpdate=true;}); } }});
  }
  setCollision(value: Collision) { const p = this.selected[0]; if (!p) return; const old = p.collision; this.history.execute({ redo:()=>{p.collision=value;}, undo:()=>{p.collision=old;} }); }
  replaceScene(pieces: Piece[], settings: {snapStep:number; angleStep:number; snapEnabled:boolean}) {
    for (const piece of this.pieces) this.scene.remove(piece.root);
    this.pieces = pieces; this.selected = []; this.attach();
    for (const piece of pieces) this.scene.add(piece.root);
    this.snapStep = settings.snapStep; this.angleStep = settings.angleStep; this.snapEnabled = settings.snapEnabled; this.configureSnap(); this.history.clear();
  }
  dispose() { this.selected = []; this.attach(); window.removeEventListener('keydown', this.spaceDown); window.removeEventListener('keyup', this.spaceUp); window.removeEventListener('blur', this.spaceReset); this.canvas.removeEventListener('pointerdown', this.selectPointer); this.canvas.removeEventListener('dragover', this.dragOver); this.canvas.removeEventListener('drop', this.drop); this.controls.dispose(); this.scene.remove(this.controls.getHelper(), this.multiPivot); }
}
