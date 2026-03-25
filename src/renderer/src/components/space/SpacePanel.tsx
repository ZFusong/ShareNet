import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useConfigStore, type Space, type SpaceButton } from '../../stores/configStore'
import { useDeviceStore, type Device } from '../../stores/deviceStore'
import { useTriggerLogStore } from '../../stores/triggerLogStore'
import { getDeviceKey, sendTriggerToDevices } from '../../lib/triggerDispatch'

type SpacePanelMode = 'view' | 'edit' | 'create'

interface SpaceFormData {
  name: string
  description: string
  deviceKeys: string[]
  buttons: SpaceButton[]
}

interface ButtonDraft {
  name: string
  triggerKey: string
}

const emptyForm: SpaceFormData = {
  name: '',
  description: '',
  deviceKeys: [],
  buttons: []
}

const emptyButtonDraft: ButtonDraft = {
  name: '',
  triggerKey: ''
}

const createButtonId = () => `sb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const getPlaceholderDevice = (deviceKey: string): Device => {
  const [ip = deviceKey, rawPort = '0'] = deviceKey.split(':')
  return {
    id: `missing-${deviceKey}`,
    name: `未发现设备 ${deviceKey}`,
    ip,
    port: Number(rawPort) || 0,
    role: 'bidirectional',
    tags: [],
    status: 'offline',
    lastSeen: 0
  }
}

const toFormData = (space: Space): SpaceFormData => ({
  name: space.name,
  description: space.description || '',
  deviceKeys: [...space.deviceKeys],
  buttons: space.buttons.map((button) => ({ ...button }))
})

export function SpacePanel() {
  const { spaces, triggerBindings, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const { devices, persistentDevices, hiddenDevices, offlineDevices, localDevice, deviceAliases } = useDeviceStore()
  const logs = useTriggerLogStore((state) => state.logs)
  const clearSpaceLogs = useTriggerLogStore((state) => state.clearSpaceLogs)

  const [mode, setMode] = useState<SpacePanelMode>('view')
  const [selectedSpaceId, setSelectedSpaceId] = useState('')
  const [formData, setFormData] = useState<SpaceFormData>(emptyForm)
  const [buttonDraft, setButtonDraft] = useState<ButtonDraft>(emptyButtonDraft)
  const [editingButtonId, setEditingButtonId] = useState('')

  useEffect(() => {
    loadPresets('space')
    loadPresets('trigger')
  }, [loadPresets])

  const currentSpace = useMemo(
    () => (selectedSpaceId ? spaces.find((space) => space.id === selectedSpaceId) || null : null),
    [selectedSpaceId, spaces]
  )

  useEffect(() => {
    if (spaces.length === 0) {
      if (mode === 'view') {
        setMode('create')
        setSelectedSpaceId('')
        setFormData(emptyForm)
      }
      return
    }

    if (!selectedSpaceId) {
      if (mode !== 'create') {
        setSelectedSpaceId(spaces[0].id)
        setMode('view')
      }
      return
    }

    if (!currentSpace && mode !== 'create') {
      setSelectedSpaceId(spaces[0].id)
      setMode('view')
    }
  }, [currentSpace, mode, selectedSpaceId, spaces])

  const allKnownDevices = useMemo(() => {
    const map = new Map<string, Device>()
    devices.forEach((device) => map.set(getDeviceKey(device), device))
    persistentDevices.forEach((device, key) => map.set(key, device))
    hiddenDevices.forEach((device, key) => map.set(key, device))
    offlineDevices.forEach((device) => map.set(getDeviceKey(device), device))
    return map
  }, [devices, hiddenDevices, offlineDevices, persistentDevices])

  const selectableDevices = useMemo(
    () =>
      Array.from(allKnownDevices.entries())
        .map(([key, device]) => ({ key, device }))
        .sort((a, b) => {
          if (a.device.status !== b.device.status) {
            return a.device.status === 'online' ? -1 : 1
          }
          return a.device.name.localeCompare(b.device.name, 'zh-CN')
        }),
    [allKnownDevices]
  )

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

  const formDevices = useMemo(
    () => formData.deviceKeys.map((deviceKey) => allKnownDevices.get(deviceKey) || getPlaceholderDevice(deviceKey)),
    [allKnownDevices, formData.deviceKeys]
  )

  const viewDevices = useMemo(
    () => (currentSpace ? currentSpace.deviceKeys.map((deviceKey) => allKnownDevices.get(deviceKey) || getPlaceholderDevice(deviceKey)) : []),
    [allKnownDevices, currentSpace]
  )

  const currentLogs = useMemo(
    () => (currentSpace ? logs.filter((log) => log.source === 'space' && log.spaceId === currentSpace.id) : []),
    [currentSpace, logs]
  )

  const getDisplayName = (device: Device) => {
    const deviceKey = getDeviceKey(device)
    const alias = deviceAliases.get(deviceKey)
    if (alias) return alias
    if (!localDevice) return device.name

    const isLocal =
      localDevice.id === device.id ||
      (localDevice.ip === device.ip && localDevice.port === device.port)

    return isLocal ? localDevice.name : device.name
  }

  const resetButtonDraft = () => {
    setButtonDraft(emptyButtonDraft)
    setEditingButtonId('')
  }

  const startCreate = () => {
    setMode('create')
    setSelectedSpaceId('')
    setFormData(emptyForm)
    resetButtonDraft()
  }

  const selectSpace = (space: Space) => {
    setSelectedSpaceId(space.id)
    setMode('view')
    resetButtonDraft()
  }

  const startEdit = () => {
    if (!currentSpace) return
    setFormData(toFormData(currentSpace))
    setMode('edit')
    resetButtonDraft()
  }

  const cancelEditing = () => {
    resetButtonDraft()
    if (currentSpace) {
      setMode('view')
      setFormData(toFormData(currentSpace))
      return
    }
    startCreate()
  }

  const toggleDevice = (deviceKey: string) => {
    setFormData((current) => ({
      ...current,
      deviceKeys: current.deviceKeys.includes(deviceKey)
        ? current.deviceKeys.filter((key) => key !== deviceKey)
        : [...current.deviceKeys, deviceKey]
    }))
  }

  const handleSaveButton = () => {
    const triggerKey = buttonDraft.triggerKey.trim()
    const name = buttonDraft.name.trim() || triggerKey

    if (!triggerKey) {
      toast.error('请输入按钮触发器 key')
      return
    }

    if (editingButtonId) {
      setFormData((current) => ({
        ...current,
        buttons: current.buttons.map((button) =>
          button.id === editingButtonId ? { ...button, name, triggerKey } : button
        )
      }))
    } else {
      setFormData((current) => ({
        ...current,
        buttons: [...current.buttons, { id: createButtonId(), name, triggerKey }]
      }))
    }

    resetButtonDraft()
  }

  const handleEditButton = (button: SpaceButton) => {
    setEditingButtonId(button.id)
    setButtonDraft({
      name: button.name,
      triggerKey: button.triggerKey
    })
  }

  const handleDeleteButton = (buttonId: string) => {
    setFormData((current) => ({
      ...current,
      buttons: current.buttons.filter((button) => button.id !== buttonId)
    }))

    if (editingButtonId === buttonId) {
      resetButtonDraft()
    }
  }

  const handleSaveSpace = async () => {
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      deviceKeys: Array.from(new Set(formData.deviceKeys)),
      buttons: formData.buttons.map((button) => ({
        id: button.id,
        name: button.name.trim() || button.triggerKey.trim(),
        triggerKey: button.triggerKey.trim()
      }))
    }

    if (!payload.name) {
      toast.error('请输入空间名称')
      return
    }

    if (payload.buttons.some((button) => !button.triggerKey)) {
      toast.error('按钮触发器 key 不能为空')
      return
    }

    const success =
      mode === 'edit' && selectedSpaceId
        ? await updatePreset('space', selectedSpaceId, payload)
        : await savePreset('space', payload)

    if (!success) {
      toast.error(mode === 'edit' ? '空间保存失败' : '空间创建失败')
      return
    }

    const latestSpaces = [...useConfigStore.getState().spaces]
    const saved =
      mode === 'edit' && selectedSpaceId
        ? latestSpaces.find((space) => space.id === selectedSpaceId) || null
        : latestSpaces
            .filter((space) => space.name === payload.name)
            .sort((a, b) => b.updatedAt - a.updatedAt)[0] ||
          [...latestSpaces].sort((a, b) => b.updatedAt - a.updatedAt)[0] ||
          null

    if (saved) {
      setSelectedSpaceId(saved.id)
      setMode('view')
      setFormData(toFormData(saved))
    }

    resetButtonDraft()
    toast.success(mode === 'edit' ? '空间已保存' : '空间已创建')
  }

  const handleDeleteSpace = async () => {
    if (!currentSpace) return
    if (!window.confirm(`确定删除空间「${currentSpace.name}」吗？`)) return

    const success = await deletePreset('space', currentSpace.id)
    if (!success) {
      toast.error('空间删除失败')
      return
    }

    const latestSpaces = [...useConfigStore.getState().spaces].filter((space) => space.id !== currentSpace.id)
    if (latestSpaces.length > 0) {
      setSelectedSpaceId(latestSpaces[0].id)
      setMode('view')
    } else {
      startCreate()
    }

    toast.success('空间已删除')
  }

  const handleExecuteButton = (button: SpaceButton) => {
    if (!currentSpace) return

    const targetDevices = currentSpace.deviceKeys.map((deviceKey) => allKnownDevices.get(deviceKey) || getPlaceholderDevice(deviceKey))

    void sendTriggerToDevices({
      devices: targetDevices,
      triggerKey: button.triggerKey,
      localDevice,
      context: { source: 'space', spaceId: currentSpace.id },
      getDisplayName
    })
  }

  const clearCurrentLogs = () => {
    if (!currentSpace) return
    clearSpaceLogs(currentSpace.id)
  }

  return (
    <section id="space-panel" className="panel active h-full">
      <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">空间</h3>
              <div className="text-sm text-muted-foreground">高频设备操作快捷集合</div>
            </div>
            <Button type="button" variant="secondary" className="text-sm" onClick={startCreate}>
              + 新建
            </Button>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {spaces.length > 0 ? (
              spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => selectSpace(space)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                    selectedSpaceId === space.id && mode !== 'create' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-medium break-all">{space.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{space.description || '无描述'}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {space.deviceKeys.length} 台设备 / {space.buttons.length} 个按钮
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">还没有空间，先新建一个。</div>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {mode === 'view' && currentSpace ? (
              <div className="space-y-4 pr-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold break-all">{currentSpace.name}</h3>
                    {currentSpace.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{currentSpace.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button type="button" variant="outline" onClick={startEdit}>
                      编辑
                    </Button>
                    <Button type="button" variant="outline" onClick={handleDeleteSpace}>
                      删除
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">设备</span>
                      <span className="text-muted-foreground">{viewDevices.length} 台</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {viewDevices.length > 0 ? (
                        viewDevices.map((device) => (
                          <span
                            key={getDeviceKey(device)}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                              device.status === 'online' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            <span>{getDisplayName(device)}</span>
                            <span className="opacity-75">{device.ip}:{device.port}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">未配置设备</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">快捷按钮</span>
                      <span className="text-muted-foreground">{currentSpace.buttons.length} 个</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {currentSpace.buttons.length > 0 ? (
                        currentSpace.buttons.map((button) => (
                          <button
                            key={button.id}
                            type="button"
                            onClick={() => handleExecuteButton(button)}
                            className="rounded-lg border px-3 py-3 text-left transition-colors hover:bg-accent"
                          >
                            <div className="text-sm font-medium break-all">{button.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground break-all">{button.triggerKey}</div>
                          </button>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">未配置按钮</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">执行日志</div>
                      <div className="text-xs text-muted-foreground">查看态才显示日志，便于直接操作和回看结果。</div>
                    </div>
                    <Button type="button" variant="outline" onClick={clearCurrentLogs}>
                      清空日志
                    </Button>
                  </div>
                  <div className="h-56 overflow-y-auto rounded border p-3 text-sm space-y-1">
                    {currentLogs.length > 0 ? (
                      currentLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`flex gap-2 ${
                            log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-600' : 'text-foreground'
                          }`}
                        >
                          <span className="shrink-0 text-xs text-muted-foreground">[{log.time}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">暂无日志</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pr-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{mode === 'create' ? '新建空间' : '编辑空间'}</h3>
                    <div className="text-sm text-muted-foreground">编辑态展示完整配置，不显示执行日志，避免操作干扰。</div>
                  </div>
                  <div className="flex gap-2">
                    {mode === 'edit' && currentSpace && (
                      <Button type="button" variant="outline" onClick={handleDeleteSpace}>
                        删除空间
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={cancelEditing}>
                      取消
                    </Button>
                    <Button type="button" onClick={handleSaveSpace}>
                      {mode === 'create' ? '创建空间' : '保存空间'}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">空间名称 *</label>
                      <Input
                        value={formData.name}
                        onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                        placeholder="例如：会议室常用控制"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">空间描述</label>
                      <Textarea
                        value={formData.description}
                        onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                        placeholder="说明这个空间的用途、适用场景"
                        className="min-h-24"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <div className="text-sm font-medium">已选设备</div>
                      <div className="text-xs text-muted-foreground">保存后，查看态会直接对这些设备执行。</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {formDevices.length > 0 ? (
                        formDevices.map((device) => (
                          <span
                            key={getDeviceKey(device)}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                              device.status === 'online' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            <span>{getDisplayName(device)}</span>
                            <span className="opacity-75">{device.ip}:{device.port}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">尚未选择设备</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <div className="text-sm font-medium">设备列表</div>
                    <div className="text-xs text-muted-foreground">勾选纳入空间的目标设备。</div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {selectableDevices.length > 0 ? (
                      selectableDevices.map(({ key, device }) => (
                        <label
                          key={key}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                            formData.deviceKeys.includes(key) ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.deviceKeys.includes(key)}
                            onChange={() => toggleDevice(key)}
                            className="mt-1 h-4 w-4"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium break-all">{getDisplayName(device)}</div>
                            <div className="text-xs text-muted-foreground">{device.ip}:{device.port}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {device.status === 'online' ? '在线' : device.status === 'busy' ? '忙碌' : '离线'}
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">当前没有可选设备。</div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <div>
                    <div className="text-sm font-medium">自定义按钮</div>
                    <div className="text-xs text-muted-foreground">编辑态管理按钮名称和 triggerKey，不直接执行。</div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,220px)_auto]">
                    <Input
                      value={buttonDraft.name}
                      onChange={(event) => setButtonDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="按钮名称"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={buttonDraft.triggerKey}
                        onChange={(event) => setButtonDraft((current) => ({ ...current, triggerKey: event.target.value }))}
                        placeholder="triggerKey"
                      />
                      {triggerOptions.length > 0 && (
                        <Select.Root
                          value=""
                          onValueChange={(value) => {
                            if (!value) return
                            setButtonDraft((current) => ({ ...current, triggerKey: value, name: current.name || value }))
                          }}
                        >
                          <Select.Trigger className="w-[180px]">
                            <Select.Value placeholder="从本机触发器中选" />
                            <Select.Icon />
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content>
                              {triggerOptions.map((option) => (
                                <Select.Item key={option} value={option}>
                                  {option}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleSaveButton}>
                        {editingButtonId ? '更新按钮' : '新增按钮'}
                      </Button>
                      {editingButtonId && (
                        <Button type="button" variant="outline" onClick={resetButtonDraft}>
                          取消编辑
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {formData.buttons.length > 0 ? (
                      formData.buttons.map((button) => (
                        <div key={button.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium break-all">{button.name}</div>
                            <div className="text-xs text-muted-foreground break-all">Key: {button.triggerKey}</div>
                          </div>
                          <Button type="button" variant="outline" onClick={() => handleEditButton(button)}>
                            编辑
                          </Button>
                          <Button type="button" variant="outline" onClick={() => handleDeleteButton(button.id)}>
                            删除
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">还没有配置按钮。</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
