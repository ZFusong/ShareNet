/**
 * ShareNet - Software Preset List Component
 * 软件预设列表组件
 */

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { useConfigStore, type SoftwarePreset } from '../../stores/configStore'

interface Props {
  onSelect?: (preset: SoftwarePreset) => void
  multiSelect?: boolean
  selectedIds?: string[]
}

export function SoftwarePresetList({ onSelect, multiSelect = false, selectedIds = [] }: Props) {
  const { softwarePresets, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const [editingPreset, setEditingPreset] = useState<SoftwarePreset | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', path: '', args: '', workDir: '' })

  useEffect(() => {
    loadPresets('software')
  }, [loadPresets])

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.path.trim()) return

    if (editingPreset) {
      await updatePreset('software', editingPreset.id, formData)
    } else {
      await savePreset('software', formData)
    }

    setFormData({ name: '', path: '', args: '', workDir: '' })
    setEditingPreset(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (preset: SoftwarePreset) => {
    setEditingPreset(preset)
    setFormData({
      name: preset.name,
      path: preset.path,
      args: preset.args || '',
      workDir: preset.workDir || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此预设吗？')) {
      await deletePreset('software', id)
    }
  }

  const handleSelect = (preset: SoftwarePreset) => {
    if (onSelect) {
      onSelect(preset)
    }
  }

  const isSelected = (id: string) => selectedIds.includes(id)

  return (
    <div className="preset-list-container">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">软件预设</h3>
        <button
          onClick={() => {
            setEditingPreset(null)
            setFormData({ name: '', path: '', args: '', workDir: '' })
            setIsDialogOpen(true)
          }}
          className="btn-primary text-sm"
        >
          + 新增
        </button>
      </div>

      {softwarePresets.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          暂无软件预设
        </div>
      ) : (
        <div className="space-y-2">
          {softwarePresets.map((preset) => (
            <div
              key={preset.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected(preset.id) ? 'border-primary bg-primary/10' : 'hover:bg-accent'
              }`}
              onClick={() => handleSelect(preset)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{preset.path}</div>
                  {preset.args && (
                    <div className="text-xs text-muted-foreground">参数: {preset.args}</div>
                  )}
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
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[480px] max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {editingPreset ? '编辑软件预设' : '新增软件预设'}
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
                <label className="block text-sm font-medium mb-1">程序路径 *</label>
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  placeholder="C:\Program Files\..."
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">启动参数</label>
                <input
                  type="text"
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  placeholder="--arg1 --arg2"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">工作目录</label>
                <input
                  type="text"
                  value={formData.workDir}
                  onChange={(e) => setFormData({ ...formData, workDir: e.target.value })}
                  placeholder="C:\WorkDir"
                  className="w-full px-3 py-2 border rounded-md"
                />
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