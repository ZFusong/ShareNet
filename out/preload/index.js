"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getAppInfo: () => electron.ipcRenderer.invoke("get-app-info"),
  getUserDataPath: () => electron.ipcRenderer.invoke("get-user-data-path"),
  getLocalIP: () => electron.ipcRenderer.invoke("get-local-ip"),
  getHostname: () => electron.ipcRenderer.invoke("get-hostname"),
  // Config management
  getConfig: (key) => electron.ipcRenderer.invoke("get-config", key),
  setConfig: (key, value) => electron.ipcRenderer.invoke("set-config", key, value),
  // Network services
  startNetworkServices: () => electron.ipcRenderer.invoke("start-network-services"),
  stopNetworkServices: () => electron.ipcRenderer.invoke("stop-network-services"),
  sendMessage: (targetId, message) => electron.ipcRenderer.invoke("send-message", targetId, message),
  // UDP Service
  udpStart: (config) => electron.ipcRenderer.invoke("udp-start", config),
  udpStop: () => electron.ipcRenderer.invoke("udp-stop"),
  udpGetDevices: () => electron.ipcRenderer.invoke("udp-get-devices"),
  udpGetLocalDevice: () => electron.ipcRenderer.invoke("udp-get-local-device"),
  udpInitLocalDevice: (deviceInfo) => electron.ipcRenderer.invoke("udp-init-local-device", deviceInfo),
  udpUpdateLocalDevice: (info) => electron.ipcRenderer.invoke("udp-update-local-device", info),
  udpAddDevice: (device) => electron.ipcRenderer.invoke("udp-add-device", device),
  udpRemoveDevice: (id) => electron.ipcRenderer.invoke("udp-remove-device", id),
  udpGetConfig: () => electron.ipcRenderer.invoke("udp-get-config"),
  udpUpdateConfig: (config) => electron.ipcRenderer.invoke("udp-update-config", config),
  // TCP Service
  tcpStart: (config) => electron.ipcRenderer.invoke("tcp-start", config),
  tcpStop: () => electron.ipcRenderer.invoke("tcp-stop"),
  tcpSend: (targetIP, message) => electron.ipcRenderer.invoke("tcp-send", targetIP, message),
  tcpBroadcast: (message) => electron.ipcRenderer.invoke("tcp-broadcast", message),
  tcpConnect: (host, port, deviceInfo) => electron.ipcRenderer.invoke("tcp-connect", host, port, deviceInfo),
  tcpGetConnections: () => electron.ipcRenderer.invoke("tcp-get-connections"),
  tcpGetConfig: () => electron.ipcRenderer.invoke("tcp-get-config"),
  tcpUpdateConfig: (config) => electron.ipcRenderer.invoke("tcp-update-config", config),
  // Network events
  onUdpDevicesUpdated: (callback) => {
    electron.ipcRenderer.on("udp-devices-updated", (_event, devices) => callback(devices));
  },
  onUdpDeviceAdded: (callback) => {
    electron.ipcRenderer.on("udp-device-added", (_event, device) => callback(device));
  },
  onUdpDeviceUpdated: (callback) => {
    electron.ipcRenderer.on("udp-device-updated", (_event, device) => callback(device));
  },
  onUdpDevicesRemoved: (callback) => {
    electron.ipcRenderer.on("udp-devices-removed", (_event, devices) => callback(devices));
  },
  onTcpMessage: (callback) => {
    electron.ipcRenderer.on("tcp-message", (_event, message, from) => callback(message, from));
  },
  onNetworkError: (callback) => {
    electron.ipcRenderer.on("network-error", (_event, payload) => callback(payload));
  },
  // Device management
  getDevices: () => electron.ipcRenderer.invoke("get-devices"),
  refreshDevices: () => electron.ipcRenderer.invoke("refresh-devices"),
  // Config center
  getPresets: (type) => electron.ipcRenderer.invoke("get-presets", type),
  savePreset: (type, preset) => electron.ipcRenderer.invoke("save-preset", type, preset),
  updatePreset: (type, id, updates) => electron.ipcRenderer.invoke("update-preset", type, id, updates),
  deletePreset: (type, id) => electron.ipcRenderer.invoke("delete-preset", type, id),
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  setSettings: (settings) => electron.ipcRenderer.invoke("set-settings", settings),
  getSetting: (key) => electron.ipcRenderer.invoke("get-setting", key),
  setSetting: (key, value) => electron.ipcRenderer.invoke("set-setting", key, value),
  exportConfig: (modules) => electron.ipcRenderer.invoke("export-config", modules),
  importConfig: (data, mode) => electron.ipcRenderer.invoke("import-config", data, mode),
  checkSceneDependencies: (scene) => electron.ipcRenderer.invoke("check-scene-dependencies", scene),
  // Execution engine
  executeCommand: (targetId, command) => electron.ipcRenderer.invoke("execute-command", targetId, command),
  executeLocal: (command) => electron.ipcRenderer.invoke("execute-local", command),
  // File transfer
  sendFile: (targetId, filePath) => electron.ipcRenderer.invoke("send-file", targetId, filePath),
  saveReceivedFile: (messageId, savePath) => electron.ipcRenderer.invoke("save-received-file", messageId, savePath),
  // Receive events
  onDeviceUpdate: (callback) => {
    electron.ipcRenderer.on("device-update", (_event, data) => callback(data));
  },
  onMessageReceived: (callback) => {
    electron.ipcRenderer.on("message-received", (_event, data) => callback(data));
  },
  onTransferProgress: (callback) => {
    electron.ipcRenderer.on("transfer-progress", (_event, data) => callback(data));
  },
  onCommandResult: (callback) => {
    electron.ipcRenderer.on("command-result", (_event, data) => callback(data));
  },
  onOpenSettings: (callback) => {
    electron.ipcRenderer.on("open-settings", () => callback());
  },
  onShowAbout: (callback) => {
    electron.ipcRenderer.on("show-about", () => callback());
  },
  // Remove listeners
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
console.log("Preload 脚本加载完成");
