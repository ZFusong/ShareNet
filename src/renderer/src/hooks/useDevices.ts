/**
 * ShareNet - useDevices Hook
 * 设备管理 Hook
 */

import { useCallback } from 'react'
import { useDeviceStore, type Device } from '../stores/deviceStore'

export function useDevices() {
  const {
    devices,
    localDevice,
    selectedDevices,
    filter,
    offlineDevices,
    hiddenDevices,
    deviceAliases,
    selectDevice,
    deselectDevice,
    setDevices,
    addDevice,
    updateDevice,
    removeDevice,
    setLocalDevice,
    toggleSelectDevice,
    selectAll,
    deselectAll,
    setFilter,
    hideDevice,
    unhideDevice,
    setDeviceAlias,
    removeDeviceAlias,
    getFilteredDevices,
    getSelectedDevicesList,
    getHiddenDevicesList
  } = useDeviceStore()

  // Refresh devices manually
  const refreshDevices = useCallback(async () => {
    const deviceList = await window.electronAPI?.udpGetDevices()
    if (deviceList) {
      setDevices(deviceList as Device[])
    }
  }, [setDevices])

  // Add device manually
  const addDeviceManually = useCallback(async (ip: string, name?: string) => {
    const trimmed = ip.trim()
    let host = trimmed
    let port = 0

    const parts = trimmed.split(':')
    if (parts.length === 2 && parts[0] && parts[1]) {
      host = parts[0]
      const parsed = Number(parts[1])
      port = Number.isFinite(parsed) ? parsed : 0
    }

    if (!port) {
      const savedSettings = await window.electronAPI?.getSettings()
      port = savedSettings?.network?.tcpPort ?? 8889
    }

    const savedSettings = await window.electronAPI?.getSettings()
    const localDevice =
      (await window.electronAPI?.udpGetLocalDevice()) || {
        id: 'local',
        name: savedSettings?.device?.name || (await window.electronAPI?.getHostname()) || 'ShareNet',
        ip: (await window.electronAPI?.getLocalIP()) || '127.0.0.1',
        port: savedSettings?.network?.tcpPort ?? 8889,
        role: savedSettings?.device?.role || 'bidirectional',
        tags: savedSettings?.device?.tags || [],
        status: 'online',
        lastSeen: Date.now()
      }

    const device: Device = {
      id: `manual-${host}:${port}`,
      name: name || `Device-${host}`,
      ip: host,
      port,
      role: 'controlled',
      tags: [],
      status: 'online',
      lastSeen: Date.now()
    }

    const result = await window.electronAPI?.udpAddDevice(device)
    const connectResult = await window.electronAPI?.tcpConnect(host, port, localDevice)
    if (!connectResult?.success) {
      console.warn('Failed to connect to device:', connectResult?.error || 'Unknown error')
    }
    return { ...result, connect: connectResult }
  }, [])

  // Remove device
  const removeDeviceById = useCallback(async (id: string) => {
    const result = await window.electronAPI?.udpRemoveDevice(id)
    if (result?.success) {
      removeDevice(id)
    }
    return result
  }, [removeDevice])

  // Update local device info
  const updateLocalDeviceInfo = useCallback(async (info: Partial<Device>) => {
    const result = await window.electronAPI?.udpUpdateLocalDevice(info)
    if (result?.success && localDevice) {
      setLocalDevice({ ...localDevice, ...info })
    }
    return result
  }, [localDevice, setLocalDevice])

  const filteredDevices = getFilteredDevices()
  const selectedDevicesList = getSelectedDevicesList()
  const hiddenDevicesList = getHiddenDevicesList()

  const persistDeviceSettings = useCallback(async (updates: { hiddenDevices?: Map<string, Device>; aliases?: Map<string, string> }) => {
    const settings = await window.electronAPI?.getSettings()
    const currentDevice = settings?.device || {}
    const nextHidden = updates.hiddenDevices ?? hiddenDevices
    const nextAliases = updates.aliases ?? deviceAliases
    const hiddenRecord: Record<string, Device> = {}
    for (const [key, device] of nextHidden) {
      hiddenRecord[key] = device
    }
    const aliasRecord: Record<string, string> = {}
    for (const [key, alias] of nextAliases) {
      aliasRecord[key] = alias
    }
    await window.electronAPI?.setSetting('device', {
      ...currentDevice,
      hiddenDevices: hiddenRecord,
      aliases: aliasRecord
    })
  }, [deviceAliases, hiddenDevices])

  const hideDeviceWithPersist = useCallback(async (device: Device) => {
    hideDevice(device)
    const nextHidden = new Map(hiddenDevices)
    nextHidden.set(`${device.ip}:${device.port}`, device)
    await persistDeviceSettings({ hiddenDevices: nextHidden })
  }, [hideDevice, hiddenDevices, persistDeviceSettings])

  const unhideDeviceWithPersist = useCallback(async (key: string) => {
    unhideDevice(key)
    const nextHidden = new Map(hiddenDevices)
    nextHidden.delete(key)
    await persistDeviceSettings({ hiddenDevices: nextHidden })
  }, [unhideDevice, hiddenDevices, persistDeviceSettings])

  const setAliasWithPersist = useCallback(async (key: string, alias: string) => {
    if (alias.trim()) {
      setDeviceAlias(key, alias)
    } else {
      removeDeviceAlias(key)
    }
    const nextAliases = new Map(deviceAliases)
    if (alias.trim()) {
      nextAliases.set(key, alias.trim())
    } else {
      nextAliases.delete(key)
    }
    await persistDeviceSettings({ aliases: nextAliases })
  }, [deviceAliases, persistDeviceSettings, removeDeviceAlias, setDeviceAlias])

  return {
    // State
    devices,
    localDevice,
    selectedDevices,
    filter,
    offlineDevices,
    hiddenDevices,
    deviceAliases,
    filteredDevices,
    selectedDevicesList,
    hiddenDevicesList,

    // Actions
    refreshDevices,
    addDeviceManually,
    removeDevice: removeDeviceById,
    updateLocalDeviceInfo,
    hideDevice: hideDeviceWithPersist,
    unhideDevice: unhideDeviceWithPersist,
    setAliasForDevice: setAliasWithPersist,
    toggleSelectDevice,
    selectDevice,
    deselectDevice,
    selectAll,
    deselectAll,
    setFilter
  }
}
