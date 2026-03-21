/**
 * ShareNet - Input Preset List Component
 * 键盘预设列表组件
 */

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useConfigStore, type InputPreset, type InputStep } from '../../stores/configStore'

interface Props {
  onSelect?: (preset: InputPreset) => void
  multiSelect?: boolean
  selectedIds?: string[]
}

const isKeyboardStep = (step: InputStep) =>
  step.type === 'keyCombo' || step.type === 'keyPress' || step.type === 'textInput' || step.type === 'delay'

const formatKeyboardStep = (step: InputStep) => {
  if (step.type === 'delay') {
    return `${Number(step.data.delay ?? step.delay ?? 0)}ms`
  }

  if (step.type === 'textInput') {
    const text = String(step.data.text ?? '')
    return text ? `文本: ${text}` : '文本输入'
  }

  const modifiers = [
    step.data.ctrlKey ? 'Ctrl' : '',
    step.data.altKey ? 'Alt' : '',
    step.data.shiftKey ? 'Shift' : '',
    step.data.metaKey ? 'Meta' : ''
  ].filter(Boolean)
  const key = String(step.data.key ?? '')
  const summary = [modifiers.join('+'), key].filter(Boolean).join('+')
  return summary || String(step.data.code ?? '按键')
}

export function InputPresetList({ onSelect, multiSelect = false, selectedIds = [] }: Props) {
  const { inputPresets, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const [editingPreset, setEditingPreset] = useState<InputPreset | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', steps: [] as InputStep[] })

  useEffect(() => {
    loadPresets('input')
  }, [loadPresets])

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

  const isSelected = (id: string) => selectedIds.includes(id)



  const updateStep = (index: number, updates: Partial<InputStep>) => {
    const nextSteps = [...formData.steps]
    nextSteps[index] = { ...nextSteps[index], ...updates }
    setFormData({ ...formData, steps: nextSteps })
  }

  return (
    <div className="preset-list-container">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">键盘宏</h3>
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
                          {formatKeyboardStep(step)}
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
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[520px] max-h-[80vh] overflow-y-auto">
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
                    onClick={() => {
                      setFormData({
                        ...formData,
                        steps: [...formData.steps, { type: 'keyPress', data: { key: '' } }]
                      })
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    + 添加键盘步骤
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <select
                        value={step.type}
                        onChange={(e) =>
                          updateStep(index, {
                            type: e.target.value as InputStep['type']
                          })
                        }
                        className="text-sm w-24 px-2 py-1 border rounded bg-background"
                      >
                        <option value="keyCombo">组合键</option>
                        <option value="keyPress">按键</option>
                        <option value="textInput">文字输入</option>
                        <option value="delay">延迟</option>
                      </select>

                      <input
                        type="text"
                        value={JSON.stringify(step.data)}
                        onChange={(e) => {
                          try {
                            updateStep(index, { data: JSON.parse(e.target.value) })
                          } catch {}
                        }}
                        placeholder="{}"
                        className="flex-1 px-2 py-1 text-sm border rounded"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const nextSteps = formData.steps.filter((_, i) => i !== index)
                          setFormData({ ...formData, steps: nextSteps })
                        }}
                        className="text-destructive hover:underline text-sm"
                      >
                        删除
                      </button>
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


