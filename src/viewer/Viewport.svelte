<!-- SPDX-License-Identifier: GPL-3.0-only -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Minus, Maximize2 } from 'lucide-svelte';
  import { Viewer } from './Viewer';
  import type { Editor } from '../scene/Editor';
  import { joystickVector } from './navigation';
  export let t: (key: string) => string;
  export let onEditor: (editor: Editor) => void;
  export let onChange: () => void;
  export let onError: (error: unknown) => void;
  export let reportStatus: (fps: number, renderer: 'CPU' | 'GPU' | 'unknown') => void;
  let host: HTMLDivElement;
  let viewer: Viewer | undefined;
  let error = false;
  let joystick: HTMLDivElement;
  let stickX = 0, stickY = 0, activePointer: number | null = null;
  onMount(() => {
    try { viewer = new Viewer(host, ({ fps, renderer }) => reportStatus(fps, renderer), onChange, onError); onEditor(viewer.editor); }
    catch { error = true; }
    return () => viewer?.dispose();
  });
  function move(event: PointerEvent) {
    if (activePointer !== event.pointerId) return;
    const rect = joystick.getBoundingClientRect();
    const value = joystickVector(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, 38);
    stickX = value.x; stickY = value.y; viewer?.setJoystick(stickX, stickY);
  }
  function start(event: PointerEvent) { if (activePointer !== null) return; activePointer = event.pointerId; joystick.setPointerCapture(event.pointerId); move(event); }
  function end(event: PointerEvent) { if (activePointer !== event.pointerId) return; activePointer = null; stickX = 0; stickY = 0; viewer?.setJoystick(0, 0); }
</script>
<div class="viewer-canvas" bind:this={host}></div>
{#if error}<div class="viewer-error" role="alert">{t('webglError')}</div>{/if}
<div class="navigation-hint">{t('navigationHint')}</div>
<div class="joystick" bind:this={joystick} role="application" aria-label={t('joystick')} onpointerdown={start} onpointermove={move} onpointerup={end} onpointercancel={end} onlostpointercapture={end}>
  <span class="joystick-axis horizontal"></span><span class="joystick-axis vertical"></span><span class="stick" style:transform={`translate(${stickX * 38}px, ${stickY * 38}px)`}></span>
</div>
<div class="view-actions"><button onclick={() => viewer?.zoom(0.8)} aria-label={t('zoomIn')} title={t('zoomIn')}><Plus size={17}/></button><button onclick={() => viewer?.zoom(1.25)} aria-label={t('zoomOut')} title={t('zoomOut')}><Minus size={17}/></button><button onclick={() => viewer?.frameAll()} aria-label={t('frameAll')} title={t('frameAll')}><Maximize2 size={16}/></button></div>
