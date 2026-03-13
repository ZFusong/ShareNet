/**
 * ShareNet - useDevices Hook
 * 设备管理 Hook
 */

import { useEffect, useCallback } from 'react'
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

  // Initialize network services and subscribe to updates
  useEffect(() => {
    const initNetwork = async () => {
      try {
        // Start UDP service
        await window.electronAPI?.udpStart({ port: 8888 })

        // Initialize local device
        const hostname = await window.electronAPI?.getHostname()
        const localIP = await window.electronAPI?.getLocalIP()

        await window.electronAPI?.udpInitLocalDevice({
          name: hostname || 'ShareNet',
          role: 'bidirectional'
        })

        // Subscribe to device updates
        window.electronAPI?.onUdpDevicesUpdated((deviceList: unknown[]) => {
          setDevices(deviceList as Device[])
        })

        window.electronAPI?.onUdpDeviceAdded((device: unknown) => {
          addDevice(device as Device)
        })

        window.electronAPI?.onUdpDeviceUpdated((device: unknown) => {
          updateDevice(device as Device)
        })

        window.electronAPI?.onUdpDevicesRemoved((deviceList: unknown[]) => {
          deviceList.forEach((device) => {
            removeDevice((device as Device).id)
          })
        })

        // Get initial device list
        const initialDevices = await window.electronAPI?.udpGetDevices()
        if (initialDevices) {
          setDevices(initialDevices as Device[])
        }

        // Get local device
        const local = await window.electronAPI?.udpGetLocalDevice()
        if (local) {
          setLocalDevice(local as Device)
        }

        // Start TCP service
        await window.electronAPI?.tcpStart({ port: 8889 })
      } catch (error) {
        console.error('Failed to initialize network services:', error)
      }
    }

    initNetwork()

    // Cleanup on unmount
    return () => {
      window.electronAPI?.udpStop()
      window.electronAPI?.tcpStop()
    }
  }, [setDevices, addDevice, updateDevice, removeDevice, setLocalDevice])

  // Refresh devices manually
  const refreshDevices = useCallback(async () => {
    const deviceList = await window.electronAPI?.udpGetDevices()
    if (deviceList) {
      setDevices(deviceList as Device[])
    }
  }, [setDevices])

  // Add device manually
  const addDeviceManually = useCallback(async (ip: string, name?: string) => {
    const device: Device = {
      id: `manual-${ip}`,
      name: name || `Device-${ip}`,
      ip,
      port: 8889,
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