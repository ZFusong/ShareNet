/**
 * ShareNet - Config Store (Renderer)
 * 配置状态管理
 */

import { create } from 'zustand'

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
  delay?: number
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

type PresetType = 'software' | 'input' | 'scene'

interface ConfigState {
  softwarePresets: SoftwarePreset[]
  inputPresets: InputPreset[]
  scenes: Scene[]
  loading: boolean

  // Actions
  loadPresets: (type: PresetType) => Promise<void>
  savePreset: (type: PresetType, preset: Partial<SoftwarePreset | InputPreset | Scene>) => Promise<boolean>
  updatePreset: (type: PresetType, id: string, updates: Partial<SoftwarePreset | InputPreset | Scene>) => Promise<boolean>
  deletePreset: (type: PresetType, id: string) => Promise<boolean>
  exportConfig: (modules: string[]) => Promise<{ success: boolean; data?: unknown; error?: string }>
  importConfig: (data: unknown, mode: string) => Promise<{ success: boolean; result?: unknown; error?: string }>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  softwarePresets: [],
  inputPresets: [],
  scenes: [],
  loading: false,

  loadPresets: async (type: PresetType) => {
    set({ loading: true })
    try {
      const presets = await window.electronAPI?.getPresets(type)
      if (type === 'software') {
        set({ softwarePresets: (presets as SoftwarePreset[]) || [] })
      } else if (type === 'input') {
        set({ inputPresets: (presets as InputPreset[]) || [] })
      } else if (type === 'scene') {
        set({ scenes: (presets as Scene[]) || [] })
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    } finally {
      set({ loading: false })
    }
  },

  savePreset: async (type: PresetType, preset) => {
    try {
      const result = await window.electronAPI?.savePreset(type, preset)
      if (result?.success) {
        await get().loadPresets(type)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to save preset:', error)
      return false
    }
  },

  updatePreset: async (type: PresetType, id: string, updates) => {
    try {
      const result = await window.electronAPI?.updatePreset?.(type, id, updates)
      if (result?.success) {
        await get().loadPresets(type)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update preset:', error)
      return false
    }
  },

  deletePreset: async (type: PresetType, id: string) => {
    try {
      const result = await window.electronAPI?.deletePreset(type, id)
      if (result?.success) {
        await get().loadPresets(type)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to delete preset:', error)
      return false
    }
  },

  exportConfig: async (modules: string[]) => {
    try {
      const result = await window.electronAPI?.exportConfig?.(modules, '')
      if (result?.success) {
        return { success: true, data: result.data }
      }
      return { success: false, error: result?.error || 'Export failed' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },

  importConfig: async (data: unknown, mode: string) => {
    try {
      const result = await window.electronAPI?.importConfig?.(data, mode)
      if (result?.success) {
        // Reload all presets
        await get().loadPresets('software')
        await get().loadPresets('input')
        await get().loadPresets('scene')
        return { success: true, result: result.result }
      }
      return { success: false, error: result?.error || 'Import failed' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}))