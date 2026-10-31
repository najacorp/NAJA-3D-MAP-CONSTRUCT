<!-- SPDX-License-Identifier: GPL-3.0-only -->
<script lang="ts">
  import { Box, MousePointer2, Move3d, Rotate3d, Scaling, Ruler, Magnet, Search, Plus, Sun, Moon, ChevronDown, Layers3, Crosshair, Sparkles, ArrowUpRight } from 'lucide-svelte';
  import i18n, { type Language } from '../i18n';
  import Viewport from '../viewer/Viewport.svelte';
  import Library from '../assets/Library.svelte';
  import { onMount } from 'svelte';
  import Inspector from '../inspector/Inspector.svelte';
  import type { Editor, Mode, PieceInfo } from '../scene/Editor';
  import { serializeProject, parseProject, download } from '../export/project';
  import { exportGlb, countTriangles, type ExportProfile } from '../export/glb';
  import { recentProjects, rememberProject, type RecentProject } from '../export/recent';
  let editor: Editor | undefined;
  let sceneVersion = 0;
  let dirty = false;
  let info: PieceInfo | null = null;
  let pieceCount = 0;
  let activeMode: Mode = 'select';
  let snapOn = true;
  let snapValue = 0.25;
  let angleValue = 15;
  let openInput: HTMLInputElement;
  let exportOpen = false;
  let profile: ExportProfile = 'godot';
  let exporting = false;
  let notice = '';
  let recent: RecentProject[] = [];
  let projectName = 'mapa.naja';
  function onChange() { sceneVersion++; dirty = true; }
  function onError(error: unknown) { notice = `${t('sceneError')}: ${error instanceof Error ? error.message : String(error)}`; }
  function beforeUnload(event: BeforeUnloadEvent) { if (dirty && editor) { event.preventDefault(); event.returnValue = ''; } }
  function onEditor(value: Editor) { editor = value; sceneVersion++; dirty = false; }
  $: { sceneVersion; info = editor?.selectedInfo() ?? null; pieceCount = editor?.pieces.length ?? 0; }
  function mode(value: Mode) { activeMode = value; editor?.setMode(value); }
  function setSnap() { snapOn = !snapOn; editor?.setSnap(snapOn); }
  function setAngleValue(event: Event) { const value = Number((event.currentTarget as HTMLInputElement).value); if (editor && value > 0 && Number.isFinite(value)) { editor.angleStep = value; angleValue = value; editor.configureSnap(); } }
  function setSnapValue(event: Event) { const value = Number((event.currentTarget as HTMLInputElement).value); if (editor && value > 0 && Number.isFinite(value)) { editor.snapStep = value; snapValue = value; editor.configureSnap(); } }
  function remember(name: string, text: string) { void rememberProject(name, text).then(items => { recent = items; }).catch(() => { notice = t('recentError'); }); }
  function save() { if (editor) { try { const text = serializeProject(editor); download(new Blob([text],{type:'application/json'}),projectName); remember(projectName, text); dirty = false; } catch (error) { notice = `${t('saveError')}: ${String(error)}`; } } }
  async function loadProject(name: string, text: string) { if (!editor) return; if ((dirty || editor.pieces.length) && !confirm(t('replaceConfirm'))) return; try { const project = await parseProject(text); editor.replaceScene(project.pieces, project.settings); snapOn = project.settings.snapEnabled; snapValue = project.settings.snapStep; angleValue = project.settings.angleStep; projectName = name; dirty = false; remember(name, text); } catch (e) { notice = `${t('openError')}: ${e instanceof Error ? e.message : String(e)}`; } }
  async function openProject(event: Event) { const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (file) { try { await loadProject(file.name, await file.text()); } catch (e) { notice = `${t('openError')}: ${String(e)}`; } } }
  function openRecent(event: Event) { const input = event.currentTarget as HTMLSelectElement; const entry = recent.find(p => p.id === input.value); input.value = ''; if (entry) void loadProject(entry.name, entry.text); }
  async function exportMap() { if (!editor || !editor.pieces.length) return; exporting = true; try { const glb = await exportGlb(editor.pieces,profile); download(new Blob([glb],{type:'model/gltf-binary'}),'mapa.glb'); notice = `${t('exported')} ${(glb.byteLength / 1024 / 1024).toFixed(2)} MB`; exportOpen = false; } catch(e) { notice = `${t('exportError')}: ${e instanceof Error ? e.message : String(e)}`; } finally { exporting = false; } }
  function shortcut(event: KeyboardEvent) { if (!editor || event.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return; const mod = event.ctrlKey || event.metaKey; if (mod && event.code === 'KeyZ') { event.preventDefault(); event.shiftKey ? editor.history.redo() : editor.history.undo(); } else if (mod && event.code === 'KeyY') { event.preventDefault(); editor.history.redo(); } else if (mod && event.code === 'KeyD') { event.preventDefault(); editor.duplicateSelected(); } else if (mod && event.code === 'KeyS') { event.preventDefault(); save(); } else if (event.code === 'Delete' || event.code === 'Backspace') { event.preventDefault(); editor.removeSelected(); } else if (!mod && editor.selected.length && ['KeyW','KeyE','KeyR'].includes(event.code)) { mode(event.code === 'KeyW' ? 'translate' : event.code === 'KeyE' ? 'rotate' : 'scale'); } }

  let fps = 0;
  let renderer: 'CPU' | 'GPU' | 'unknown' = 'unknown';
  let renderMode: 'auto' | 'gpu' | 'cpu' = 'auto';
  onMount(() => { void recentProjects().then(items => { recent = items; }).catch(() => {}); void window.naja?.getRenderMode().then(mode => { renderMode = mode; }); window.addEventListener('keydown', shortcut); window.addEventListener('beforeunload', beforeUnload); return () => { window.removeEventListener('keydown', shortcut); window.removeEventListener('beforeunload', beforeUnload); }; });
  function setRenderMode(event: Event) { const mode = (event.currentTarget as HTMLSelectElement).value as 'auto' | 'gpu' | 'cpu'; if (window.naja && mode !== renderMode) { if (dirty && !confirm(t('restartConfirm'))) { (event.currentTarget as HTMLSelectElement).value = renderMode; return; } void window.naja.setRenderMode(mode); } }
  function reportStatus(nextFps: number, nextRenderer: 'CPU' | 'GPU' | 'unknown') { fps = nextFps; renderer = nextRenderer; }
  let language: Language = i18n.language === 'pt-BR' ? 'pt-BR' : 'en';
  let theme: 'dark' | 'light' = 'dark';
  let revision = 0;
  let t = (key: string): string => i18n.t(key);
  $: { revision; t = (key: string): string => i18n.t(key); }
  function setLanguage(event: Event) {
    language = (event.currentTarget as HTMLSelectElement).value as Language;
    void i18n.changeLanguage(language).then(() => { revision++; document.documentElement.lang = language; });
  }
  function toggleTheme() { theme = theme === 'dark' ? 'light' : 'dark'; }
  const tools = [{ icon: MousePointer2, label: 'select' }, { icon: Move3d, label: 'move' }, { icon: Rotate3d, label: 'rotate' }, { icon: Scaling, label: 'scale' }, { icon: Ruler, label: 'measure' }, { icon: Magnet, label: 'snap' }];
</script>

<svelte:head><meta name="theme-color" content="#0b0e11" /></svelte:head>
<div class:light={theme === 'light'} class="shell">
  <header class="topbar">
    <div class="brand"><div class="brand-mark"><span>Ｎ</span></div><div><strong>NAJA</strong><small>MAP CONSTRUCT</small></div></div>
    <div class="top-divider"></div>
    <nav aria-label={t('workspaceLabel')}><button onclick={() => openInput.click()} disabled={!editor}>{t('open')}</button><button onclick={save} disabled={!editor}>{t('save')}</button><button onclick={() => editor?.history.undo()} disabled={!editor}>{t('undo')}</button><button onclick={() => editor?.history.redo()} disabled={!editor}>{t('redo')}</button></nav><label class="recent-select"><span class="sr-only">{t('recent')}</span><select onchange={openRecent} disabled={!editor || !recent.length} value=""><option value="">{t('recent')}</option>{#each recent as project}<option value={project.id}>{project.name}</option>{/each}</select></label><input class="directory-picker" type="file" accept=".naja,application/json" bind:this={openInput} onchange={openProject}/>
    <div class="top-spacer"></div>
    <div class="project-name"><span class="project-dot"></span>{t('project')}</div>
    <div class="top-spacer"></div>
    <label class="render-mode" title={window.naja ? t('renderMode') : t('modeBrowser')}><span class="sr-only">{t('renderMode')}</span><select value={renderMode} onchange={setRenderMode} disabled={!window.naja}><option value="auto">{t('auto')}</option><option value="gpu">{t('gpuMode')}</option><option value="cpu">{t('cpuMode')}</option></select><ChevronDown size={13}/></label>
    <label class="language"><span class="sr-only">{t('language')}</span><select value={language} onchange={setLanguage}><option value="pt-BR">PT-BR</option><option value="en">EN</option></select><ChevronDown size={13}/></label>
    <button class="icon-button theme-button" onclick={toggleTheme} aria-label={theme === 'dark' ? t('light') : t('dark')} title={theme === 'dark' ? t('light') : t('dark')}>{#if theme === 'dark'}<Sun size={17}/>{:else}<Moon size={17}/>{/if}</button>
    <button class="export" disabled={!pieceCount} onclick={() => { exportOpen = true; notice = ''; }}><ArrowUpRight size={16}/>{t('export')}</button>
  </header>
  <main class="main">
    <aside class="toolbar" aria-label={t('workspaceLabel')}>
      {#each tools as tool, index}
        {@const toolMode = index === 0 ? 'select' : index === 1 ? 'translate' : index === 2 ? 'rotate' : 'scale'}
        <button class:enabled={index !== 4} class:active={index < 4 ? activeMode === toolMode : index === 5 && snapOn} disabled={!editor || index === 4} onclick={() => index === 5 ? setSnap() : mode(toolMode)} title={t(tool.label)} aria-label={t(tool.label)}><tool.icon size={19} strokeWidth={1.75}/></button>{#if index === 3}<div class="tool-divider"></div>{/if}
      {/each}
      <button class="enabled" onclick={() => editor?.duplicateSelected()} disabled={!info} title={t('duplicate')} aria-label={t('duplicate')}>＋</button><button class="enabled" onclick={() => editor?.removeSelected()} disabled={!editor?.selected.length} title={t('delete')} aria-label={t('delete')}>×</button>
      <div class="tool-spacer"></div><div class="tool-index">01</div>
    </aside>
    <section class="viewport" aria-label={t('workspaceLabel')}>
      <div class="viewport-top"><div><span class="live-dot"></span> {t('workspaceLabel').toUpperCase()} <span class="slash">/</span> <span>{t('project')}</span></div><span>{t('viewer')} <span class="slash">·</span> 01</span></div>
      <Viewport {t} {reportStatus} {onEditor} {onChange} {onError}/>
      <div class="viewport-bottom"><div class="coordinates"><span class="axis x">X</span> 0.000 <span class="axis y">Y</span> 0.000 <span class="axis z">Z</span> 0.000</div><div class="view-label"><Crosshair size={14}/> {t('ready')}</div></div>
    </section>
    <aside class="sidebar">
      <section class="library panel"><Library {t}/></section>
      <section class="inspector panel"><Inspector {t} {editor} {info}/></section>
    </aside>
  </main>
  <footer class="status"><div><span class="live-dot"></span><strong>{fps} FPS</strong><span>{renderer === 'unknown' ? t('unknownRenderer') : renderer}</span><span class="status-sep"></span>{t('ready')}</div><div><span>{t('version')}</span><span class="status-sep"></span><span>M</span><span class="status-sep"></span><label>{t('snap')} <input class="snap-input" type="number" min="0.001" step="0.05" value={snapValue} onchange={setSnapValue} aria-label={t('snapStep')}/></label><span class="status-sep"></span><label>{t('angleStep')} <input class="snap-input" type="number" min="0.1" step="1" value={angleValue} onchange={setAngleValue} aria-label={t('angleStep')}/>°</label><span class="status-sep"></span><span><b>{pieceCount}</b> {t('pieces')}</span></div></footer>
</div>

{#if exportOpen}<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="export-title"><h2 id="export-title">{t('export')}</h2><p>{pieceCount} {t('pieces')} · {editor ? countTriangles(editor.pieces) : 0} {t('triangles')}</p><label>{t('profile')} <select bind:value={profile}><option value="godot">Godot</option><option value="neutral">{t('neutral')}</option></select></label><div class="modal-actions"><button onclick={() => exportOpen = false}>{t('cancel')}</button><button class="primary-button" disabled={exporting} onclick={exportMap}>{t('export')}</button></div></div></div>{/if}
{#if notice}<div class="notice" role="status">{notice} <button onclick={() => notice = ''} aria-label={t('close')}>×</button></div>{/if}
