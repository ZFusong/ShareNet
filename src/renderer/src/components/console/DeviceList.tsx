/**
 * ShareNet - Device List Component
 * 设备列表组件 - 使用 Radix UI
 */

import * as Checkbox from '@radix-ui/react-checkbox'
import * as Dialog from '@radix-ui/react-dialog'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { useState } from 'react'
import { type Device } from '../../stores/deviceStore'
import { useDevices } from '../../hooks/useDevices'

// Status indicator component
function StatusBadge({ status }: { status: Device['status'] }) {
  const colors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-yellow-500'
  }

  const labels = {
    online: '在线',
    offline: '离线',
    busy: '忙碌'
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs">{labels[status]}</span>
    </span>
  )
}

// Role badge component
function RoleBadge({ role }: { role: Device['role'] }) {
  const styles = {
    controller: 'bg-blue-100 text-blue-700',
    controlled: 'bg-purple-100 text-purple-700',
    bidirectional: 'bg-green-100 text-green-700'
  }

  const labels = {
    controller: '主控',
    controlled: '被控',
    bidirectional: '双向'
  }

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${styles[role]}`}>
      {labels[role]}
    </span>
  )
}

export function DeviceList() {
  const {
    devices,
    filteredDevices,
    selectedDevices,
    filter,
    toggleSelectDevice,
    selectDevice,
    deselectAll,
    setFilter,
    addDeviceManually,
    removeDevice,
    refreshDevices
  } = useDevices()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newDeviceIP, setNewDeviceIP] = useState('')
  const [newDeviceName, setNewDeviceName] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'busy'>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')

  const handleAddDevice = async () => {
    if (!newDeviceIP.trim()) return

    await addDeviceManually(newDeviceIP, newDeviceName || undefined)
    setNewDeviceIP('')
    setNewDeviceName('')
    setShowAddDialog(false)
  }

  const handleRemoveDevice = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要移除此设备吗？')) {
      await removeDevice(id)
    }
  }

  const allTags = Array.from(
    new Set(
      devices.flatMap((device) => device.tags)
    )
  )

  const visibleDevices = filteredDevices
    .filter((device) => {
      if (statusFilter !== 'all' && device.status !== statusFilter) return false
      if (tagFilter !== 'all' && !device.tags.includes(tagFilter)) return false

      if (!searchText.trim()) return true
      const text = searchText.trim().toLowerCase()
      return (
        device.name.toLowerCase().includes(text) ||
        device.ip.toLowerCase().includes(text) ||
        device.tags.some((tag) => tag.toLowerCase().includes(text))
      )
    })
    .sort((a, b) => {
      if (a.lastSeen !== b.lastSeen) return b.lastSeen - a.lastSeen
      const statusOrder = { online: 0, busy: 1, offline: 2 }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return a.name.localeCompare(b.name, 'zh-CN')
    })

  const allVisibleSelected = visibleDevices.length > 0 && visibleDevices.every((d) => selectedDevices.has(d.id))
  const someVisibleSelected = visibleDevices.some((d) => selectedDevices.has(d.id))

  const handleSelectVisible = (checked: boolean | string) => {
    if (!checked) {
      deselectAll()
      return
    }

    visibleDevices.forEach((device) => selectDevice(device.id))
  }

  return (
    <div className="device-list-container flex flex-col h-full">
      {/* Header */}
      <div className="device-list-header flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">选择设备</h3>
        <div className="flex gap-2">
          <button
            onClick={refreshDevices}
            className="btn-icon"
            title="刷新设备"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <Dialog.Root open={showAddDialog} onOpenChange={setShowAddDialog}>
            <Dialog.Trigger asChild>
              <button className="btn-primary text-sm px-3 py-1.5" title="手动添加设备">
                + 添加
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-96">
                <Dialog.Title className="text-lg font-semibold mb-4">手动添加设备</Dialog.Title>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">IP 地址（可带端口）</label>
                    <input
                      type="text"
                      value={newDeviceIP}
                      onChange={(e) => setNewDeviceIP(e.target.value)}
                      placeholder="192.168.1.100:8899"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">设备名称（可选）</label>
                    <input
                      type="text"
                      value={newDeviceName}
                      onChange={(e) => setNewDeviceName(e.target.value)}
                      placeholder="设备名称"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Dialog.Close asChild>
                    <button className="btn-secondary">取消</button>
                  </Dialog.Close>
                  <button onClick={handleAddDevice} className="btn-primary">
                    添加
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar p-4 border-b space-y-3">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索设备名称或标签"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background"
        />
        <div className="flex gap-3 flex-wrap items-center">
          <div className="text-xs text-muted-foreground">分组:</div>
          <ToggleGroup.Root
            type="single"
            value={filter.type}
            onValueChange={(value) => value && setFilter({ type: value as any })}
            className="flex gap-1 flex-wrap"
          >
            <ToggleGroup.Item
              value="all"
              className={`px-3 py-1.5 text-sm rounded ${
                filter.type === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              全部
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="controller"
              className={`px-3 py-1.5 text-sm rounded ${
                filter.type === 'controller' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              主控
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="controlled"
              className={`px-3 py-1.5 text-sm rounded ${
                filter.type === 'controlled' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              被控
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="bidirectional"
              className={`px-3 py-1.5 text-sm rounded ${
                filter.type === 'bidirectional' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              双向
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
        <div className="flex gap-2 flex-wrap text-sm">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2 py-1 border rounded text-sm bg-background"
          >
            <option value="all">全部状态</option>
            <option value="online">在线</option>
            <option value="busy">忙碌</option>
            <option value="offline">离线</option>
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-2 py-1 border rounded text-sm bg-background"
          >
            <option value="all">全部标签</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Select all */}
      <div className="select-all-bar p-3 border-b flex items-center gap-3">
        <Checkbox.Root
          checked={allVisibleSelected}
          onCheckedChange={handleSelectVisible}
          className={`w-5 h-5 rounded border-2 border-primary flex items-center justify-center data-[state=checked]:bg-primary ${someVisibleSelected && !allVisibleSelected ? 'bg-primary/50' : ''}`}
          id="select-all"
        >
          <Checkbox.Indicator>
            {allVisibleSelected || (someVisibleSelected && !allVisibleSelected) ? (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : null}
          </Checkbox.Indicator>
        </Checkbox.Root>
        <label htmlFor="select-all" className="text-sm text-muted-foreground">
          {selectedDevices.size > 0 ? `已选择 ${selectedDevices.size} 个设备` : '全选本页'}
        </label>
        <button
          onClick={deselectAll}
          className="ml-auto text-xs px-2 py-1 border rounded hover:bg-secondary"
        >
          清空已选
        </button>
      </div>

      {/* Device list */}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">
          {visibleDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p>未发现匹配设备</p>
              <p className="text-xs mt-1">请调整筛选或搜索条件</p>
            </div>
          ) : (
            <div className="device-list">
              {visibleDevices.map((device) => (
                <div
                  key={device.id}
                  className={`device-item p-4 border-b cursor-pointer transition-colors ${
                    selectedDevices.has(device.id) ? 'bg-primary/10' : 'hover:bg-accent'
                  }`}
                  onClick={() => toggleSelectDevice(device.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox.Root
                      checked={selectedDevices.has(device.id)}
                      onCheckedChange={() => toggleSelectDevice(device.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 mt-0.5 rounded border-2 border-primary flex items-center justify-center data-[state=checked]:bg-primary"
                    >
                      <Checkbox.Indicator>
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </Checkbox.Indicator>
                    </Checkbox.Root>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{device.name}</span>
                        <button
                          onClick={(e) => handleRemoveDevice(device.id, e)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                          title="移除设备"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground truncate mt-0.5">
                        {device.ip}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={device.status} />
                        <RoleBadge role={device.role} />
                        {device.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {device.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                                {tag}
                              </span>
                            ))}
                            {device.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{device.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="w-2">
          <ScrollArea.Thumb className="bg-border rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Device count */}
      <div className="device-count p-3 border-t text-sm text-muted-foreground">
        共 {visibleDevices.length} 个设备
        {selectedDevices.size > 0 && (
          <span className="ml-2 text-primary">
            (已选 {selectedDevices.size})
          </span>
        )}
      </div>
    </div>
  )
}
