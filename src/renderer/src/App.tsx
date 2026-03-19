import { useState, useEffect } from 'react'
import { ConsolePanel } from './components/console/ConsolePanel'
import { ResourcePanel } from './components/resource/ResourcePanel'
import { ConfigPanel } from './components/config/ConfigPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { DeviceList } from './components/console/DeviceList'
import { useDeviceStore } from './stores/deviceStore'
import { useNetwork } from './hooks/useNetwork'
import * as Dialog from '@radix-ui/react-dialog'
import { Toaster } from "@/components/ui/sonner";
import icoPng from '@/assets/ico.png';

type Tab = 'console' | 'resource' | 'config' | 'settings'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('resource')
  const [appInfo, setAppInfo] = useState({ name: 'ShareNet', version: '1.0.0' })
  const { networkStatus, networkError, devices, selectedDevices, deviceStatusCheckCount } = useDeviceStore()
  const hasNetworkError = !!(networkError?.udp || networkError?.tcp)
  const statusClass = hasNetworkError ? 'offline' : 'online'
  const deviceCount = devices.length
  const selectedCount = selectedDevices.size
  const selectedOnlineCount = devices.filter((device) => selectedDevices.has(device.id) && device.status === 'online').length

  useNetwork()

  useEffect(() => {
    // Get app info on mount
    window.electronAPI?.getAppInfo().then((info) => {
      setAppInfo({ name: info.name, version: info.version })
    })

    // Listen for menu events
    window.electronAPI?.onOpenSettings(() => {
      setActiveTab('settings')
    })

    return () => {
      window.electronAPI?.removeAllListeners('open-settings')
    }
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'resource', label: '资源站' },
    { id: 'console', label: '操作台' },
    { id: 'config', label: '配置中心' },
    { id: 'settings', label: '系统设置' }
  ]

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <img src={icoPng} alt="Logo" className="logo-icon" />
          <span className="logo-text">ShareNet</span>
        </div>
        <nav className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <div className="device-info">
            <span id="local-device-name">本机</span>
            <span className={`status-dot ${statusClass}`}></span>
          </div>
        </div>
      </header>

      {hasNetworkError && (
        <div className="network-alert">
          <div className="network-alert-text">
            网络服务启动失败：{networkError?.udp || networkError?.tcp}
          </div>
          <button
            className="network-alert-action"
            onClick={() => setActiveTab('settings')}
          >
            去设置端口
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'resource' && <ResourcePanel />}
        {activeTab === 'config' && <ConfigPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="status-info">
          {/* <span id="network-status">网络: {networkStatus}</span> */}
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button id="selected-count" className="text-xs text-primary hover:underline">
                已选设备: {selectedCount}（在线 {selectedOnlineCount}）
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded shadow-lg w-[760px] max-w-[95vw] max-h-[90vh] overflow-hidden z-50">
                <DeviceList />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          {deviceStatusCheckCount > 0 && (
            <div className="ml-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span>检查设备状态</span>
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M12 3a9 9 0 019 9h-2.5a6.5 6.5 0 10-6.5 6.5V21a9 9 0 010-18z"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="footer-info">
          <span id="app-version">v{appInfo.version}</span>
        </div>
      </footer>
      <Toaster />
    </div>
  )
}

export default App
