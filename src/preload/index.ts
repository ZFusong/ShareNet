/**
 * ShareNet - Preload Script
 * Establishes secure IPC bridge between main and renderer processes
 */

import { contextBridge, ipcRenderer } from 'electron'

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  getHostname: () => ipcRenderer.invoke('get-hostname'),

  // Config management
  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('set-config', key, value),

  // Network services
  startNetworkServices: () => ipcRenderer.invoke('start-network-services'),
  stopNetworkServices: () => ipcRenderer.invoke('stop-network-services'),
  sendMessage: (targetId: string, message: unknown) => ipcRenderer.invoke('send-message', targetId, message),

  // Device management
  getDevices: () => ipcRenderer.invoke('get-devices'),
  refreshDevices: () => ipcRenderer.invoke('refresh-devices'),

  // Config center
  getPresets: (type: string) => ipcRenderer.invoke('get-presets', type),
  savePreset: (type: string, preset: unknown) => ipcRenderer.invoke('save-preset', type, preset),
  deletePreset: (type: string, id: string) => ipcRenderer.invoke('delete-preset', type, id),
  exportConfig: (modules: string[], filePath: string) => ipcRenderer.invoke('export-config', modules, filePath),
  importConfig: (filePath: string, mode: string) => ipcRenderer.invoke('import-config', filePath, mode),

  // Execution engine
  executeCommand: (targetId: string, command: unknown) => ipcRenderer.invoke('execute-command', targetId, command),
  executeLocal: (command: unknown) => ipcRenderer.invoke('execute-local', command),

  // File transfer
  sendFile: (targetId: string, filePath: string) => ipcRenderer.invoke('send-file', targetId, filePath),
  saveReceivedFile: (messageId: string, savePath: string) => ipcRenderer.invoke('save-received-file', messageId, savePath),

  // Receive events
  onDeviceUpdate: (callback: (data: unknown) => void) => {
    ipcRenderer.on('device-update', (_event, data) => callback(data))
  },
  onMessageReceived: (callback: (data: unknown) => void) => {
    ipcRenderer.on('message-received', (_event, data) => callback(data))
  },
  onTransferProgress: (callback: (data: unknown) => void) => {
    ipcRenderer.on('transfer-progress', (_event, data) => callback(data))
  },
  onCommandResult: (callback: (data: unknown) => void) => {
    ipcRenderer.on('command-result', (_event, data) => callback(data))
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', () => callback())
  },
  onShowAbout: (callback: () => void) => {
    ipcRenderer.on('show-about', () => callback())
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

console.log('Preload 脚本加载完成')

// Type definitions for renderer
export interface ElectronAPI {
  getAppInfo: () => Promise<{
    name: string
    version: string
    electron: string
    node: string
    platform: string
  }>
  getUserDataPath: () => Promise<string>
  getLocalIP: () => Promise<string>
  getHostname: () => Promise<string>
  getConfig: (key: string) => Promise<unknown>
  setConfig: (key: string, value: unknown) => Promise<void>
  startNetworkServices: () => Promise<void>
  stopNetworkServices: () => Promise<void>
  sendMessage: (targetId: string, message: unknown) => Promise<void>
  getDevices: () => Promise<unknown[]>
  refreshDevices: () => Promise<void>
  getPresets: (type: string) => Promise<unknown[]>
  savePreset: (type: string, preset: unknown) => Promise<void>
  deletePreset: (type: string, id: string) => Promise<void>
  exportConfig: (modules: string[], filePath: string) => Promise<void>
  importConfig: (filePath: string, mode: string) => Promise<unknown>
  executeCommand: (targetId: string, command: unknown) => Promise<unknown>
  executeLocal: (command: unknown) => Promise<unknown>
  sendFile: (targetId: string, filePath: string) => Promise<void>
  saveReceivedFile: (messageId: string, savePath: string) => Promise<void>
  onDeviceUpdate: (callback: (data: unknown) => void) => void
  onMessageReceived: (callback: (data: unknown) => void) => void
  onTransferProgress: (callback: (data: unknown) => void) => void
  onCommandResult: (callback: (data: unknown) => void) => void
  onOpenSettings: (callback: () => void) => void
  onShowAbout: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}