// SPDX-License-Identifier: GPL-3.0-only
import { Box3, Vector3 } from 'three';
/** Find the smallest correction that brings overlapping faces into contact. */
export function faceSnapDelta(box: Box3, neighbours: Box3[], threshold: number): Vector3 {
  let best = threshold + Number.EPSILON, axis = -1, adjustment = 0;
  for (const other of neighbours) for (let i=0; i<3; i++) {
    const j=(i+1)%3, k=(i+2)%3;
    if (box.max.getComponent(j) < other.min.getComponent(j) || box.min.getComponent(j) > other.max.getComponent(j) || box.max.getComponent(k) < other.min.getComponent(k) || box.min.getComponent(k) > other.max.getComponent(k)) continue;
    for (const delta of [other.min.getComponent(i)-box.max.getComponent(i), other.max.getComponent(i)-box.min.getComponent(i)]) {
      if (Math.abs(delta) < best) { best = Math.abs(delta); axis=i; adjustment=delta; }
    }
  }
  const result = new Vector3(); if (axis >= 0) result.setComponent(axis, adjustment); return result;
}
