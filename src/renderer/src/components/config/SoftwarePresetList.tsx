/**
 * ShareNet - Software Preset List Component
 * 软件预设列表组件
 */

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { toast } from 'sonner'
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
import { Button } from '../ui/button'
import { Input } from '../ui/input'
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
  const [deleteTarget, setDeleteTarget] = useState<SoftwarePreset | null>(null)
  const [formData, setFormData] = useState({ name: '', path: '', args: '' })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadPresets('software')
  }, [loadPresets])

  const handlePickPath = async () => {
    const selectFile = window.electronAPI?.selectFile
    if (typeof selectFile === 'function') {
      const result = await selectFile()
      if (result?.success && result.path) {
        setFormData((prev) => ({ ...prev, path: result.path }))
        return
      }
    }

    fileInputRef.current?.click()
  }

  const handleFallbackFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const path = window.electronAPI?.getPathForFile?.(file) || (file as File & { path?: string }).path
    if (!path) {
      toast.error('当前环境无法获取文件路径，请在 Electron 中重新打开')
      event.target.value = ''
      return
    }

    setFormData((prev) => ({ ...prev, path }))
    event.target.value = ''
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.path.trim()) return

    if (editingPreset) {
      await updatePreset('software', editingPreset.id, formData)
    } else {
      await savePreset('software', formData)
    }

    setFormData({ name: '', path: '', args: '' })
    setEditingPreset(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (preset: SoftwarePreset) => {
    setEditingPreset(preset)
    setFormData({
      name: preset.name,
      path: preset.path,
      args: preset.args || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deletePreset('software', deleteTarget.id)
    setDeleteTarget(null)
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
        <div>
          <h3 className="text-lg font-semibold">软件预设</h3>
          <div className="text-sm text-muted-foreground">程序路径可用文件选择器填写，工作目录默认使用程序所在目录。</div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingPreset(null)
            setFormData({ name: '', path: '', args: '' })
            setIsDialogOpen(true)
          }}
          className="text-sm"
          variant="secondary"
        >
          + 新增
        </Button>
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
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[520px] max-h-[80vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {editingPreset ? '编辑软件预设' : '新增软件预设'}
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">名称 *</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="预设名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">程序路径 *</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="C:\\Program Files\\..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={handlePickPath} variant="outline">
                    选择文件
                  </Button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">留空时会自动使用程序所在目录作为工作目录。</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">启动参数</label>
                <Input
                  type="text"
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  placeholder="--arg1 --arg2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  取消
                </Button>
              </Dialog.Close>
              <Button type="button" onClick={handleSave}>
                保存
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFallbackFileChange} />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除软件预设</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `确定要删除此预设吗？「${deleteTarget.name}」` : '确定要删除此预设吗？'}
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
