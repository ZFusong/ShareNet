import { DeviceInfo } from '../../main/services/types'

export interface AppSettings {
  device?: {
    name?: string
    role?: 'controller' | 'controlled' | 'bidirectional'
    tags?: string[]
    aliases?: Record<string, string>
    hiddenDevices?: Record<string, unknown>
    persistentDevices?: Record<string, DeviceInfo>
    deviceGroups?: Array<{ id: string; name: string; deviceKeys: string[] }>
  }
  network?: {
    udpPort?: number
    tcpPort?: number
    broadcastInterval?: number
  }
  security?: {
    allowControl?: boolean
    whitelist?: string[]
    confirmMode?: boolean
  }
  ui?: {
    theme?: string
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
  }
  downloads?: {
    directory?: string
  }
}

export interface SceneDependencyCheckResult {
  valid: boolean
  missing?: string[]
}

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

  udpStart: (config?: { port?: number }) => Promise<{ success: boolean; error?: string }>
  udpStop: () => Promise<{ success: boolean; error?: string }>
  udpSubscribe: () => void
  udpGetDevices: () => Promise<DeviceInfo[]>
  udpGetLocalDevice: () => Promise<DeviceInfo | null>
  udpInitLocalDevice: (deviceInfo: Partial<DeviceInfo>) => Promise<{ success: boolean; device?: DeviceInfo; error?: string }>
  udpUpdateLocalDevice: (info: Partial<DeviceInfo>) => Promise<{ success: boolean; error?: string }>
  udpAddDevice: (device: Partial<DeviceInfo>) => Promise<{ success: boolean; error?: string }>
  udpRemoveDevice: (id: string) => Promise<{ success: boolean; error?: string }>
  udpGetConfig: () => Promise<unknown>
  udpUpdateConfig: (config: { port?: number }) => Promise<{ success: boolean; error?: string }>

  tcpStart: (config?: { port?: number }) => Promise<{ success: boolean; error?: string }>
  tcpStop: () => Promise<{ success: boolean; error?: string }>
  tcpSend: (targetIP: string, targetPort: number, message: unknown) => Promise<{ success: boolean; error?: string }>
  tcpBroadcast: (message: unknown) => Promise<{ success: boolean; count?: number; error?: string }>
  tcpConnect: (host: string, port: number, deviceInfo: unknown) => Promise<{ success: boolean; clientId?: string | null; error?: string }>
  tcpGetConnections: () => Promise<number>
  tcpGetConfig: () => Promise<unknown>
  tcpUpdateConfig: (config: { port?: number }) => Promise<{ success: boolean; error?: string }>

  onUdpDevicesUpdated: (callback: (devices: DeviceInfo[]) => void) => void
  onUdpDeviceAdded: (callback: (device: DeviceInfo) => void) => void
  onUdpDeviceUpdated: (callback: (device: DeviceInfo) => void) => void
  onUdpDevicesRemoved: (callback: (devices: DeviceInfo[]) => void) => void
  onTcpMessage: (callback: (message: unknown, from: unknown) => void) => void
  onNetworkError: (callback: (payload: { service: string; error: string }) => void) => void
  onImageDownloadProgress: (callback: (payload: unknown) => void) => void
  onImageDownloadComplete: (callback: (payload: unknown) => void) => void
  onImageDownloadError: (callback: (payload: unknown) => void) => void
  onFileDownloadProgress: (callback: (payload: unknown) => void) => void
  onFileDownloadComplete: (callback: (payload: unknown) => void) => void
  onFileDownloadError: (callback: (payload: unknown) => void) => void

  getDevices: () => Promise<DeviceInfo[]>
  refreshDevices: () => Promise<void>

  getPresets: (type: string) => Promise<unknown[]>
  savePreset: (type: string, preset: unknown) => Promise<{ success: boolean; error?: string }>
  updatePreset: (type: string, id: string, updates: unknown) => Promise<{ success: boolean; error?: string }>
  deletePreset: (type: string, id: string) => Promise<{ success: boolean; error?: string }>
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: AppSettings) => Promise<void>
  selectDirectory: () => Promise<{ success: boolean; path?: string }>
  registerSharedImage: (resource: unknown) => Promise<{ success: boolean; error?: string }>
  registerSharedFile: (resource: unknown) => Promise<{ success: boolean; error?: string }>
  getSetting: (key: string) => Promise<unknown>
  setSetting: (key: string, value: unknown) => Promise<void>
  exportConfig: (modules: string[], filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  importConfig: (data: unknown, mode: string) => Promise<{ success: boolean; result?: unknown; error?: string }>
  checkSceneDependencies: (scene: unknown) => Promise<SceneDependencyCheckResult>

  executeCommand: (targetId: string, command: unknown) => Promise<unknown>
  executeLocal: (command: unknown) => Promise<unknown>

  sendFile: (targetId: string, filePath: string) => Promise<void>
  saveReceivedFile: (messageId: string, savePath: string) => Promise<void>
  saveReceived: (data: { type: 'text' | 'image' | 'file'; content: string; fileName?: string }) => Promise<{ success: boolean; path?: string; error?: string }>
  revealFile: (filePath: string) => Promise<{ success: boolean; error?: string }>

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
    electronAPI?: ElectronAPI
  }
}

export {}
