/**
 * ShareNet - Input Preset List Component
 * 键盘预设列表组件
 */

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useConfigStore, type InputPreset, type InputStep } from '../../stores/configStore'

interface Props {
  onSelect?: (preset: InputPreset) => void
  multiSelect?: boolean
  selectedIds?: string[]
}

type KeyboardStepType = Extract<InputStep['type'], 'keyCombo' | 'keyPress' | 'textInput' | 'delay'>
type ShortcutToken = string
type ActiveShortcut = number | null

const SHORTCUT_TOKEN_LIMIT = 4

const keyboardStepTypes = new Set<KeyboardStepType>(['keyCombo', 'keyPress', 'textInput', 'delay'])

const isKeyboardStep = (step: InputStep) => keyboardStepTypes.has(step.type as KeyboardStepType)

const emptyKeyboardData = () => ({
  key: '',
  code: '',
  keys: [] as ShortcutToken[],
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  repeat: false
})

const dedupeShortcutTokens = (tokens: ShortcutToken[]) => {
  const seen = new Set<string>()
  return tokens.filter((token) => {
    if (!token || seen.has(token)) return false
    seen.add(token)
    return true
  })
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

const normalizeShortcutTokens = (tokens: unknown): ShortcutToken[] => {
  if (!Array.isArray(tokens)) return []
  return dedupeShortcutTokens(tokens
    .map((token) => normalizeShortcutToken(String(token || '')))
    .filter(Boolean)
  ).slice(0, SHORTCUT_TOKEN_LIMIT)
}

const getLegacyShortcutTokens = (data: Record<string, unknown>) => {
  const tokens = dedupeShortcutTokens([
    data.ctrlKey ? 'Ctrl' : '',
    data.altKey ? 'Alt' : '',
    data.shiftKey ? 'Shift' : '',
    data.metaKey ? 'Meta' : '',
    normalizeShortcutToken(String(data.key ?? ''))
  ].filter(Boolean))
  return tokens.slice(0, SHORTCUT_TOKEN_LIMIT)
}

const getShortcutTokens = (step: InputStep) => {
  const data = step.data as Record<string, unknown>
  const tokens = normalizeShortcutTokens(data.keys)
  return tokens.length > 0 ? tokens : getLegacyShortcutTokens(data)
}

const buildShortcutDataFromTokens = (tokens: ShortcutToken[], type: 'keyCombo' | 'keyPress', code = '', repeat = false) => {
  const normalizedTokens = dedupeShortcutTokens(tokens).slice(-SHORTCUT_TOKEN_LIMIT)
  const key = normalizedTokens[normalizedTokens.length - 1] || ''
  return {
    ...emptyKeyboardData(),
    key,
    code,
    keys: normalizedTokens,
    ctrlKey: normalizedTokens.includes('Ctrl'),
    altKey: normalizedTokens.includes('Alt'),
    shiftKey: normalizedTokens.includes('Shift'),
    metaKey: normalizedTokens.includes('Meta'),
    repeat
  }
}

const createKeyboardStep = (type: KeyboardStepType, seed?: InputStep): InputStep => {
  const delay = seed?.delay ?? 0

  if (type === 'delay') {
    return {
      type,
      data: {
        delay: Number(seed?.data.delay ?? 1000) || 1000
      },
      delay: 0
    }
  }

  if (type === 'textInput') {
    return {
      type,
      delay,
      data: {
        text: String(seed?.data.text ?? '')
      }
    }
  }

  return {
    type,
    delay,
    data: buildShortcutDataFromTokens(
      normalizeShortcutTokens(seed?.data.keys ?? getLegacyShortcutTokens(seed?.data || {})),
      type,
      String(seed?.data.code ?? ''),
      Boolean(seed?.data.repeat ?? false)
    )
  }
}

const createDefaultStep = (type: KeyboardStepType): InputStep => createKeyboardStep(type)

const getShortcutParts = (step: InputStep) => {
  const tokens = getShortcutTokens(step)
  return {
    tokens
  }
}

const formatShortcutSummary = (step: InputStep) => {
  const { tokens } = getShortcutParts(step)
  if (step.type === 'keyPress') {
    return tokens.length > 0 ? tokens[0] : '单键输入'
  }

  if (step.type === 'keyCombo') {
    return tokens.length > 0 ? tokens.join(' + ') : '组合键输入'
  }

  return '点击后按下快捷键'
}

const formatKeyboardValue = (step: InputStep) => {
  if (step.type === 'delay') {
    return `${Number(step.data.delay ?? 0)}ms`
  }

  if (step.type === 'textInput') {
    const text = String(step.data.text ?? '')
    return text ? `文本: ${text}` : '文本输入'
  }

  const summary = formatShortcutSummary(step)
  if (step.type === 'keyPress') return summary === '单键输入' ? summary : `单键: ${summary}`
  if (step.type === 'keyCombo') return summary === '组合键输入' ? summary : `组合键: ${summary}`
  return summary
}

const buildShortcutData = (tokens: ShortcutToken[], stepType: 'keyCombo' | 'keyPress', event: ReactKeyboardEvent<HTMLDivElement>) => {
  const normalizedToken = normalizeShortcutToken(event.key)
  const nextTokens =
      stepType === 'keyPress'
        ? [normalizedToken]
      : dedupeShortcutTokens([...tokens, normalizedToken]).slice(-SHORTCUT_TOKEN_LIMIT)
  return buildShortcutDataFromTokens(nextTokens, stepType, event.code, event.repeat)
}

export function InputPresetList({ onSelect, multiSelect = false, selectedIds = [] }: Props) {
  const { inputPresets, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const [editingPreset, setEditingPreset] = useState<InputPreset | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', steps: [] as InputStep[] })
  const shortcutRefs = useRef<(HTMLDivElement | null)[]>([])
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null)
  const [activeShortcut, setActiveShortcut] = useState<ActiveShortcut>(null)
  const pressedShortcutCodesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    loadPresets('input')
  }, [loadPresets])

  useEffect(() => {
    if (!isDialogOpen) {
      setRecordingIndex(null)
      setActiveShortcut(null)
      pressedShortcutCodesRef.current.clear()
      return
    }

    const firstShortcutIndex = formData.steps.findIndex((step) => step.type === 'keyCombo' || step.type === 'keyPress')
    setRecordingIndex(firstShortcutIndex >= 0 ? firstShortcutIndex : null)
  }, [isDialogOpen])

  useEffect(() => {
    if (recordingIndex === null) return
    shortcutRefs.current[recordingIndex]?.focus()
  }, [recordingIndex, formData.steps])

  const updateStep = (index: number, updates: Partial<InputStep>) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps]
      nextSteps[index] = { ...nextSteps[index], ...updates }
      return { ...prev, steps: nextSteps }
    })
  }

  const replaceStepType = (index: number, type: KeyboardStepType) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps]
      nextSteps[index] = createKeyboardStep(type, nextSteps[index])
      return { ...prev, steps: nextSteps }
    })

    if (type === 'keyCombo' || type === 'keyPress') {
      setRecordingIndex(index)
    } else if (recordingIndex === index) {
      setRecordingIndex(null)
      setActiveShortcut(null)
      pressedShortcutCodesRef.current.clear()
    }
  }

  const addStep = (type: KeyboardStepType) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps, createDefaultStep(type)]
      const nextIndex = nextSteps.length - 1
      if (type === 'keyCombo' || type === 'keyPress') {
        setRecordingIndex(nextIndex)
      }
      return { ...prev, steps: nextSteps }
    })
  }

  const captureShortcut = (index: number, step: InputStep, event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (step.type !== 'keyCombo' && step.type !== 'keyPress') return

    if (recordingIndex !== index) {
      if (event.key === 'Backspace') {
        event.preventDefault()
        event.stopPropagation()
        const tokens = getShortcutTokens(step)
        const nextTokens = step.type === 'keyPress' ? [] : tokens.slice(0, -1)
        updateStep(index, {
          data: buildShortcutDataFromTokens(nextTokens, step.type)
        })
      }
      return
    }

    event.preventDefault()
    event.stopPropagation()

    if (event.repeat) return

    const normalizedToken = normalizeShortcutToken(event.key)
    if (!normalizedToken) return

    const code = event.code || normalizedToken
    if (pressedShortcutCodesRef.current.has(code)) {
      return
    }
    pressedShortcutCodesRef.current.add(code)

    const nextTokens =
      step.type === 'keyPress'
        ? [normalizedToken]
        : [...getShortcutTokens(step), normalizedToken].slice(0, SHORTCUT_TOKEN_LIMIT)

    updateStep(index, {
      data: buildShortcutData(nextTokens, step.type, event)
    })

    setActiveShortcut(index)
  }

  const releaseShortcut = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (recordingIndex === null) return

    const normalizedToken = normalizeShortcutToken(event.key)
    const code = event.code || normalizedToken
    if (code) {
      pressedShortcutCodesRef.current.delete(code)
    }

    if (pressedShortcutCodesRef.current.size === 0) {
      setActiveShortcut(null)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return

    const keyboardOnlySteps = formData.steps.filter(isKeyboardStep)
    const payload = { ...formData, steps: keyboardOnlySteps }

    if (editingPreset) {
      await updatePreset('input', editingPreset.id, payload)
    } else {
      await savePreset('input', payload)
    }

    setFormData({ name: '', steps: [] })
    setEditingPreset(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (preset: InputPreset) => {
    setEditingPreset(preset)
    setFormData({
      name: preset.name,
      steps: preset.steps.filter(isKeyboardStep)
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此预设吗？')) {
      await deletePreset('input', id)
    }
  }

  const handleSelect = (preset: InputPreset) => {
    if (onSelect) onSelect(preset)
  }

  const startRecording = (index: number) => {
    setActiveShortcut(null)
    pressedShortcutCodesRef.current.clear()
    setRecordingIndex(index)
  }

  const stopRecording = () => {
    setRecordingIndex(null)
    setActiveShortcut(null)
    pressedShortcutCodesRef.current.clear()
  }

  const clearShortcut = (index: number) => {
    const step = formData.steps[index]
    if (!step || (step.type !== 'keyCombo' && step.type !== 'keyPress')) return

    updateStep(index, {
      data: buildShortcutDataFromTokens([], step.type)
    })
    pressedShortcutCodesRef.current.clear()
    setActiveShortcut(null)
  }

  const isSelected = (id: string) => selectedIds.includes(id)

  return (
    <div className="preset-list-container">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">键盘宏</h3>
          <div className="text-sm text-muted-foreground">按键、组合键、文字输入和延迟会根据类型显示对应编辑控件。</div>
        </div>
        <button
          onClick={() => {
            setEditingPreset(null)
            setFormData({ name: '', steps: [] })
            setIsDialogOpen(true)
          }}
          className="btn-primary text-sm"
        >
          + 新增
        </button>
      </div>

      {inputPresets.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无键盘宏</div>
      ) : (
        <div className="space-y-2">
          {inputPresets.map((preset) => {
            const keyboardSteps = preset.steps.filter(isKeyboardStep)
            return (
              <div
                key={preset.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected(preset.id) ? 'border-primary bg-primary/10' : 'hover:bg-accent'
                }`}
                onClick={() => handleSelect({ ...preset, steps: keyboardSteps })}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-sm text-muted-foreground">{keyboardSteps.length} 个步骤</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {keyboardSteps.slice(0, 3).map((step, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-secondary rounded">
                          {formatKeyboardValue(step)}
                        </span>
                      ))}
                      {keyboardSteps.length > 3 && <span className="text-xs text-muted-foreground">...</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(preset)
                      }}
                      className="text-muted-foreground hover:text-primary"
                    >
                      编辑
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(preset.id)
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
          <Dialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[560px] max-h-[80vh] overflow-y-auto"
            onEscapeKeyDown={(event) => {
              if (recordingIndex !== null) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
          >
            <Dialog.Title className="text-lg font-semibold mb-4">
              {editingPreset ? '编辑键盘宏' : '新增键盘宏'}
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="预设名称"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">步骤（仅键盘宏）</label>
                  <button
                    type="button"
                    onClick={() => addStep('keyPress')}
                    className="text-sm text-primary hover:underline"
                  >
                    + 添加步骤
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="rounded border p-3 space-y-3">
                      <div className="flex items-center gap-2 h-8">
                        <select
                          value={step.type}
                          onChange={(e) => replaceStepType(index, e.target.value as KeyboardStepType)}
                          className="text-sm w-24 px-2 py-1 border rounded bg-background"
                        >
                          <option value="keyCombo">组合键</option>
                          <option value="keyPress">按键</option>
                          <option value="textInput">文字输入</option>
                          <option value="delay">延迟</option>
                        </select>

                        <div className="text-xs text-muted-foreground flex-1">
                          {step.type === 'keyCombo' || step.type === 'keyPress'
                              ? step.type === 'keyCombo'
                              ? '组合键：连续录制多个按键，最多 4 个。后按的键会覆盖前一个，点击"取消录制"停止。'
                              : '按键：只记录单个按键，后按的键会覆盖前一个，点击"取消录制"停止。'
                            : step.type === 'textInput'
                              ? '输入要发送的文字内容。'
                              : '输入延迟时间，单位为毫秒。'}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              steps: prev.steps.filter((_, i) => i !== index)
                            }))
                          }}
                          className="text-destructive hover:underline text-sm"
                        >
                          删除
                        </button>
                      </div>

                      {step.type === 'keyCombo' || step.type === 'keyPress' ? (
                        <div className="flex items-center gap-2">
                          <div
                            role="textbox"
                            tabIndex={0}
                            aria-label="快捷键捕获"
                            ref={(node) => {
                              shortcutRefs.current[index] = node
                            }}
                            onKeyDownCapture={(event) => captureShortcut(index, step, event)}
                            onKeyUpCapture={(event) => releaseShortcut(event)}
                            className="min-h-11 flex-1 px-3 py-2 border rounded-md bg-background text-sm text-foreground cursor-text focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <div className="flex flex-wrap items-center gap-2 min-h-5">
                              {(() => {
                                const summary = formatShortcutSummary(step)
                                const hasShortcut = summary !== '单键输入' && summary !== '组合键输入' && summary !== '点击后按下快捷键'
                                if (!hasShortcut) {
                                  return (
                                    <span className="text-muted-foreground">
                                      {recordingIndex === index
                                        ? step.type === 'keyCombo'
                                          ? '正在录制组合键'
                                          : '正在录制单键'
                                        : step.type === 'keyCombo'
                                          ? '点击“开始录制”进入组合键录制'
                                          : '点击“开始录制”进入单键录制'}
                                    </span>
                                  )
                                }

                                return (
                                  <span
                                    className="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium"
                                    style={
                                      activeShortcut === index
                                        ? {
                                            background: 'hsl(var(--primary))',
                                            color: 'hsl(var(--primary-foreground))',
                                            borderColor: 'hsl(var(--primary))',
                                            boxShadow: '0 0 0 2px hsl(var(--primary) / 0.18)'
                                          }
                                        : {
                                            background: 'hsl(var(--secondary))',
                                            color: 'hsl(var(--secondary-foreground))',
                                            borderColor: 'hsl(var(--border))'
                                          }
                                    }
                                  >
                                    {summary}
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                          {recordingIndex === index ? (
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="shrink-0 px-3 py-2 border rounded-md text-sm text-muted-foreground hover:text-primary"
                            >
                              取消录制
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startRecording(index)}
                              className="shrink-0 px-3 py-2 border rounded-md text-sm text-muted-foreground hover:text-primary"
                            >
                              开始录制
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => clearShortcut(index)}
                            className="shrink-0 px-3 py-2 border rounded-md text-sm text-muted-foreground hover:text-destructive"
                          >
                            清空
                          </button>
                        </div>
                      ) : null}

                      {step.type === 'textInput' && (
                        <input
                          type="text"
                          value={String(step.data.text ?? '')}
                          onChange={(e) => updateStep(index, { data: { ...step.data, text: e.target.value } })}
                          placeholder="请输入文字"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      )}

                      {step.type === 'delay' && (
                        <input
                          type="number"
                          min={0}
                          value={Number(step.data.delay ?? 1000)}
                          onChange={(e) => updateStep(index, { data: { ...step.data, delay: Number(e.target.value) || 0 } })}
                          placeholder="毫秒"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      )}
                    </div>
                  ))}
                </div>
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
    </div>
  )
}
