/**
 * ShareNet - Scene List Component
 * 场景列表组件
 */

import { useEffect, useState } from 'react'
import { ScrollArea } from '../ui/scroll-area'
import { Dialog } from '../ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog'
import { Select } from '../ui/select'
import { FieldRow } from '../ui/field-row'
import { useConfigStore, type Scene, type SceneStep } from '../../stores/configStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'

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

const createDefaultStep = (type: SceneStep['type'], seed?: SceneStep): SceneStep => {
  const delay = seed?.delay ?? 0
  if (type === 'software') {
    return { type, presetId: '', delay }
  }
  if (type === 'input') {
    return { type, presetId: '', delay }
  }
  if (type === 'mouse') {
    return { type, presetId: '', delay }
  }
  if (type === 'delay') {
    return { type, delay: seed?.delay ?? 1000 }
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
    })),
    ...(scene.mousePresetIds || []).map((presetId) => ({
      type: 'mouse' as const,
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

  const mousePresetIds = steps
    .filter((step) => step.type === 'mouse' && typeof step.presetId === 'string' && step.presetId.trim())
    .map((step) => step.presetId!.trim())

  return { softwarePresetIds, inputPresetIds, mousePresetIds }
}

const getStepTitle = (
  step: SceneStep,
  index: number,
  resolvePresetName: (id: string, type: 'software' | 'input' | 'mouse') => string
) => {
  const labels: Record<SceneStep['type'], string> = {
    software: '软件步骤',
    input: '键盘步骤',
    mouse: '鼠标',
    delay: '延迟'
  }

  let detail = ''
  if (step.type === 'software') {
    detail = step.presetId ? resolvePresetName(step.presetId, 'software') : '未选择预设'
  } else if (step.type === 'input') {
    detail = step.presetId ? resolvePresetName(step.presetId, 'input') : '未选择预设'
  } else if (step.type === 'mouse') {
    detail = step.presetId ? resolvePresetName(step.presetId, 'mouse') : '未选择预设'
  } else if (step.type === 'delay') {
    detail = `${step.delay ?? 0}ms`
  }

  if (typeof step.delay === 'number' && step.delay > 0) {
    detail = detail ? `${detail}，前置 ${step.delay}ms` : `前置 ${step.delay}ms`
  }

  return `${index + 1}. ${labels[step.type]}${detail ? ` - ${detail}` : ''}`
}

export function SceneList({ onSelect, multiSelect = false, selectedIds = [] }: Props) {
  const { scenes, softwarePresets, inputPresets, mousePresets, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const [editingScene, setEditingScene] = useState<Scene | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Scene | null>(null)
  const [formData, setFormData] = useState<SceneFormData>(emptyForm)
  const [dependencyErrors, setDependencyErrors] = useState<string[]>([])

  useEffect(() => {
    loadPresets('scene')
    loadPresets('software')
    loadPresets('input')
    loadPresets('mouse')
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

  const handleSave = async () => {
    if (!formData.name.trim()) return

    const steps = formData.steps
    const { softwarePresetIds, inputPresetIds, mousePresetIds } = extractPresetIds(steps)

    const testScene: Scene = {
      id: editingScene?.id || '',
      name: formData.name,
      description: formData.description,
      softwarePresetIds,
      inputPresetIds,
      mousePresetIds,
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
      mousePresetIds,
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deletePreset('scene', deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleSelect = (scene: Scene) => {
    if (onSelect) {
      onSelect(scene)
    }
  }

  const isSelected = (id: string) => selectedIds.includes(id)

  const getPresetName = (id: string, type: 'software' | 'input' | 'mouse') => {
    const presets = type === 'software' ? softwarePresets : type === 'input' ? inputPresets : mousePresets
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
        <Button
          onClick={() => {
            setEditingScene(null)
            setFormData(emptyForm)
            setIsDialogOpen(true)
          }}
          className="text-sm"
          variant= {"secondary"}
        >
          + 新增
        </Button>
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
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(scene)
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      编辑
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(scene)
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      删除
                    </Button>
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[85vh] max-h-[90vh] w-[660px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-lg">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b py-2">
              <div>
                <Dialog.Title className="text-lg font-semibold">{editingScene ? '编辑场景' : '新增场景'}</Dialog.Title>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden py-0">
              <ScrollArea.Root className="h-full">
                <ScrollArea.Viewport className="h-full w-full pr-1">
                  <div className="space-y-2">
                    {dependencyErrors.length > 0 && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <div className="mb-1 font-medium">依赖检查失败:</div>
                        <ul className="list-disc space-y-1 pl-5">
                          {dependencyErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <FieldRow label="名称 *">
                        <Input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="场景名称"
                          className="h-10 w-full"
                        />
                      </FieldRow>

                      <FieldRow label="描述">
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="场景描述"
                          className="w-full resize-none min-h-10"
                          rows={2}
                        />
                      </FieldRow>
                    </div>

                    <div className="rounded-xl border bg-secondary/20 p-4 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="text-sm font-medium text-muted-foreground">步骤编排</label>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button type="button" onClick={() => addStep('software')} className="h-8 px-2.5 text-xs">
                            + 软件
                          </Button>
                          <Button type="button" onClick={() => addStep('input')} className="h-8 px-2.5 text-xs">
                            + 键盘
                          </Button>
                          <Button type="button" onClick={() => addStep('mouse')} className="h-8 px-2.5 text-xs">
                            + 鼠标
                          </Button>
                          <Button type="button" onClick={() => addStep('delay')} className="h-8 px-2.5 text-xs">
                            + 延迟
                          </Button>
                        </div>
                      </div>

                      {formData.steps.length === 0 ? (
                        <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground">
                          还没有步骤，先添加一个软件、键盘、鼠标或延迟步骤。
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {formData.steps.map((step, index) => (
                            <div key={`${step.type}-${index}`} className="rounded-xl border bg-background p-3 shadow-sm">
                              <div className="flex flex-col gap-3 border-b pb-2 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                                    #{index + 1}
                                  </span>
                                  <Select.Root
                                    value={step.type}
                                    onValueChange={(value) => replaceStepType(index, value as SceneStep['type'])}
                                  >
                                    <Select.Trigger className="h-9 w-36 text-sm">
                                      <Select.Value />
                                      <Select.Icon />
                                    </Select.Trigger>
                                    <Select.Portal>
                                        <Select.Content>
                                          <Select.Item value="software">软件步骤</Select.Item>
                                          <Select.Item value="input">键盘步骤</Select.Item>
                                          <Select.Item value="mouse">鼠标</Select.Item>
                                          <Select.Item value="delay">延迟</Select.Item>
                                        </Select.Content>
                                      </Select.Portal>
                                  </Select.Root>
                                </div>

                                <div className="flex flex-wrap justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    onClick={() => moveStep(index, -1)}
                                    className="h-8 px-2.5 text-xs"
                                    disabled={index === 0}
                                  >
                                    上移
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => moveStep(index, 1)}
                                    className="h-8 px-2.5 text-xs"
                                    disabled={index === formData.steps.length - 1}
                                  >
                                    下移
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => removeStep(index)}
                                    className="h-8 px-3 text-xs text-destructive"
                                  >
                                    删除
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-2 flex gap-4">
                                {step.type === 'software' && (
                                  <FieldRow className="flex-1" labelClassName={"w-14"} label="软件预设">
                                    <Select.Root
                                      value={step.presetId || ''}
                                      onValueChange={(value) => updateStep(index, { presetId: value })}
                                    >
                                      <Select.Trigger className="h-10 w-full">
                                        <Select.Value placeholder="请选择软件预设" />
                                        <Select.Icon />
                                      </Select.Trigger>
                                      <Select.Portal>
                                        <Select.Content>
                                          {softwarePresets.map((preset) => (
                                            <Select.Item key={preset.id} value={preset.id}>
                                              {preset.name}
                                            </Select.Item>
                                          ))}
                                        </Select.Content>
                                      </Select.Portal>
                                    </Select.Root>
                                  </FieldRow>
                                )}

                                {step.type === 'input' && (
                                  <FieldRow className="flex-1" labelClassName={"w-14"} label="键盘预设">
                                    <Select.Root
                                      value={step.presetId || ''}
                                      onValueChange={(value) => updateStep(index, { presetId: value })}
                                    >
                                      <Select.Trigger className="h-10 w-full">
                                        <Select.Value placeholder="请选择键盘预设" />
                                        <Select.Icon />
                                      </Select.Trigger>
                                      <Select.Portal>
                                        <Select.Content>
                                          {inputPresets.map((preset) => (
                                            <Select.Item key={preset.id} value={preset.id}>
                                              {preset.name}
                                            </Select.Item>
                                          ))}
                                        </Select.Content>
                                      </Select.Portal>
                                    </Select.Root>
                                  </FieldRow>
                                )}

                                {step.type === 'mouse' && (
                                  <FieldRow className="flex-1" labelClassName={"w-14"} label="鼠标预设">
                                    <Select.Root
                                      value={step.presetId || ''}
                                      onValueChange={(value) => updateStep(index, { presetId: value })}
                                    >
                                      <Select.Trigger className="h-10 w-full">
                                        <Select.Value placeholder="请选择鼠标预设" />
                                        <Select.Icon />
                                      </Select.Trigger>
                                      <Select.Portal>
                                        <Select.Content>
                                          {mousePresets.map((preset) => (
                                            <Select.Item key={preset.id} value={preset.id}>
                                              {preset.name}
                                            </Select.Item>
                                          ))}
                                        </Select.Content>
                                      </Select.Portal>
                                    </Select.Root>
                                  </FieldRow>
                                )}

                                {step.type === 'delay' && (
                                  <FieldRow className="flex-1" labelClassName={"w-14"} label="延迟时间（毫秒）">
                                    <Input
                                      type="number"
                                      min={0}
                                      step={100}
                                      value={step.delay ?? 0}
                                      onChange={(e) => updateStep(index, { delay: Number(e.target.value) || 0 })}
                                      className="h-10 w-full"
                                    />
                                  </FieldRow>
                                )}

                                <FieldRow className="flex-1" labelClassName={"w-14"} label="前置延迟（毫秒）">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={100}
                                    value={step.delay ?? 0}
                                    onChange={(e) => updateStep(index, { delay: Number(e.target.value) || 0 })}
                                    className="h-10 w-full"
                                  />
                                </FieldRow>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical" className="w-2.5">
                  <ScrollArea.Thumb className="bg-border rounded-full" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </div>

            <div className="shrink-0 border-t bg-background/95 pt-2 backdrop-blur">
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button className="btn-secondary">取消</Button>
                </Dialog.Close>
                <Button onClick={handleSave} variant={"secondary"}>
                  保存
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除场景</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? '确定要删除此场景吗？「' + deleteTarget.name + '」' : '确定要删除此场景吗？'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-red-500 hover:bg-red/90 text-white'>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
