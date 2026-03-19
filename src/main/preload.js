/**
 * ShareNet - Preload 脚本
 * 在渲染进程和主进程之间建立安全的 IPC 桥接
 */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  getHostname: () => ipcRenderer.invoke('get-hostname'),
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // 配置管理
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),

  // 网络服务
  startNetworkServices: () => ipcRenderer.invoke('start-network-services'),
  stopNetworkServices: () => ipcRenderer.invoke('stop-network-services'),
  sendMessage: (targetId, message) => ipcRenderer.invoke('send-message', targetId, message),

  // 设备管理
  udpStart: (config) => ipcRenderer.invoke('udp-start', config),
  udpStop: () => ipcRenderer.invoke('udp-stop'),
  udpSubscribe: () => ipcRenderer.send('udp-subscribe'),
  udpGetDevices: () => ipcRenderer.invoke('udp-get-devices'),
  udpGetLocalDevice: () => ipcRenderer.invoke('udp-get-local-device'),
  udpInitLocalDevice: (deviceInfo) => ipcRenderer.invoke('udp-init-local-device', deviceInfo),
  udpUpdateLocalDevice: (info) => ipcRenderer.invoke('udp-update-local-device', info),
  udpAddDevice: (device) => ipcRenderer.invoke('udp-add-device', device),
  udpRemoveDevice: (id) => ipcRenderer.invoke('udp-remove-device', id),
  udpGetConfig: () => ipcRenderer.invoke('udp-get-config'),
  udpUpdateConfig: (config) => ipcRenderer.invoke('udp-update-config', config),
  tcpStart: (config) => ipcRenderer.invoke('tcp-start', config),
  tcpStop: () => ipcRenderer.invoke('tcp-stop'),
  tcpSend: (targetIP, targetPort, message) => ipcRenderer.invoke('tcp-send', targetIP, targetPort, message),
  tcpBroadcast: (message) => ipcRenderer.invoke('tcp-broadcast', message),
  tcpConnect: (host, port, deviceInfo) => ipcRenderer.invoke('tcp-connect', host, port, deviceInfo),
  tcpGetConnections: () => ipcRenderer.invoke('tcp-get-connections'),
  tcpGetConfig: () => ipcRenderer.invoke('tcp-get-config'),
  tcpUpdateConfig: (config) => ipcRenderer.invoke('tcp-update-config', config),
  getDevices: () => ipcRenderer.invoke('get-devices'),
  refreshDevices: () => ipcRenderer.invoke('refresh-devices'),

  // 配置中心
  getPresets: (type) => ipcRenderer.invoke('get-presets', type),
  savePreset: (type, preset) => ipcRenderer.invoke('save-preset', type, preset),
  updatePreset: (type, id, updates) => ipcRenderer.invoke('update-preset', type, id, updates),
  deletePreset: (type, id) => ipcRenderer.invoke('delete-preset', type, id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  registerSharedImage: (resource) => ipcRenderer.invoke('register-shared-image', resource),
  registerSharedFile: (resource) => ipcRenderer.invoke('register-shared-file', resource),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  checkSceneDependencies: (scene) => ipcRenderer.invoke('check-scene-dependencies', scene),
  exportConfig: (modules, filePath) => ipcRenderer.invoke('export-config', modules, filePath),
  importConfig: (filePath, mode) => ipcRenderer.invoke('import-config', filePath, mode),

  // 执行引擎
  executeCommand: (targetId, command) => ipcRenderer.invoke('execute-command', targetId, command),
  executeLocal: (command) => ipcRenderer.invoke('execute-local', command),

  // 文件传输
  sendFile: (targetId, filePath) => ipcRenderer.invoke('send-file', targetId, filePath),
  saveReceivedFile: (messageId, savePath) => ipcRenderer.invoke('save-received-file', messageId, savePath),
  saveReceived: (data) => ipcRenderer.invoke('save-received', data),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),

  // 接收事件
  onUdpDevicesUpdated: (callback) => {
    ipcRenderer.on('udp-devices-updated', (_event, devices) => callback(devices));
  },
  onUdpDeviceAdded: (callback) => {
    ipcRenderer.on('udp-device-added', (_event, device) => callback(device));
  },
  onUdpDeviceUpdated: (callback) => {
    ipcRenderer.on('udp-device-updated', (_event, device) => callback(device));
  },
  onUdpDevicesRemoved: (callback) => {
    ipcRenderer.on('udp-devices-removed', (_event, devices) => callback(devices));
  },
  onTcpMessage: (callback) => {
    ipcRenderer.on('tcp-message', (_event, message, from) => callback(message, from));
  },
  onNetworkError: (callback) => {
    ipcRenderer.on('network-error', (_event, payload) => callback(payload));
  },
  onImageDownloadProgress: (callback) => {
    ipcRenderer.on('image-download-progress', (_event, payload) => callback(payload));
  },
  onImageDownloadComplete: (callback) => {
    ipcRenderer.on('image-download-complete', (_event, payload) => callback(payload));
  },
  onImageDownloadError: (callback) => {
    ipcRenderer.on('image-download-error', (_event, payload) => callback(payload));
  },
  onFileDownloadProgress: (callback) => {
    ipcRenderer.on('file-download-progress', (_event, payload) => callback(payload));
  },
  onFileDownloadComplete: (callback) => {
    ipcRenderer.on('file-download-complete', (_event, payload) => callback(payload));
  },
  onFileDownloadError: (callback) => {
    ipcRenderer.on('file-download-error', (_event, payload) => callback(payload));
  },
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
