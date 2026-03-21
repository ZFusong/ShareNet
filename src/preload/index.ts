/**
 * ShareNet - Preload Script
 * Establishes secure IPC bridge between main and renderer processes
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron'

// Expose secure API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),
  getHostname: () => ipcRenderer.invoke('get-hostname'),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  // Config management
  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('set-config', key, value),

  // Network services
  startNetworkServices: () => ipcRenderer.invoke('start-network-services'),
  stopNetworkServices: () => ipcRenderer.invoke('stop-network-services'),
  sendMessage: (targetId: string, message: unknown) => ipcRenderer.invoke('send-message', targetId, message),

  // UDP Service
  udpStart: (config?: { port?: number }) => ipcRenderer.invoke('udp-start', config),
  udpStop: () => ipcRenderer.invoke('udp-stop'),
  udpSubscribe: () => ipcRenderer.send('udp-subscribe'),
  udpGetDevices: () => ipcRenderer.invoke('udp-get-devices'),
  udpGetLocalDevice: () => ipcRenderer.invoke('udp-get-local-device'),
  udpInitLocalDevice: (deviceInfo: unknown) => ipcRenderer.invoke('udp-init-local-device', deviceInfo),
  udpUpdateLocalDevice: (info: unknown) => ipcRenderer.invoke('udp-update-local-device', info),
  udpAddDevice: (device: unknown) => ipcRenderer.invoke('udp-add-device', device),
  udpRemoveDevice: (id: string) => ipcRenderer.invoke('udp-remove-device', id),
  udpGetConfig: () => ipcRenderer.invoke('udp-get-config'),
  udpUpdateConfig: (config: { port?: number }) => ipcRenderer.invoke('udp-update-config', config),

  // TCP Service
  tcpStart: (config?: { port?: number }) => ipcRenderer.invoke('tcp-start', config),
  tcpStop: () => ipcRenderer.invoke('tcp-stop'),
  tcpSend: (targetIP: string, targetPort: number, message: unknown) =>
    ipcRenderer.invoke('tcp-send', targetIP, targetPort, message),
  tcpBroadcast: (message: unknown) => ipcRenderer.invoke('tcp-broadcast', message),
  tcpConnect: (host: string, port: number, deviceInfo: unknown) => ipcRenderer.invoke('tcp-connect', host, port, deviceInfo),
  tcpGetConnections: () => ipcRenderer.invoke('tcp-get-connections'),
  tcpGetConfig: () => ipcRenderer.invoke('tcp-get-config'),
  tcpUpdateConfig: (config: { port?: number }) => ipcRenderer.invoke('tcp-update-config', config),

  // Network events
  onUdpDevicesUpdated: (callback: (devices: unknown[]) => void) => {
    ipcRenderer.on('udp-devices-updated', (_event, devices) => callback(devices))
  },
  onUdpDeviceAdded: (callback: (device: unknown) => void) => {
    ipcRenderer.on('udp-device-added', (_event, device) => callback(device))
  },
  onUdpDeviceUpdated: (callback: (device: unknown) => void) => {
    ipcRenderer.on('udp-device-updated', (_event, device) => callback(device))
  },
  onUdpDevicesRemoved: (callback: (devices: unknown[]) => void) => {
    ipcRenderer.on('udp-devices-removed', (_event, devices) => callback(devices))
  },
  onTcpMessage: (callback: (message: unknown, from: unknown) => void) => {
    ipcRenderer.on('tcp-message', (_event, message, from) => callback(message, from))
  },
  onNetworkError: (callback: (payload: { service: string; error: string }) => void) => {
    ipcRenderer.on('network-error', (_event, payload) => callback(payload))
  },
  onImageDownloadProgress: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('image-download-progress', (_event, payload) => callback(payload))
  },
  onImageDownloadComplete: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('image-download-complete', (_event, payload) => callback(payload))
  },
  onImageDownloadError: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('image-download-error', (_event, payload) => callback(payload))
  },
  onFileDownloadProgress: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('file-download-progress', (_event, payload) => callback(payload))
  },
  onFileDownloadComplete: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('file-download-complete', (_event, payload) => callback(payload))
  },
  onFileDownloadError: (callback: (payload: unknown) => void) => {
    ipcRenderer.on('file-download-error', (_event, payload) => callback(payload))
  },

  // Device management
  getDevices: () => ipcRenderer.invoke('get-devices'),
  refreshDevices: () => ipcRenderer.invoke('refresh-devices'),

  // Config center
  getPresets: (type: string) => ipcRenderer.invoke('get-presets', type),
  savePreset: (type: string, preset: unknown) => ipcRenderer.invoke('save-preset', type, preset),
  updatePreset: (type: string, id: string, updates: unknown) => ipcRenderer.invoke('update-preset', type, id, updates),
  deletePreset: (type: string, id: string) => ipcRenderer.invoke('delete-preset', type, id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('set-settings', settings),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  registerSharedImage: (resource: unknown) => ipcRenderer.invoke('register-shared-image', resource),
  registerSharedFile: (resource: unknown) => ipcRenderer.invoke('register-shared-file', resource),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('set-setting', key, value),
  exportConfig: (modules: string[]) => ipcRenderer.invoke('export-config', modules),
  importConfig: (data: unknown, mode: string) => ipcRenderer.invoke('import-config', data, mode),
  checkSceneDependencies: (scene: unknown) => ipcRenderer.invoke('check-scene-dependencies', scene),

  // Execution engine
  executeCommand: (targetId: string, command: unknown) => ipcRenderer.invoke('execute-command', targetId, command),
  executeLocal: (command: unknown) => ipcRenderer.invoke('execute-local', command),

  // File transfer
  sendFile: (targetId: string, filePath: string) => ipcRenderer.invoke('send-file', targetId, filePath),
  saveReceivedFile: (messageId: string, savePath: string) => ipcRenderer.invoke('save-received-file', messageId, savePath),
  saveReceived: (data: { type: 'text' | 'image' | 'file'; content: string; fileName?: string }) =>
    ipcRenderer.invoke('save-received', data),
  revealFile: (filePath: string) => ipcRenderer.invoke('reveal-file', filePath),

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
  getPathForFile: (file: File) => string
  getConfig: (key: string) => Promise<unknown>
  setConfig: (key: string, value: unknown) => Promise<void>
  startNetworkServices: () => Promise<void>
  stopNetworkServices: () => Promise<void>
  sendMessage: (targetId: string, message: unknown) => Promise<void>

  // UDP Service
  udpStart: (config?: { port?: number }) => Promise<{ success: boolean; error?: string }>
  udpStop: () => Promise<{ success: boolean; error?: string }>
  udpGetDevices: () => Promise<unknown[]>
  udpGetLocalDevice: () => Promise<unknown | null>
  udpInitLocalDevice: (deviceInfo: unknown) => Promise<{ success: boolean; device?: unknown; error?: string }>
  udpUpdateLocalDevice: (info: unknown) => Promise<{ success: boolean; error?: string }>
  udpAddDevice: (device: unknown) => Promise<{ success: boolean; error?: string }>
  udpRemoveDevice: (id: string) => Promise<{ success: boolean; error?: string }>
  udpGetConfig: () => Promise<unknown>
  udpUpdateConfig: (config: { port?: number }) => Promise<{ success: boolean; error?: string }>

  // TCP Service
  tcpStart: (config?: { port?: number }) => Promise<{ success: boolean; error?: string }>
  tcpStop: () => Promise<{ success: boolean; error?: string }>
  tcpSend: (targetIP: string, targetPort: number, message: unknown) => Promise<{ success: boolean; error?: string }>
  tcpBroadcast: (message: unknown) => Promise<{ success: boolean; count?: number; error?: string }>
  tcpConnect: (host: string, port: number, deviceInfo: unknown) => Promise<{ success: boolean; clientId?: string | null; error?: string }>
  tcpGetConnections: () => Promise<number>
  tcpGetConfig: () => Promise<unknown>
  tcpUpdateConfig: (config: { port?: number }) => Promise<{ success: boolean; error?: string }>

  // Network events
  onUdpDevicesUpdated: (callback: (devices: unknown[]) => void) => void
  onUdpDeviceAdded: (callback: (device: unknown) => void) => void
  onUdpDeviceUpdated: (callback: (device: unknown) => void) => void
  onUdpDevicesRemoved: (callback: (devices: unknown[]) => void) => void
  onTcpMessage: (callback: (message: unknown, from: unknown) => void) => void
  onNetworkError: (callback: (payload: { service: string; error: string }) => void) => void
  onImageDownloadProgress: (callback: (payload: unknown) => void) => void
  onImageDownloadComplete: (callback: (payload: unknown) => void) => void
  onImageDownloadError: (callback: (payload: unknown) => void) => void
  onFileDownloadProgress: (callback: (payload: unknown) => void) => void
  onFileDownloadComplete: (callback: (payload: unknown) => void) => void
  onFileDownloadError: (callback: (payload: unknown) => void) => void

  // Device management
  getDevices: () => Promise<unknown[]>
  refreshDevices: () => Promise<void>

  // Config center
  getPresets: (type: string) => Promise<unknown[]>
  savePreset: (type: string, preset: unknown) => Promise<void>
  deletePreset: (type: string, id: string) => Promise<void>
  exportConfig: (modules: string[], filePath: string) => Promise<void>
  importConfig: (filePath: string, mode: string) => Promise<unknown>

  // Execution engine
  executeCommand: (targetId: string, command: unknown) => Promise<unknown>
  executeLocal: (command: unknown) => Promise<unknown>

  // File transfer
  sendFile: (targetId: string, filePath: string) => Promise<void>
  saveReceivedFile: (messageId: string, savePath: string) => Promise<void>
  saveReceived: (data: { type: 'text' | 'image' | 'file'; content: string; fileName?: string }) => Promise<{ success: boolean; path?: string; error?: string }>
  revealFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  registerSharedFile: (resource: unknown) => Promise<{ success: boolean; error?: string }>

  // Receive events
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





