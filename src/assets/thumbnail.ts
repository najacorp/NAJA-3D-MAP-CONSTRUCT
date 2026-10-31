// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
/** One offscreen renderer reused for every asset in the batch. */
export class ThumbnailRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100000);
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(96, 96);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x465661, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 6, 5); this.scene.add(light);
  }
  render(model: THREE.Object3D): string {
    this.scene.add(model);
    try {
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() / 2, 0.001);
      this.camera.near = Math.max(radius / 1000, 0.00001); this.camera.far = radius * 100 + 1;
      this.camera.position.copy(center).add(new THREE.Vector3(1, 0.8, 1).normalize().multiplyScalar(radius * 4));
      this.camera.lookAt(center); this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL('image/png');
    } finally { this.scene.remove(model); }
  }
  dispose() { this.renderer.dispose(); }
}
