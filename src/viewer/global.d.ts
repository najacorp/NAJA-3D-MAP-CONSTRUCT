// SPDX-License-Identifier: GPL-3.0-only
export {};
declare global {
  interface Window { naja?: { getRenderMode: () => Promise<'auto' | 'gpu' | 'cpu'>; setRenderMode: (mode: 'auto' | 'gpu' | 'cpu') => Promise<void> }; }
}
