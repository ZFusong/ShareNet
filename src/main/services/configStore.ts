/**
 * ShareNet - Config Store
 * 配置存储模块
 */

import Store from 'electron-store'

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
  type: 'keyCombo' | 'keyPress' | 'textInput' | 'delay'
  data: Record<string, unknown>
  delay?: number // ms before this step
}

export interface MouseStep {
  type: 'mouseMove' | 'mouseScroll' | 'mouseClick'
  data: Record<string, unknown>
}

export interface MousePreset {
  id: string
  name: string
  steps: MouseStep[]
  sourceInputPresetId?: string
  createdAt: number
  updatedAt: number
}

export interface Scene {
  id: string
  name: string
  description?: string
  softwarePresetIds: string[]
  inputPresetIds: string[]
  mousePresetIds?: string[]
  steps: SceneStep[]
  createdAt: number
  updatedAt: number
}

export interface SceneStep {
  type: 'software' | 'input' | 'mouse' | 'delay'
  presetId?: string
  delay?: number
  config?: Record<string, unknown>
}

export interface TriggerBinding {
  id: string
  triggerKey: string
  triggerName?: string
  sceneId: string
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export interface AppConfig {
  settings: Settings
  'software-presets': SoftwarePreset[]
  'input-presets': InputPreset[]
  'mouse-presets': MousePreset[]
  scenes: Scene[]
  'trigger-bindings': TriggerBinding[]
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
    'mouse-presets': [],
    scenes: [],
    'trigger-bindings': [],
    offlineDevices: {}
  }
})

const normalizeMouseStep = (step: MouseStep): MouseStep | null => {
  if (step.type !== 'mouseMove' && step.type !== 'mouseScroll' && step.type !== 'mouseClick') {
    return null
  }

  if (step.type === 'mouseMove') {
    return {
      type: step.type,
      data: {
        screenX: Number(step.data.screenX ?? step.data.clientX ?? 0),
        screenY: Number(step.data.screenY ?? step.data.clientY ?? 0),
        note: String(step.data.note ?? '')
      }
    }
  }

  if (step.type === 'mouseScroll') {
    const rawDirection = String(step.data.direction ?? '').toLowerCase()
    const direction =
      rawDirection === 'up' || rawDirection === 'down'
        ? rawDirection
        : Number(step.data.deltaY ?? 0) < 0
          ? 'up'
          : 'down'
    const legacyDeltaY = Number(step.data.deltaY ?? 0)
    const stepCount = Number(step.data.step ?? step.data.steps ?? 0)

    return {
      type: step.type,
      data: {
        direction,
        step: Number.isFinite(stepCount) && stepCount > 0 ? Math.round(stepCount) : Math.max(1, Math.round(Math.abs(legacyDeltaY) / 120) || 1),
        note: String(step.data.note ?? '')
      }
    }
  }

  return {
    type: step.type,
    data: {
      button: Number(step.data.button ?? 0),
      clickCount: Number(step.data.clickCount ?? 1),
      note: String(step.data.note ?? '')
    }
  }
}

const normalizeMousePresetSteps = (steps: MouseStep[]): MouseStep[] =>
  steps.map(normalizeMouseStep).filter((step): step is MouseStep => step !== null)

function migrateTriggerBindingsToLocalOnly(): void {
  const triggerBindings = store.get('trigger-bindings', []) as Array<TriggerBinding & { deviceKey?: string }>
  if (triggerBindings.length === 0) return

  const normalizedByKey = new Map<string, TriggerBinding>()

  for (const binding of triggerBindings) {
    const triggerKey = binding.triggerKey?.trim()
    if (!triggerKey) continue

    const normalized: TriggerBinding = {
      id: binding.id,
      triggerKey,
      triggerName: binding.triggerName,
      sceneId: binding.sceneId,
      enabled: binding.enabled !== false,
      createdAt: binding.createdAt || Date.now(),
      updatedAt: binding.updatedAt || Date.now()
    }

    const existing = normalizedByKey.get(triggerKey)
    if (!existing || normalized.updatedAt >= existing.updatedAt) {
      normalizedByKey.set(triggerKey, normalized)
    }
  }

  const normalizedBindings = Array.from(normalizedByKey.values())
  const changed =
    normalizedBindings.length !== triggerBindings.length ||
    triggerBindings.some((binding) => 'deviceKey' in binding)

  if (changed) {
    store.set('trigger-bindings', normalizedBindings)
  }
}

migrateTriggerBindingsToLocalOnly()

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
  const normalizedSteps = preset.steps.filter((step) =>
    step.type === 'keyCombo' || step.type === 'keyPress' || step.type === 'textInput' || step.type === 'delay'
  )

  const newPreset: InputPreset = {
    ...preset,
    steps: normalizedSteps,
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

  const normalizedUpdates = {
    ...updates,
    ...(updates.steps !== undefined
      ? {
          steps: updates.steps.filter(
            (step) => step.type === 'keyCombo' || step.type === 'keyPress' || step.type === 'textInput' || step.type === 'delay'
          )
        }
      : {})
  }

  presets[index] = {
    ...presets[index],
    ...normalizedUpdates,
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

// ========== Mouse Presets ==========

export function getMousePresets(): MousePreset[] {
  return store.get('mouse-presets', [])
}

export function getMousePreset(id: string): MousePreset | undefined {
  const presets = getMousePresets()
  return presets.find((p) => p.id === id)
}

export function saveMousePreset(preset: Omit<MousePreset, 'id' | 'createdAt' | 'updatedAt'>): MousePreset {
  const presets = getMousePresets()
  const now = Date.now()
  const normalizedSteps = normalizeMousePresetSteps(preset.steps)

  const newPreset: MousePreset = {
    ...preset,
    steps: normalizedSteps,
    id: `mp-${now}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  }

  presets.push(newPreset)
  store.set('mouse-presets', presets)

  return newPreset
}

export function updateMousePreset(id: string, updates: Partial<Omit<MousePreset, 'id' | 'createdAt'>>): MousePreset | null {
  const presets = getMousePresets()
  const index = presets.findIndex((p) => p.id === id)

  if (index === -1) return null

  const normalizedUpdates = {
    ...updates,
    ...(updates.steps !== undefined ? { steps: normalizeMousePresetSteps(updates.steps) } : {})
  }

  presets[index] = {
    ...presets[index],
    ...normalizedUpdates,
    updatedAt: Date.now()
  }

  store.set('mouse-presets', presets)
  return presets[index]
}

export function deleteMousePreset(id: string): boolean {
  const presets = getMousePresets()
  const filtered = presets.filter((p) => p.id !== id)

  if (filtered.length === presets.length) return false

  store.set('mouse-presets', filtered)
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

// ========== Trigger Bindings ==========

export function getTriggerBindings(): TriggerBinding[] {
  return store.get('trigger-bindings', [])
}

export function saveTriggerBinding(
  binding: Omit<TriggerBinding, 'id' | 'createdAt' | 'updatedAt'>
): TriggerBinding {
  const bindings = getTriggerBindings()
  const now = Date.now()

  const newBinding: TriggerBinding = {
    ...binding,
    id: `tb-${now}-${Math.random().toString(36).slice(2, 4)}`,
    createdAt: now,
    updatedAt: now
  }

  bindings.push(newBinding)
  store.set('trigger-bindings', bindings)
  return newBinding
}

export function updateTriggerBinding(
  id: string,
  updates: Partial<Omit<TriggerBinding, 'id' | 'createdAt'>>
): TriggerBinding | null {
  const bindings = getTriggerBindings()
  const index = bindings.findIndex((binding) => binding.id === id)

  if (index === -1) return null

  bindings[index] = {
    ...bindings[index],
    ...updates,
    updatedAt: Date.now()
  }

  store.set('trigger-bindings', bindings)
  return bindings[index]
}

export function deleteTriggerBinding(id: string): boolean {
  const bindings = getTriggerBindings()
  const filtered = bindings.filter((binding) => binding.id !== id)

  if (filtered.length === bindings.length) return false

  store.set('trigger-bindings', filtered)
  return true
}

export function resolveSceneIdByTrigger(triggerKey: string): string | null {
  const normalizedTriggerKey = triggerKey.trim()
  const binding = getTriggerBindings().find(
    (item) => item.enabled && item.triggerKey === normalizedTriggerKey
  )
  return binding?.sceneId || null
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

  if (modules.includes('mouse-presets')) {
    (data.data as Record<string, unknown>)['mouse-presets'] = getMousePresets()
    ;(data.exportMeta as Record<string, unknown>).itemCount = {
      ...(data.exportMeta as Record<string, unknown>).itemCount,
      'mouse-presets': getMousePresets().length
    }
  }

  if (modules.includes('scenes')) {
    (data.data as Record<string, unknown>)['scenes'] = getScenes()
    ;(data.exportMeta as Record<string, unknown>).itemCount = {
      ...(data.exportMeta as Record<string, unknown>).itemCount,
      scenes: getScenes().length
    }
  }

  if (modules.includes('trigger-bindings')) {
    (data.data as Record<string, unknown>)['trigger-bindings'] = getTriggerBindings()
    ;(data.exportMeta as Record<string, unknown>).itemCount = {
      ...(data.exportMeta as Record<string, unknown>).itemCount,
      'trigger-bindings': getTriggerBindings().length
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
    const normalizedInputPresets = (config.data['input-presets'] as InputPreset[]).map((preset) => ({
      ...preset,
      steps: (preset.steps || []).filter(
        (step) => step.type === 'keyCombo' || step.type === 'keyPress' || step.type === 'textInput' || step.type === 'delay'
      )
    }))
    const imported = importPresets(
      normalizedInputPresets,
      getInputPresets(),
      mode,
      'input-presets'
    )
    result.imported['input-presets'] = imported.count
    result.errors.push(...imported.errors)
    result.conflicts.push(...imported.conflicts)
    store.set('input-presets', imported.items)
  }

  if (config.data['mouse-presets'] && Array.isArray(config.data['mouse-presets'])) {
    const normalizedMousePresets = (config.data['mouse-presets'] as MousePreset[]).map((preset) => ({
      ...preset,
      steps: normalizeMousePresetSteps(preset.steps || [])
    }))
    const imported = importPresets(
      normalizedMousePresets,
      getMousePresets(),
      mode,
      'mouse-presets'
    )
    result.imported['mouse-presets'] = imported.count
    result.errors.push(...imported.errors)
    result.conflicts.push(...imported.conflicts)
    store.set('mouse-presets', imported.items)
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

  if (config.data['trigger-bindings'] && Array.isArray(config.data['trigger-bindings'])) {
    const imported = importPresets(
      config.data['trigger-bindings'] as TriggerBinding[],
      getTriggerBindings(),
      mode,
      'trigger-bindings'
    )
    result.imported['trigger-bindings'] = imported.count
    result.errors.push(...imported.errors)
    result.conflicts.push(...imported.conflicts)
    store.set('trigger-bindings', imported.items)
  }

  result.success = result.errors.length === 0
  return result
}

function importPresets<T extends { id: string; name?: string; triggerKey?: string }>(
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
    const label = item.name || item.triggerKey || item.id
    try {
      const existingIndex = existing.findIndex((e) => e.id === item.id)

      if (mode === 'append') {
        if (existingIndex === -1) {
          const canCheckNameConflict = Boolean(item.name)
          const nameExists = canCheckNameConflict && existing.some((e) => e.name === item.name)
          if (nameExists && item.name) {
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
      result.errors.push(`Failed to import ${type} "${label}": ${error}`)
    }
  }

  return result
}

// ========== ID Generator ==========

export function generateId(type: 'software' | 'input' | 'mouse' | 'scene' | 'trigger'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 4)
  switch (type) {
    case 'software':
      return `sw-${timestamp}-${random}`
    case 'input':
      return `ip-${timestamp}-${random}`
    case 'mouse':
      return `mp-${timestamp}-${random}`
    case 'scene':
      return `sc-${timestamp}-${random}`
    case 'trigger':
      return `tb-${timestamp}-${random}`
  }
}

// ========== Dependency Check ==========

export function checkDependencies(scene: Scene): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  const softwarePresets = getSoftwarePresets()
  const inputPresets = getInputPresets()
  const mousePresets = getMousePresets()

  for (const presetId of scene.softwarePresetIds) {
    if (!softwarePresets.find((p) => p.id === presetId)) {
      missing.push(`软件预设: ${presetId}`)
    }
  }

  for (const presetId of scene.inputPresetIds) {
    if (!inputPresets.find((p) => p.id === presetId)) {
      missing.push(`键盘预设: ${presetId}`)
    }
  }

  for (const presetId of scene.mousePresetIds || []) {
    if (!mousePresets.find((p) => p.id === presetId)) {
      missing.push(`鼠标预设: ${presetId}`)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

// ========== Store Instance Export ==========

export { store }




