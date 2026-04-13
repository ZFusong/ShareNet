/**
 * ShareNet - Console Panel
 * 操作台面板 - 发送触发器 Key
 */

import { useEffect, useRef } from 'react'
import { useConsoleStore } from '../../stores/consoleStore'
import { useDeviceStore } from '../../stores/deviceStore'
import { useTriggerLogStore } from '../../stores/triggerLogStore'
import { getDeviceKey, sendTriggerToDevices } from '../../lib/triggerDispatch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

type ModeOption = {
  value: 'selected-devices' | 'device-group'
  title: string
  summary: string
}

export function ConsolePanel() {
  const logContainerRef = useRef<HTMLDivElement>(null)

  const { devices, selectedDevices, deviceGroups, localDevice, deviceAliases } = useDeviceStore()
  const logs = useTriggerLogStore((state) => state.logs)
  const addLog = useTriggerLogStore((state) => state.addLog)
  const clearLogs = useTriggerLogStore((state) => state.clearAllLogs)
  const {
    targetMode,
    selectedGroupId,
    triggerKey,
    setTargetMode,
    setSelectedGroupId,
    setResolvedDeviceKeys,
    setTriggerKey
  } = useConsoleStore()

  const selectedDeviceList = devices.filter((device) => selectedDevices.has(getDeviceKey(device)))
  const selectedGroup = deviceGroups.find((group) => group.id === selectedGroupId) || null
  const resolvedDevices =
    targetMode === 'selected-devices'
      ? selectedDeviceList
      : selectedGroup
        ? devices.filter((device) => selectedGroup.deviceKeys.includes(getDeviceKey(device)))
        : []

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

  const latestLog = logs[logs.length - 1] ?? null
  const modeLabel = targetMode === 'selected-devices' ? '选择设备' : '设备分组'
  const triggerDisplay = triggerKey.trim() || '未填写 triggerKey'
  const resultDisplay = latestLog ? `${latestLog.type === 'error' ? '异常' : latestLog.type === 'success' ? '成功' : '状态'} · ${latestLog.time}` : '暂无发送记录'
  const resultMessage = latestLog?.message ?? '等待发送后展示最新结果'
  const hasTriggerKey = triggerKey.trim().length > 0
  const hasTargets = resolvedDevices.length > 0
  const blockingMessage = !hasTargets
    ? targetMode === 'selected-devices'
      ? '当前没有可发送目标，请先在设备列表勾选设备。'
      : '当前分组没有可用目标，请先选择一个包含设备的分组。'
    : !hasTriggerKey
      ? '请先输入 triggerKey，再执行发送。'
      : null

  const actionSummary = targetMode === 'selected-devices'
    ? `发送到 ${resolvedDevices.length} 台设备`
    : selectedGroup
      ? `发送到分组「${selectedGroup.name}」 / ${resolvedDevices.length} 台设备`
      : '请先选择设备分组'

  const modeOptions: ModeOption[] = [
    {
      value: 'selected-devices',
      title: '选择设备',
      summary: `已解析 ${selectedDeviceList.length} 台设备`
    },
    {
      value: 'device-group',
      title: '设备分组',
      summary: selectedGroup ? `当前分组 ${resolvedDevices.length} 台设备` : '请选择一个设备分组'
    }
  ]

  const handleSend = () => {
    if (resolvedDevices.length === 0) {
      addLog(
        targetMode === 'selected-devices' ? '请先在设备列表勾选设备' : '请选择一个包含设备的分组',
        'error',
        { source: 'console' }
      )
      return
    }
    void sendTriggerToDevices({
      devices: resolvedDevices,
      triggerKey,
      localDevice,
      context: { source: 'console' },
      getDisplayName
    })
  }

  return (
    <section id="console-panel" className="panel active h-full">
      <div className="console-cockpit h-full">
        <div className="console-overview" style={{display:'none'}}>
            <article className="console-overview-card">
              <span className="console-overview-card__label">目标</span>
              <strong className="console-overview-card__value">
                {modeLabel} / {resolvedDevices.length} 台
              </strong>
              <span className="console-overview-card__meta">
                {targetMode === 'selected-devices'
                  ? '来自当前设备选择'
                  : selectedGroup
                    ? `分组「${selectedGroup.name}」`
                    : '等待选择分组'}
              </span>
            </article>

            <article className="console-overview-card">
              <span className="console-overview-card__label">TriggerKey</span>
              <strong className="console-overview-card__value console-overview-card__value--code">
                {triggerDisplay}
              </strong>
              <span className="console-overview-card__meta">当前发送内容</span>
            </article>

            <article className="console-overview-card">
              <span className="console-overview-card__label">最近结果</span>
              <strong className="console-overview-card__value">{resultDisplay}</strong>
              <span className="console-overview-card__meta">{resultMessage}</span>
            </article>
        </div>

        <div className="console-layout">
          <div className="console-target-section ">
            <section className="console-card-target console-card--target flex-1">
                <div className="console-card__header">
                  <h3 className="console-card__title">目标设备</h3>
                </div>

                <div className="console-mode-grid">
                  {modeOptions.map((option) => {
                    const active = option.value === targetMode

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`console-mode-card ${active ? 'is-active' : ''}`}
                        onClick={() => setTargetMode(option.value)}
                      >
                        <span className="console-mode-card__title">{option.title}</span>
                        <span className="console-mode-card__summary">{option.summary}</span>
                      </button>
                    )
                  })}
                </div>

                {targetMode === 'device-group' && (
                  <div className="console-group-picker">
                    <div className="console-card__subhead">
                      <span>目标分组</span>
                      <span>{selectedGroup ? `${resolvedDevices.length} 台设备` : '未选择'}</span>
                    </div>
                    <Select.Root value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <Select.Trigger className="h-11 w-full rounded-xl border border-border/80 bg-background px-4 text-sm">
                        <Select.Value placeholder="选择设备分组..." />
                        <Select.Icon />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-background border rounded-xl shadow-lg z-50">
                          <Select.Viewport className="p-1">
                            {deviceGroups.map((group) => (
                              <Select.Item
                                key={group.id}
                                value={group.id}
                                className="py-2 text-sm"
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
            </section>

            <span className="console-card-split"></span>

            <section className="console-card-target console-card--selection">
              <div className="console-card__header">
                <h3 className="console-card__title">已选设备</h3>
                <div className="console-send-summary">{actionSummary}</div>
              </div>

              <div className="console-device-echo">
                {resolvedDevices.length > 0 ? (
                  resolvedDevices.map((device) => (
                    <article
                      key={device.id}
                      className={`console-device-echo__item ${device.status === 'online' ? 'is-online' : 'is-muted'}`}
                    >
                      <div className="console-device-echo__top">
                        <strong>{getDisplayName(device)}</strong>
                        <span>{device.status === 'online' ? '在线' : device.status === 'busy' ? '忙碌' : '离线'}</span>
                      </div>
                      <span className="console-device-echo__meta">
                        {device.ip}:{device.port}
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="console-empty-panel">暂无目标设备，右侧将在解析到目标后显示设备范围。</div>
                )}
              </div>
            </section>
          </div>

          <div className="console-action-section">
            <section className="console-card console-card--send">
                <div className="console-card__header">
                  <h3 className="console-card__title">发送触发器</h3>
                  <Button
                      onClick={handleSend}
                      className="console-send-button h-11 rounded-xl px-5 text-sm font-semibold"
                    >
                      发送触发器
                    </Button>
                </div>

                <div className="console-send-stack">
                  <div className="console-input-shell">
                    <Input
                      id="console-trigger-key"
                      value={triggerKey}
                      onChange={(e) => setTriggerKey(e.target.value)}
                      placeholder="例如: meeting-start"
                      className="console-input-shell__input border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                    />
                  </div>

                  {blockingMessage ? (
                    <div className="console-inline-alert console-inline-alert--warning">{blockingMessage}</div>
                  ) : null}
                </div>
            </section>

            <section className="console-card console-card--log">
                <div className="console-card__header">
                  <h3 className="console-card__title">执行日志</h3>
                  <Button onClick={clearLogs} variant="outline" className="h-9 rounded-lg px-3 text-xs">
                    清空日志
                  </Button>
                </div>

                <div ref={logContainerRef} id="log-list" className="console-log-list">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <article key={log.id} className={`console-log-entry is-${log.type}`}>
                        <div className="console-log-entry__meta">
                          <span>{log.time}</span>
                          <span>{log.type === 'error' ? '异常' : log.type === 'success' ? '成功' : '信息'}</span>
                        </div>
                        <div className="console-log-entry__message">{log.message}</div>
                      </article>
                    ))
                  ) : (
                    <div className="console-empty-panel">暂无日志，发送触发器后会在这里展示实时反馈。</div>
                  )}
                </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
