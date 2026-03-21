/**
 * ShareNet - Trigger Binding List Component
 * 触发器绑定管理（本机 triggerKey -> scene）
 */

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useConfigStore, type Scene, type TriggerBinding } from '../../stores/configStore'

interface BindingFormData {
  triggerKey: string
  triggerName: string
  sceneId: string
  enabled: boolean
}

const emptyForm: BindingFormData = {
  triggerKey: '',
  triggerName: '',
  sceneId: '',
  enabled: true
}

export function TriggerBindingList() {
  const { triggerBindings, scenes, loadPresets, savePreset, updatePreset, deletePreset } = useConfigStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBinding, setEditingBinding] = useState<TriggerBinding | null>(null)
  const [formData, setFormData] = useState<BindingFormData>(emptyForm)

  useEffect(() => {
    loadPresets('trigger')
    loadPresets('scene')
  }, [loadPresets])

  const getSceneName = (sceneId: string) => scenes.find((scene) => scene.id === sceneId)?.name || sceneId

  const openCreate = () => {
    setEditingBinding(null)
    setFormData({
      ...emptyForm,
      sceneId: scenes[0]?.id || ''
    })
    setIsDialogOpen(true)
  }

  const openEdit = (binding: TriggerBinding) => {
    setEditingBinding(binding)
    setFormData({
      triggerKey: binding.triggerKey,
      triggerName: binding.triggerName || '',
      sceneId: binding.sceneId,
      enabled: binding.enabled
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const triggerKey = formData.triggerKey.trim()
    const sceneId = formData.sceneId.trim()
    if (!triggerKey || !sceneId) return

    const payload = {
      triggerKey,
      triggerName: formData.triggerName.trim(),
      sceneId,
      enabled: formData.enabled
    }

    if (editingBinding) {
      await updatePreset('trigger', editingBinding.id, payload)
    } else {
      const existing = triggerBindings.find((item) => item.triggerKey === payload.triggerKey)
      if (existing) {
        await updatePreset('trigger', existing.id, payload)
      } else {
        await savePreset('trigger', payload)
      }
    }

    setEditingBinding(null)
    setFormData(emptyForm)
    setIsDialogOpen(false)
  }

  const handleDelete = async (bindingId: string) => {
    if (confirm('确定要删除此触发器绑定吗？')) {
      await deletePreset('trigger', bindingId)
    }
  }

  return (
    <div className="preset-list-container">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">触发器绑定</h3>
          <div className="text-sm text-muted-foreground">本机收到 triggerKey 后，将按这里的绑定执行对应场景。</div>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">
          + 新增
        </button>
      </div>

      {triggerBindings.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无触发器绑定</div>
      ) : (
        <div className="space-y-2">
          {triggerBindings.map((binding) => (
            <div key={binding.id} className="p-3 border rounded-lg hover:bg-accent transition-colors">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium break-all">{binding.triggerName || binding.triggerKey}</div>
                  <div className="text-xs text-muted-foreground break-all">Key: {binding.triggerKey}</div>
                  <div className="text-xs text-muted-foreground">场景: {getSceneName(binding.sceneId)}</div>
                  <div className="mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        binding.enabled ? 'bg-emerald-500/10 text-emerald-700' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {binding.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(binding)} className="text-muted-foreground hover:text-primary">
                    编辑
                  </button>
                  <button onClick={() => handleDelete(binding.id)} className="text-muted-foreground hover:text-destructive">
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[520px] max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {editingBinding ? '编辑触发器绑定' : '新增触发器绑定'}
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">触发器 Key *</label>
                <input
                  type="text"
                  value={formData.triggerKey}
                  onChange={(e) => setFormData({ ...formData, triggerKey: e.target.value })}
                  placeholder="例如：meeting-start"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">触发器名称</label>
                <input
                  type="text"
                  value={formData.triggerName}
                  onChange={(e) => setFormData({ ...formData, triggerName: e.target.value })}
                  placeholder="例如：开始会议"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">场景 *</label>
                <select
                  value={formData.sceneId}
                  onChange={(e) => setFormData({ ...formData, sceneId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">请选择场景</option>
                  {scenes.map((scene: Scene) => (
                    <option key={scene.id} value={scene.id}>
                      {scene.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                启用绑定
              </label>
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
