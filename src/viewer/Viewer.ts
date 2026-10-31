// SPDX-License-Identifier: GPL-3.0-only
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { rendererKind } from './navigation';
import { Editor } from '../scene/Editor';
import { Batches } from './Batches';

type ViewerStatus = { fps: number; renderer: 'CPU' | 'GPU' | 'unknown' };
export class Viewer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private observer: ResizeObserver;
  private frame = 0;
  private lastTime = performance.now();
  private fpsTime = this.lastTime;
  private frames = 0;
  private keys = new Set<string>();
  private stick = { x: 0, y: 0 };
  private rendererType: ViewerStatus['renderer'];
  private status: (status: ViewerStatus) => void;
  private grid: THREE.GridHelper;
  readonly editor: Editor;
  private batches: Batches;
  private batchesDirty = true;

  constructor(private host: HTMLElement, status: (status: ViewerStatus) => void, update: () => void, reportError: (error: unknown) => void) {
    this.status = status;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    this.rendererType = rendererKind(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) as string : null);
    this.renderer.setPixelRatio(this.rendererType === 'CPU' ? 1 : Math.min(window.devicePixelRatio, 2));
    this.host.appendChild(this.renderer.domElement);
    this.camera.position.set(9, 8, 11);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.screenSpacePanning = false;
    this.controls.mouseButtons = { LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 150;
    this.grid = new THREE.GridHelper(100, 100, 0x2e3d49, 0x1f2a33);
    this.scene.add(this.grid);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x52606a, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(5, 10, 6); this.scene.add(light);
    this.batches = new Batches(this.scene);
    this.editor = new Editor(this.scene, this.camera, this.renderer.domElement, update, enabled => { this.controls.enabled = enabled; }, reportError, () => { this.batchesDirty = true; });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.resetInput);
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }
  private resize = () => {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
  private keyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN; }
    if (event.code === 'KeyF' && !event.repeat) this.frameAll();
    if (event.code === 'KeyW' && this.editor.selected.length) return;
    this.keys.add(event.code);
  };
  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (event.code === 'Space') this.controls.mouseButtons.LEFT = undefined;
  };
  private resetInput = () => { this.keys.clear(); this.controls.mouseButtons.LEFT = undefined; this.stick = { x: 0, y: 0 }; };
  setJoystick(x: number, y: number) { this.stick = { x, y }; }
  zoom(factor: number) {
    const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);
    offset.clampLength(this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }
  frameAll() {
    const selected = this.editor.selected.length ? this.editor.selected : this.editor.pieces;
    if (!selected.length) { this.controls.target.set(0, 0, 0); this.camera.position.set(9, 8, 11); }
    else { const box = new THREE.Box3(); for (const p of selected) box.union(new THREE.Box3().setFromObject(p.root)); const center = box.getCenter(new THREE.Vector3()), radius = Math.max(box.getSize(new THREE.Vector3()).length(), 1); this.controls.target.copy(center); this.camera.position.copy(center).add(new THREE.Vector3(1, 0.8, 1).normalize().multiplyScalar(radius * 1.6)); }
    this.controls.update();
  }
  private animate = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05); this.lastTime = time;
    const x = this.stick.x + Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
    const y = this.stick.y + Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW'));
    if (x || y) {
      const forward = new THREE.Vector3(); this.camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
      const movement = right.multiplyScalar(x).addScaledVector(forward, -y).clampLength(0, 1).multiplyScalar(8 * dt);
      this.camera.position.add(movement); this.controls.target.add(movement);
    }
    this.controls.update();
    if (this.batchesDirty) { this.batches.rebuild(this.editor.pieces, this.editor.selected); this.batchesDirty = false; }
    this.editor.updateVisuals(); this.renderer.render(this.scene, this.camera);
    this.frames++;
    if (time - this.fpsTime >= 1000) { this.status({ fps: Math.round(this.frames * 1000 / (time - this.fpsTime)), renderer: this.rendererType }); this.frames = 0; this.fpsTime = time; }
    this.frame = requestAnimationFrame(this.animate);
  };
  dispose() {
    cancelAnimationFrame(this.frame); this.observer.disconnect(); this.batches.clear(); this.editor.dispose(); this.controls.dispose();
    window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp); window.removeEventListener('blur', this.resetInput);
    this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
