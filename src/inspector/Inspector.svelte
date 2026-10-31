<!-- SPDX-License-Identifier: GPL-3.0-only -->
<script lang="ts">
 import { Crosshair } from 'lucide-svelte';
 import type { Editor, PieceInfo, Collision, TextureSlot } from '../scene/Editor';
 export let t: (key: string) => string;
 export let editor: Editor | undefined;
 export let info: PieceInfo | null;
 let locked = false;
 type TransformKind = 'position'|'rotation'|'scale'|'dimensions';
 let drag: { pointer: number; kind: TransformKind; axis: number; x: number; value: number } | null = null;
 function startDrag(event: PointerEvent, kind: TransformKind, axis: number) { if (!editor || !info || event.button !== 0) return; event.preventDefault(); const target = event.currentTarget as HTMLElement; target.setPointerCapture(event.pointerId); drag = {pointer:event.pointerId,kind,axis,x:event.clientX,value:info[kind][axis]}; editor.beginNumericDrag(); }
 function moveDrag(event: PointerEvent) { if (!drag || drag.pointer !== event.pointerId || !editor) return; const factor = event.shiftKey ? 0.1 : event.altKey ? 10 : 1; const step = drag.kind === 'rotation' ? 1 : 0.01; drag.value += (event.clientX - drag.x) * step * factor; drag.x = event.clientX; if (drag.kind === 'dimensions') drag.value = Math.max(0.001,drag.value); editor.setTransform(drag.kind,drag.axis,drag.value,locked,false); }
 function endDrag(event: PointerEvent) { if (!drag || drag.pointer !== event.pointerId) return; drag = null; editor?.endNumericDrag(); }

 let applyAll = false;
 let textureError = '';
 let textureMessage = '';
 let shownId = '';
 $: if ((info?.id ?? '') !== shownId) { shownId = info?.id ?? ''; textureError = ''; textureMessage = ''; }
 async function setTexture(event: Event, slot: TextureSlot) { const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file || !editor) return; try { await editor.setTexture(slot, file, applyAll); textureError = ''; textureMessage = t('textureLoaded'); } catch { textureMessage = ''; textureError = t('textureError'); } }
 const axes = ['X', 'Y', 'Z'];
 function numberChange(event: Event, kind: 'position'|'rotation'|'scale'|'dimensions', axis: number) { const value = Number((event.currentTarget as HTMLInputElement).value); editor?.setTransform(kind, axis, value, locked); }
 function material(event: Event, field: 'color'|'emission'|'metalness'|'roughness'|'opacity') { const input = event.currentTarget as HTMLInputElement; editor?.setMaterial(field, input.type === 'color' ? input.value : Number(input.value)); }
</script>
<div class="panel-head"><div><div class="section-kicker">02 / {t('properties')}</div><h2>{t('inspector')}</h2></div><span class="panel-indicator"></span></div>
{#if info}
<div class="inspector-fields">
 <div class="selected-name" title={info.assetPath}>{info.name}</div>
 {#each ['position','rotation','scale','dimensions'] as kind}
 <div class="field-title">{t(kind)} {#if kind === 'scale'}<label class="lock"><input type="checkbox" bind:checked={locked}/> {t('lockScale')}</label>{/if}</div>
 <div class="vector-row">{#each axes as axis, i}<label><button type="button" class="axis-drag" class:axis-x={i===0} class:axis-y={i===1} class:axis-z={i===2} title={t('dragValue')} aria-label={`${t('dragValue')} ${t(kind)} ${axis}`} onpointerdown={(event)=>startDrag(event,kind as TransformKind,i)} onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} onlostpointercapture={endDrag}>{axis}</button><input type="number" step={kind === 'rotation' ? 1 : 0.001} value={info[kind as 'position'|'rotation'|'scale'|'dimensions'][i].toFixed(3)} onchange={(event) => numberChange(event, kind as 'position'|'rotation'|'scale'|'dimensions', i)} aria-label={`${t(kind)} ${axis}`}/></label>{/each}</div>
 {/each}
 <div class="field-title">{t('material')}</div>
 <div class="material-grid"><label>{t('color')}<input type="color" value={info.color} onchange={(e)=>material(e,'color')}/></label><label>{t('emission')}<input type="color" value={info.emission} onchange={(e)=>material(e,'emission')}/></label>
 {#each ['metalness','roughness','opacity'] as field}<label>{t(field)}<input type="number" min="0" max="1" step="0.05" value={info[field as 'metalness'|'roughness'|'opacity']} onchange={(e)=>material(e,field as 'metalness'|'roughness'|'opacity')}/></label>{/each}</div>
 <div class="field-title">{t('textures')}</div><label class="texture-all"><input type="checkbox" bind:checked={applyAll}/> {t('applyAll')}</label>
 {#each [['map','textureColor'],['normalMap','textureNormal'],['roughnessMap','textureRoughness']] as slot}<label class="texture-label">{t(slot[1])}<input type="file" accept="image/*" onchange={(e)=>setTexture(e,slot[0] as TextureSlot)}/></label>{/each}
 {#if textureError}<div class="import-warning" role="alert">{textureError}</div>{/if}
 {#if textureMessage}<div class="texture-status" role="status">{textureMessage}</div>{/if}
 <label class="collision-label">{t('collision')}<select value={info.collision} onchange={(event)=>editor?.setCollision((event.currentTarget as HTMLSelectElement).value as Collision)}><option value="none">{t('collisionNone')}</option><option value="box">{t('collisionBox')}</option><option value="convex">{t('collisionConvex')}</option><option value="mesh">{t('collisionMesh')}</option></select></label>
</div>
{:else}<div class="empty inspector-empty"><div class="empty-icon subtle"><Crosshair size={22} strokeWidth={1.3}/></div><strong>{t('emptyInspector')}</strong><p>{t('emptyInspectorHint')}</p></div>{/if}
