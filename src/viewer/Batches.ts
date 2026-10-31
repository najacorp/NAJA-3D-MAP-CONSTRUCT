// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
import type { Piece } from '../scene/Editor';
interface Batch { mesh: THREE.InstancedMesh; sources: THREE.Mesh[] }
/** Batch identical static opaque meshes while preserving source objects for selection and export. */
export class Batches {
  private batches: Batch[] = [];
  private hidden: THREE.Mesh[] = [];
  constructor(private scene: THREE.Scene) {}
  clear() {
    for (const source of this.hidden) { source.visible = true; delete source.userData.najaInstanced; }
    this.hidden = [];
    for (const batch of this.batches) { this.scene.remove(batch.mesh); batch.mesh.dispose(); }
    this.batches = [];
  }
  rebuild(pieces: Piece[], selected: Piece[]) {
    this.clear();
    const groups = new Map<string, THREE.Mesh[]>();
    for (const piece of pieces) {
      if (selected.includes(piece)) continue;
      piece.root.updateWorldMatrix(true,true);
      piece.root.traverse(object => {
        if (!(object instanceof THREE.Mesh) || object instanceof THREE.SkinnedMesh || object instanceof THREE.InstancedMesh || object.morphTargetInfluences || Array.isArray(object.material) || object.material.transparent || object.matrixWorld.determinant() <= 0) return;
        let node: THREE.Object3D | null = object; while (node && node !== piece.root.parent) { if (!node.visible) return; node = node.parent; }
        try {
          const material = object.material.toJSON() as Record<string, unknown>; delete material.uuid;
          const key = `${object.geometry.uuid}:${JSON.stringify(material)}`;
          const group = groups.get(key) ?? []; group.push(object); groups.set(key, group);
        } catch { /* Keep unsupported materials on their original meshes. */ }
      });
    }
    for (const sources of groups.values()) {
      if (sources.length < 2) continue;
      const first = sources[0];
      const batch = new THREE.InstancedMesh(first.geometry, first.material as THREE.Material, sources.length);
      batch.frustumCulled = false;
      sources.forEach((source,index) => { batch.setMatrixAt(index,source.matrixWorld); source.visible=false; source.userData.najaInstanced=true; this.hidden.push(source); });
      batch.instanceMatrix.needsUpdate = true; this.scene.add(batch); this.batches.push({mesh:batch,sources});
    }
  }
}
