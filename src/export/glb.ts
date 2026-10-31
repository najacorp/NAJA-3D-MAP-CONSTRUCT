// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Piece } from '../scene/Editor';
export type ExportProfile = 'godot' | 'neutral';
export function exportScene(pieces: Piece[], profile: ExportProfile): THREE.Group {
  const scene = new THREE.Group(); scene.name = 'NAJA_Map';
  for (const piece of pieces) {
    const root = piece.root.clone(true) as THREE.Group;
    root.name = piece.root.name;
    root.traverse(object => { if (object.userData.najaInstanced) { object.visible = true; delete object.userData.najaInstanced; } });
    root.updateMatrixWorld(true);
    if (profile === 'godot' && piece.collision !== 'none') {
      const inverse = root.matrixWorld.clone().invert();
      if (piece.collision === 'box') {
        const box = new THREE.Box3();
        root.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.computeBoundingBox(); if (object.geometry.boundingBox) box.union(object.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld))); } });
        if (!box.isEmpty()) { const size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3()); size.max(new THREE.Vector3(0.001, 0.001, 0.001)); const collider = new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),new THREE.MeshBasicMaterial()); collider.position.copy(center); collider.name=`${root.name}-convcolonly`; root.add(collider); }
      } else {
        const collisions: THREE.Mesh[] = [];
        root.traverse(object => { if (object instanceof THREE.Mesh) { const mesh = new THREE.Mesh(object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld)), new THREE.MeshBasicMaterial()); mesh.name=`${object.name || root.name}${piece.collision === 'convex' ? '-convcolonly' : '-colonly'}`; collisions.push(mesh); } });
        root.add(...collisions);
      }
    }
    scene.add(root);
  }
  return scene;
}
export function countTriangles(pieces: Piece[]): number { let count=0; for (const p of pieces) p.root.traverse(o=>{if(o instanceof THREE.Mesh){ const geometry=o.geometry; count += (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3; }}); return Math.floor(count); }
export async function exportGlb(pieces: Piece[], profile: ExportProfile): Promise<ArrayBuffer> { return await new GLTFExporter().parseAsync(exportScene(pieces, profile), {binary:true, onlyVisible:true}) as ArrayBuffer; }
