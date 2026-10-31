// SPDX-License-Identifier: GPL-3.0-only
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const configPath = path.join(app.getPath('userData'), 'render-mode.json');
let renderMode = 'auto';
try {
  const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (['auto', 'gpu', 'cpu'].includes(saved.mode)) renderMode = saved.mode;
} catch { /* First launch or invalid settings: use automatic mode. */ }
if (renderMode === 'cpu') {
  app.commandLine.appendSwitch('use-gl', 'angle');
  app.commandLine.appendSwitch('use-angle', 'swiftshader-webgl');
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
} else if (renderMode === 'gpu') {
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
} else {
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
}
function createWindow() {
  const window = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0b0e11', title: 'NAJA 3D Map Construct',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') }
  });
  window.removeMenu();
  window.webContents.on('will-prevent-unload', event => {
    const pt = app.getLocale().toLowerCase().startsWith('pt');
    const choice = dialog.showMessageBoxSync(window, {type:'warning',buttons:pt ? ['Cancelar','Descartar'] : ['Cancel','Discard'],defaultId:0,cancelId:0,message:pt ? 'Há alterações não salvas no mapa.' : 'The map has unsaved changes.'});
    if (choice === 1) event.preventDefault();
  });
  if (app.isPackaged) window.loadFile(path.join(__dirname, '../dist/index.html'));
  else window.loadURL('http://127.0.0.1:5173');
}
ipcMain.handle('render-mode:get', () => renderMode);
ipcMain.handle('render-mode:set', (event, mode) => {
  if (!['auto', 'gpu', 'cpu'].includes(mode) || !BrowserWindow.fromWebContents(event.sender) || event.senderFrame !== event.sender.mainFrame) throw new Error('Invalid render mode');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ mode }));
  app.relaunch();
  app.exit(0);
});
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
