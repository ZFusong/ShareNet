/**
 * ShareNet - Device Store
 * 设备状态管理
 */

import { create } from 'zustand'

export interface Device {
  id: string
  name: string
  ip: string
  port: number
  role: 'controller' | 'controlled' | 'bidirectional'
  tags: string[]
  status: 'online' | 'offline' | 'busy'
  lastSeen: number
  avatar?: string
}

export interface DeviceFilter {
  type: 'all' | 'controller' | 'controlled' | 'bidirectional' | 'tag'
  tag?: string
}

export interface DeviceGroup {
  id: string
  name: string
  deviceKeys: string[]
}

const getDeviceKey = (device: Pick<Device, 'ip' | 'port'>) => `${device.ip}:${device.port}`

const findHiddenKeyById = (id: string, hiddenDevices: Map<string, Device>) => {
  for (const [key, device] of hiddenDevices) {
    if (device.id === id) return key
  }
  return null
}

interface DeviceState {
  devices: Device[]
  localDevice: Device | null
  selectedDevices: Set<string>
  filter: DeviceFilter
  offlineDevices: Map<string, Device>
  hiddenDevices: Map<string, Device>
  persistentDevices: Map<string, Device>
  deviceGroups: DeviceGroup[]
  deviceAliases: Map<string, string>
  networkStatus: string
  networkError: { udp?: string; tcp?: string } | null
  deviceStatusCheckCount: number

  // Actions
  setDevices: (devices: Device[]) => void
  setHiddenDevices: (devices: Map<string, Device>) => void
  setPersistentDevices: (devices: Map<string, Device>) => void
  addPersistentDevice: (device: Device) => void
  removePersistentDevice: (key: string) => void
  setDeviceGroups: (groups: DeviceGroup[]) => void
  addDeviceGroup: (group: DeviceGroup) => void
  updateDeviceGroup: (groupId: string, updates: Partial<DeviceGroup>) => void
  deleteDeviceGroup: (groupId: string) => void
  addDeviceToGroup: (groupId: string, key: string) => void
  removeDeviceFromGroup: (groupId: string, key: string) => void
  setDeviceAliases: (aliases: Map<string, string>) => void
  setDeviceAlias: (key: string, alias: string) => void
  removeDeviceAlias: (key: string) => void
  addDevice: (device: Device) => void
  updateDevice: (device: Device) => void
  removeDevice: (id: string) => void
  setLocalDevice: (device: Device | null) => void
  selectDevice: (deviceKey: string) => void
  deselectDevice: (deviceKey: string) => void
  toggleSelectDevice: (deviceKey: string) => void
  selectAll: () => void
  deselectAll: () => void
  setFilter: (filter: DeviceFilter) => void
  addOfflineDevice: (device: Device) => void
  hideDevice: (device: Device) => void
  unhideDevice: (key: string) => void
  setNetworkStatus: (status: string) => void
  setNetworkError: (error: { udp?: string; tcp?: string } | null) => void
  beginDeviceStatusCheck: () => void
  endDeviceStatusCheck: () => void

  // Getters
  getFilteredDevices: () => Device[]
  getSelectedDevicesList: () => Device[]
  getHiddenDevicesList: () => Device[]
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  localDevice: null,
  selectedDevices: new Set(),
  filter: { type: 'all' },
  offlineDevices: new Map(),
  hiddenDevices: new Map(),
  persistentDevices: new Map(),
  deviceGroups: [],
  deviceAliases: new Map(),
  networkStatus: '就绪',
  networkError: null,
  deviceStatusCheckCount: 0,

  setDevices: (devices) =>
    set((state) => {
      const nextHidden = new Map(state.hiddenDevices)
      const merged = new Map<string, Device>()
      state.persistentDevices.forEach((device, key) => {
        merged.set(key, device)
      })
      devices.forEach((device) => {
        merged.set(getDeviceKey(device), device)
      })
      const visible: Device[] = []

      merged.forEach((device, key) => {
        if (nextHidden.has(key)) {
          const existing = nextHidden.get(key)
          nextHidden.set(key, { ...existing, ...device })
        } else {
          visible.push(device)
        }
      })

      return { devices: visible, hiddenDevices: nextHidden }
    }),

  setHiddenDevices: (devices) => set({ hiddenDevices: devices }),
  setPersistentDevices: (devices) =>
    set((state) => {
      const nextHidden = new Map(state.hiddenDevices)
      const nextDevices = [...state.devices]
      devices.forEach((device, key) => {
        if (nextHidden.has(key)) {
          const existing = nextHidden.get(key)
          nextHidden.set(key, { ...existing, ...device })
        } else if (!nextDevices.find((d) => getDeviceKey(d) === key)) {
          nextDevices.push(device)
        }
      })
      return { persistentDevices: devices, devices: nextDevices, hiddenDevices: nextHidden }
    }),
  addPersistentDevice: (device) =>
    set((state) => {
      const key = getDeviceKey(device)
      const nextPersistent = new Map(state.persistentDevices)
      nextPersistent.set(key, device)
      if (state.hiddenDevices.has(key)) {
        const nextHidden = new Map(state.hiddenDevices)
        const existing = nextHidden.get(key)
        nextHidden.set(key, { ...existing, ...device })
        return { persistentDevices: nextPersistent, hiddenDevices: nextHidden }
      }
      const exists = state.devices.find((d) => getDeviceKey(d) === key)
      return {
        persistentDevices: nextPersistent,
        devices: exists ? state.devices.map((d) => (getDeviceKey(d) === key ? { ...d, ...device } : d)) : [...state.devices, device]
      }
    }),
  removePersistentDevice: (key) =>
    set((state) => {
      if (!state.persistentDevices.has(key)) return state
      const nextPersistent = new Map(state.persistentDevices)
      nextPersistent.delete(key)
      return { persistentDevices: nextPersistent }
    }),
  setDeviceGroups: (groups) => set({ deviceGroups: groups }),
  addDeviceGroup: (group) =>
    set((state) => ({
      deviceGroups: [...state.deviceGroups, group]
    })),
  updateDeviceGroup: (groupId, updates) =>
    set((state) => ({
      deviceGroups: state.deviceGroups.map((group) =>
        group.id === groupId ? { ...group, ...updates } : group
      )
    })),
  deleteDeviceGroup: (groupId) =>
    set((state) => ({
      deviceGroups: state.deviceGroups.filter((group) => group.id !== groupId)
    })),
  addDeviceToGroup: (groupId, key) =>
    set((state) => ({
      deviceGroups: state.deviceGroups.map((group) =>
        group.id === groupId && !group.deviceKeys.includes(key)
          ? { ...group, deviceKeys: [...group.deviceKeys, key] }
          : group
      )
    })),
  removeDeviceFromGroup: (groupId, key) =>
    set((state) => ({
      deviceGroups: state.deviceGroups.map((group) =>
        group.id === groupId
          ? { ...group, deviceKeys: group.deviceKeys.filter((deviceKey) => deviceKey !== key) }
          : group
      )
    })),
  setDeviceAliases: (aliases) => set({ deviceAliases: aliases }),
  setDeviceAlias: (key, alias) =>
    set((state) => {
      const next = new Map(state.deviceAliases)
      if (alias.trim()) {
        next.set(key, alias.trim())
      } else {
        next.delete(key)
      }
      return { deviceAliases: next }
    }),
  removeDeviceAlias: (key) =>
    set((state) => {
      const next = new Map(state.deviceAliases)
      next.delete(key)
      return { deviceAliases: next }
    }),

  addDevice: (device) =>
    set((state) => {
      const key = getDeviceKey(device)
      const nextPersistent = new Map(state.persistentDevices)
      if (nextPersistent.has(key)) {
        const existingPersistent = nextPersistent.get(key)
        nextPersistent.set(key, { ...existingPersistent, ...device })
      }
      if (state.hiddenDevices.has(key)) {
        const nextHidden = new Map(state.hiddenDevices)
        const existing = nextHidden.get(key)
        nextHidden.set(key, { ...existing, ...device })
        return { hiddenDevices: nextHidden, persistentDevices: nextPersistent }
      }
      const exists = state.devices.find((d) => d.id === device.id)
      if (exists) {
        return {
          devices: state.devices.map((d) => (d.id === device.id ? device : d)),
          persistentDevices: nextPersistent
        }
      }
      const sameAddress = state.devices.find((d) => getDeviceKey(d) === key)
      if (sameAddress) {
        return {
          devices: state.devices.map((d) =>
            getDeviceKey(d) === key ? { ...d, ...device, id: d.id } : d
          ),
          persistentDevices: nextPersistent
        }
      }
      return { devices: [...state.devices, device], persistentDevices: nextPersistent }
    }),

  updateDevice: (device) =>
    set((state) => {
      const key = getDeviceKey(device)
      const nextPersistent = new Map(state.persistentDevices)
      if (nextPersistent.has(key)) {
        const existingPersistent = nextPersistent.get(key)
        nextPersistent.set(key, { ...existingPersistent, ...device })
      }
      if (state.hiddenDevices.has(key)) {
        const nextHidden = new Map(state.hiddenDevices)
        const existing = nextHidden.get(key)
        nextHidden.set(key, { ...existing, ...device })
        return { hiddenDevices: nextHidden, persistentDevices: nextPersistent }
      }

      return {
        devices: state.devices.map((d) => {
          if (d.id === device.id) return device
          if (getDeviceKey(d) === key) return { ...d, ...device, id: d.id }
          return d
        }),
        persistentDevices: nextPersistent
      }
    }),

  removeDevice: (id) =>
    set((state) => {
      const device = state.devices.find((d) => d.id === id)
      if (device) {
        const key = getDeviceKey(device)
        if (state.persistentDevices.has(key)) {
          return {
            devices: state.devices.map((d) =>
              d.id === id ? { ...d, status: 'offline', lastSeen: Date.now() } : d
            ),
            selectedDevices: new Set([...state.selectedDevices].filter((deviceKey) => deviceKey !== key))
          }
        }
        // Add to offline cache
        const newOffline = new Map(state.offlineDevices)
        newOffline.set(id, { ...device, status: 'offline', lastSeen: Date.now() })
        return {
          devices: state.devices.filter((d) => d.id !== id),
          offlineDevices: newOffline,
          selectedDevices: new Set([...state.selectedDevices].filter((deviceKey) => deviceKey !== key))
        }
      }
      const hiddenKey = findHiddenKeyById(id, state.hiddenDevices)
      if (hiddenKey) {
        const nextHidden = new Map(state.hiddenDevices)
        const hiddenDevice = nextHidden.get(hiddenKey)
        if (hiddenDevice) {
          nextHidden.set(hiddenKey, { ...hiddenDevice, status: 'offline', lastSeen: Date.now() })
        }
        return { hiddenDevices: nextHidden }
      }
      return state
    }),

  setLocalDevice: (device) => set({ localDevice: device }),

  selectDevice: (deviceKey) =>
    set((state) => {
      const newSelected = new Set(state.selectedDevices)
      newSelected.add(deviceKey)
      return { selectedDevices: newSelected }
    }),

  deselectDevice: (deviceKey) =>
    set((state) => {
      const newSelected = new Set(state.selectedDevices)
      newSelected.delete(deviceKey)
      return { selectedDevices: newSelected }
    }),

  toggleSelectDevice: (deviceKey) =>
    set((state) => {
      const newSelected = new Set(state.selectedDevices)
      if (newSelected.has(deviceKey)) {
        newSelected.delete(deviceKey)
      } else {
        newSelected.add(deviceKey)
      }
      return { selectedDevices: newSelected }
    }),

  selectAll: () =>
    set((state) => ({
      selectedDevices: new Set(get().getFilteredDevices().map((d) => getDeviceKey(d)))
    })),

  deselectAll: () => set({ selectedDevices: new Set() }),

  setFilter: (filter) => set({ filter }),

  addOfflineDevice: (device) =>
    set((state) => {
      const newOffline = new Map(state.offlineDevices)
      newOffline.set(device.id, device)
      return { offlineDevices: newOffline }
    }),

  hideDevice: (device) =>
    set((state) => {
      const key = getDeviceKey(device)
      const nextHidden = new Map(state.hiddenDevices)
      nextHidden.set(key, device)
      const nextSelected = new Set(state.selectedDevices)
      nextSelected.delete(key)
      return {
        hiddenDevices: nextHidden,
        devices: state.devices.filter((d) => d.id !== device.id),
        selectedDevices: nextSelected
      }
    }),

  unhideDevice: (key) =>
    set((state) => {
      const nextHidden = new Map(state.hiddenDevices)
      const device = nextHidden.get(key)
      if (!device) return state
      nextHidden.delete(key)
      const exists = state.devices.find((d) => d.id === device.id)
      return {
        hiddenDevices: nextHidden,
        devices: exists ? state.devices : [...state.devices, device]
      }
    }),

  setNetworkStatus: (status) => set({ networkStatus: status }),
  setNetworkError: (error) => set({ networkError: error }),
  beginDeviceStatusCheck: () =>
    set((state) => ({ deviceStatusCheckCount: state.deviceStatusCheckCount + 1 })),
  endDeviceStatusCheck: () =>
    set((state) => ({ deviceStatusCheckCount: Math.max(0, state.deviceStatusCheckCount - 1) })),

  getFilteredDevices: () => {
    const { devices, filter } = get()
    return devices.filter((device) => {
      switch (filter.type) {
        case 'all':
          return true
        case 'controller':
          return device.role === 'controller'
        case 'controlled':
          return device.role === 'controlled'
        case 'bidirectional':
          return device.role === 'bidirectional'
        case 'tag':
          return filter.tag ? device.tags.includes(filter.tag) : true
        default:
          return true
      }
    })
  },

  getSelectedDevicesList: () => {
    const { devices, selectedDevices } = get()
    return devices.filter((d) => selectedDevices.has(getDeviceKey(d)))
  },

  getHiddenDevicesList: () => Array.from(get().hiddenDevices.values())
}))
