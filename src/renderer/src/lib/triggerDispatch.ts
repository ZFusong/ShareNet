import type { Device } from '../stores/deviceStore'
import type { TriggerLogContext } from '../stores/triggerLogStore'
import { useTriggerLogStore } from '../stores/triggerLogStore'

export const getDeviceKey = (device: Pick<Device, 'ip' | 'port'>) => `${device.ip}:${device.port}`

type LogType = 'info' | 'success' | 'error'

interface TriggerDispatchOptions {
  devices: Device[]
  triggerKey: string
  localDevice: Device | null
  context?: TriggerLogContext | null
  getDisplayName?: (device: Device) => string
}

const getFallbackSender = (): Device => ({
  id: 'local',
  name: 'Local',
  ip: '127.0.0.1',
  port: 0,
  role: 'bidirectional',
  tags: [],
  status: 'online',
  lastSeen: Date.now()
})

export async function sendTriggerToDevices({
  devices,
  triggerKey,
  localDevice,
  context = null,
  getDisplayName
}: TriggerDispatchOptions): Promise<void> {
  const { addLog, setCurrentContext } = useTriggerLogStore.getState()
  setCurrentContext(context)

  const trimmedTriggerKey = triggerKey.trim()
  if (!trimmedTriggerKey) {
    addLog('请输入触发器 key', 'error', context)
    return
  }

  if (devices.length === 0) {
    addLog('暂无目标设备', 'error', context)
    return
  }

  const offlineCount = devices.filter((device) => device.status !== 'online').length
  if (offlineCount > 0) {
    addLog(`目标中有 ${offlineCount} 台设备离线，可能执行失败`, 'info', context)
  }

  const sender = localDevice || getFallbackSender()
  let failed = 0

  for (const device of devices) {
    const label = getDisplayName ? getDisplayName(device) : device.name
    const connected = await window.electronAPI?.tcpConnect(device.ip, device.port, sender)
    if (!connected?.success) {
      failed += 1
      addLog(`连接失败: ${label} (${device.ip}:${device.port})`, 'error', context)
      continue
    }

    const sent = await window.electronAPI?.tcpSend(device.ip, device.port, {
      msg_type: 'EXECUTE_TRIGGER',
      payload: { triggerKey: trimmedTriggerKey }
    })

    if (!sent?.success) {
      failed += 1
      addLog(`发送失败: ${label} (${device.ip}:${device.port})`, 'error', context)
      continue
    }

    addLog(`已发送触发器 ${trimmedTriggerKey} 到 ${label}`, 'success', context)
  }

  if (failed > 0) {
    addLog(`触发器发送完成，失败 ${failed} 台`, 'error', context)
    return
  }

  addLog(`触发器发送完成，共 ${devices.length} 台`, 'success', context)
}
