/**
 * ShareNet - Console Panel
 * 操作台面板 - 发送触发器 Key
 */

import { useEffect, useMemo, useRef } from 'react'
import { useConfigStore } from '../../stores/configStore'
import { useConsoleStore } from '../../stores/consoleStore'
import { useDeviceStore } from '../../stores/deviceStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'

const getDeviceKey = (device: { ip: string; port: number }) => `${device.ip}:${device.port}`

export function ConsolePanel() {
  const logContainerRef = useRef<HTMLDivElement>(null)

  const { triggerBindings, loadPresets } = useConfigStore()
  const { devices, selectedDevices, deviceGroups, localDevice, deviceAliases } = useDeviceStore()
  const {
    targetMode,
    selectedGroupId,
    triggerKey,
    logs,
    setTargetMode,
    setSelectedGroupId,
    setResolvedDeviceKeys,
    setTriggerKey,
    addLog,
    clearLogs
  } = useConsoleStore()

  useEffect(() => {
    loadPresets('trigger')
  }, [loadPresets])

  useEffect(() => {
    window.electronAPI?.onTcpMessage((rawMessage: unknown) => {
      const message = (rawMessage || {}) as { msg_type?: string; payload?: Record<string, unknown> }
      if (message.msg_type !== 'EXECUTE_TRIGGER_RESULT') return
      const payload = message.payload || {}
      const key = String(payload.triggerKey || '')
      const sceneId = payload.sceneId ? String(payload.sceneId) : ''
      const text = String(payload.message || '')
      const ok = payload.ok === true
      addLog(`触发器回执${sceneId ? ` [${sceneId}]` : ''} ${key ? `(${key})` : ''}: ${text}`, ok ? 'success' : 'error')
    })
    return () => {
      window.electronAPI?.removeAllListeners('tcp-message')
    }
  }, [addLog])

  const selectedDeviceList = devices.filter((device) => selectedDevices.has(getDeviceKey(device)))
  const selectedGroup = deviceGroups.find((group) => group.id === selectedGroupId) || null
  const resolvedDevices =
    targetMode === 'selected-devices'
      ? selectedDeviceList
      : selectedGroup
        ? devices.filter((device) => selectedGroup.deviceKeys.includes(getDeviceKey(device)))
        : []

  const triggerOptions = useMemo(() => {
    const seen = new Set<string>()
    return triggerBindings
      .filter((binding) => binding.enabled)
      .map((binding) => binding.triggerKey.trim())
      .filter((key) => {
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [triggerBindings])

  useEffect(() => {
    setResolvedDeviceKeys(resolvedDevices.map((device) => getDeviceKey(device)))
  }, [resolvedDevices, setResolvedDeviceKeys])

  useEffect(() => {
    if (targetMode === 'device-group' && selectedGroupId && !selectedGroup) {
      setSelectedGroupId('')
    }
  }, [selectedGroup, selectedGroupId, setSelectedGroupId, targetMode])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const getDisplayName = (device: { id: string; ip: string; port: number; name: string }) => {
    const deviceKey = getDeviceKey(device)
    const alias = deviceAliases.get(deviceKey)
    if (alias) return alias
    if (!localDevice) return device.name
    const isLocal =
      localDevice.id === device.id ||
      (localDevice.ip === device.ip && localDevice.port === device.port)
    return isLocal ? localDevice.name : device.name
  }

  const handleSend = () => {
    const trimmedTriggerKey = triggerKey.trim()
    if (!trimmedTriggerKey) {
      addLog('请输入触发器 key', 'error')
      return
    }
    if (resolvedDevices.length === 0) {
      addLog(targetMode === 'selected-devices' ? '请先在设备列表勾选设备' : '请选择一个包含设备的分组', 'error')
      return
    }

    const offlineCount = resolvedDevices.filter((device) => device.status !== 'online').length
    if (offlineCount > 0) {
      addLog(`目标中有 ${offlineCount} 台设备离线，可能执行失败`, 'info')
    }

    const sender =
      localDevice || {
        id: 'local',
        name: 'Local',
        ip: '127.0.0.1',
        port: 0,
        role: 'bidirectional' as const,
        tags: [],
        status: 'online' as const,
        lastSeen: Date.now()
      }

    const send = async () => {
      let failed = 0
      for (const device of resolvedDevices) {
        const connected = await window.electronAPI?.tcpConnect(device.ip, device.port, sender)
        if (!connected?.success) {
          failed += 1
          addLog(`连接失败: ${getDisplayName(device)} (${device.ip}:${device.port})`, 'error')
          continue
        }

        const sent = await window.electronAPI?.tcpSend(device.ip, device.port, {
          msg_type: 'EXECUTE_TRIGGER',
          payload: { triggerKey: trimmedTriggerKey }
        })
        if (!sent?.success) {
          failed += 1
          addLog(`发送失败: ${getDisplayName(device)} (${device.ip}:${device.port})`, 'error')
        } else {
          addLog(`已发送触发器 ${trimmedTriggerKey} 到 ${getDisplayName(device)}`, 'success')
        }
      }

      if (failed > 0) {
        addLog(`触发器发送完成，失败 ${failed} 台`, 'error')
      } else {
        addLog(`触发器发送完成，共 ${resolvedDevices.length} 台`, 'success')
      }
    }

    void send()
  }

  return (
    <section id="console-panel" className="panel active h-full">
      <div className="h-full flex flex-col">
        <div className="flex-1 p-4 overflow-auto">
          <div className="command-panel space-y-4">
            <div className="rounded border p-3 space-y-3 bg-secondary/20">
              <div className="text-sm font-medium">目标设备</div>
              <RadioGroup
                value={targetMode}
                onValueChange={(value) => setTargetMode(value as 'selected-devices' | 'device-group')}
                className="flex flex-wrap gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="selected-devices" />
                  <span className="text-sm">选择设备</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="device-group" />
                  <span className="text-sm">设备分组</span>
                </label>
              </RadioGroup>

              {targetMode === 'device-group' && (
                <div className="max-w-sm">
                  <Select.Root value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border rounded bg-background text-sm">
                      <Select.Value placeholder="选择分组..." />
                      <Select.Icon />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-background border rounded shadow-lg z-50">
                        <Select.Viewport className="p-1">
                          {deviceGroups.map((group) => (
                            <Select.Item
                              key={group.id}
                              value={group.id}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded"
                            >
                              <Select.ItemText>{group.name}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {targetMode === 'selected-devices'
                    ? `已从设备列表读取 ${resolvedDevices.length} 台设备`
                    : selectedGroup
                      ? `分组「${selectedGroup.name}」包含 ${resolvedDevices.length} 台设备`
                      : '请先选择一个分组'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resolvedDevices.length > 0 ? (
                    resolvedDevices.map((device) => (
                      <span
                        key={device.id}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                          device.status === 'online' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <span>{getDisplayName(device)}</span>
                        <span className="opacity-75">{device.ip}:{device.port}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">暂无目标设备</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">触发器 Key</label>
              <Input
                value={triggerKey}
                onChange={(e) => setTriggerKey(e.target.value)}
                placeholder="例如: meeting-start"
                className="h-9 px-3 py-2 text-sm"
              />
              {triggerOptions.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return
                    setTriggerKey(e.target.value)
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="">从本机已配置触发器中选择...</option>
                  {triggerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
              <div className="text-xs text-muted-foreground">控制台只发送 triggerKey，远端设备会按自己的本地绑定执行场景。</div>
            </div>

            <div className="execution-options flex flex-wrap items-center gap-4">
              <Button onClick={clearLogs} variant="outline" className="px-3 py-2 text-sm">
                清空日志
              </Button>

              <Button
                onClick={handleSend}
                className="ml-auto px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                发送触发器
              </Button>
            </div>
          </div>

          <div className="execution-log mt-4">
            <h4 className="mb-2 font-medium text-sm">执行日志</h4>
            <div ref={logContainerRef} id="log-list" className="log-list h-[150px] overflow-y-auto border rounded p-2 text-sm space-y-1">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex gap-2 ${
                      log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-500' : 'text-foreground'
                    }`}
                  >
                    <span className="text-muted-foreground text-xs shrink-0">[{log.time}]</span>
                    <span>{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">暂无日志</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
