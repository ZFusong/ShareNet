/**
 * ShareNet - Mouse Preset List Component
 * 鼠标预设列表组件
 */

import { useEffect, useState } from 'react'
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
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FieldRow } from '../ui/field-row'
import { useConfigStore, type MousePreset, type MouseStep } from '../../stores/configStore'
import { MouseRecorderDialog } from './MouseRecorderDialog'

interface Props {
  onSelect?: (preset: MousePreset) => void
  multiSelect?: boolean
  selectedIds?: string[]
}

type MouseStepType = MouseStep['type']

const mouseStepTypes: MouseStepType[] = ['mouseMove', 'mouseScroll', 'mouseClick']

const isMouseStep = (step: MouseStep) => mouseStepTypes.includes(step.type)

const toNumber = (value: unknown, fallback = 0): number => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const normalizeMouseStepData = (step: MouseStep): MouseStep => {
  const data = step.data || {}

  if (step.type === 'mouseMove') {
    return {
      type: step.type,
      data: {
        screenX: toNumber(data.screenX ?? data.clientX),
        screenY: toNumber(data.screenY ?? data.clientY),
        note: String(data.note ?? '')
      }
    }
  }

  if (step.type === 'mouseScroll') {
    const rawDirection = String(data.direction ?? '').toLowerCase()
    const direction =
      rawDirection === 'up' || rawDirection === 'down'
        ? rawDirection
        : toNumber(data.deltaY) < 0
          ? 'up'
          : 'down'
    const legacyDeltaY = toNumber(data.deltaY)
    const stepValue = toNumber(data.step ?? data.steps, 0)

    return {
      type: step.type,
      data: {
        direction,
        step: stepValue > 0 ? Math.round(stepValue) : Math.max(1, Math.round(Math.abs(legacyDeltaY) / 120) || 1),
        note: String(data.note ?? '')
      }
    }
  }

  return {
    type: step.type,
    data: {
      button: toNumber(data.button, 0),
      clickCount: toNumber(data.clickCount, 1),
      note: String(data.note ?? '')
    }
  }
}

const createDefaultStep = (type: MouseStepType, seed?: MouseStep): MouseStep => {
  const data = seed ? normalizeMouseStepData(seed).data : {}

  if (type === 'mouseScroll') {
    return {
      type,
      data: {
        direction: String(data.direction ?? 'down').toLowerCase() === 'up' ? 'up' : 'down',
        step: Math.max(1, toNumber(data.step ?? data.steps, 1)),
        note: String(data.note ?? '')
      }
    }
  }

  if (type === 'mouseClick') {
    return {
      type,
      data: {
        button: toNumber(data.button, 0),
        clickCount: toNumber(data.clickCount, 1),
        note: String(data.note ?? '')
      }
    }
  }

  return {
    type,
    data: {
      screenX: toNumber(data.screenX ?? data.clientX),
      screenY: toNumber(data.screenY ?? data.clientY),
      note: String(data.note ?? '')
    }
  }
}

const formatMouseValue = (step: MouseStep) => {
  if (step.type === 'mouseMove') {
    return `移动 @ ${toNumber(step.data.screenX ?? step.data.clientX)}, ${toNumber(step.data.screenY ?? step.data.clientY)}`
  }

  if (step.type === 'mouseScroll') {
    const direction = String(step.data.direction ?? 'down') === 'up' ? '上' : '下'
    const stepCount = Math.max(1, toNumber(step.data.step ?? step.data.steps, 1))
    return `滚动 ${direction}${stepCount}档`
  }

  const clickCount = toNumber(step.data.clickCount, 1)
  const clickLabel = clickCount === 2 ? '双击' : '单击'
  const button = toNumber(step.data.button, 0)
  const buttonLabel = button === 1 ? '中键' : button === 2 ? '右键' : '左键'
  return `${clickLabel} ${buttonLabel}`
}

export function MousePresetList({ onSelect, multiSelect = false, selectedIds = [] }: Props) {
  const { mousePresets, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const [editingPreset, setEditingPreset] = useState<MousePreset | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MousePreset | null>(null)
  const [isRecorderOpen, setIsRecorderOpen] = useState(false)
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: '', steps: [] as MouseStep[] })

  useEffect(() => {
    loadPresets('mouse')
  }, [loadPresets])

  const updateStep = (index: number, updates: Partial<MouseStep>) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps]
      nextSteps[index] = {
        ...nextSteps[index],
        ...updates,
        data: updates.data ? { ...nextSteps[index].data, ...updates.data } : nextSteps[index].data
      }
      return { ...prev, steps: nextSteps }
    })
  }

  const replaceStepType = (index: number, type: MouseStepType) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps]
      nextSteps[index] = createDefaultStep(type, nextSteps[index])
      return { ...prev, steps: nextSteps }
    })
  }

  const addStep = (type: MouseStepType) => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, createDefaultStep(type)]
    }))
  }

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    const steps = formData.steps.filter(isMouseStep).map(normalizeMouseStepData)
    const payload = { name: formData.name, steps }

    if (editingPreset) {
      await updatePreset('mouse', editingPreset.id, payload)
    } else {
      await savePreset('mouse', payload)
    }

    setFormData({ name: '', steps: [] })
    setEditingPreset(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (preset: MousePreset) => {
    setEditingPreset(preset)
    setFormData({
      name: preset.name,
      steps: preset.steps.filter(isMouseStep).map(normalizeMouseStepData)
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deletePreset('mouse', deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleSelect = (preset: MousePreset) => {
    if (onSelect) onSelect(preset)
  }

  const isSelected = (id: string) => selectedIds.includes(id)

  const applyRecorderStep = (step: MouseStep) => {
    if (recordingIndex === null) return
    updateStep(recordingIndex, {
      data: {
        ...formData.steps[recordingIndex]?.data,
        ...normalizeMouseStepData(step).data
      }
    })
    setIsRecorderOpen(false)
    setRecordingIndex(null)
  }

  return (
    <div className="preset-list-container">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">鼠标预设</h3>
          <div className="text-sm text-muted-foreground">移动步骤使用屏幕坐标，点击和滚动步骤只保留动作参数。</div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingPreset(null)
            setFormData({ name: '', steps: [] })
            setIsDialogOpen(true)
          }}
          className="text-sm"
          variant="secondary"
        >
          + 新增
        </Button>
      </div>

      {mousePresets.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">暂无鼠标预设</div>
      ) : (
        <div className="space-y-2">
          {mousePresets.map((preset) => (
            <div
              key={preset.id}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                isSelected(preset.id) ? 'border-primary bg-primary/10' : 'hover:bg-accent'
              }`}
              onClick={() => handleSelect(preset)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-sm text-muted-foreground">{preset.steps.length} 个步骤</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {preset.steps.slice(0, 3).map((step, index) => (
                      <span key={`${preset.id}-${index}`} className="rounded bg-secondary px-2 py-0.5 text-xs">
                        {formatMouseValue(step)}
                      </span>
                    ))}
                    {preset.steps.length > 3 && <span className="text-xs text-muted-foreground">...</span>}
                  </div>
                </div>
                <div className="ml-2 flex gap-2">
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(preset)
                    }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    编辑
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(preset)
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[720px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-background shadow-lg">
            <div className="shrink-0 border-b py-2">
              <Dialog.Title className="text-lg font-semibold">{editingPreset ? '编辑鼠标预设' : '新增鼠标预设'}</Dialog.Title>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-0">
              <div className="space-y-2 pt-2 pr-1">
                <FieldRow label="名称 *">
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="预设名称"
                    className="h-10 w-full"
                  />
                </FieldRow>

                <div className="rounded-xl border bg-secondary/20 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-muted-foreground">步骤</label>
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => addStep('mouseMove')} className="h-8 px-2.5 text-xs">
                        + 移动
                      </Button>
                      <Button type="button" onClick={() => addStep('mouseScroll')} className="h-8 px-2.5 text-xs">
                        + 滚动
                      </Button>
                      <Button type="button" onClick={() => addStep('mouseClick')} className="h-8 px-2.5 text-xs">
                        + 点击
                      </Button>
                    </div>
                  </div>

                  {formData.steps.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">暂无步骤</div>
                  ) : (
                    <div className="space-y-3">
                  {formData.steps.map((step, index) => (
                        <div key={index} className="rounded-lg border bg-background p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Select.Root value={step.type} onValueChange={(value) => replaceStepType(index, value as MouseStepType)}>
                                <Select.Trigger className="h-9 w-28">
                                  <Select.Value />
                                  <Select.Icon />
                                </Select.Trigger>
                                <Select.Portal>
                                  <Select.Content>
                                    <Select.Item value="mouseMove">移动</Select.Item>
                                    <Select.Item value="mouseScroll">滚动</Select.Item>
                                    <Select.Item value="mouseClick">点击</Select.Item>
                                  </Select.Content>
                                </Select.Portal>
                              </Select.Root>
                              <span className="text-xs text-muted-foreground">步骤 #{index + 1}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {step.type === 'mouseMove' && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={() => {
                                    setRecordingIndex(index)
                                    setIsRecorderOpen(true)
                                  }}
                                >
                                  从录制器获取
                                </Button>
                              )}
                              <Button
                                type="button"
                                onClick={() => removeStep(index)}
                                className="h-8 px-3 text-xs text-destructive"
                              >
                                删除
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-3">
                            {step.type === 'mouseMove' && (
                              <div className="grid gap-3 md:grid-cols-2">
                                <FieldRow label="屏幕 X" labelClassName="w-14">
                                  <Input
                                    type="number"
                                    value={toNumber(step.data.screenX ?? step.data.clientX)}
                                    onChange={(e) =>
                                      updateStep(index, {
                                        data: {
                                          ...step.data,
                                          screenX: toNumber(e.target.value)
                                        }
                                      })
                                    }
                                    className="h-10 w-full"
                                  />
                                </FieldRow>
                                <FieldRow label="屏幕 Y" labelClassName="w-14">
                                  <Input
                                    type="number"
                                    value={toNumber(step.data.screenY ?? step.data.clientY)}
                                    onChange={(e) =>
                                      updateStep(index, {
                                        data: {
                                          ...step.data,
                                          screenY: toNumber(e.target.value)
                                        }
                                      })
                                    }
                                    className="h-10 w-full"
                                  />
                                </FieldRow>
                              </div>
                            )}

                            {step.type === 'mouseClick' && (
                              <div className="grid gap-3 md:grid-cols-2">
                                <FieldRow label="点击类型" labelClassName="w-14">
                                  <Select.Root
                                    value={String(Number(step.data.clickCount ?? 1))}
                                    onValueChange={(value) =>
                                      updateStep(index, {
                                        data: {
                                          ...step.data,
                                          clickCount: Number(value) || 1
                                        }
                                      })
                                    }
                                  >
                                    <Select.Trigger className="h-10 w-full">
                                      <Select.Value />
                                      <Select.Icon />
                                    </Select.Trigger>
                                    <Select.Portal>
                                      <Select.Content>
                                        <Select.Item value="1">单击</Select.Item>
                                        <Select.Item value="2">双击</Select.Item>
                                      </Select.Content>
                                    </Select.Portal>
                                  </Select.Root>
                                </FieldRow>
                                <FieldRow label="按钮" labelClassName="w-14">
                                  <Select.Root
                                    value={String(Number(step.data.button ?? 0))}
                                    onValueChange={(value) =>
                                      updateStep(index, {
                                        data: {
                                          ...step.data,
                                          button: Number(value) || 0
                                        }
                                      })
                                    }
                                  >
                                    <Select.Trigger className="h-10 w-full">
                                      <Select.Value />
                                      <Select.Icon />
                                    </Select.Trigger>
                                    <Select.Portal>
                                      <Select.Content>
                                        <Select.Item value="0">左键</Select.Item>
                                        <Select.Item value="1">中键</Select.Item>
                                        <Select.Item value="2">右键</Select.Item>
                                      </Select.Content>
                                    </Select.Portal>
                                  </Select.Root>
                                </FieldRow>
                              </div>
                            )}

                            {step.type === 'mouseScroll' && (
                              <div>

                                <div className="grid gap-3 md:grid-cols-2">
                                  <FieldRow label="滚动方向" labelClassName="w-14">
                                    <Select.Root
                                      value={String(step.data.direction ?? 'down')}
                                      onValueChange={(value) =>
                                        updateStep(index, {
                                          data: {
                                            ...step.data,
                                            direction: value === 'up' ? 'up' : 'down'
                                          }
                                        })
                                      }
                                    >
                                      <Select.Trigger className="h-10 w-full">
                                        <Select.Value />
                                        <Select.Icon />
                                      </Select.Trigger>
                                      <Select.Portal>
                                        <Select.Content>
                                          <Select.Item value="up">上滚</Select.Item>
                                          <Select.Item value="down">下滚</Select.Item>
                                        </Select.Content>
                                      </Select.Portal>
                                    </Select.Root>
                                  </FieldRow>
                                  <FieldRow label="步长" labelClassName="w-14">
                                    <Input
                                      type="number"
                                      min={1}
                                      step={1}
                                      value={Math.max(1, toNumber(step.data.step ?? step.data.steps, 1))}
                                      onChange={(e) =>
                                        updateStep(index, {
                                          data: {
                                            ...step.data,
                                            step: Math.max(1, toNumber(e.target.value, 1))
                                          }
                                        })
                                      }
                                      className="h-10 w-full"
                                    />
                                  </FieldRow>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  滚轮按“上/下 + 步长”保存，1 档表示一次滚轮刻度。
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t bg-background/95 pt-2 backdrop-blur">
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="outline">取消</Button>
                </Dialog.Close>
                <Button onClick={handleSave} variant="secondary">
                  保存
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <MouseRecorderDialog
        open={isRecorderOpen}
        initialPoint={
          recordingIndex !== null && formData.steps[recordingIndex]?.type === 'mouseMove'
            ? {
                screenX: toNumber(formData.steps[recordingIndex]?.data.screenX ?? formData.steps[recordingIndex]?.data.clientX),
                screenY: toNumber(formData.steps[recordingIndex]?.data.screenY ?? formData.steps[recordingIndex]?.data.clientY)
              }
            : null
        }
        onOpenChange={(open) => {
          setIsRecorderOpen(open)
          if (!open) {
            setRecordingIndex(null)
          }
        }}
        onCapture={applyRecorderStep}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除鼠标预设</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `确定要删除此预设吗？「${deleteTarget.name}」` : '确定要删除此预设吗？'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 text-white hover:bg-red/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
