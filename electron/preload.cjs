// SPDX-License-Identifier: GPL-3.0-only
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('naja', {
  getRenderMode: () => ipcRenderer.invoke('render-mode:get'),
  setRenderMode: mode => ipcRenderer.invoke('render-mode:set', mode)
});
