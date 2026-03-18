/**
 * ShareNet - Settings Panel
 * 系统设置面板 - 本机信息、网络、安全、日志等
 */

import { useState, useEffect, useRef } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Select from '@radix-ui/react-select'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { toast } from 'sonner'
import { useDeviceStore } from '../../stores/deviceStore'

interface Settings {
  deviceName: string
  deviceRole: 'controller' | 'controlled' | 'bidirectional'
  deviceTags: string[]
  udpPort: number
  tcpPort: number
  broadcastInterval: number
  allowControl: boolean
  requireConfirm: boolean
  ipWhitelist: string[]
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
}

type LogType = 'all' | 'run' | 'audit'

export function SettingsPanel() {
  const { setNetworkStatus, setNetworkError } = useDeviceStore()
  const [settings, setSettings] = useState<Settings>({
    deviceName: '',
    deviceRole: 'bidirectional',
    deviceTags: [],
    udpPort: 8888,
    tcpPort: 8889,
    broadcastInterval: 5000,
    allowControl: true,
    requireConfirm: false,
    ipWhitelist: [],
    logLevel: 'info'
  })
  const [tagsInput, setTagsInput] = useState('')

  const [logType, setLogType] = useState<LogType>('all')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false)
  const [storageUsage, setStorageUsage] = useState<{ totalSize: number; fileCount: number; formatted: string } | null>(null)

  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (isLogViewerOpen) {
      loadLogs()
    }
  }, [isLogViewerOpen, logType])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI?.getSettings()
      if (savedSettings) {
        const nextTags = savedSettings.device?.tags || []
        setSettings({
          deviceName: savedSettings.device?.name || '',
          deviceRole: savedSettings.device?.role || 'bidirectional',
          deviceTags: nextTags,
          udpPort: savedSettings.network?.udpPort || 8888,
          tcpPort: savedSettings.network?.tcpPort || 8889,
          broadcastInterval: savedSettings.network?.broadcastInterval || 5000,
          allowControl: savedSettings.security?.allowControl ?? true,
          requireConfirm: savedSettings.security?.confirmMode || false,
          ipWhitelist: savedSettings.security?.whitelist || [],
          logLevel: savedSettings.ui?.logLevel || 'info'
        })
        setTagsInput(nextTags.join(', '))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const parseTagsInput = (value: string) =>
    value
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)

  const handleSave = async () => {
    try {
      const parsedTags = parseTagsInput(tagsInput)
      await window.electronAPI?.setSettings({
        device: {
          name: settings.deviceName,
          role: settings.deviceRole,
          tags: parsedTags
        },
        network: {
          udpPort: settings.udpPort,
          tcpPort: settings.tcpPort,
          broadcastInterval: settings.broadcastInterval
        },
        security: {
          allowControl: settings.allowControl,
          whitelist: settings.ipWhitelist,
          confirmMode: settings.requireConfirm
        },
        ui: {
          theme: 'system',
          logLevel: settings.logLevel
        }
      })

      setNetworkStatus('启动中')
      setNetworkError(null)

      await window.electronAPI?.udpStop()
      await window.electronAPI?.tcpStop()

      const errors: { udp?: string; tcp?: string } = {}
      const udpResult = await window.electronAPI?.udpStart({ port: settings.udpPort })
      if (!udpResult?.success) {
        const message = udpResult?.error || 'Unknown UDP error'
        errors.udp = message.includes('EADDRINUSE')
          ? `UDP 端口 ${settings.udpPort} 已被占用`
          : `UDP 启动失败: ${message}`
      }

      if (!errors.udp) {
        const hostname = await window.electronAPI?.getHostname()
        await window.electronAPI?.udpInitLocalDevice({
          name: settings.deviceName || hostname || 'ShareNet',
          role: settings.deviceRole,
          tags: parsedTags,
          port: settings.tcpPort
        })
      }

      const tcpResult = await window.electronAPI?.tcpStart({ port: settings.tcpPort })
      if (!tcpResult?.success) {
        const message = tcpResult?.error || 'Unknown TCP error'
        errors.tcp = message.includes('EADDRINUSE')
          ? `TCP 端口 ${settings.tcpPort} 已被占用`
          : `TCP 启动失败: ${message}`
      }

      if (errors.udp || errors.tcp) {
        setNetworkStatus('异常')
        setNetworkError(errors)
        toast.error(`设置已保存，但网络服务启动失败：${errors.udp || errors.tcp}`)
      } else {
        setNetworkStatus('就绪')
        setNetworkError(null)
        toast.success('设置已保存并应用')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('保存失败')
    }
  }

  const loadLogs = async () => {
    const mockLogs: LogEntry[] = [
      { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Application started' },
      { id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'UDP service initialized on port 8888' },
      { id: '3', timestamp: new Date().toISOString(), level: 'info', message: 'TCP server started on port 8889' },
      { id: '4', timestamp: new Date().toISOString(), level: 'debug', message: 'Device discovery started' },
    ]
    setLogs(mockLogs)
  }

  const handleLogLevelChange = async (level: string) => {
    const newLevel = level as Settings['logLevel']
    setSettings((prev) => ({ ...prev, logLevel: newLevel }))

    try {
      await window.electronAPI?.setSetting('ui', { logLevel: newLevel })
    } catch (error) {
      console.error('Failed to set log level:', error)
    }
  }

  const handleOpenConfigDir = async () => {
    try {
      const userDataPath = await window.electronAPI?.getUserDataPath()
      console.log('Config directory:', userDataPath)
    } catch (error) {
      console.error('Failed to open config dir:', error)
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings({ ...settings, [key]: value })
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500'
      case 'warn': return 'text-yellow-500'
      case 'debug': return 'text-blue-500'
      default: return 'text-foreground'
    }
  }

  return (
    <section id="settings-panel" className="panel h-full">
      <Tabs.Root defaultValue="device" className="h-full flex flex-col">
        <Tabs.List className="flex border-b px-4">
          <Tabs.Trigger
            value="device"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            本机信息
          </Tabs.Trigger>
          <Tabs.Trigger
            value="network"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            网络
          </Tabs.Trigger>
          <Tabs.Trigger
            value="security"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            安全
          </Tabs.Trigger>
          <Tabs.Trigger
            value="logs"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary"
          >
            日志
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="device" className="flex-1 p-6 overflow-auto">
          <div className="settings-group space-y-4">
            <h3 className="text-lg font-semibold">本机信息</h3>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">设备名称</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded bg-background"
                placeholder="设备名称"
                value={settings.deviceName}
                onChange={(e) => updateSetting('deviceName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">角色</label>
              <Select.Root
                value={settings.deviceRole}
                onValueChange={(value) => updateSetting('deviceRole', value as Settings['deviceRole'])}
              >
                <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border rounded bg-background">
                  <Select.Value />
                  <Select.Icon />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-background border rounded shadow-lg z-50">
                    <Select.Viewport className="p-1">
                      <Select.Item value="controller" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                        <Select.ItemText>主控</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="controlled" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                        <Select.ItemText>被控</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="bidirectional" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                        <Select.ItemText>双向</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">标签</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded bg-background"
                placeholder="用逗号分隔多个标签（支持中英文逗号）"
                value={tagsInput}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setTagsInput(nextValue)
                  updateSetting('deviceTags', parseTagsInput(nextValue))
                }}
              />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="network" className="flex-1 p-6 overflow-auto">
          <div className="settings-group space-y-4">
            <h3 className="text-lg font-semibold">网络设置</h3>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">UDP 端口</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded bg-background"
                value={settings.udpPort}
                onChange={(e) => updateSetting('udpPort', parseInt(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">TCP 端口</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded bg-background"
                value={settings.tcpPort}
                onChange={(e) => updateSetting('tcpPort', parseInt(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">广播间隔 (毫秒)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded bg-background"
                value={settings.broadcastInterval}
                onChange={(e) => updateSetting('broadcastInterval', parseInt(e.target.value))}
              />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="security" className="flex-1 p-6 overflow-auto">
          <div className="settings-group space-y-4">
            <h3 className="text-lg font-semibold">安全设置</h3>
            <div className="form-group">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowControl}
                  onChange={(e) => updateSetting('allowControl', e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-sm">允许被控制</span>
              </label>
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireConfirm}
                  onChange={(e) => updateSetting('requireConfirm', e.target.checked)}
                  className="accent-primary"
                />
                <span className="text-sm">操作确认</span>
              </label>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">IP 白名单</label>
              <textarea
                className="w-full px-3 py-2 border rounded bg-background resize-none"
                placeholder="每行一个IP地址，留空表示允许所有"
                rows={4}
                value={settings.ipWhitelist.join('\n')}
                onChange={(e) => updateSetting('ipWhitelist', e.target.value.split('\n').map(ip => ip.trim()).filter(Boolean))}
              />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="logs" className="flex-1 p-4 overflow-hidden">
          <div className="logs-panel h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-sm">日志查看</h3>
              <div className="flex items-center gap-2">
                <Select.Root value={settings.logLevel} onValueChange={handleLogLevelChange}>
                  <Select.Trigger className="flex items-center gap-1 px-2 py-1 border rounded text-xs bg-background">
                    <Select.Value />
                    <Select.Icon>▼</Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-background border rounded shadow-lg z-50">
                      <Select.Viewport className="p-1">
                        <Select.Item value="debug" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded">
                          <Select.ItemText>Debug</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="info" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded">
                          <Select.ItemText>Info</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="warn" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded">
                          <Select.ItemText>Warn</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="error" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded">
                          <Select.ItemText>Error</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>

                <button
                  onClick={handleClearLogs}
                  className="px-2 py-1 text-xs border rounded hover:bg-secondary"
                >
                  清空
                </button>
                <button
                  onClick={handleOpenConfigDir}
                  className="px-2 py-1 text-xs border rounded hover:bg-secondary"
                >
                  打开目录
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {(['all', 'run', 'audit'] as LogType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setLogType(type)}
                  className={`px-3 py-1 text-xs rounded ${
                    logType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {type === 'all' ? '全部' : type === 'run' ? '运行日志' : '审计日志'}
                </button>
              ))}
            </div>

            <ScrollArea.Root className="flex-1 border rounded">
              <ScrollArea.Viewport className="h-full w-full">
                <div ref={logContainerRef} className="log-content p-2 font-mono text-xs space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">暂无日志</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`uppercase shrink-0 w-12 ${getLogLevelColor(log.level)}`}>
                          [{log.level}]
                        </span>
                        <span className={getLogLevelColor(log.level)}>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                className="flex select-none touch-none p-0.5 bg-secondary transition-colors hover:bg-background/50 data-[orientation=vertical]:w-2.5"
                orientation="vertical"
              >
                <ScrollArea.Thumb className="flex-1 bg-border rounded-full relative" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <div className="p-4 border-t bg-background">
        <button
          onClick={handleSave}
          className="w-full py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 font-medium"
        >
          保存设置
        </button>
      </div>
    </section>
  )
}
