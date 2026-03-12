import { useState, useEffect } from 'react'

interface Settings {
  deviceName: string
  deviceRole: string
  deviceTags: string
  udpPort: number
  tcpPort: number
  broadcastInterval: number
  allowControl: boolean
  requireConfirm: boolean
  ipWhitelist: string
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    deviceName: '',
    deviceRole: 'both',
    deviceTags: '',
    udpPort: 8888,
    tcpPort: 8889,
    broadcastInterval: 5000,
    allowControl: true,
    requireConfirm: false,
    ipWhitelist: ''
  })

  useEffect(() => {
    // Load settings from store
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI?.getConfig('settings')
      if (savedSettings) {
        setSettings({ ...settings, ...(savedSettings as Settings) })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSave = async () => {
    try {
      await window.electronAPI?.setConfig('settings', settings)
      alert('设置已保存')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('保存失败')
    }
  }

  const handleViewLogs = () => {
    // TODO: Open log viewer
    console.log('Viewing logs...')
  }

  const handleOpenConfigDir = async () => {
    try {
      const userDataPath = await window.electronAPI?.getUserDataPath()
      console.log('Config directory:', userDataPath)
      // TODO: Open in file explorer
    } catch (error) {
      console.error('Failed to open config dir:', error)
    }
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings({ ...settings, [key]: value })
  }

  return (
    <section id="settings-panel" className="panel">
      <div className="settings-content p-6 overflow-y-auto h-full">
        {/* Local Device Info */}
        <div className="settings-group mb-6">
          <h3 className="text-lg font-semibold mb-4">本机信息</h3>
          <div className="form-group">
            <label>设备名称</label>
            <input
              type="text"
              id="device-name"
              placeholder="设备名称"
              value={settings.deviceName}
              onChange={(e) => updateSetting('deviceName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>角色</label>
            <select
              id="device-role"
              value={settings.deviceRole}
              onChange={(e) => updateSetting('deviceRole', e.target.value)}
            >
              <option value="master">主控</option>
              <option value="slave">被控</option>
              <option value="both">双向</option>
            </select>
          </div>
          <div className="form-group">
            <label>标签</label>
            <input
              type="text"
              id="device-tags"
              placeholder="标签，用逗号分隔"
              value={settings.deviceTags}
              onChange={(e) => updateSetting('deviceTags', e.target.value)}
            />
          </div>
        </div>

        {/* Network Settings */}
        <div className="settings-group mb-6">
          <h3 className="text-lg font-semibold mb-4">网络设置</h3>
          <div className="form-group">
            <label>UDP 端口</label>
            <input
              type="number"
              id="udp-port"
              value={settings.udpPort}
              onChange={(e) => updateSetting('udpPort', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>TCP 端口</label>
            <input
              type="number"
              id="tcp-port"
              value={settings.tcpPort}
              onChange={(e) => updateSetting('tcpPort', parseInt(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>广播间隔(毫秒)</label>
            <input
              type="number"
              id="broadcast-interval"
              value={settings.broadcastInterval}
              onChange={(e) => updateSetting('broadcastInterval', parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Security Settings */}
        <div className="settings-group mb-6">
          <h3 className="text-lg font-semibold mb-4">安全设置</h3>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="allow-control"
                checked={settings.allowControl}
                onChange={(e) => updateSetting('allowControl', e.target.checked)}
              />
              允许被控制
            </label>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="require-confirm"
                checked={settings.requireConfirm}
                onChange={(e) => updateSetting('requireConfirm', e.target.checked)}
              />
              操作确认
            </label>
          </div>
          <div className="form-group">
            <label>IP 白名单</label>
            <textarea
              id="ip-whitelist"
              placeholder="每行一个IP地址，留空表示允许所有"
              rows={4}
              value={settings.ipWhitelist}
              onChange={(e) => updateSetting('ipWhitelist', e.target.value)}
            />
          </div>
        </div>

        {/* Log Settings */}
        <div className="settings-group mb-6">
          <h3 className="text-lg font-semibold mb-4">日志</h3>
          <div className="flex gap-2">
            <button id="view-logs" className="btn-secondary" onClick={handleViewLogs}>
              查看日志
            </button>
            <button id="open-config-dir" className="btn-secondary" onClick={handleOpenConfigDir}>
              打开配置目录
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button id="save-settings" className="btn-primary" onClick={handleSave}>
            保存设置
          </button>
        </div>
      </div>
    </section>
  )
}