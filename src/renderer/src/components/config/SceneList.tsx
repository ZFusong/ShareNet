/**
 * ShareNet - Scene List Component
 * 场景列表组件
 */

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useConfigStore, type Scene, type SceneStep } from '../../stores/configStore'

interface Props {
  onSelect?: (scene: Scene) => void
  multiSelect?: boolean
  selectedIds?: string[]
}

export function SceneList({ onSelect, multiSelect = false, selectedIds = [] }: Props) {
  const { scenes, softwarePresets, inputPresets, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()
  const [editingScene, setEditingScene] = useState<Scene | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', softwarePresetIds: [] as string[], inputPresetIds: [] as string[] })
  const [dependencyErrors, setDependencyErrors] = useState<string[]>([])

  useEffect(() => {
    loadPresets('scene')
    loadPresets('software')
    loadPresets('input')
  }, [loadPresets])

  const handleSave = async () => {
    if (!formData.name.trim()) return

    // Check dependencies
    const testScene: Scene = {
      id: editingScene?.id || '',
      name: formData.name,
      description: formData.description,
      softwarePresetIds: formData.softwarePresetIds,
      inputPresetIds: formData.inputPresetIds,
      steps: [],
      createdAt: editingScene?.createdAt || Date.now(),
      updatedAt: Date.now()
    }

    const deps = await window.electronAPI?.checkSceneDependencies(testScene)
    if (deps && !deps.valid) {
      setDependencyErrors(deps.missing || [])
      return
    }

    setDependencyErrors([])

    if (editingScene) {
      await updatePreset('scene', editingScene.id, formData)
    } else {
      await savePreset('scene', formData)
    }

    setFormData({ name: '', description: '', softwarePresetIds: [], inputPresetIds: [] })
    setEditingScene(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (scene: Scene) => {
    setEditingScene(scene)
    setFormData({
      name: scene.name,
      description: scene.description || '',
      softwarePresetIds: scene.softwarePresetIds || [],
      inputPresetIds: scene.inputPresetIds || []
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
        <h3 className="text-lg font-semibold">场景编排</h3>
        <button
          onClick={() => {
            setEditingScene(null)
            setFormData({ name: '', description: '', softwarePresetIds: [], inputPresetIds: [] })
            setIsDialogOpen(true)
          }}
          className="btn-primary text-sm"
        >
          + 新增
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          暂无场景
        </div>
      ) : (
        <div className="space-y-2">
          {scenes.map((scene) => (
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
                  {scene.description && (
                    <div className="text-sm text-muted-foreground truncate">{scene.description}</div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scene.softwarePresetIds?.map((id) => (
                      <span key={id} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {getPresetName(id, 'software')}
                      </span>
                    ))}
                    {scene.inputPresetIds?.map((id) => (
                      <span key={id} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                        {getPresetName(id, 'input')}
                      </span>
                    ))}
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
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[520px] max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {editingScene ? '编辑场景' : '新增场景'}
            </Dialog.Title>

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

              <div>
                <label className="block text-sm font-medium mb-2">软件预设</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                  {softwarePresets.map((preset) => (
                    <label key={preset.id} className="flex items-center gap-2 p-1 hover:bg-accent rounded">
                      <input
                        type="checkbox"
                        checked={formData.softwarePresetIds.includes(preset.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...formData.softwarePresetIds, preset.id]
                            : formData.softwarePresetIds.filter((id) => id !== preset.id)
                          setFormData({ ...formData, softwarePresetIds: ids })
                        }}
                      />
                      <span className="text-sm">{preset.name}</span>
                    </label>
                  ))}
                  {softwarePresets.length === 0 && (
                    <div className="text-sm text-muted-foreground">暂无软件预设</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">键鼠预设</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                  {inputPresets.map((preset) => (
                    <label key={preset.id} className="flex items-center gap-2 p-1 hover:bg-accent rounded">
                      <input
                        type="checkbox"
                        checked={formData.inputPresetIds.includes(preset.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...formData.inputPresetIds, preset.id]
                            : formData.inputPresetIds.filter((id) => id !== preset.id)
                          setFormData({ ...formData, inputPresetIds: ids })
                        }}
                      />
                      <span className="text-sm">{preset.name}</span>
                    </label>
                  ))}
                  {inputPresets.length === 0 && (
                    <div className="text-sm text-muted-foreground">暂无键鼠预设</div>
                  )}
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