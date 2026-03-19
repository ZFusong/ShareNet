/**
 * ShareNet - Device List Component
 * 设备列表组件 - 使用 Radix UI
 */

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type Device, type DeviceGroup } from '../../stores/deviceStore'
import { useDevices } from '../../hooks/useDevices'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select } from '@/components/ui/select'

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
    selectedDevices,
    localDevice,
    hiddenDevicesList,
    persistentDevices,
    deviceGroups,
    deviceAliases,
    toggleSelectDevice,
    selectDevice,
    deselectAll,
    addDeviceManually,
    hideDevice,
    unhideDevice,
    setAliasForDevice,
    addPersistentDevice,
    removePersistentDevice,
    addDeviceGroup,
    deleteDeviceGroup,
    addDeviceToGroup,
    removeDeviceFromGroup,
    refreshDevices,
    removeDevice
  } = useDevices()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newDeviceIP, setNewDeviceIP] = useState('')
  const [newDeviceAlias, setNewDeviceAlias] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'busy'>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [aliasTarget, setAliasTarget] = useState<Device | null>(null)
  const [aliasInput, setAliasInput] = useState('')
  const [searchHitCounts, setSearchHitCounts] = useState<Map<string, number>>(new Map())
  const lastSearchText = useRef('')
  const SEARCH_PERSIST_THRESHOLD = 3
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState('')
  const [groupNameError, setGroupNameError] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<DeviceGroup | null>(null)
  const groupNameInputRef = useRef<HTMLInputElement | null>(null)
  const [onlineOpen, setOnlineOpen] = useState(true)
  const [offlineOpen, setOfflineOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({})

  const handleAddDevice = async () => {
    if (!newDeviceIP.trim()) return

    const result = await addDeviceManually(newDeviceIP)
    if (result?.device) {
      await addPersistentDevice(result.device)
    }
    if (newDeviceAlias.trim()) {
      const trimmed = newDeviceIP.trim()
      const parts = trimmed.split(':')
      const host = parts[0] || trimmed
      let port = 0
      if (parts.length === 2 && parts[1]) {
        const parsed = Number(parts[1])
        port = Number.isFinite(parsed) ? parsed : 0
      }
      if (!port) {
        const savedSettings = await window.electronAPI?.getSettings()
        port = savedSettings?.network?.tcpPort ?? 8889
      }
      await setAliasForDevice(`${host}:${port}`, newDeviceAlias)
    }
    setNewDeviceIP('')
    setNewDeviceAlias('')
    setShowAddDialog(false)
  }

  const handleHideDevice = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation()
    hideDevice(device)
  }

  const handleOpenAlias = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation()
    setAliasTarget(device)
    const key = `${device.ip}:${device.port}`
    setAliasInput(deviceAliases.get(key) || '')
  }

  const handleSaveAlias = async () => {
    if (!aliasTarget) return
    const key = `${aliasTarget.ip}:${aliasTarget.port}`
    await setAliasForDevice(key, aliasInput)
    setAliasTarget(null)
  }

  const getDeviceKey = (device: Device) => `${device.ip}:${device.port}`

  const allTags = Array.from(
    new Set(
      devices.flatMap((device) => device.tags)
    )
  )

  const onlineDevicesAll = devices.filter((device) => device.status !== 'offline')
  const groupsForFilter = deviceGroups
    .map((group) => ({
      group,
      devices: onlineDevicesAll.filter((device) => group.deviceKeys.includes(getDeviceKey(device)))
    }))
  const groupDeviceKeys = groupFilter === 'all'
    ? null
    : deviceGroups.find((group) => group.id === groupFilter)?.deviceKeys || []

  const visibleDevices = devices
    .filter((device) => {
      if (statusFilter !== 'all' && device.status !== statusFilter) return false
      if (tagFilter !== 'all' && !device.tags.includes(tagFilter)) return false
      if (groupDeviceKeys && !groupDeviceKeys.includes(getDeviceKey(device))) return false

      if (!searchText.trim()) return true
      const text = searchText.trim().toLowerCase()
      const alias = getAliasName(device).toLowerCase()
      return (
        (alias && alias.includes(text)) ||
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

  const getDisplayName = (device: Device) => {
    if (!localDevice) return device.name
    const isSameDevice =
      device.id === localDevice.id ||
      (device.ip === localDevice.ip && device.port === localDevice.port)
    return isSameDevice ? localDevice.name : device.name
  }

  const getAliasName = (device: Device) => deviceAliases.get(getDeviceKey(device)) || ''

  const isGroupNameDuplicate = (name: string) => {
    const trimmed = name.trim().toLowerCase()
    if (!trimmed) return false
    return deviceGroups.some((group) => group.name.trim().toLowerCase() === trimmed)
  }

  const handleCreateGroup = async () => {
    const trimmed = groupNameInput.trim()
    if (!trimmed) {
      setGroupNameError('请输入分组名称')
      return
    }
    if (isGroupNameDuplicate(trimmed)) {
      setGroupNameError('分组名称已存在')
      return
    }
    const group: DeviceGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      deviceKeys: []
    }
    await addDeviceGroup(group)
    setGroupNameInput('')
    setGroupNameError('')
    setShowGroupDialog(false)
  }

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return
    await deleteDeviceGroup(deleteGroupTarget.id)
    if (editingGroupId === deleteGroupTarget.id) {
      setEditingGroupId(null)
    }
    setDeleteGroupTarget(null)
  }

  useEffect(() => {
    setGroupOpen((prev) => {
      const next: Record<string, boolean> = { ...prev }
      deviceGroups.forEach((group) => {
        if (next[group.id] === undefined) next[group.id] = true
      })
      Object.keys(next).forEach((id) => {
        if (!deviceGroups.find((group) => group.id === id)) delete next[id]
      })
      return next
    })
  }, [deviceGroups])

  const handleDeleteSelected = async () => {
    if (selectedDevices.size === 0) return
    const targets = devices.filter((device) => selectedDevices.has(device.id))
    for (const device of targets) {
      const key = getDeviceKey(device)
      if (persistentDevices.has(key)) {
        await removePersistentDevice(key)
      }
      await removeDevice(device.id)
    }
  }

  useEffect(() => {
    const text = searchText.trim().toLowerCase()
    if (!text) {
      lastSearchText.current = ''
      return
    }
    if (text === lastSearchText.current) return
    lastSearchText.current = text
    const next = new Map(searchHitCounts)
    visibleDevices.forEach((device) => {
      const key = getDeviceKey(device)
      const nextCount = (next.get(key) ?? 0) + 1
      next.set(key, nextCount)
      if (nextCount >= SEARCH_PERSIST_THRESHOLD && !persistentDevices.has(key)) {
        addPersistentDevice(device)
      }
    })
    setSearchHitCounts(next)
  }, [addPersistentDevice, persistentDevices, searchText, searchHitCounts, visibleDevices])

  const renderDeviceItem = (device: Device) => (
    <div
      key={device.id}
      className={`device-item group p-3 border-b cursor-pointer transition-colors ${
        selectedDevices.has(device.id) ? 'bg-primary/10' : 'hover:bg-accent'
      }`}
      onClick={() => toggleSelectDevice(device.id)}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selectedDevices.has(device.id)}
          onCheckedChange={() => toggleSelectDevice(device.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded border-2 border-primary flex items-center justify-center data-[state=checked]:bg-primary"
        >
        </Checkbox>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {getAliasName(device) ? (
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-medium truncate">{getAliasName(device)}</span>
                <span className="text-xs text-muted-foreground truncate">{getDisplayName(device)}</span>
              </div>
            ) : (
              <span className="font-medium truncate">{getDisplayName(device)}</span>
            )}
            <StatusBadge status={device.status} />
            <RoleBadge role={device.role} />
            <Button
              onClick={(e) => handleOpenAlias(device, e)}
              className="text-xs px-2 py-0.5 border rounded text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100"
              title="设置别名"
            >
              别名
            </Button>
            <Button
              onClick={(e) => handleHideDevice(device, e)}
              className="ml-auto text-xs px-2 py-0.5 border rounded text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100"
              title="隐藏设备"
            >
              隐藏
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="truncate">{device.ip}:{device.port}</span>
            {device.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {device.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {device.tags.length === 0 && (
              <span className="text-xs text-muted-foreground">无标签</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const onlineDevices = visibleDevices.filter((device) => device.status !== 'offline')
  const offlineDevices = visibleDevices.filter((device) => device.status === 'offline')
  const groupedKeys = new Set(deviceGroups.flatMap((group) => group.deviceKeys))
  const ungroupedOnlineDevices = onlineDevices.filter((device) => !groupedKeys.has(getDeviceKey(device)))
  const groupsWithDevices = deviceGroups.map((group) => ({
    group,
    devices: onlineDevices.filter((device) => group.deviceKeys.includes(getDeviceKey(device)))
  }))
  const editingGroup = deviceGroups.find((group) => group.id === editingGroupId) || null
  const editingGroupDevices = editingGroup
    ? onlineDevices.filter((device) => editingGroup.deviceKeys.includes(getDeviceKey(device)))
    : []
  const editUngroupedOnline = onlineDevices.filter((device) => {
    if (!editingGroup) return false
    return !editingGroup.deviceKeys.includes(getDeviceKey(device))
  })
  const deviceGroupMap = new Map<string, DeviceGroup>()
  deviceGroups.forEach((group) => {
    group.deviceKeys.forEach((key) => deviceGroupMap.set(key, group))
  })
  const moveDeviceToGroup = async (device: Device, targetGroupId: string) => {
    const key = getDeviceKey(device)
    const currentGroup = deviceGroupMap.get(key)
    if (currentGroup && currentGroup.id !== targetGroupId) {
      await removeDeviceFromGroup(currentGroup.id, key)
    }
    await addDeviceToGroup(targetGroupId, key)
  }

  const renderGroupDeviceRow = (device: Device, action: ReactNode, meta?: ReactNode) => (
    <div key={device.id} className="flex items-center gap-2 p-2 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{getDisplayName(device)}</span>
          {meta}
          <StatusBadge status={device.status} />
          <RoleBadge role={device.role} />
        </div>
        <div className="text-xs text-muted-foreground truncate">{device.ip}:{device.port}</div>
      </div>
      {action}
    </div>
  )

  return (
    <div className="device-list-container flex flex-col h-full">
      {/* Header */}
      <div className="device-list-header flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">选择设备</h3>
        <div className="flex gap-2">
          <Button
            onClick={refreshDevices}
            className="btn-icon"
            title="刷新设备"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          <Dialog.Root open={showAddDialog} onOpenChange={setShowAddDialog}>
            <Dialog.Trigger asChild>
              <Button className="btn-primary text-sm px-3 py-1.5" title="手动添加设备">
                + 添加
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-96">
                <Dialog.Title className="text-lg font-semibold mb-4">手动添加设备</Dialog.Title>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">IP 地址（可带端口）</label>
                    <Input
                      type="text"
                      value={newDeviceIP}
                      onChange={(e) => setNewDeviceIP(e.target.value)}
                      placeholder="192.168.1.100:8899"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">设备别名（可选）</label>
                    <Input
                      type="text"
                      value={newDeviceAlias}
                      onChange={(e) => setNewDeviceAlias(e.target.value)}
                      placeholder="设备别名"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Dialog.Close asChild>
                    <Button className="btn-secondary">取消</Button>
                  </Dialog.Close>
                  <Button onClick={handleAddDevice} className="btn-primary">
                    添加
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar p-4 border-b">
        <div className="flex items-center gap-2">
          <Select.Root value={groupFilter} onValueChange={(value) => setGroupFilter(value)}>
            <Select.Trigger className="flex items-center justify-between gap-2 px-2 py-1 border rounded text-sm bg-background w-28">
              <Select.Value />
              <Select.Icon>▼</Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-background border rounded shadow-lg z-50"
                position="popper"
                side="bottom"
                align="start"
                sideOffset={4}
                avoidCollisions={false}
              >
                <Select.Viewport className="p-1">
                  <Select.Item value="all" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                    <Select.ItemText>全部分组</Select.ItemText>
                  </Select.Item>
                  {groupsForFilter.map(({ group }) => (
                    <Select.Item key={group.id} value={group.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                      <Select.ItemText>{group.name}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <Select.Root value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <Select.Trigger className="flex items-center justify-between gap-2 px-2 py-1 border rounded text-sm bg-background w-28">
              <Select.Value />
              <Select.Icon>▼</Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-background border rounded shadow-lg z-50"
                position="popper"
                side="bottom"
                align="start"
                sideOffset={4}
                avoidCollisions={false}
              >
                <Select.Viewport className="p-1">
                  <Select.Item value="all" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                    <Select.ItemText>全部状态</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="online" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                    <Select.ItemText>在线</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="busy" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                    <Select.ItemText>忙碌</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="offline" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                    <Select.ItemText>离线</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <Select.Root value={tagFilter} onValueChange={(value) => setTagFilter(value)}>
            <Select.Trigger className="flex items-center justify-between gap-2 px-2 py-1 border rounded text-sm bg-background w-28">
              <Select.Value />
              <Select.Icon>▼</Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-background border rounded shadow-lg z-50"
                position="popper"
                side="bottom"
                align="start"
                sideOffset={4}
                avoidCollisions={false}
              >
                <Select.Viewport className="p-1">
                  <Select.Item value="all" className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                    <Select.ItemText>全部标签</Select.ItemText>
                  </Select.Item>
                  {allTags.map((tag) => (
                    <Select.Item key={tag} value={tag} className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded">
                      <Select.ItemText>{tag}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <Input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索设备名称或标签"
            className="flex-1 min-w-0 text-sm bg-background"
          />
        </div>
      </div>

      {/* Select all */}
      <div className="select-all-bar p-3 border-b flex items-center gap-3">
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={handleSelectVisible}
          className={`w-5 h-5 rounded border-2 border-primary flex items-center justify-center data-[state=checked]:bg-primary ${someVisibleSelected && !allVisibleSelected ? 'bg-primary/50' : ''}`}
          id="select-all"
        >
        </Checkbox>
        <label htmlFor="select-all" className="text-sm text-muted-foreground">
          {selectedDevices.size > 0 ? `已选择 ${selectedDevices.size} 个设备` : '全选本页'}
        </label>
        <div className="ml-auto flex gap-2">
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedDevices.size === 0}
            className="text-xs px-2 py-1 border rounded hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            删除
          </Button>
          <Button
            onClick={deselectAll}
            className="text-xs px-2 py-1 border rounded hover:bg-secondary"
          >
            清空已选
          </Button>
        </div>
      </div>

      {/* Device list */}
      <ScrollArea.Root className="h-[50vh] overflow-hidden">
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
              <div className="group border-b last:border-b-0">
                <div
                  className="group-summary cursor-pointer select-none px-3 py-2 text-sm font-medium text-foreground bg-secondary/40 flex items-center justify-between"
                  onClick={() => setOnlineOpen((prev) => !prev)}
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className={`details-arrow w-3.5 h-3.5 ${onlineOpen ? 'is-open' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    在线设备 ({onlineDevices.length})
                  </span>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowGroupDialog(true)
                      setGroupNameInput('')
                      setGroupNameError('')
                      setTimeout(() => groupNameInputRef.current?.focus(), 0)
                    }}
                    className="group-actions text-xs px-2 py-0.5 border rounded hover:bg-secondary"
                    title="添加分组"
                  >
                    +
                  </Button>
                </div>
                <div className={`accordion-content ${onlineOpen ? 'is-open' : ''}`}>
                  <div className="accordion-content-inner">
                    {ungroupedOnlineDevices.map(renderDeviceItem)}
                    {groupsWithDevices.map(({ group, devices: groupDevices }) => (
                      <div key={group.id} className="border-t">
                        <div
                          className="group-summary cursor-pointer select-none px-3 py-2 pl-8 text-sm font-medium text-foreground bg-background/60 flex items-center justify-between"
                          onClick={() =>
                            setGroupOpen((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                          }
                        >
                          <span className="flex items-center gap-2">
                            <svg
                              className={`details-arrow w-3.5 h-3.5 ${groupOpen[group.id] ? 'is-open' : ''}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            {group.name} ({groupDevices.length})
                          </span>
                          <span className="group-actions flex items-center gap-1">
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingGroupId(group.id)
                              }}
                              className="text-xs px-2 py-0.5 border rounded hover:bg-secondary"
                            >
                              编辑
                            </Button>
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDeleteGroupTarget(group)
                              }}
                              className="text-xs px-2 py-0.5 border rounded hover:bg-secondary text-destructive"
                            >
                              删除
                            </Button>
                          </span>
                        </div>
                        <div className={`accordion-content ${groupOpen[group.id] ? 'is-open' : ''}`}>
                          <div className="accordion-content-inner">
                            {groupDevices.length === 0 ? (
                              <div className="p-3 text-center text-xs text-muted-foreground">暂无在线设备</div>
                            ) : (
                              <div className="pl-6">
                                {groupDevices.map(renderDeviceItem)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-b last:border-b-0">
                <div
                  className="group-summary cursor-pointer select-none px-3 py-2 text-sm font-medium text-foreground bg-secondary/40 flex items-center gap-2"
                  onClick={() => setOfflineOpen((prev) => !prev)}
                >
                  <svg
                    className={`details-arrow w-3.5 h-3.5 ${offlineOpen ? 'is-open' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  离线设备 ({offlineDevices.length})
                </div>
                <div className={`accordion-content ${offlineOpen ? 'is-open' : ''}`}>
                  <div className="accordion-content-inner">
                    {offlineDevices.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">暂无离线设备</div>
                    ) : (
                      offlineDevices.map(renderDeviceItem)
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="w-2">
          <ScrollArea.Thumb className="bg-border rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* Device count */}
      <div className="device-count p-3 border-t text-sm text-muted-foreground flex items-center justify-between">
        <div>
          共 {visibleDevices.length} 个设备
          {selectedDevices.size > 0 && (
            <span className="ml-2 text-primary">
              (已选 {selectedDevices.size})
            </span>
          )}
        </div>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button className="text-xs px-2 py-1 border rounded hover:bg-secondary text-foreground">
              隐藏列表{hiddenDevicesList.length > 0 ? `(${hiddenDevicesList.length})` : ''}
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[520px] max-w-[90vw]">
              <Dialog.Title className="text-lg font-semibold mb-4">隐藏列表</Dialog.Title>
              <div className="border rounded">
                {hiddenDevicesList.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">暂无隐藏设备</div>
                ) : (
                  <div className="divide-y">
                    {hiddenDevicesList.map((device) => (
                      <div key={device.id} className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getAliasName(device) ? (
                              <div className="flex items-baseline gap-2 min-w-0">
                                <span className="font-medium truncate">{getAliasName(device)}</span>
                                <span className="text-xs text-muted-foreground truncate">{getDisplayName(device)}</span>
                              </div>
                            ) : (
                              <span className="font-medium truncate">{getDisplayName(device)}</span>
                            )}
                            <StatusBadge status={device.status} />
                            <RoleBadge role={device.role} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="truncate">{device.ip}:{device.port}</span>
                            {device.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {device.tags.map((tag) => (
                                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">无标签</span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => unhideDevice(`${device.ip}:${device.port}`)}
                          className="text-xs px-2 py-1 border rounded hover:bg-secondary"
                        >
                          取消隐藏
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <Dialog.Close asChild>
                  <Button className="btn-secondary">关闭</Button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <Dialog.Root open={!!aliasTarget} onOpenChange={(open) => !open && setAliasTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-96">
            <Dialog.Title className="text-lg font-semibold mb-4">设置设备别名</Dialog.Title>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {aliasTarget ? `${aliasTarget.ip}:${aliasTarget.port}` : ''}
              </div>
              <Input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="输入别名"
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button className="btn-secondary" onClick={() => setAliasTarget(null)}>取消</Button>
              </Dialog.Close>
              <Button onClick={handleSaveAlias} className="btn-primary">
                保存
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-96">
            <Dialog.Title className="text-lg font-semibold mb-4">添加在线分组</Dialog.Title>
            <div className="space-y-2">
              <Input
                type="text"
                value={groupNameInput}
                ref={groupNameInputRef}
                onChange={(e) => {
                  setGroupNameInput(e.target.value)
                  setGroupNameError('')
                }}
                placeholder="输入分组名称"
                className="w-full"
              />
              {groupNameError && <div className="text-xs text-destructive">{groupNameError}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button className="btn-secondary" onClick={() => setGroupNameError('')}>取消</Button>
              </Dialog.Close>
              <Button onClick={handleCreateGroup} className="btn-primary">
                创建
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroupId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[720px] max-w-[95vw] max-h-[90vh] overflow-hidden">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {editingGroup ? `编辑分组：${editingGroup.name}` : '编辑分组'}
            </Dialog.Title>
            <div className="border rounded mb-4">
              <div className="px-3 py-2 text-sm font-medium bg-secondary/40">可加入的在线设备 ({editUngroupedOnline.length})</div>
              {editUngroupedOnline.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">暂无可加入设备</div>
              ) : (
                editUngroupedOnline.map((device) =>
                  renderGroupDeviceRow(
                    device,
                    <Button
                      type="button"
                      onClick={() => editingGroup && moveDeviceToGroup(device, editingGroup.id)}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-secondary"
                      title="加入分组"
                    >
                      +
                    </Button>
                    ,
                    deviceGroupMap.get(getDeviceKey(device))?.id
                      ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {deviceGroupMap.get(getDeviceKey(device))?.name}
                          </span>
                        )
                      : null
                  )
                )
              )}
            </div>
            <div className="border rounded">
              <div className="px-3 py-2 text-sm font-medium bg-secondary/40">分组内设备 ({editingGroupDevices.length})</div>
              {editingGroupDevices.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">暂无分组内设备</div>
              ) : (
                editingGroupDevices.map((device) =>
                  renderGroupDeviceRow(
                    device,
                    <Button
                      type="button"
                      onClick={() => editingGroup && removeDeviceFromGroup(editingGroup.id, getDeviceKey(device))}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-secondary"
                      title="移出分组"
                    >
                      -
                    </Button>
                  )
                )
              )}
            </div>
            <div className="flex justify-end mt-4">
              <Dialog.Close asChild>
                <Button className="btn-secondary" onClick={() => setEditingGroupId(null)}>关闭</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={!!deleteGroupTarget} onOpenChange={(open) => !open && setDeleteGroupTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-96">
            <Dialog.Title className="text-lg font-semibold mb-2">确认删除分组</Dialog.Title>
            <div className="text-sm text-muted-foreground">
              {deleteGroupTarget ? `确认删除分组“${deleteGroupTarget.name}”？删除后分组内设备将回到在线列表。` : ''}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button className="btn-secondary">取消</Button>
              </Dialog.Close>
              <Button onClick={handleDeleteGroup} className="btn-primary">
                确认删除
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

