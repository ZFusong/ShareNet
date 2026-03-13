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

interface DeviceState {
  devices: Device[]
  localDevice: Device | null
  selectedDevices: Set<string>
  filter: DeviceFilter
  offlineDevices: Map<string, Device>

  // Actions
  setDevices: (devices: Device[]) => void
  addDevice: (device: Device) => void
  updateDevice: (device: Device) => void
  removeDevice: (id: string) => void
  setLocalDevice: (device: Device | null) => void
  selectDevice: (id: string) => void
  deselectDevice: (id: string) => void
  toggleSelectDevice: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  setFilter: (filter: DeviceFilter) => void
  addOfflineDevice: (device: Device) => void

  // Getters
  getFilteredDevices: () => Device[]
  getSelectedDevicesList: () => Device[]
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  localDevice: null,
  selectedDevices: new Set(),
  filter: { type: 'all' },
  offlineDevices: new Map(),

  setDevices: (devices) => set({ devices }),

  addDevice: (device) =>
    set((state) => {
      const exists = state.devices.find((d) => d.id === device.id)
      if (exists) {
        return { devices: state.devices.map((d) => (d.id === device.id ? device : d)) }
      }
      return { devices: [...state.devices, device] }
    }),

  updateDevice: (device) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === device.id ? device : d))
    })),

  removeDevice: (id) =>
    set((state) => {
      const device = state.devices.find((d) => d.id === id)
      if (device) {
        // Add to offline cache
        const newOffline = new Map(state.offlineDevices)
        newOffline.set(id, { ...device, status: 'offline', lastSeen: Date.now() })
        return {
          devices: state.devices.filter((d) => d.id !== id),
          offlineDevices: newOffline,
          selectedDevices: new Set([...state.selectedDevices].filter((sid) => sid !== id))
        }
      }
      return state
    }),

  setLocalDevice: (device) => set({ localDevice: device }),

  selectDevice: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedDevices)
      newSelected.add(id)
      return { selectedDevices: newSelected }
    }),

  deselectDevice: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedDevices)
      newSelected.delete(id)
      return { selectedDevices: newSelected }
    }),

  toggleSelectDevice: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedDevices)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return { selectedDevices: newSelected }
    }),

  selectAll: () =>
    set((state) => ({
      selectedDevices: new Set(get().getFilteredDevices().map((d) => d.id))
    })),

  deselectAll: () => set({ selectedDevices: new Set() }),

  setFilter: (filter) => set({ filter }),

  addOfflineDevice: (device) =>
    set((state) => {
      const newOffline = new Map(state.offlineDevices)
      newOffline.set(device.id, device)
      return { offlineDevices: newOffline }
    }),

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
    return devices.filter((d) => selectedDevices.has(d.id))
  }
}))