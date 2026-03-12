import { useState, useEffect } from 'react'

interface Device {
  id: string
  name: string
  ip: string
  role: string
  status: 'online' | 'offline' | 'busy'
  lastSeen?: number
}

export function ConsolePanel() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate device discovery
    setTimeout(() => {
      setDevices([
        { id: '1', name: 'DESKTOP-A1B2', ip: '192.168.1.100', role: 'master', status: 'online' },
        { id: '2', name: 'LAPTOP-C3D4', ip: '192.168.1.101', role: 'slave', status: 'online' }
      ])
      setLoading(false)
    }, 1000)

    // Listen for device updates
    window.electronAPI?.onDeviceUpdate((data) => {
      console.log('Device update:', data)
    })

    return () => {
      window.electronAPI?.removeAllListeners('device-update')
    }
  }, [])

  const toggleDevice = (id: string) => {
    const newSelected = new Set(selectedDevices)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedDevices(newSelected)
  }

  const selectAll = () => {
    if (selectedDevices.size === filteredDevices.length) {
      setSelectedDevices(new Set())
    } else {
      setSelectedDevices(new Set(filteredDevices.map((d) => d.id)))
    }
  }

  const filteredDevices = devices.filter((device) => {
    if (filter === 'all') return true
    return device.role === filter
  })

  return (
    <section id="console-panel" className="panel active">
      <div className="panel-left">
        <div className="panel-header">
          <h3>设备列表</h3>
          <button className="btn-icon" title="刷新设备">
            🔄
          </button>
        </div>
        <div className="filter-bar mb-4">
          <select
            id="device-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full"
          >
            <option value="all">全部设备</option>
            <option value="master">主控</option>
            <option value="slave">被控</option>
            <option value="both">双向</option>
          </select>
        </div>
        <div className="device-list">
          {loading ? (
            <div className="empty-state">正在搜索设备...</div>
          ) : filteredDevices.length === 0 ? (
            <div className="empty-state">未发现设备</div>
          ) : (
            filteredDevices.map((device) => (
              <div
                key={device.id}
                className={`device-item ${selectedDevices.has(device.id) ? 'selected' : ''}`}
                onClick={() => toggleDevice(device.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedDevices.has(device.id)}
                  onChange={() => toggleDevice(device.id)}
                  className="mr-2"
                />
                <div>
                  <div className="font-medium">{device.name}</div>
                  <div className="text-xs text-muted-foreground">{device.ip}</div>
                </div>
                <span className={`status-dot ${device.status}`}></span>
              </div>
            ))
          )}
        </div>
        <div className="selection-info mt-4 flex items-center justify-between">
          <span id="selected-count">已选: {selectedDevices.size} 台设备</span>
          <button id="select-all" className="btn-small btn-secondary" onClick={selectAll}>
            {selectedDevices.size === filteredDevices.length ? '取消全选' : '全选'}
          </button>
        </div>
      </div>
      <div className="panel-right">
        <div className="panel-header">
          <h3>指令编排</h3>
        </div>
        <div className="command-panel">
          <div className="command-type mb-4">
            <label className="mr-4">
              <input type="radio" name="command-type" value="scene" defaultChecked /> 场景
            </label>
            <label className="mr-4">
              <input type="radio" name="command-type" value="software" /> 软件
            </label>
            <label>
              <input type="radio" name="command-type" value="input" /> 键鼠
            </label>
          </div>
          <div id="command-selector" className="command-selector mb-4">
            <select id="scene-select" className="w-full">
              <option value="">选择场景...</option>
            </select>
          </div>
          <div id="steps-preview" className="steps-preview mb-4 min-h-[100px] border rounded p-2">
            <div className="text-sm text-muted-foreground">请选择要执行的场景</div>
          </div>
          <div className="execution-options flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" id="execute-now" /> 立即执行
            </label>
            <button id="send-command" className="btn-primary">
              发送指令
            </button>
          </div>
        </div>
        <div className="execution-log mt-4">
          <h4 className="mb-2 font-medium">执行日志</h4>
          <div id="log-list" className="log-list h-[200px] overflow-y-auto border rounded p-2 text-sm">
            <div className="text-muted-foreground">暂无日志</div>
          </div>
        </div>
      </div>
    </section>
  )
}