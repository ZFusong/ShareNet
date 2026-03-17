/**
 * ShareNet - useNetwork Hook
 * Network services initialization and subscriptions
 */

import { useEffect } from 'react'
import { useDeviceStore, type Device } from '../stores/deviceStore'

export function useNetwork() {
  const {
    setDevices,
    addDevice,
    updateDevice,
    removeDevice,
    setLocalDevice,
    setHiddenDevices,
    setDeviceAliases,
    setNetworkStatus,
    setNetworkError
  } = useDeviceStore()

  useEffect(() => {
    const initNetwork = async () => {
      try {
        setNetworkStatus('启动中')
        setNetworkError(null)

        const savedSettings = await window.electronAPI?.getSettings()
        const udpPort = savedSettings?.network?.udpPort ?? 8888
        const tcpPort = savedSettings?.network?.tcpPort ?? 8889
        const hiddenRecord = (savedSettings?.device?.hiddenDevices as Record<string, Device>) || {}
        const aliasRecord = savedSettings?.device?.aliases || {}
        const hiddenMap = new Map<string, Device>()
        Object.entries(hiddenRecord).forEach(([key, device]) => {
          hiddenMap.set(key, device as Device)
        })
        const aliasMap = new Map<string, string>()
        Object.entries(aliasRecord).forEach(([key, alias]) => {
          aliasMap.set(key, alias)
        })
        setHiddenDevices(hiddenMap)
        setDeviceAliases(aliasMap)

        const errors: { udp?: string; tcp?: string } = {}

        const udpResult = await window.electronAPI?.udpStart({ port: udpPort })
        if (!udpResult?.success) {
          const message = udpResult?.error || 'Unknown UDP error'
          errors.udp = message.includes('EADDRINUSE')
            ? `UDP 端口 ${udpPort} 已被占用`
            : `UDP 启动失败: ${message}`
        }

        if (!errors.udp) {
          window.electronAPI?.udpSubscribe()

          const hostname = await window.electronAPI?.getHostname()

          await window.electronAPI?.udpInitLocalDevice({
            name: savedSettings?.device?.name || hostname || 'ShareNet',
            role: savedSettings?.device?.role || 'bidirectional',
            tags: savedSettings?.device?.tags || [],
            port: tcpPort
          })

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

          const initialDevices = await window.electronAPI?.udpGetDevices()
          if (initialDevices) {
            setDevices(initialDevices as Device[])
          }

          const local = await window.electronAPI?.udpGetLocalDevice()
          if (local) {
            setLocalDevice(local as Device)
          }
        }

        const tcpResult = await window.electronAPI?.tcpStart({ port: tcpPort })
        if (!tcpResult?.success) {
          const message = tcpResult?.error || 'Unknown TCP error'
          errors.tcp = message.includes('EADDRINUSE')
            ? `TCP 端口 ${tcpPort} 已被占用`
            : `TCP 启动失败: ${message}`
        }

        if (errors.udp || errors.tcp) {
          setNetworkStatus('异常')
          setNetworkError(errors)
        } else {
          setNetworkStatus('就绪')
          setNetworkError(null)
        }

        window.electronAPI?.onNetworkError?.((payload: { service: string; error: string }) => {
          const message = payload.error || 'Unknown error'
          const current = useDeviceStore.getState().networkError || {}
          setNetworkStatus('异常')
          setNetworkError({
            ...current,
            udp: payload.service === 'udp' ? message : current.udp,
            tcp: payload.service === 'tcp' ? message : current.tcp
          })
        })
      } catch (error) {
        console.error('Failed to initialize network services:', error)
        setNetworkStatus('异常')
        setNetworkError({ udp: String(error) })
      }
    }

    initNetwork()

    return () => {
      window.electronAPI?.udpStop()
      window.electronAPI?.tcpStop()
      window.electronAPI?.removeAllListeners?.('network-error')
    }
  }, [setDevices, addDevice, updateDevice, removeDevice, setLocalDevice, setHiddenDevices, setDeviceAliases, setNetworkStatus, setNetworkError])
}
