/**
 * ShareNet - Scene List Component
 * 场景列表组件
 */

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useConfigStore, type Scene, type SceneStep, type InputStep } from '../../stores/configStore'
import { RecorderDialog } from '../recorder/RecorderDialog'

interface Props {
  onSelect?: (scene: Scene) => void
  multiSelect?: boolean
  selectedIds?: string[]
}

interface SceneFormData {
  name: string
  description: string
  steps: SceneStep[]
}

const emptyForm: SceneFormData = {
  name: '',
  description: '',
  steps: []
}

type SceneDraftStep = {
  kind: 'scene'
  step: SceneStep
}

type PresetDraftStep = {
  kind: 'preset'
  steps: InputStep[]
}

const createDefaultStep = (type: SceneStep['type'], seed?: SceneStep): SceneStep => {
  const delay = seed?.delay ?? 0
  if (type === 'software') {
    return { type, presetId: '', delay }
  }
  if (type === 'input') {
    return { type, presetId: '', delay }
  }
  if (type === 'delay') {
    return { type, delay: seed?.delay ?? 1000 }
  }
  if (type === 'mouseClick') {
    return {
      type,
      delay,
      config: {
        button: 0,
        clientX: 0,
        clientY: 0,
        screenX: 0,
        screenY: 0,
        clickCount: 1,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        note: ''
      }
    }
  }
  return {
    type,
    delay,
    config: {
      clientX: 0,
      clientY: 0,
      screenX: 0,
      screenY: 0,
      duration: 0,
      note: ''
    }
  }
}

const isRecordedKeyboardStep = (step: InputStep) =>
  step.type === 'keyCombo' || step.type === 'keyPress' || step.type === 'textInput'

const isRecordedDelayStep = (step: InputStep) => step.type === 'delay'

const isRecordedMouseStep = (step: InputStep) => step.type === 'mouseClick'

const mapRecordedMouseStep = (step: InputStep): SceneStep => ({
  type: 'mouseClick',
  delay: step.delay ?? 0,
  config: {
    ...(step.data || {}),
    button: Number(step.data.button ?? 0),
    clientX: Number(step.data.clientX ?? 0),
    clientY: Number(step.data.clientY ?? 0),
    screenX: Number(step.data.screenX ?? step.data.clientX ?? 0),
    screenY: Number(step.data.screenY ?? step.data.clientY ?? 0),
    clickCount: Number(step.data.detail ?? step.data.clickCount ?? 1),
    ctrlKey: Boolean(step.data.ctrlKey ?? false),
    altKey: Boolean(step.data.altKey ?? false),
    shiftKey: Boolean(step.data.shiftKey ?? false),
    metaKey: Boolean(step.data.metaKey ?? false),
    note: String(step.data.note ?? '')
  }
})

const isSceneStepPreset = (step: SceneDraftStep | PresetDraftStep): step is PresetDraftStep => step.kind === 'preset'

const normalizeLegacySteps = (scene: Scene): SceneStep[] => {
  if (scene.steps && scene.steps.length > 0) {
    return scene.steps
  }

  return [
    ...(scene.softwarePresetIds || []).map((presetId) => ({
      type: 'software' as const,
      presetId
    })),
    ...(scene.inputPresetIds || []).map((presetId) => ({
      type: 'input' as const,
      presetId
    }))
  ]
}

const extractPresetIds = (steps: SceneStep[]) => {
  const softwarePresetIds = steps
    .filter((step) => step.type === 'software' && typeof step.presetId === 'string' && step.presetId.trim())
    .map((step) => step.presetId!.trim())

  const inputPresetIds = steps
    .filter((step) => step.type === 'input' && typeof step.presetId === 'string' && step.presetId.trim())
    .map((step) => step.presetId!.trim())

  return { softwarePresetIds, inputPresetIds }
}

const getStepTitle = (
  step: SceneStep,
  index: number,
  resolvePresetName: (id: string, type: 'software' | 'input') => string
) => {
  const labels: Record<SceneStep['type'], string> = {
    software: '软件步骤',
    input: '键盘步骤',
    delay: '延迟',
    mouseClick: '鼠标点击',
    mouseMove: '鼠标移动'
  }

  let detail = ''
  if (step.type === 'software') {
    detail = step.presetId ? resolvePresetName(step.presetId, 'software') : '未选择预设'
  } else if (step.type === 'input') {
    detail = step.presetId ? resolvePresetName(step.presetId, 'input') : '未选择预设'
  } else if (step.type === 'delay') {
    detail = `${step.delay ?? 0}ms`
  } else if (step.type === 'mouseClick') {
    const button = Number(step.config?.button ?? 0)
    const buttonLabel = button === 1 ? '中键' : button === 2 ? '右键' : '左键'
    const clickCount = Number(step.config?.clickCount ?? step.config?.detail ?? 1)
    const modifierLabels = [
      step.config?.ctrlKey ? 'Ctrl' : '',
      step.config?.altKey ? 'Alt' : '',
      step.config?.shiftKey ? 'Shift' : '',
      step.config?.metaKey ? 'Meta' : ''
    ].filter((label): label is string => Boolean(label))
    const point = `${step.config?.clientX ?? 0}, ${step.config?.clientY ?? 0}`
    const screenPoint = `${step.config?.screenX ?? 0}, ${step.config?.screenY ?? 0}`
    const modifiers = modifierLabels.length > 0 ? `${modifierLabels.join('+')} ` : ''
    const note = String(step.config?.note ?? '')
    const noteSuffix = note ? `，${note}` : ''
    detail = `${modifiers}${buttonLabel} @ ${point} [屏幕 ${screenPoint}] x${clickCount}${noteSuffix}`
  } else if (step.type === 'mouseMove') {
    const point = `${step.config?.clientX ?? 0}, ${step.config?.clientY ?? 0}`
    const screenPoint = `${step.config?.screenX ?? 0}, ${step.config?.screenY ?? 0}`
    const duration = Number(step.config?.duration ?? 0)
    const note = String(step.config?.note ?? '')
    const noteSuffix = note ? `，${note}` : ''
    detail = `${point} [屏幕 ${screenPoint}]${duration > 0 ? `，持续 ${duration}ms` : ''}${noteSuffix}`
  }

  if (typeof step.delay === 'number' && step.delay > 0) {
    detail = detail ? `${detail}，前置 ${step.delay}ms` : `前置 ${step.delay}ms`
  }

  return `${index + 1}. ${labels[step.type]}${detail ? ` - ${detail}` : ''}`
}

export function SceneList({ onSelect, multiSelect = false, selectedIds = [] }: Props) {
  const { scenes, softwarePresets, inputPresets, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const [editingScene, setEditingScene] = useState<Scene | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRecorderOpen, setIsRecorderOpen] = useState(false)
  const [formData, setFormData] = useState<SceneFormData>(emptyForm)
  const [dependencyErrors, setDependencyErrors] = useState<string[]>([])

  useEffect(() => {
    loadPresets('scene')
    loadPresets('software')
    loadPresets('input')
  }, [loadPresets])

  const updateStep = (index: number, updates: Partial<SceneStep>) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps]
      nextSteps[index] = { ...nextSteps[index], ...updates }
      return { ...prev, steps: nextSteps }
    })
  }

  const replaceStepType = (index: number, type: SceneStep['type']) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps]
      nextSteps[index] = createDefaultStep(type, nextSteps[index])
      return { ...prev, steps: nextSteps }
    })
  }

  const addStep = (type: SceneStep['type']) => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, createDefaultStep(type)]
    }))
  }

  const moveStep = (index: number, delta: number) => {
    setFormData((prev) => {
      const targetIndex = index + delta
      if (targetIndex < 0 || targetIndex >= prev.steps.length) return prev

      const nextSteps = [...prev.steps]
      const [moved] = nextSteps.splice(index, 1)
      nextSteps.splice(targetIndex, 0, moved)
      return { ...prev, steps: nextSteps }
    })
  }

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }))
  }

  const handleImportRecording = async (name: string, steps: InputStep[]) => {
    const trimmedName = name.trim() || `录制步骤 ${Date.now()}`
    const draftSteps: Array<SceneDraftStep | PresetDraftStep> = []
    let keyboardBuffer: InputStep[] = []

    const flushKeyboardBuffer = () => {
      if (keyboardBuffer.length === 0) return
      draftSteps.push({ kind: 'preset', steps: [...keyboardBuffer] })
      keyboardBuffer = []
    }

    for (const step of steps) {
      if (isRecordedKeyboardStep(step)) {
        keyboardBuffer.push(step)
        continue
      }

      if (isRecordedDelayStep(step) && keyboardBuffer.length > 0) {
        keyboardBuffer.push(step)
        continue
      }

      flushKeyboardBuffer()

      if (isRecordedMouseStep(step)) {
        draftSteps.push({
          kind: 'scene',
          step: mapRecordedMouseStep(step)
        })
        continue
      }

      if (isRecordedDelayStep(step)) {
        draftSteps.push({
          kind: 'scene',
          step: {
            type: 'delay',
            delay: Number(step.data.delay ?? step.delay ?? 0) || 0
          }
        })
      }
    }

    flushKeyboardBuffer()

    const keyboardSegments = draftSteps.filter(isSceneStepPreset)
    const sceneSteps: SceneStep[] = []
    let keyboardIndex = 0

    for (const draft of draftSteps) {
      if (draft.kind === 'scene') {
        sceneSteps.push(draft.step)
        continue
      }

      keyboardIndex += 1
      const presetName = keyboardSegments.length === 1 ? trimmedName : `${trimmedName} - 键盘片段 ${keyboardIndex}`
      const result = (await window.electronAPI?.savePreset('input', {
        name: presetName,
        steps: draft.steps
      })) as { success?: boolean; preset?: { id?: string } } | undefined
      const preset = result?.preset
      if (!result?.success || !preset?.id) {
        setDependencyErrors((prev) => [...prev, `录制导入失败：无法创建键盘预设「${presetName}」`])
        return
      }

      sceneSteps.push({
        type: 'input',
        presetId: preset.id
      })
    }

    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, ...sceneSteps]
    }))
    await loadPresets('input')
    setIsRecorderOpen(false)
    if (!formData.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        name: trimmedName,
        steps: prev.steps
      }))
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    const steps = formData.steps
    const { softwarePresetIds, inputPresetIds } = extractPresetIds(steps)

    const testScene: Scene = {
      id: editingScene?.id || '',
      name: formData.name,
      description: formData.description,
      softwarePresetIds,
      inputPresetIds,
      steps,
      createdAt: editingScene?.createdAt || Date.now(),
      updatedAt: Date.now()
    }

    const deps = await window.electronAPI?.checkSceneDependencies(testScene)
    if (deps && !deps.valid) {
      setDependencyErrors(deps.missing || [])
      return
    }

    setDependencyErrors([])

    const payload = {
      name: formData.name,
      description: formData.description,
      softwarePresetIds,
      inputPresetIds,
      steps
    }

    if (editingScene) {
      await updatePreset('scene', editingScene.id, payload)
    } else {
      await savePreset('scene', payload)
    }

    setFormData(emptyForm)
    setEditingScene(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (scene: Scene) => {
    setEditingScene(scene)
    setFormData({
      name: scene.name,
      description: scene.description || '',
      steps: normalizeLegacySteps(scene)
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此场景吗？')) {
      await deletePreset('scene', id)
    }
  }

  const handleSelect = (scene: Scene) => {
    if (onSelect) {
      onSelect(scene)
    }
  }

  const isSelected = (id: string) => selectedIds.includes(id)

  const getPresetName = (id: string, type: 'software' | 'input') => {
    const presets = type === 'software' ? softwarePresets : inputPresets
    const preset = presets.find((p) => p.id === id)
    return preset?.name || id
  }

  return (
    <div className="preset-list-container">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">场景编排</h3>
          <div className="text-sm text-muted-foreground">以步骤流编排软件、键盘、鼠标和延迟动作。</div>
        </div>
        <button
          onClick={() => {
            setEditingScene(null)
            setFormData(emptyForm)
            setIsDialogOpen(true)
          }}
          className="btn-primary text-sm"
        >
          + 新增
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无场景</div>
      ) : (
        <div className="space-y-2">
          {scenes.map((scene) => {
            const stepCount = scene.steps?.length || (scene.softwarePresetIds?.length || 0) + (scene.inputPresetIds?.length || 0)
            return (
              <div
                key={scene.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected(scene.id) ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                }`}
                onClick={() => handleSelect(scene)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{scene.name}</div>
                    {scene.description && <div className="text-sm text-muted-foreground truncate">{scene.description}</div>}
                    <div className="text-xs text-muted-foreground mt-1">共 {stepCount} 个步骤</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(scene.steps?.length ? scene.steps : normalizeLegacySteps(scene)).slice(0, 4).map((step, index) => (
                        <span
                          key={`${scene.id}-${index}`}
                          className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                        >
                          {getStepTitle(step, index, getPresetName).replace(/^\d+\.\s*/, '')}
                        </span>
                      ))}
                      {stepCount > 4 && <span className="text-xs text-muted-foreground">...</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(scene)
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      编辑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(scene.id)
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[760px] max-h-[85vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold mb-4">{editingScene ? '编辑场景' : '新增场景'}</Dialog.Title>

            {dependencyErrors.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
                <div className="font-medium mb-1">依赖检查失败:</div>
                <ul className="list-disc list-inside">
                  {dependencyErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="场景名称"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="场景描述（可选）"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                />
              </div>

              <div className="rounded border p-3 space-y-3 bg-secondary/20">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-sm font-medium">步骤编排</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setIsRecorderOpen(true)} className="text-xs px-2 py-1 rounded border">
                      从录制器导入
                    </button>
                    <button type="button" onClick={() => addStep('software')} className="text-xs px-2 py-1 rounded border">
                      + 软件
                    </button>
                    <button type="button" onClick={() => addStep('input')} className="text-xs px-2 py-1 rounded border">
                      + 键盘
                    </button>
                    <button type="button" onClick={() => addStep('delay')} className="text-xs px-2 py-1 rounded border">
                      + 延迟
                    </button>
                    <button type="button" onClick={() => addStep('mouseClick')} className="text-xs px-2 py-1 rounded border">
                      + 鼠标点击
                    </button>
                    <button type="button" onClick={() => addStep('mouseMove')} className="text-xs px-2 py-1 rounded border">
                      + 鼠标移动
                    </button>
                  </div>
                </div>

                {formData.steps.length === 0 ? (
                  <div className="text-sm text-muted-foreground border border-dashed rounded p-4 bg-background">
                    还没有步骤，先添加一个软件、键盘、鼠标或延迟步骤。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div key={`${step.type}-${index}`} className="rounded border bg-background p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground shrink-0">#{index + 1}</span>
                            <select
                              value={step.type}
                              onChange={(e) => replaceStepType(index, e.target.value as SceneStep['type'])}
                              className="text-sm px-2 py-1 border rounded bg-background"
                            >
                              <option value="software">软件步骤</option>
                              <option value="input">键盘步骤</option>
                              <option value="delay">延迟</option>
                              <option value="mouseClick">鼠标点击</option>
                              <option value="mouseMove">鼠标移动</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveStep(index, -1)}
                              className="text-xs px-2 py-1 rounded border"
                              disabled={index === 0}
                            >
                              上移
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(index, 1)}
                              className="text-xs px-2 py-1 rounded border"
                              disabled={index === formData.steps.length - 1}
                            >
                              下移
                            </button>
                            <button type="button" onClick={() => removeStep(index)} className="text-xs px-2 py-1 rounded border text-destructive">
                              删除
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">前置延迟（毫秒）</label>
                          <input
                            type="number"
                            min={0}
                            value={step.delay ?? 0}
                            onChange={(e) => updateStep(index, { delay: Number(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>

                        {step.type === 'software' && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">软件预设</label>
                            <select
                              value={step.presetId || ''}
                              onChange={(e) => updateStep(index, { presetId: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            >
                              <option value="">请选择软件预设</option>
                              {softwarePresets.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {step.type === 'input' && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">键盘预设</label>
                            <select
                              value={step.presetId || ''}
                              onChange={(e) => updateStep(index, { presetId: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                            >
                              <option value="">请选择键盘预设</option>
                              {inputPresets.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {step.type === 'delay' && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">延迟时间（毫秒）</label>
                            <input
                              type="number"
                              min={0}
                              value={step.delay ?? 0}
                              onChange={(e) => updateStep(index, { delay: Number(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border rounded-md"
                            />
                          </div>
                        )}

                        {step.type === 'mouseClick' && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">按钮</label>
                              <select
                                value={Number(step.config?.button ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      button: Number(e.target.value)
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                              >
                                <option value={0}>左键</option>
                                <option value={1}>中键</option>
                                <option value={2}>右键</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">点击次数</label>
                              <input
                                type="number"
                                min={1}
                                value={Number(step.config?.clickCount ?? step.config?.detail ?? 1)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      clickCount: Number(e.target.value) || 1,
                                      detail: Number(e.target.value) || 1
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">客户端 X</label>
                              <input
                                type="number"
                                value={Number(step.config?.clientX ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      clientX: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">客户端 Y</label>
                              <input
                                type="number"
                                value={Number(step.config?.clientY ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      clientY: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">屏幕 X</label>
                              <input
                                type="number"
                                value={Number(step.config?.screenX ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      screenX: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">屏幕 Y</label>
                              <input
                                type="number"
                                value={Number(step.config?.screenY ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      screenY: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">备注</label>
                              <input
                                type="text"
                                value={String(step.config?.note || '')}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      note: e.target.value
                                    }
                                  })
                                }
                                placeholder="可选"
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                          </div>
                        )}

                        {step.type === 'mouseMove' && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">客户端 X</label>
                              <input
                                type="number"
                                value={Number(step.config?.clientX ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      clientX: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">客户端 Y</label>
                              <input
                                type="number"
                                value={Number(step.config?.clientY ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      clientY: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">屏幕 X</label>
                              <input
                                type="number"
                                value={Number(step.config?.screenX ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      screenX: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">屏幕 Y</label>
                              <input
                                type="number"
                                value={Number(step.config?.screenY ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      screenY: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">持续时间</label>
                              <input
                                type="number"
                                min={0}
                                value={Number(step.config?.duration ?? 0)}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      duration: Number(e.target.value) || 0
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">备注</label>
                              <input
                                type="text"
                                value={String(step.config?.note || '')}
                                onChange={(e) =>
                                  updateStep(index, {
                                    config: {
                                      ...(step.config || {}),
                                      note: e.target.value
                                    }
                                  })
                                }
                                placeholder="可选"
                                className="w-full px-3 py-2 border rounded-md"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <button className="btn-secondary">取消</button>
              </Dialog.Close>
              <button onClick={handleSave} className="btn-primary">
                保存
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <RecorderDialog
        open={isRecorderOpen}
        onOpenChange={setIsRecorderOpen}
        onSave={handleImportRecording}
      />
    </div>
  )
}


