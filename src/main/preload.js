/**
 * ShareNet - Preload 脚本
 * 在渲染进程和主进程之间建立安全的 IPC 桥接
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),

  // 配置管理
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),

  // 网络服务
  startNetworkServices: () => ipcRenderer.invoke('start-network-services'),
  stopNetworkServices: () => ipcRenderer.invoke('stop-network-services'),
  sendMessage: (targetId, message) => ipcRenderer.invoke('send-message', targetId, message),

  // 设备管理
  getDevices: () => ipcRenderer.invoke('get-devices'),
  refreshDevices: () => ipcRenderer.invoke('refresh-devices'),

  // 配置中心
  getPresets: (type) => ipcRenderer.invoke('get-presets', type),
  savePreset: (type, preset) => ipcRenderer.invoke('save-preset', type, preset),
  deletePreset: (type, id) => ipcRenderer.invoke('delete-preset', type, id),
  exportConfig: (modules, filePath) => ipcRenderer.invoke('export-config', modules, filePath),
  importConfig: (filePath, mode) => ipcRenderer.invoke('import-config', filePath, mode),

  // 执行引擎
  executeCommand: (targetId, command) => ipcRenderer.invoke('execute-command', targetId, command),
  executeLocal: (command) => ipcRenderer.invoke('execute-local', command),

  // 文件传输
  sendFile: (targetId, filePath) => ipcRenderer.invoke('send-file', targetId, filePath),
  saveReceivedFile: (messageId, savePath) => ipcRenderer.invoke('save-received-file', messageId, savePath),

  // 接收事件
  onDeviceUpdate: (callback) => {
    ipcRenderer.on('device-update', (event, data) => callback(data));
  },
  onMessageReceived: (callback) => {
    ipcRenderer.on('message-received', (event, data) => callback(data));
  },
  onTransferProgress: (callback) => {
    ipcRenderer.on('transfer-progress', (event, data) => callback(data));
  },
  onCommandResult: (callback) => {
    ipcRenderer.on('command-result', (event, data) => callback(data));
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', () => callback());
  },
  onShowAbout: (callback) => {
    ipcRenderer.on('show-about', () => callback());
  },

  // 移除监听
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

console.log('Preload 脚本加载完成');