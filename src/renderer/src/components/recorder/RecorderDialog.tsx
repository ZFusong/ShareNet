/**
 * ShareNet - Recorder Dialog
 * 键鼠录制器组件
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { type InputStep } from '../../stores/configStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, steps: InputStep[]) => void
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'preview'

type ModifierKey = 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
type ShortcutToken = string

const cloneStep = (step: InputStep): InputStep => ({
  type: step.type,
  delay: step.delay,
  data: { ...(step.data || {}) }
})

const dedupeShortcutTokens = (tokens: ShortcutToken[]) => {
  const seen = new Set<string>()
  return tokens.filter((token) => {
    if (!token || seen.has(token)) return false
    seen.add(token)
    return true
  })
}

const createRecordedStep = (type: InputStep['type'], seed?: InputStep): InputStep => {
  const delay = seed?.delay ?? 0
  const isShortcutType = seed?.type === 'keyCombo' || seed?.type === 'keyPress'
  const isNextShortcutType = type === 'keyCombo' || type === 'keyPress'
  const shouldClearShortcut = isShortcutType && isNextShortcutType && seed?.type !== type

  switch (type) {
    case 'delay':
      return {
        type,
        data: {
          delay: Number(seed?.data.delay ?? 1000) || 1000
        },
        delay: 0
      }
    case 'textInput':
      return {
        type,
        delay,
        data: {
          text: String(seed?.data.text ?? '')
        }
      }
    case 'mouseClick':
      return {
        type,
        delay,
        data: {
          button: Number(seed?.data.button ?? 0),
          clientX: Number(seed?.data.clientX ?? 0),
          clientY: Number(seed?.data.clientY ?? 0),
          screenX: Number(seed?.data.screenX ?? 0),
          screenY: Number(seed?.data.screenY ?? 0),
          detail: Number(seed?.data.detail ?? 1),
          ctrlKey: Boolean(seed?.data.ctrlKey ?? false),
          altKey: Boolean(seed?.data.altKey ?? false),
          shiftKey: Boolean(seed?.data.shiftKey ?? false),
          metaKey: Boolean(seed?.data.metaKey ?? false)
        }
      }
    case 'mouseMove':
      return {
        type,
        delay,
        data: {
          clientX: Number(seed?.data.clientX ?? 0),
          clientY: Number(seed?.data.clientY ?? 0),
          screenX: Number(seed?.data.screenX ?? 0),
          screenY: Number(seed?.data.screenY ?? 0),
          duration: Number(seed?.data.duration ?? 0),
          note: String(seed?.data.note ?? '')
        }
      }
    case 'keyCombo':
    case 'keyPress':
    default:
      return {
        type,
        delay,
        data: {
          key: shouldClearShortcut ? '' : String(seed?.data.key ?? ''),
          code: shouldClearShortcut ? '' : String(seed?.data.code ?? ''),
          ctrlKey: shouldClearShortcut ? false : Boolean(seed?.data.ctrlKey ?? false),
          altKey: shouldClearShortcut ? false : Boolean(seed?.data.altKey ?? false),
          shiftKey: shouldClearShortcut ? false : Boolean(seed?.data.shiftKey ?? false),
          metaKey: shouldClearShortcut ? false : Boolean(seed?.data.metaKey ?? false),
          repeat: shouldClearShortcut ? false : Boolean(seed?.data.repeat ?? false)
        }
      }
  }
}

const getButtonLabel = (button: number) => {
  if (button === 1) return '中键'
  if (button === 2) return '右键'
  return '左键'
}

const normalizeShortcutToken = (key: string) => {
  if (key === 'Control') return 'Ctrl'
  if (key === 'Alt') return 'Alt'
  if (key === 'Shift') return 'Shift'
  if (key === 'Meta') return 'Meta'
  if (key === 'Escape') return 'Esc'
  if (key === ' ') return 'Space'
  if (key === 'ArrowUp') return 'Up'
  if (key === 'ArrowDown') return 'Down'
  if (key === 'ArrowLeft') return 'Left'
  if (key === 'ArrowRight') return 'Right'
  return key
}

const formatModifiers = (data: Record<string, unknown>) => {
  const parts: string[] = []
  if (data.ctrlKey) parts.push('Ctrl')
  if (data.altKey) parts.push('Alt')
  if (data.shiftKey) parts.push('Shift')
  if (data.metaKey) parts.push('Meta')
  return parts.length > 0 ? parts.join('+') : ''
}

const getShortcutTokens = (step: InputStep) => {
  const data = step.data as Record<string, unknown>
  return dedupeShortcutTokens([
    data.ctrlKey ? 'Ctrl' : '',
    data.altKey ? 'Alt' : '',
    data.shiftKey ? 'Shift' : '',
    data.metaKey ? 'Meta' : '',
    normalizeShortcutToken(String(data.key ?? ''))
  ].filter(Boolean) as ShortcutToken[])
}

const formatKeyboardDetail = (step: InputStep) => {
  if (step.type === 'textInput') {
    const text = String(step.data.text ?? '')
    return text ? `文本: ${text}` : '文本输入'
  }

  const code = String(step.data.code ?? '')
  const tokens = getShortcutTokens(step)
  const summary = tokens.length > 0 ? tokens.join(' + ') : '未命名按键'
  return code ? `${summary} (${code})` : summary
}

const formatMouseDetail = (step: InputStep) => {
  if (step.type === 'mouseClick') {
    const button = Number(step.data.button ?? 0)
    const modifiers = formatModifiers(step.data)
    const point = `${Number(step.data.clientX ?? 0)}, ${Number(step.data.clientY ?? 0)}`
    const screenPoint = `${Number(step.data.screenX ?? 0)}, ${Number(step.data.screenY ?? 0)}`
    const detail = Number(step.data.detail ?? 1)
    const modifierText = modifiers ? `${modifiers} ` : ''
    return `${modifierText}${getButtonLabel(button)} @ ${point} [屏幕 ${screenPoint}] x${detail}`
  }

  if (step.type === 'mouseMove') {
    const point = `${Number(step.data.clientX ?? 0)}, ${Number(step.data.clientY ?? 0)}`
    const screenPoint = `${Number(step.data.screenX ?? 0)}, ${Number(step.data.screenY ?? 0)}`
    const duration = Number(step.data.duration ?? 0)
    const note = String(step.data.note ?? '')
    return `${point} [屏幕 ${screenPoint}]${duration > 0 ? `，持续 ${duration}ms` : ''}${note ? `，${note}` : ''}`
  }

  return ''
}

const formatStepDetail = (step: InputStep) => {
  if (step.type === 'delay') {
    return `${Number(step.data.delay ?? step.delay ?? 1000)}ms`
  }

  if (step.type === 'mouseClick' || step.type === 'mouseMove') {
    return formatMouseDetail(step)
  }

  if (step.type === 'keyCombo' || step.type === 'keyPress' || step.type === 'textInput') {
    return formatKeyboardDetail(step)
  }

  return ''
}

const getStepLabel = (step: InputStep, index: number) => {
  const labels = {
    keyCombo: '组合键',
    keyPress: '按键',
    mouseClick: '鼠标点击',
    mouseMove: '鼠标移动',
    textInput: '文字输入',
    delay: '延迟'
  } as const

  const detail = formatStepDetail(step)
  return `${index + 1}. ${labels[step.type]}${detail ? ` - ${detail}` : ''}`
}

const hasKeyboardStepType = (step: InputStep) =>
  step.type === 'keyCombo' || step.type === 'keyPress' || step.type === 'textInput'

export function RecorderDialog({ open, onOpenChange, onSave }: Props) {
  const [state, setState] = useState<RecorderState>('idle')
  const [steps, setSteps] = useState<InputStep[]>([])
  const [stepName, setStepName] = useState('')
  const [lastStepTime, setLastStepTime] = useState<number>(Date.now())
  const [contextStepIndex, setContextStepIndex] = useState<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingStep, setEditingStep] = useState<InputStep | null>(null)
  const previewIndex = useRef(0)
  const previewInterval = useRef<NodeJS.Timeout | null>(null)
  const pressedKeyboardCodesRef = useRef<Set<string>>(new Set())

  const clearPreviewTimer = useCallback(() => {
    if (previewInterval.current) {
      clearInterval(previewInterval.current)
      previewInterval.current = null
    }
    previewIndex.current = 0
  }, [])

  const clearPressedKeyboardCodes = useCallback(() => {
    pressedKeyboardCodesRef.current.clear()
  }, [])

  const closeEditor = useCallback(() => {
    setEditingIndex(null)
    setEditingStep(null)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state !== 'recording') return
    if (e.repeat) return

    const now = Date.now()
    const delay = now - lastStepTime
    const code = e.code || e.key
    if (!code || pressedKeyboardCodesRef.current.has(code)) return
    pressedKeyboardCodesRef.current.add(code)

    const step: InputStep = {
      type: e.ctrlKey || e.altKey || e.shiftKey || e.metaKey ? 'keyCombo' : 'keyPress',
      data: {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        repeat: e.repeat
      },
      delay
    }

    setSteps((prev) => [...prev, step])
    setLastStepTime(now)
  }, [state, lastStepTime])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (state !== 'recording' && state !== 'paused') return

    const code = e.code || e.key
    if (!code) return

    pressedKeyboardCodesRef.current.delete(code)
  }, [state])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (state !== 'recording') return

    const now = Date.now()
    const delay = now - lastStepTime

    const step: InputStep = {
      type: 'mouseClick',
      data: {
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        detail: e.detail,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      },
      delay
    }

    setSteps((prev) => [...prev, step])
    setLastStepTime(now)
  }, [state, lastStepTime])

  useEffect(() => {
    if (state === 'recording') {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)
      document.addEventListener('mousedown', handleMouseDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [state, handleKeyDown, handleKeyUp, handleMouseDown])

  useEffect(() => {
    if (open) return
    clearPreviewTimer()
    clearPressedKeyboardCodes()
    closeEditor()
    setContextStepIndex(null)
    setState('idle')
  }, [open, clearPreviewTimer, clearPressedKeyboardCodes, closeEditor])

  const startRecording = () => {
    clearPreviewTimer()
    clearPressedKeyboardCodes()
    closeEditor()
    setContextStepIndex(null)
    setSteps([])
    setLastStepTime(Date.now())
    setState('recording')
  }

  const pauseRecording = () => {
    setState('paused')
  }

  const resumeRecording = () => {
    clearPressedKeyboardCodes()
    setLastStepTime(Date.now())
    setState('recording')
  }

  const stopRecording = () => {
    clearPressedKeyboardCodes()
    setState('idle')
  }

  const startPreview = () => {
    clearPreviewTimer()
    previewIndex.current = 0
    clearPressedKeyboardCodes()
    setState('preview')

    previewInterval.current = setInterval(() => {
      if (previewIndex.current >= steps.length) {
        clearPreviewTimer()
        setState('idle')
        return
      }

      const step = steps[previewIndex.current]
      console.log('[Preview]', step.type, step.data)
      previewIndex.current++
    }, 500)
  }

  const handleSave = () => {
    if (!stepName.trim()) return
    clearPreviewTimer()
    clearPressedKeyboardCodes()
    onSave(stepName, steps)
    setStepName('')
    setSteps([])
    closeEditor()
    setContextStepIndex(null)
    onOpenChange(false)
  }

  const updateEditor = (updates: Partial<InputStep>) => {
    setEditingStep((prev) => (prev ? { ...prev, ...updates, data: updates.data ? { ...prev.data, ...updates.data } : prev.data } : prev))
  }

  const updateEditorData = (key: string, value: unknown) => {
    setEditingStep((prev) => (prev ? { ...prev, data: { ...prev.data, [key]: value } } : prev))
  }

  const openEditor = (index: number) => {
    const step = steps[index]
    if (!step) return
    setEditingIndex(index)
    setEditingStep(cloneStep(step))
  }

  const saveEditor = () => {
    if (editingIndex === null || !editingStep) return

    setSteps((prev) => {
      const next = [...prev]
      next[editingIndex] = cloneStep(editingStep)
      return next
    })

    closeEditor()
  }

  const insertDelayAt = (index: number) => {
    closeEditor()
    setSteps((prev) => {
      const next = [...prev]
      next.splice(Math.max(0, index), 0, {
        type: 'delay',
        data: { delay: 1000 },
        delay: 0
      })
      return next
    })
  }

  const duplicateStep = (index: number) => {
    const step = steps[index]
    if (!step) return
    closeEditor()
    setSteps((prev) => {
      const next = [...prev]
      next.splice(index + 1, 0, cloneStep(step))
      return next
    })
  }

  const deleteStep = (index: number) => {
    closeEditor()
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const stepElement = target?.closest('[data-step-index]') as HTMLElement | null
    const index = stepElement ? Number(stepElement.dataset.stepIndex) : null
    setContextStepIndex(Number.isFinite(index ?? NaN) ? index : null)
  }

  const contextStep = contextStepIndex !== null ? steps[contextStepIndex] : null
  const stepTypeOptions: InputStep['type'][] = ['keyPress', 'keyCombo', 'textInput', 'delay', 'mouseClick', 'mouseMove']
  const mousePreviewStep = contextStep && (contextStep.type === 'mouseClick' || contextStep.type === 'mouseMove')

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[760px] max-h-[88vh] flex flex-col gap-4 overflow-hidden">
          <Dialog.Title className="text-lg font-semibold">键鼠录制器</Dialog.Title>

          <div className="flex flex-wrap gap-2">
            <ToggleGroup.Root type="single" value={state} className="flex gap-1">
              <ToggleGroup.Item
                value="idle"
                className="px-3 py-1.5 text-sm rounded bg-secondary"
                disabled={state !== 'idle'}
              >
                空闲
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="recording"
                className={`px-3 py-1.5 text-sm rounded ${state === 'recording' ? 'bg-red-500 text-white' : 'bg-secondary'}`}
                onClick={state === 'idle' ? startRecording : undefined}
              >
                {state === 'paused' ? '继续' : '录制'}
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="paused"
                className="px-3 py-1.5 text-sm rounded bg-yellow-500 text-white"
                onClick={state === 'recording' ? pauseRecording : undefined}
                disabled={state !== 'recording'}
              >
                暂停
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="preview"
                className="px-3 py-1.5 text-sm rounded bg-secondary"
                onClick={steps.length > 0 ? startPreview : undefined}
                disabled={steps.length === 0 || state !== 'idle'}
              >
                预览
              </ToggleGroup.Item>
            </ToggleGroup.Root>

            {(state === 'recording' || state === 'paused') && (
              <button
                onClick={stopRecording}
                className="px-3 py-1.5 text-sm rounded bg-destructive text-white"
              >
                停止
              </button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {state === 'idle' && '点击"录制"开始录制键鼠操作'}
            {state === 'recording' && '正在录制... 请执行键鼠操作'}
            {state === 'paused' && '录制已暂停'}
            {state === 'preview' && '预览模式'}
          </div>

          <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
              <div
                className="flex-1 min-h-[220px] border rounded overflow-hidden"
                onContextMenu={handleContextMenu}
              >
                <ScrollArea.Root className="h-full">
                  <ScrollArea.Viewport className="w-full h-full p-2">
                    {steps.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">暂无录制步骤</div>
                    ) : (
                      <div className="space-y-1">
                        {steps.map((step, index) => (
                          <div
                            key={`${step.type}-${index}`}
                            data-step-index={index}
                            className={`group rounded border px-3 py-2 text-sm transition-colors ${
                              editingIndex === index ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                            }`}
                            onClick={() => openEditor(index)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="truncate">{getStepLabel(step, index)}</div>
                                {typeof step.delay === 'number' && step.delay > 0 && (
                                  <div className="mt-1 text-xs text-muted-foreground">前置 {step.delay}ms</div>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">单击可编辑</span>
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
              </div>
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
              <ContextMenu.Content className="bg-background border rounded-md p-1 shadow-lg min-w-[220px]">
                {contextStep ? (
                  <>
                    <ContextMenu.Label className="px-2 py-1 text-xs text-muted-foreground">
                      步骤 #{(contextStepIndex ?? 0) + 1}
                    </ContextMenu.Label>
                    <ContextMenu.Item
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      onSelect={() => contextStepIndex !== null && openEditor(contextStepIndex)}
                    >
                      编辑步骤
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      onSelect={() => contextStepIndex !== null && insertDelayAt(contextStepIndex)}
                    >
                      前插延迟
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      onSelect={() => contextStepIndex !== null && insertDelayAt(contextStepIndex + 1)}
                    >
                      后插延迟
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      onSelect={() => contextStepIndex !== null && duplicateStep(contextStepIndex)}
                    >
                      复制步骤
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-destructive"
                      onSelect={() => contextStepIndex !== null && deleteStep(contextStepIndex)}
                    >
                      删除步骤
                    </ContextMenu.Item>
                  </>
                ) : (
                  <>
                    <ContextMenu.Item
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      onSelect={() => insertDelayAt(steps.length)}
                    >
                      在末尾插入延迟
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-destructive"
                      onSelect={() => {
                        closeEditor()
                        setContextStepIndex(null)
                        setSteps([])
                      }}
                    >
                      清空所有
                    </ContextMenu.Item>
                  </>
                )}
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>

          {editingStep && editingIndex !== null && (
            <div className="rounded border bg-secondary/20 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">单步编辑</div>
                  <div className="text-xs text-muted-foreground">步骤 #{editingIndex + 1}</div>
                </div>
                <button type="button" onClick={closeEditor} className="text-xs px-2 py-1 rounded border">
                  关闭编辑
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span className="block">步骤类型</span>
                  <select
                    value={editingStep.type}
                    onChange={(e) => {
                      const nextType = e.target.value as InputStep['type']
                      setEditingStep(createRecordedStep(nextType, editingStep))
                    }}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                  >
                    {stepTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type === 'keyPress'
                          ? '按键'
                          : type === 'keyCombo'
                            ? '组合键'
                            : type === 'textInput'
                              ? '文字输入'
                              : type === 'delay'
                                ? '延迟'
                                : type === 'mouseClick'
                                  ? '鼠标点击'
                                  : '鼠标移动'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-xs text-muted-foreground">
                  <span className="block">前置延迟（毫秒）</span>
                  <input
                    type="number"
                    min={0}
                    value={editingStep.delay ?? 0}
                    onChange={(e) => updateEditor({ delay: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                  />
                </label>
              </div>

              {hasKeyboardStepType(editingStep) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span className="block">按键</span>
                    <input
                      type="text"
                      value={String(editingStep.data.key || '')}
                      onChange={(e) => updateEditorData('key', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span className="block">按键码</span>
                    <input
                      type="text"
                      value={String(editingStep.data.code || '')}
                      onChange={(e) => updateEditorData('code', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                    />
                  </label>
                  {(['ctrlKey', 'altKey', 'shiftKey', 'metaKey'] as ModifierKey[]).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(editingStep.data[key])}
                        onChange={(e) => updateEditorData(key, e.target.checked)}
                      />
                      <span>
                        {key === 'ctrlKey' ? 'Ctrl' : key === 'altKey' ? 'Alt' : key === 'shiftKey' ? 'Shift' : 'Meta'}
                      </span>
                    </label>
                  ))}
                  {editingStep.type === 'textInput' && (
                    <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">
                      <span className="block">文本内容</span>
                      <input
                        type="text"
                        value={String(editingStep.data.text || '')}
                        onChange={(e) => updateEditorData('text', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                      />
                    </label>
                  )}
                </div>
              )}

              {editingStep.type === 'delay' && (
                <label className="space-y-1 text-xs text-muted-foreground block">
                  <span className="block">延迟时长</span>
                  <input
                    type="number"
                    min={0}
                    value={Number(editingStep.data.delay ?? 1000)}
                    onChange={(e) => updateEditorData('delay', Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                  />
                </label>
              )}

              {(editingStep.type === 'mouseClick' || editingStep.type === 'mouseMove') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editingStep.type === 'mouseClick' && (
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span className="block">按钮</span>
                      <select
                        value={Number(editingStep.data.button ?? 0)}
                        onChange={(e) => updateEditorData('button', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                      >
                        <option value={0}>左键</option>
                        <option value={1}>中键</option>
                        <option value={2}>右键</option>
                      </select>
                    </label>
                  )}

                  {editingStep.type === 'mouseClick' && (
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span className="block">点击次数</span>
                      <input
                        type="number"
                        min={1}
                        value={Number(editingStep.data.detail ?? 1)}
                        onChange={(e) => updateEditorData('detail', Number(e.target.value) || 1)}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                      />
                    </label>
                  )}

                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span className="block">客户端 X</span>
                    <input
                      type="number"
                      value={Number(editingStep.data.clientX ?? 0)}
                      onChange={(e) => updateEditorData('clientX', Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span className="block">客户端 Y</span>
                    <input
                      type="number"
                      value={Number(editingStep.data.clientY ?? 0)}
                      onChange={(e) => updateEditorData('clientY', Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span className="block">屏幕 X</span>
                    <input
                      type="number"
                      value={Number(editingStep.data.screenX ?? 0)}
                      onChange={(e) => updateEditorData('screenX', Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span className="block">屏幕 Y</span>
                    <input
                      type="number"
                      value={Number(editingStep.data.screenY ?? 0)}
                      onChange={(e) => updateEditorData('screenY', Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                    />
                  </label>
                  {editingStep.type === 'mouseMove' && (
                    <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">
                      <span className="block">持续时间（毫秒）</span>
                      <input
                        type="number"
                        min={0}
                        value={Number(editingStep.data.duration ?? 0)}
                        onChange={(e) => updateEditorData('duration', Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                      />
                    </label>
                  )}
                  <label className="space-y-1 text-xs text-muted-foreground md:col-span-2">
                    <span className="block">备注</span>
                    <input
                      type="text"
                      value={String(editingStep.data.note || '')}
                      onChange={(e) => updateEditorData('note', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm text-foreground"
                    />
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeEditor} className="btn-secondary">
                  取消编辑
                </button>
                <button type="button" onClick={saveEditor} className="">
                  保存步骤
                </button>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t space-y-2">
            <input
              type="text"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="输入预设名称保存..."
              className="w-full px-3 py-2 border rounded"
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="btn-secondary">取消</button>
              </Dialog.Close>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={!stepName.trim() || steps.length === 0}
              >
                保存预设
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

