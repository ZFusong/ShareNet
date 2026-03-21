import { create } from 'zustand'

export type ConsoleTargetMode = 'selected-devices' | 'device-group'

export interface ConsoleLog {
  id: string
  time: string
  message: string
  type: 'info' | 'success' | 'error'
}

interface ConsoleState {
  targetMode: ConsoleTargetMode
  selectedGroupId: string
  resolvedDeviceKeys: string[]
  triggerKey: string
  logs: ConsoleLog[]
  setTargetMode: (mode: ConsoleTargetMode) => void
  setSelectedGroupId: (groupId: string) => void
  setResolvedDeviceKeys: (keys: string[]) => void
  setTriggerKey: (key: string) => void
  addLog: (message: string, type?: ConsoleLog['type']) => void
  clearLogs: () => void
}

const sameKeys = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

export const useConsoleStore = create<ConsoleState>((set) => ({
  targetMode: 'selected-devices',
  selectedGroupId: '',
  resolvedDeviceKeys: [],
  triggerKey: '',
  logs: [],

  setTargetMode: (mode) => {
    set((state) => ({
      targetMode: mode,
      selectedGroupId: mode === 'selected-devices' ? '' : state.selectedGroupId
    }))
  },

  setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),

  setResolvedDeviceKeys: (keys) =>
    set((state) => {
      if (sameKeys(state.resolvedDeviceKeys, keys)) return state
      return { resolvedDeviceKeys: keys }
    }),

  setTriggerKey: (key) => set({ triggerKey: key }),

  addLog: (message, type = 'info') =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          time: new Date().toLocaleTimeString(),
          message,
          type
        }
      ]
    })),

  clearLogs: () => set({ logs: [] })
}))
