// SPDX-License-Identifier: GPL-3.0-only
import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { loadModel, disposeModel, filesFromDrop } from '../src/assets/import';
import { filterAssets, folderOf, isModelFile, type AssetRecord } from '../src/assets/types';
const encoded = (s: string) => new TextEncoder().encode(s).buffer;
describe('asset library', () => {
  it('loads an OBJ and centers its origin at the bottom', async () => {
    const model = await loadModel('props/corner.obj', encoded('v 2 4 1\nv 4 4 1\nv 2 6 1\nf 1 2 3\n'));
    const box = new Box3().setFromObject(model);
    expect(box.min.y).toBeCloseTo(0);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0);
    disposeModel(model);
  });
  it('rejects malformed or empty model files', async () => {
    await expect(loadModel('bad.obj', encoded('not a model'))).rejects.toThrow();
    await expect(loadModel('bad.glb', encoded('not a glb'))).rejects.toThrow();
  });
  it('walks dropped directories across multiple reader batches', async () => {
    const file = new File(['v 0 0 0'], 'piece.obj');
    const entry = { name: 'piece.obj', isFile: true, isDirectory: false, file: (resolve: (file: File) => void) => resolve(file) };
    let batch = 0;
    const directory = { name: 'models', isFile: false, isDirectory: true, createReader: () => ({ readEntries: (resolve: (entries: unknown[]) => void) => resolve(batch++ === 0 ? [entry] : []) }) };
    const drop = { items: [{ webkitGetAsEntry: () => directory }], files: [] } as unknown as DataTransfer;
    expect((await filesFromDrop(drop)).map(item => item.path)).toEqual(['models/piece.obj']);
  });
  it('filters by name and folder without matching sibling prefixes', () => {
    const assets = ['a/box.obj', 'ab/box.glb', 'a/sub/wall.glb'].map(path => ({ path } as AssetRecord));
    expect(filterAssets(assets, 'BOX', 'a').map(a => a.path)).toEqual(['a/box.obj']);
    expect(filterAssets(assets, '', 'a')).toHaveLength(2);
    expect(folderOf('a/sub/wall.glb')).toBe('a/sub');
    expect(isModelFile('wall.GLB')).toBe(true);
    expect(isModelFile('wall.obj.bak')).toBe(false);
  });
});
