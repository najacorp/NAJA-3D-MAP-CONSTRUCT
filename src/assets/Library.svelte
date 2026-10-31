<!-- SPDX-License-Identifier: GPL-3.0-only -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Box, Folder, Layers3, Plus, Search } from 'lucide-svelte';
  import { filesFromDrop, filesFromList, loadModel, disposeModel } from './import';
  import { getAssets, saveAsset } from './storage';
  import { ThumbnailRenderer } from './thumbnail';
  import { filterAssets, folderOf, isModelFile, type AssetRecord, type ImportFile, type ImportError } from './types';
  export let t: (key: string) => string;
  let picker: HTMLInputElement;
  let assets: AssetRecord[] = [];
  let errors: ImportError[] = [];
  let query = '', folder = '', importing = false, progress = '', warning = '', dragging = false;
  function warn(message: string) { if (!warning.includes(message)) warning = warning ? `${warning} ${message}` : message; }
  let initialized = false;
  $: visible = filterAssets(assets, query, folder);
  $: folders = [...new Set(assets.flatMap(asset => {
    const parts = folderOf(asset.path).split('/').filter(Boolean);
    return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
  }))].sort((a, b) => a.localeCompare(b));
  onMount(() => {
    picker.setAttribute('webkitdirectory', '');
    void getAssets().then(saved => { assets = saved; }).catch(error => { errors = [{ path: t('storage'), message: String(error) }]; }).finally(() => { initialized = true; });
    const dragover = (event: DragEvent) => { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); dragging = true; } };
    const dragleave = (event: DragEvent) => { if (!event.relatedTarget) dragging = false; };
    const drop = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault(); dragging = false;
      // Entries must be captured before the drop handler returns.
      void filesFromDrop(event.dataTransfer).then(importFiles).catch(error => { errors = [{ path: t('import'), message: String(error) }]; });
    };
    window.addEventListener('dragover', dragover); window.addEventListener('dragleave', dragleave); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', dragover); window.removeEventListener('dragleave', dragleave); window.removeEventListener('drop', drop); };
  });
  async function importFiles(files: ImportFile[]) {
    if (importing || !initialized) return;
    const models = files.filter(item => isModelFile(item.path));
    errors = []; warning = ''; importing = true;
    if (!models.length) { errors = [{ path: t('import'), message: t('noModels') }]; importing = false; return; }
    let thumbnails: ThumbnailRenderer | undefined;
    try { thumbnails = new ThumbnailRenderer(); } catch { warn(t('thumbnailUnavailable')); }
    let current = [...assets];
    try {
      for (let i = 0; i < models.length; i++) {
        const { file, path } = models[i]; progress = `${i + 1} / ${models.length}`;
        try {
          const data = await file.arrayBuffer();
          const model = await loadModel(path, data);
          let thumbnail: string | null = null;
          try { if (thumbnails) thumbnail = thumbnails.render(model); }
          catch { warn(t('thumbnailUnavailable')); }
          finally { disposeModel(model); }
          const asset: AssetRecord = { path, name: file.name, size: file.size, modified: file.lastModified, data, thumbnail };
          try { await saveAsset(asset); } catch (error) { errors = [...errors, { path, message: `${t('storageError')}: ${String(error)}` }]; }
          current = [...current.filter(item => item.path !== path), asset]; assets = current;
          if (/\.obj$/i.test(path)) warn(t('objWarning'));
        } catch (error) { errors = [...errors, { path, message: error instanceof Error ? error.message : String(error) }]; }
        // Allow the UI to render progress and avoid blocking a large import.
        if (i % 8 === 7) await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally { thumbnails?.dispose(); importing = false; progress = ''; }
  }
  function choose(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = filesFromList(input.files || []); input.value = '';
    void importFiles(files);
  }
</script>
<div class="panel-head"><div><div class="section-kicker">01 / {t('assets')}</div><h2>{t('library')}</h2></div><button class="square-button" disabled={importing || !initialized} onclick={() => picker.click()} title={t('import')} aria-label={t('import')}><Plus size={17}/></button><input class="directory-picker" type="file" multiple bind:this={picker} onchange={choose} aria-label={t('import')}/></div>
<label class="search"><Search size={15}/><input placeholder={t('search')} bind:value={query} aria-label={t('search')}/></label>
{#if dragging}<div class="drop-banner">{t('dropFolder')}</div>{/if}
{#if importing}<div class="import-progress" role="status">{t('importing')} {progress}</div>{/if}
{#if folders.length}<div class="folder-list" aria-label={t('folders')}><button class:folder-active={!folder} onclick={() => folder = ''}>{t('allFolders')}</button>{#each folders as item}<button class:folder-active={folder === item} onclick={() => folder = item} title={item} style:padding-left={`${8 + (item.split('/').length - 1) * 12}px`}><Folder size={12}/>{item.split('/').pop()}</button>{/each}</div>{/if}
{#if visible.length}
  <div class="asset-grid" role="list">{#each visible as asset (asset.path)}<div role="listitem" class="asset-card" title={asset.path} draggable="true" ondragstart={(event) => { event.dataTransfer?.setData('application/x-naja-asset', asset.path); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'; }}><div class="asset-thumb">{#if asset.thumbnail}<img src={asset.thumbnail} alt=""/>{:else}<Box size={28}/>{/if}</div><div class="asset-name">{asset.name}</div><div class="asset-path">{folderOf(asset.path)}</div></div>{/each}</div>
{:else if !assets.length && !importing}
  <div class="empty"><div class="empty-icon"><Layers3 size={24} strokeWidth={1.3}/></div><strong>{t('emptyLibrary')}</strong><p>{t('emptyLibraryHint')}</p><button class="import-button" disabled={!initialized} onclick={() => picker.click()}>{t('import')}</button></div>
{:else if !importing}<div class="empty no-results">{t('noResults')}</div>{/if}
{#if warning}<div class="import-warning" role="status">{warning}</div>{/if}
{#if errors.length}<details class="import-errors"><summary>{t('importErrors')} ({errors.length})</summary><ul>{#each errors as error}<li><strong>{error.path}</strong>: {error.message}</li>{/each}</ul></details>{/if}
<div class="panel-footer"><span>{assets.length} {t('pieces')}</span><span>{visible.length} / {assets.length}</span></div>
