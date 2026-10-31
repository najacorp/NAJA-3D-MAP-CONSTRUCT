// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
export interface GroupEntry { root: THREE.Object3D; world: THREE.Matrix4 }
/** Apply the pivot's world-space change to every original world transform. */
export function applyGroupDelta(entries: GroupEntry[], inverseStart: THREE.Matrix4, pivotWorld: THREE.Matrix4) {
  const delta = pivotWorld.clone().multiply(inverseStart);
  for (const entry of entries) {
    const world = delta.clone().multiply(entry.world);
    const local = entry.root.parent ? entry.root.parent.matrixWorld.clone().invert().multiply(world) : world;
    local.decompose(entry.root.position, entry.root.quaternion, entry.root.scale);
    entry.root.updateMatrixWorld(true);
  }
}
