/**
 * ShareNet - Settings Panel
 * 系统设置面板 - 本机信息、网络、安全、日志等
 */

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useDeviceStore } from '../../stores/deviceStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs } from '@/components/ui/tabs'

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
  downloadDirectory: string
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
    logLevel: 'info',
    downloadDirectory: ''
  })
  const [tagsInput, setTagsInput] = useState('')
  const [logType, setLogType] = useState<LogType>('all')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [logType])

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
          logLevel: savedSettings.ui?.logLevel || 'info',
          downloadDirectory: savedSettings.downloads?.directory || ''
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
        },
        downloads: {
          directory: settings.downloadDirectory
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
      { id: '4', timestamp: new Date().toISOString(), level: 'debug', message: `Current log filter: ${logType}` }
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

  const handleChooseDownloadDirectory = async () => {
    try {
      const result = await window.electronAPI?.selectDirectory()
      if (result?.success && result.path) {
        setSettings((prev) => ({ ...prev, downloadDirectory: result.path || '' }))
      }
    } catch (error) {
      console.error('Failed to pick download directory:', error)
      toast.error('选择下载目录失败')
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500'
      case 'warn':
        return 'text-yellow-500'
      case 'debug':
        return 'text-blue-500'
      default:
        return 'text-foreground'
    }
  }

  return (
    <section id="settings-panel" className="panel h-full">
      <Tabs.Root defaultValue="device" className="h-full flex flex-col">
        <Tabs.List className="flex border-b px-4">
          <Tabs.Trigger value="device" className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary">
            本机信息
          </Tabs.Trigger>
          <Tabs.Trigger value="network" className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary">
            网络
          </Tabs.Trigger>
          <Tabs.Trigger value="security" className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary">
            安全
          </Tabs.Trigger>
          <Tabs.Trigger value="logs" className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary">
            日志
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="device" className="flex-1 p-6 overflow-auto">
          <div className="settings-group space-y-4">
            <h3 className="text-lg font-semibold">本机信息</h3>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">设备名称</label>
              <Input
                type="text"
                className="w-full"
                placeholder="设备名称"
                value={settings.deviceName}
                onChange={(e) => updateSetting('deviceName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">角色</label>
              <Select.Root value={settings.deviceRole} onValueChange={(value) => updateSetting('deviceRole', value as Settings['deviceRole'])}>
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
              <Input
                type="text"
                className="w-full"
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
              <Input type="number" className="w-full" value={settings.udpPort} onChange={(e) => updateSetting('udpPort', parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">TCP 端口</label>
              <Input type="number" className="w-full" value={settings.tcpPort} onChange={(e) => updateSetting('tcpPort', parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">广播间隔 (毫秒)</label>
              <Input type="number" className="w-full" value={settings.broadcastInterval} onChange={(e) => updateSetting('broadcastInterval', parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">下载目录</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  className="w-full"
                  placeholder="默认 Downloads/ShareNet"
                  value={settings.downloadDirectory}
                  onChange={(e) => updateSetting('downloadDirectory', e.target.value)}
                />
                <Button type="button" variant="outline" onClick={handleChooseDownloadDirectory} className="shrink-0">
                  浏览
                </Button>
              </div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="security" className="flex-1 p-6 overflow-auto">
          <div className="settings-group space-y-4">
            <h3 className="text-lg font-semibold">安全设置</h3>
            <div className="form-group">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={settings.allowControl} onCheckedChange={(checked) => updateSetting('allowControl', checked === true)} />
                <span className="text-sm">允许被控制</span>
              </label>
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={settings.requireConfirm} onCheckedChange={(checked) => updateSetting('requireConfirm', checked === true)} />
                <span className="text-sm">操作确认</span>
              </label>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">IP 白名单</label>
              <Textarea
                className="w-full resize-none"
                placeholder="每行一个IP地址，留空表示允许所有"
                rows={4}
                value={settings.ipWhitelist.join('\n')}
                onChange={(e) => updateSetting('ipWhitelist', e.target.value.split('\n').map((ip) => ip.trim()).filter(Boolean))}
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
                        <Select.Item value="debug" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded"><Select.ItemText>Debug</Select.ItemText></Select.Item>
                        <Select.Item value="info" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded"><Select.ItemText>Info</Select.ItemText></Select.Item>
                        <Select.Item value="warn" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded"><Select.ItemText>Warn</Select.ItemText></Select.Item>
                        <Select.Item value="error" className="px-3 py-1 text-sm cursor-pointer hover:bg-accent rounded"><Select.ItemText>Error</Select.ItemText></Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                <Button type="button" variant="outline" size="sm" onClick={handleClearLogs} className="h-8 px-2 text-xs">
                  清空
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleOpenConfigDir} className="h-8 px-2 text-xs">
                  打开目录
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {(['all', 'run', 'audit'] as LogType[]).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={logType === type ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setLogType(type)}
                  className="h-8 px-3 text-xs"
                >
                  {type === 'all' ? '全部' : type === 'run' ? '运行日志' : '审计日志'}
                </Button>
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
                        <span className="text-muted-foreground shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`uppercase shrink-0 w-12 ${getLogLevelColor(log.level)}`}>[{log.level}]</span>
                        <span className={getLogLevelColor(log.level)}>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </div>
        </Tabs.Content>

        <div className="border-t px-4 py-3 flex justify-end">
          <Button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium">
            保存设置
          </Button>
        </div>
      </Tabs.Root>
    </section>
  )
}
