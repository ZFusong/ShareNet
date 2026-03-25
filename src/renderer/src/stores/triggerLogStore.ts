import { create } from 'zustand'

export type TriggerLogType = 'info' | 'success' | 'error'

export interface TriggerLogContext {
  source: 'console' | 'space'
  spaceId?: string
}

export interface TriggerLogEntry extends TriggerLogContext {
  id: string
  time: string
  message: string
  type: TriggerLogType
}

interface TriggerLogState {
  logs: TriggerLogEntry[]
  currentContext: TriggerLogContext | null
  setCurrentContext: (context: TriggerLogContext | null) => void
  addLog: (message: string, type?: TriggerLogType, context?: TriggerLogContext | null) => void
  clearAllLogs: () => void
  clearSpaceLogs: (spaceId: string) => void
}

export const useTriggerLogStore = create<TriggerLogState>((set) => ({
  logs: [],
  currentContext: null,

  setCurrentContext: (context) => set({ currentContext: context }),

  addLog: (message, type = 'info', context = null) =>
    set((state) => {
      const resolvedContext = context ?? state.currentContext ?? { source: 'console' as const }
      return {
        logs: [
          ...state.logs,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            time: new Date().toLocaleTimeString(),
            message,
            type,
            ...resolvedContext
          }
        ]
      }
    }),

  clearAllLogs: () => set({ logs: [] }),

  clearSpaceLogs: (spaceId) =>
    set((state) => ({
      logs: state.logs.filter((log) => log.spaceId !== spaceId)
    }))
}))
