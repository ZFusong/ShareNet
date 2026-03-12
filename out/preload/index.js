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
  // Device management
  getDevices: () => electron.ipcRenderer.invoke("get-devices"),
  refreshDevices: () => electron.ipcRenderer.invoke("refresh-devices"),
  // Config center
  getPresets: (type) => electron.ipcRenderer.invoke("get-presets", type),
  savePreset: (type, preset) => electron.ipcRenderer.invoke("save-preset", type, preset),
  deletePreset: (type, id) => electron.ipcRenderer.invoke("delete-preset", type, id),
  exportConfig: (modules, filePath) => electron.ipcRenderer.invoke("export-config", modules, filePath),
  importConfig: (filePath, mode) => electron.ipcRenderer.invoke("import-config", filePath, mode),
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
