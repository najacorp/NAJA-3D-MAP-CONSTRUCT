// SPDX-License-Identifier: GPL-3.0-only
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { History, snap } from '../src/scene/history';
import { faceSnapDelta } from '../src/scene/faceSnap';
import { loadModel } from '../src/assets/import';
import { Editor, prepareMaterials, type Piece } from '../src/scene/Editor';
import { serializeProject, parseProject } from '../src/export/project';
import { exportScene, exportGlb, countTriangles } from '../src/export/glb';
import { Batches } from '../src/viewer/Batches';
const obj = new TextEncoder().encode('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n').buffer;
async function piece(): Promise<Piece> { const root = await loadModel('test.obj',obj); prepareMaterials(root); return {id:'test',asset:{path:'test.obj',name:'test.obj',size:obj.byteLength,modified:0,data:obj,thumbnail:null},root,collision:'box'}; }
describe('scene editing', () => {
  it('replays fifty commands and clears the redo branch after a new command', () => {
    let value=0; const history = new History(()=>{});
    for(let i=0;i<50;i++) history.execute({redo:()=>value++,undo:()=>value--});
    for(let i=0;i<50;i++) history.undo(); expect(value).toBe(0);
    for(let i=0;i<50;i++) history.redo(); expect(value).toBe(50);
    history.undo(); history.execute({redo:()=>value+=10,undo:()=>value-=10}); history.redo(); expect(value).toBe(59);
  });
  it('restores the scene after fifty transform commands', async () => {
    vi.stubGlobal('window',new EventTarget());
    const canvas = new EventTarget() as HTMLCanvasElement; Object.defineProperty(canvas,'style',{value:{touchAction:''}});
    const scene = new THREE.Scene(), editor = new Editor(scene,new THREE.PerspectiveCamera(),canvas,()=>{},()=>{},()=>{},()=>{});
    try {
      const p = await piece(); scene.add(p.root); editor.pieces=[p]; editor.selected=[p];
      const initial=JSON.stringify(p.root.position.toArray());
      for (let i=1;i<=50;i++) editor.setTransform('position',0,i);
      const final=JSON.stringify(p.root.position.toArray());
      for (let i=0;i<50;i++) editor.history.undo(); expect(JSON.stringify(p.root.position.toArray())).toBe(initial);
      for (let i=0;i<50;i++) editor.history.redo(); expect(JSON.stringify(p.root.position.toArray())).toBe(final);
    } finally { editor.dispose(); vi.unstubAllGlobals(); }
  });
  it('snaps grid values and puts overlapping faces in contact', () => {
    expect(snap(0.37,0.25)).toBe(0.25);
    const moving=new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(1,1,1));
    const neighbour=new THREE.Box3(new THREE.Vector3(1.08,0,0),new THREE.Vector3(2.08,1,1));
    expect(faceSnapDelta(moving,[neighbour],0.1).x).toBeCloseTo(0.08);
    expect(faceSnapDelta(moving,[neighbour],0.05).length()).toBe(0);
  });
  it('round trips embedded assets, transforms, materials and collision', async () => {
    const p=await piece(); p.root.position.set(2,3,4); p.root.rotation.y=0.7; p.root.scale.set(2,3,4);
    const editor = {pieces:[p],snapStep:0.25,angleStep:15,snapEnabled:true} as Editor;
    const restored=await parseProject(serializeProject(editor));
    expect(restored.pieces[0].root.position.toArray()).toEqual([2,3,4]);
    expect(restored.pieces[0].root.scale.toArray()).toEqual([2,3,4]);
    expect(restored.pieces[0].root.rotation.y).toBeCloseTo(0.7);
    expect(restored.pieces[0].collision).toBe('box');
    await expect(parseProject('{"format":"naja"}')).rejects.toThrow();
  });
  it('keeps distinct asset versions with the same relative path', async () => {
    const first=await piece(); const second=await piece(); second.id='second';
    const different = new TextEncoder().encode('v 0 0 0\nv 2 0 0\nv 0 2 0\nf 1 2 3\n').buffer;
    second.asset={...second.asset,data:different}; second.root=await loadModel('test.obj',different); prepareMaterials(second.root);
    const result=await parseProject(serializeProject({pieces:[first,second],snapStep:0.25,angleStep:15,snapEnabled:true} as Editor));
    expect(new THREE.Box3().setFromObject(result.pieces[0].root).getSize(new THREE.Vector3()).x).toBe(1);
    expect(new THREE.Box3().setFromObject(result.pieces[1].root).getSize(new THREE.Vector3()).x).toBe(2);
  });
  it('exports a valid binary glTF with the Godot collision suffix', async () => {
    class Reader { result: string | ArrayBuffer | null = null; onloadend: (() => void) | null = null; readAsArrayBuffer(blob: Blob) { void blob.arrayBuffer().then(value => { this.result=value; this.onloadend?.(); }); } readAsDataURL(blob: Blob) { void blob.arrayBuffer().then(value => { this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); } }
    vi.stubGlobal('FileReader',Reader);
    try { const data=await exportGlb([await piece()],'godot'); const view=new DataView(data); expect(view.getUint32(0,true)).toBe(0x46546c67); const json=new TextDecoder().decode(new Uint8Array(data,20,view.getUint32(12,true))); expect(json).toContain('-convcolonly'); }
    finally { vi.unstubAllGlobals(); }
  });
  it('batches identical pieces and preserves visible geometry in exports', async () => {
    const first=await piece(), second={...first,id:'second',root:first.root.clone(true) as THREE.Group};
    prepareMaterials(second.root);
    const scene=new THREE.Scene(); scene.add(first.root,second.root);
    const batches=new Batches(scene); batches.rebuild([first,second],[]);
    expect(scene.children.filter(o => o instanceof THREE.InstancedMesh)).toHaveLength(1);
    const source=first.root.getObjectByProperty('type','Mesh')!;
    expect(source.visible).toBe(false);
    const exported=exportScene([first,second],'neutral');
    expect(exported.children[0].getObjectByProperty('type','Mesh')?.visible).toBe(true);
    batches.clear(); expect(source.visible).toBe(true);
  });
  it('keeps selected or transparent pieces as ordinary meshes', async () => {
    const first=await piece(), second={...first,id:'second',root:first.root.clone(true) as THREE.Group};
    prepareMaterials(second.root); const scene=new THREE.Scene(); scene.add(first.root,second.root);
    const batches=new Batches(scene); batches.rebuild([first,second],[first]);
    expect(scene.children.filter(o => o instanceof THREE.InstancedMesh)).toHaveLength(0);
    const mesh=first.root.getObjectByProperty('type','Mesh') as THREE.Mesh;
    (mesh.material as THREE.Material).transparent=true;
    batches.rebuild([first,second],[]);
    expect(scene.children.filter(o => o instanceof THREE.InstancedMesh)).toHaveLength(0);
    expect(mesh.visible).toBe(true); batches.clear();
  });
  it('moves multiple selected pieces as one undoable gizmo action', async () => {
    vi.stubGlobal('window',new EventTarget());
    const canvas = new EventTarget() as HTMLCanvasElement; Object.defineProperty(canvas,'style',{value:{touchAction:''}});
    const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera();
    const editor=new Editor(scene,camera,canvas,()=>{},()=>{},()=>{},()=>{});
    try {
      const first=await piece(), second=await piece(); second.id='second'; second.root.position.x=2;
      scene.add(first.root,second.root); editor.pieces=[first,second]; editor.selected=[first,second]; editor.setMode('translate');
      editor.controls.dispatchEvent({type:'mouseDown',mode:'translate'});
      const pivot=editor.controls.object!; pivot.position.x+=3; editor.controls.dispatchEvent({type:'objectChange'});
      editor.controls.dispatchEvent({type:'mouseUp',mode:'translate'});
      expect(first.root.position.x).toBeCloseTo(3); expect(second.root.position.x).toBeCloseTo(5);
      editor.history.undo(); expect(first.root.position.x).toBeCloseTo(0); expect(second.root.position.x).toBeCloseTo(2);
      editor.history.redo(); expect(first.root.position.x).toBeCloseTo(3); expect(second.root.position.x).toBeCloseTo(5);
      editor.history.undo(); editor.setMode('rotate'); editor.controls.dispatchEvent({type:'mouseDown',mode:'rotate'});
      editor.controls.object!.rotation.y=Math.PI/2; editor.controls.dispatchEvent({type:'objectChange'}); editor.controls.dispatchEvent({type:'mouseUp',mode:'rotate'});
      expect(first.root.position.x).toBeCloseTo(1); expect(first.root.position.z).toBeCloseTo(1); expect(second.root.position.z).toBeCloseTo(-1);
      editor.history.undo(); editor.setMode('scale'); editor.controls.dispatchEvent({type:'mouseDown',mode:'scale'});
      editor.controls.object!.scale.set(2,1,1); editor.controls.dispatchEvent({type:'objectChange'}); editor.controls.dispatchEvent({type:'mouseUp',mode:'scale'});
      expect(first.root.position.x).toBeCloseTo(-1); expect(second.root.position.x).toBeCloseTo(3); expect(first.root.scale.x).toBeCloseTo(2); expect(first.root.scale.y).toBeCloseTo(2);
      editor.history.undo(); expect(first.root.position.x).toBeCloseTo(0); expect(second.root.scale.x).toBeCloseTo(1);
    } finally { editor.dispose(); vi.unstubAllGlobals(); }
  });
  it('adds Godot collision geometry only to the Godot profile', async () => {
    const p=await piece(); const godot=exportScene([p],'godot'); const neutral=exportScene([p],'neutral');
    expect(countTriangles([p])).toBe(1);
    expect(godot.getObjectByName('test.obj-convcolonly')).toBeDefined();
    expect(neutral.getObjectByName('test.obj-convcolonly')).toBeUndefined();
  });
});
