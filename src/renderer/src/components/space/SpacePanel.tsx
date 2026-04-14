import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useConfigStore, type Space, type SpaceButton } from '../../stores/configStore'
import { useDeviceStore, type Device } from '../../stores/deviceStore'
import { useTriggerLogStore } from '../../stores/triggerLogStore'
import { getDeviceKey, sendTriggerToDevices } from '../../lib/triggerDispatch'
import { SpaceDetailWorkbench } from './SpaceDetailWorkbench'
import { SpaceEditorWorkbench } from './SpaceEditorWorkbench'
import { SpaceSidebar } from './SpaceSidebar'
import type { ButtonDraft, SpaceDeviceSummary, SpaceFormData, SpacePanelMode } from './spacePanelTypes'

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
  const { devices, persistentDevices, hiddenDevices, offlineDevices, localDevice, deviceAliases, openDeviceSelector } = useDeviceStore()
  const logs = useTriggerLogStore((state) => state.logs)
  const clearSpaceLogs = useTriggerLogStore((state) => state.clearSpaceLogs)

  const [mode, setMode] = useState<SpacePanelMode>('view')
  const [selectedSpaceId, setSelectedSpaceId] = useState('')
  const [formData, setFormData] = useState<SpaceFormData>(emptyForm)
  const [buttonDraft, setButtonDraft] = useState<ButtonDraft>(emptyButtonDraft)
  const [editingButtonId, setEditingButtonId] = useState('')
  const [logHighlighted, setLogHighlighted] = useState(false)

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
      setSelectedSpaceId(spaces[0].id)
      if (mode !== 'create') {
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

  const toSpaceDeviceSummary = (deviceKey: string): SpaceDeviceSummary => {
    const device = allKnownDevices.get(deviceKey) || getPlaceholderDevice(deviceKey)
    return {
      key: deviceKey,
      device,
      displayName: getDisplayName(device),
      address: `${device.ip}:${device.port}`,
      isOnline: device.status === 'online',
      isMissing: device.id.startsWith('missing-')
    }
  }

  const formDevices = useMemo(
    () => formData.deviceKeys.map((deviceKey) => toSpaceDeviceSummary(deviceKey)),
    [allKnownDevices, formData.deviceKeys]
  )

  const viewDevices = useMemo(
    () => (currentSpace ? currentSpace.deviceKeys.map((deviceKey) => toSpaceDeviceSummary(deviceKey)) : []),
    [allKnownDevices, currentSpace]
  )

  useEffect(() => {
    if (!logHighlighted) return
    const timer = window.setTimeout(() => setLogHighlighted(false), 3200)
    return () => window.clearTimeout(timer)
  }, [logHighlighted])

  const resetButtonDraft = () => {
    setButtonDraft(emptyButtonDraft)
    setEditingButtonId('')
  }

  const startCreate = () => {
    setMode('create')
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
    setFormData(emptyForm)
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
      setSelectedSpaceId('')
      setMode('create')
      setFormData(emptyForm)
    }

    toast.success('空间已删除')
  }

  const handleExecuteButton = (button: SpaceButton) => {
    if (!currentSpace) return

    const targetDevices = currentSpace.deviceKeys.map((deviceKey) => allKnownDevices.get(deviceKey) || getPlaceholderDevice(deviceKey))
    setLogHighlighted(true)

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
    setLogHighlighted(false)
  }

  return (
    <section id="space-panel" className="panel active h-full">
      <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)] grid-rows-1 bg-[radial-gradient(circle_at_top_right,_rgba(96,132,255,0.12),_transparent_22%),linear-gradient(180deg,#f8fbff_0%,#f2f7fb_100%)]">
        <SpaceSidebar
          spaces={spaces}
          mode={mode}
          selectedSpaceId={selectedSpaceId}
          onCreate={startCreate}
          onSelectSpace={selectSpace}
        />

        <div className="min-w-0 px-4 py-4">
          {mode === 'view' && currentSpace ? (
            <SpaceDetailWorkbench
              currentSpace={currentSpace}
              viewDevices={viewDevices}
              currentLogs={currentLogs}
              logHighlighted={logHighlighted}
              onEdit={startEdit}
              onDelete={handleDeleteSpace}
              onExecuteButton={handleExecuteButton}
              onClearLogs={clearCurrentLogs}
            />
          ) : (
            <SpaceEditorWorkbench
              mode={mode}
              currentSpace={currentSpace}
              formData={formData}
              buttonDraft={buttonDraft}
              editingButtonId={editingButtonId}
              formDevices={formDevices}
              triggerOptions={triggerOptions}
              onChangeField={(field, value) => setFormData((current) => ({ ...current, [field]: value }))}
              onOpenDeviceSelector={() => {
                openDeviceSelector(
                  (selectedKeys) => {
                    setFormData((current) => ({ ...current, deviceKeys: selectedKeys }))
                  },
                  formData.deviceKeys
                )
              }}
              onChangeButtonDraft={(field, value) => setButtonDraft((current) => ({ ...current, [field]: value }))}
              onSaveButton={handleSaveButton}
              onResetButtonDraft={resetButtonDraft}
              onEditButton={handleEditButton}
              onDeleteButton={handleDeleteButton}
              onCancel={cancelEditing}
              onSaveSpace={handleSaveSpace}
              onDeleteSpace={handleDeleteSpace}
            />
          )}
        </div>
      </div>
    </section>
  )
}
