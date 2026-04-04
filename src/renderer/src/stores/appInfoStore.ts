import { create } from 'zustand'
import staticConfig from '@/app-info.json'

export interface AppInfo {
  name: string
  version: string
  description: string
  author: string
  license: string
  homepage: string
  electron: string
  node: string
  platform: string
  platformLabel: string
  techStack: Array<{ name: string; version?: string; color: string }>
}

interface AppState {
  appInfo: AppInfo | null
  initialized: boolean
  init: () => Promise<void>
}

const resolvePlatformLabel = (platform: string) => {
  const map: Record<string, string> = {
    win32: 'Windows',
    darwin: 'macOS',
    linux: 'Linux',
  }
  return map[platform] || platform
}

export const useAppInfoStore = create<AppState>((set, get) => ({
  appInfo: null,
  initialized: false,

  init: async () => {
    if (get().initialized) return

    try {
      const runtimeInfo = await window.electronAPI?.getAppInfo()

      const techStack = staticConfig.techStack.map((item) => {
        if (item.name === 'Electron' && !item.version && runtimeInfo?.electron) {
          return { ...item, version: runtimeInfo.electron }
        }
        if (item.name === 'Node.js' && !item.version && runtimeInfo?.node) {
          return { ...item, version: runtimeInfo.node }
        }
        return item
      })

      const appInfo: AppInfo = {
        name: staticConfig.name,
        version: runtimeInfo?.version ?? '',
        description: staticConfig.description,
        author: staticConfig.author,
        license: staticConfig.license,
        homepage: staticConfig.homepage,
        electron: runtimeInfo?.electron ?? '',
        node: runtimeInfo?.node ?? '',
        platform: runtimeInfo?.platform ?? '',
        platformLabel: resolvePlatformLabel(runtimeInfo?.platform ?? ''),
        techStack,
      }

      set({ appInfo, initialized: true })
    } catch (err) {
      console.error('[appInfoStore] init failed:', err)
    }
  },
}))
