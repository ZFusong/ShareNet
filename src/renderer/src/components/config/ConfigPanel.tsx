/**
 * ShareNet - Config Panel
 * 配置中心面板
 */

import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Dialog from '@radix-ui/react-dialog'
import * as Toast from '@radix-ui/react-toast'
import { SoftwarePresetList } from './SoftwarePresetList'
import { InputPresetList } from './InputPresetList'
import { SceneList } from './SceneList'
import { useConfigStore } from '../../stores/configStore'

export function ConfigPanel() {
  const { exportConfig, importConfig } = useConfigStore()
  const [activeTab, setActiveTab] = useState<'software' | 'input' | 'scene'>('software')
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [exportModules, setExportModules] = useState({
    'software-presets': true,
    'input-presets': true,
    scenes: true
  })
  const [importMode, setImportMode] = useState<'append' | 'overwrite' | 'merge'>('append')
  const [importData, setImportData] = useState('')
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setToastOpen(true)
  }

  const handleExport = async () => {
    const modules = Object.entries(exportModules)
      .filter(([_, selected]) => selected)
      .map(([key]) => key)

    if (modules.length === 0) {
      showToast('请至少选择一个导出项', 'error')
      return
    }

    const result = await exportConfig(modules)
    if (result.success && result.data) {
      // Create download
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sharenet-config-${Date.now()}.lccfg`
      a.click()
      URL.revokeObjectURL(url)
      showToast('配置导出成功')
      setIsExportDialogOpen(false)
    } else {
      showToast(result.error || '导出失败', 'error')
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      showToast('请输入配置数据', 'error')
      return
    }

    try {
      const data = JSON.parse(importData)
      const result = await importConfig(data, importMode)
      if (result.success && result.result) {
        const r = result.result as any
        const imported = Object.entries(r.imported || {})
          .map(([key, count]) => `${key}: ${count}`)
          .join(', ')
        showToast(`导入成功: ${imported}`)
        if (r.conflicts?.length > 0) {
          showToast(`有 ${r.conflicts.length} 个冲突项已处理`, 'error')
        }
        setIsImportDialogOpen(false)
        setImportData('')
      } else {
        showToast(result.error || '导入失败', 'error')
      }
    } catch (error) {
      showToast('配置数据格式无效', 'error')
    }
  }

  return (
    <Toast.Provider>
      <section id="config-panel" className="panel h-full">
        <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
          <Tabs.List className="flex border-b px-4">
            <Tabs.Trigger
              value="software"
              className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              软件预设
            </Tabs.Trigger>
            <Tabs.Trigger
              value="input"
              className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              键鼠预设
            </Tabs.Trigger>
            <Tabs.Trigger
              value="scene"
              className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              场景编排
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="software" className="flex-1 overflow-auto p-4">
            <SoftwarePresetList />
          </Tabs.Content>

          <Tabs.Content value="input" className="flex-1 overflow-auto p-4">
            <InputPresetList />
          </Tabs.Content>

          <Tabs.Content value="scene" className="flex-1 overflow-auto p-4">
            <SceneList />
          </Tabs.Content>
        </Tabs.Root>

        {/* Export/Import buttons */}
        <div className="flex gap-2 p-4 border-t">
          <button
            className="btn-secondary"
            onClick={() => setIsExportDialogOpen(true)}
          >
            导出配置
          </button>
          <button
            className="btn-secondary"
            onClick={() => setIsImportDialogOpen(true)}
          >
            导入配置
          </button>
        </div>

        {/* Export Dialog */}
        <Dialog.Root open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-96">
              <Dialog.Title className="text-lg font-semibold mb-4">导出配置</Dialog.Title>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportModules['software-presets']}
                    onChange={(e) => setExportModules({ ...exportModules, 'software-presets': e.target.checked })}
                  />
                  <span>软件预设</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportModules['input-presets']}
                    onChange={(e) => setExportModules({ ...exportModules, 'input-presets': e.target.checked })}
                  />
                  <span>键鼠预设</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exportModules.scenes}
                    onChange={(e) => setExportModules({ ...exportModules, scenes: e.target.checked })}
                  />
                  <span>场景编排</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Dialog.Close asChild>
                  <button className="btn-secondary">取消</button>
                </Dialog.Close>
                <button onClick={handleExport} className="btn-primary">
                  导出
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Import Dialog */}
        <Dialog.Root open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[480px]">
              <Dialog.Title className="text-lg font-semibold mb-4">导入配置</Dialog.Title>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">导入模式</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="import-mode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                      />
                      <span>追加</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="import-mode"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                      />
                      <span>覆盖</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="import-mode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />
                      <span>智能合并</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">配置数据 (.lccfg JSON)</label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="粘贴导出的配置 JSON 数据..."
                    className="w-full h-40 px-3 py-2 border rounded-md font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Dialog.Close asChild>
                  <button className="btn-secondary">取消</button>
                </Dialog.Close>
                <button onClick={handleImport} className="btn-primary">
                  导入
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Toast */}
        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          className={`p-4 rounded-lg shadow-lg ${
            toastType === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}
        >
          <Toast.Title>{toastMessage}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-4 right-4" />
      </section>
    </Toast.Provider>
  )
}