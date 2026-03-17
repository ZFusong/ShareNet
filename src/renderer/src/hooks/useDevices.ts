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
    setDevices,
    addDevice,
    updateDevice,
    removeDevice,
    setLocalDevice,
    toggleSelectDevice,
    selectAll,
    deselectAll,
    setFilter,
    getFilteredDevices,
    getSelectedDevicesList
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
    return result
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

  return {
    // State
    devices,
    localDevice,
    selectedDevices,
    filter,
    offlineDevices,
    filteredDevices,
    selectedDevicesList,

    // Actions
    refreshDevices,
    addDeviceManually,
    removeDevice: removeDeviceById,
    updateLocalDeviceInfo,
    toggleSelectDevice,
    selectAll,
    deselectAll,
    setFilter
  }
}
