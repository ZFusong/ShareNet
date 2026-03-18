/**
 * ShareNet - Config Store
 * 配置存储模块
 */

import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'

// ========== Types ==========

export interface Settings {
  device: {
    name: string
    role: 'controller' | 'controlled' | 'bidirectional'
    tags: string[]
    avatar?: string
    aliases?: Record<string, string>
    hiddenDevices?: Record<string, unknown>
    persistentDevices?: Record<string, unknown>
    deviceGroups?: Array<{ id: string; name: string; deviceKeys: string[] }>
  }
  network: {
    udpPort: number
    tcpPort: number
    broadcastInterval: number
  }
  security: {
    allowControl: boolean
    whitelist: string[]
    confirmMode: boolean
  }
  ui: {
    theme: 'light' | 'dark' | 'system'
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
  downloads: {
    directory: string
  }
}

export interface SoftwarePreset {
  id: string
  name: string
  path: string
  args?: string
  workDir?: string
  createdAt: number
  updatedAt: number
}

export interface InputPreset {
  id: string
  name: string
  steps: InputStep[]
  createdAt: number
  updatedAt: number
}

export interface InputStep {
  type: 'keyCombo' | 'keyPress' | 'mouseClick' | 'mouseMove' | 'textInput' | 'delay'
  data: Record<string, unknown>
  delay?: number // ms before this step
}

export interface Scene {
  id: string
  name: string
  description?: string
  softwarePresetIds: string[]
  inputPresetIds: string[]
  steps: SceneStep[]
  createdAt: number
  updatedAt: number
}

export interface SceneStep {
  type: 'software' | 'input' | 'delay'
  presetId?: string
  delay?: number
  config?: Record<string, unknown>
}

export interface AppConfig {
  settings: Settings
  'software-presets': SoftwarePreset[]
  'input-presets': InputPreset[]
  scenes: Scene[]
  offlineDevices: Record<string, { lastSeen: number; device: unknown }>
}

// ========== Default Values ==========

const defaultSettings: Settings = {
  device: {
    name: '',
    role: 'bidirectional',
    tags: [],
    aliases: {},
    hiddenDevices: {},
    persistentDevices: {},
    deviceGroups: []
  },
  network: {
    udpPort: 8888,
    tcpPort: 8889,
    broadcastInterval: 5000
  },
  security: {
    allowControl: true,
    whitelist: [],
    confirmMode: true
  },
  ui: {
    theme: 'system',
    logLevel: 'info'
  },
  downloads: {
    directory: ''
  }
}

// ========== Store Instance ==========

const store = new Store<AppConfig>({
  name: 'sharenet-config',
  defaults: {
    settings: defaultSettings,
    'software-presets': [],
    'input-presets': [],
    scenes: [],
    offlineDevices: {}
  }
})

// ========== Settings ==========

export function getSettings(): Settings {
  return store.get('settings', defaultSettings)
}

export function setSettings(settings: Partial<Settings>): void {
  const current = getSettings()
  store.set('settings', {
    ...current,
    ...settings,
    device: { ...current.device, ...settings.device },
    network: { ...current.network, ...settings.network },
    security: { ...current.security, ...settings.security },
    ui: { ...current.ui, ...settings.ui },
    downloads: { ...current.downloads, ...settings.downloads }
  })
}

export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
  return getSettings()[key]
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const current = getSettings()
  store.set('settings', { ...current, [key]: value })
}

// ========== Software Presets ==========

export function getSoftwarePresets(): SoftwarePreset[] {
  return store.get('software-presets', [])
}

export function getSoftwarePreset(id: string): SoftwarePreset | undefined {
  const presets = getSoftwarePresets()
  return presets.find((p) => p.id === id)
}

export function saveSoftwarePreset(preset: Omit<SoftwarePreset, 'id' | 'createdAt' | 'updatedAt'>): SoftwarePreset {
  const presets = getSoftwarePresets()
  const now = Date.now()

  const newPreset: SoftwarePreset = {
    ...preset,
    id: `sw-${now}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  }

  presets.push(newPreset)
  store.set('software-presets', presets)

  return newPreset
}

export function updateSoftwarePreset(id: string, updates: Partial<Omit<SoftwarePreset, 'id' | 'createdAt'>>): SoftwarePreset | null {
  const presets = getSoftwarePresets()
  const index = presets.findIndex((p) => p.id === id)

  if (index === -1) return null

  presets[index] = {
    ...presets[index],
    ...updates,
    updatedAt: Date.now()
  }

  store.set('software-presets', presets)
  return presets[index]
}

export function deleteSoftwarePreset(id: string): boolean {
  const presets = getSoftwarePresets()
  const filtered = presets.filter((p) => p.id !== id)

  if (filtered.length === presets.length) return false

  store.set('software-presets', filtered)
  return true
}

// ========== Input Presets ==========

export function getInputPresets(): InputPreset[] {
  return store.get('input-presets', [])
}

export function getInputPreset(id: string): InputPreset | undefined {
  const presets = getInputPresets()
  return presets.find((p) => p.id === id)
}

export function saveInputPreset(preset: Omit<InputPreset, 'id' | 'createdAt' | 'updatedAt'>): InputPreset {
  const presets = getInputPresets()
  const now = Date.now()

  const newPreset: InputPreset = {
    ...preset,
    id: `ip-${now}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  }

  presets.push(newPreset)
  store.set('input-presets', presets)

  return newPreset
}

export function updateInputPreset(id: string, updates: Partial<Omit<InputPreset, 'id' | 'createdAt'>>): InputPreset | null {
  const presets = getInputPresets()
  const index = presets.findIndex((p) => p.id === id)

  if (index === -1) return null

  presets[index] = {
    ...presets[index],
    ...updates,
    updatedAt: Date.now()
  }

  store.set('input-presets', presets)
  return presets[index]
}

export function deleteInputPreset(id: string): boolean {
  const presets = getInputPresets()
  const filtered = presets.filter((p) => p.id !== id)

  if (filtered.length === presets.length) return false

  store.set('input-presets', filtered)
  return true
}

// ========== Scenes ==========

export function getScenes(): Scene[] {
  return store.get('scenes', [])
}

export function getScene(id: string): Scene | undefined {
  const scenes = getScenes()
  return scenes.find((s) => s.id === id)
}

export function saveScene(scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Scene {
  const scenes = getScenes()
  const now = Date.now()

  const newScene: Scene = {
    ...scene,
    id: `sc-${now}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  }

  scenes.push(newScene)
  store.set('scenes', scenes)

  return newScene
}

export function updateScene(id: string, updates: Partial<Omit<Scene, 'id' | 'createdAt'>>): Scene | null {
  const scenes = getScenes()
  const index = scenes.findIndex((s) => s.id === id)

  if (index === -1) return null

  scenes[index] = {
    ...scenes[index],
    ...updates,
    updatedAt: Date.now()
  }

  store.set('scenes', scenes)
  return scenes[index]
}

export function deleteScene(id: string): boolean {
  const scenes = getScenes()
  const filtered = scenes.filter((s) => s.id !== id)

  if (filtered.length === scenes.length) return false

  store.set('scenes', filtered)
  return true
}

// ========== Offline Devices ==========

export function getOfflineDevices(): Record<string, { lastSeen: number; device: unknown }> {
  return store.get('offlineDevices', {})
}

export function saveOfflineDevice(id: string, device: unknown): void {
  const offline = getOfflineDevices()
  offline[id] = { lastSeen: Date.now(), device }
  store.set('offlineDevices', offline)
}

export function removeOfflineDevice(id: string): void {
  const offline = getOfflineDevices()
  delete offline[id]
  store.set('offlineDevices', offline)
}

export function clearOfflineDevices(): void {
  store.set('offlineDevices', {})
}

// ========== Export / Import ==========

export function exportConfig(modules: string[]): Record<string, unknown> {
  const data: Record<string, unknown> = {
    exportMeta: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: getSettings().device.name || 'ShareNet',
      modules,
      itemCount: {} as Record<string, number>
    },
    data: {}
  }

  if (modules.includes('software-presets')) {
    (data.data as Record<string, unknown>)['software-presets'] = getSoftwarePresets()
    ;(data.exportMeta as Record<string, unknown>).itemCount = {
      ...(data.exportMeta as Record<string, unknown>).itemCount,
      'software-presets': getSoftwarePresets().length
    }
  }

  if (modules.includes('input-presets')) {
    (data.data as Record<string, unknown>)['input-presets'] = getInputPresets()
    ;(data.exportMeta as Record<string, unknown>).itemCount = {
      ...(data.exportMeta as Record<string, unknown>).itemCount,
      'input-presets': getInputPresets().length
    }
  }

  if (modules.includes('scenes')) {
    (data.data as Record<string, unknown>)['scenes'] = getScenes()
    ;(data.exportMeta as Record<string, unknown>).itemCount = {
      ...(data.exportMeta as Record<string, unknown>).itemCount,
      scenes: getScenes().length
    }
  }

  return data
}

export interface ImportResult {
  success: boolean
  imported: Record<string, number>
  errors: string[]
  conflicts: Array<{ type: string; oldName: string; newName: string }>
}

export function importConfig(config: { data: Record<string, unknown> }, mode: 'append' | 'overwrite' | 'merge'): ImportResult {
  const result: ImportResult = {
    success: true,
    imported: {},
    errors: [],
    conflicts: []
  }

  // Import software presets
  if (config.data['software-presets'] && Array.isArray(config.data['software-presets'])) {
    const imported = importPresets(
      config.data['software-presets'] as SoftwarePreset[],
      getSoftwarePresets(),
      mode,
      'software-presets'
    )
    result.imported['software-presets'] = imported.count
    result.errors.push(...imported.errors)
    result.conflicts.push(...imported.conflicts)
    store.set('software-presets', imported.items)
  }

  // Import input presets
  if (config.data['input-presets'] && Array.isArray(config.data['input-presets'])) {
    const imported = importPresets(
      config.data['input-presets'] as InputPreset[],
      getInputPresets(),
      mode,
      'input-presets'
    )
    result.imported['input-presets'] = imported.count
    result.errors.push(...imported.errors)
    result.conflicts.push(...imported.conflicts)
    store.set('input-presets', imported.items)
  }

  // Import scenes
  if (config.data['scenes'] && Array.isArray(config.data['scenes'])) {
    const imported = importPresets(
      config.data['scenes'] as Scene[],
      getScenes(),
      mode,
      'scenes'
    )
    result.imported['scenes'] = imported.count
    result.errors.push(...imported.errors)
    result.conflicts.push(...imported.conflicts)
    store.set('scenes', imported.items)
  }

  result.success = result.errors.length === 0
  return result
}

function importPresets<T extends { id: string; name: string }>(
  items: T[],
  existing: T[],
  mode: 'append' | 'overwrite' | 'merge',
  type: string
): { items: T[]; count: number; errors: string[]; conflicts: Array<{ type: string; oldName: string; newName: string }> } {
  const result = {
    items: [...existing],
    count: 0,
    errors: [] as string[],
    conflicts: [] as Array<{ type: string; oldName: string; newName: string }>
  }

  for (const item of items) {
    try {
      const existingIndex = existing.findIndex((e) => e.id === item.id)

      if (mode === 'append') {
        if (existingIndex === -1) {
          // Check for name conflicts
          const nameExists = existing.some((e) => e.name === item.name)
          if (nameExists) {
            result.conflicts.push({
              type,
              oldName: item.name,
              newName: `${item.name}-1`
            })
            result.items.push({ ...item, name: `${item.name}-1` } as T)
          } else {
            result.items.push(item)
          }
          result.count++
        }
      } else if (mode === 'overwrite') {
        if (existingIndex !== -1) {
          result.items[existingIndex] = item
        } else {
          result.items.push(item)
        }
        result.count++
      } else if (mode === 'merge') {
        // Ask user for each conflict - for now treat as append
        if (existingIndex === -1) {
          result.items.push(item)
          result.count++
        }
      }
    } catch (error) {
      result.errors.push(`Failed to import ${type} "${item.name}": ${error}`)
    }
  }

  return result
}

// ========== ID Generator ==========

export function generateId(type: 'software' | 'input' | 'scene'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 4)
  switch (type) {
    case 'software':
      return `sw-${timestamp}-${random}`
    case 'input':
      return `ip-${timestamp}-${random}`
    case 'scene':
      return `sc-${timestamp}-${random}`
  }
}

// ========== Dependency Check ==========

export function checkDependencies(scene: Scene): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  const softwarePresets = getSoftwarePresets()
  const inputPresets = getInputPresets()

  for (const presetId of scene.softwarePresetIds) {
    if (!softwarePresets.find((p) => p.id === presetId)) {
      missing.push(`软件预设: ${presetId}`)
    }
  }

  for (const presetId of scene.inputPresetIds) {
    if (!inputPresets.find((p) => p.id === presetId)) {
      missing.push(`键鼠预设: ${presetId}`)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

// ========== Store Instance Export ==========

export { store }


