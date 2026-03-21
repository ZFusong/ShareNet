/**
 * ShareNet - Config Panel
 * 配置中心面板
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { SoftwarePresetList } from './SoftwarePresetList'
import { InputPresetList } from './InputPresetList'
import { SceneList } from './SceneList'
import { TriggerBindingList } from './TriggerBindingList'
import { useConfigStore } from '../../stores/configStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Tabs } from '@/components/ui/tabs'

export function ConfigPanel() {
  const { exportConfig, importConfig } = useConfigStore()
  const [activeTab, setActiveTab] = useState<'software' | 'input' | 'scene' | 'trigger'>('scene')
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [exportModules, setExportModules] = useState({
    'software-presets': true,
    'input-presets': true,
    scenes: true,
    'trigger-bindings': true
  })
  const [importMode, setImportMode] = useState<'append' | 'overwrite' | 'merge'>('append')
  const [importData, setImportData] = useState('')

  const handleExport = async () => {
    const modules = Object.entries(exportModules)
      .filter(([_, selected]) => selected)
      .map(([key]) => key)

    if (modules.length === 0) {
      toast.error('请至少选择一个导出项')
      return
    }

    const result = await exportConfig(modules)
    if (result.success && result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sharenet-config-${Date.now()}.lccfg`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('配置导出成功')
      setIsExportDialogOpen(false)
    } else {
      toast.error(result.error || '导出失败')
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error('请输入配置数据')
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
        toast.success(`导入成功: ${imported}`)
        if (r.conflicts?.length > 0) {
          toast.error(`有 ${r.conflicts.length} 个冲突项已处理`)
        }
        setIsImportDialogOpen(false)
        setImportData('')
      } else {
        toast.error(result.error || '导入失败')
      }
    } catch (error) {
      toast.error('配置数据格式无效')
    }
  }

  return (
    <section id="config-panel" className="panel h-full">
      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
        <Tabs.List className="flex border-b px-4 justify-start bg-background">
          <Tabs.Trigger
            value="scene"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none"
          >
            场景编排
          </Tabs.Trigger>
          <Tabs.Trigger
            value="software"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none"
          >
            软件预设
          </Tabs.Trigger>
          <Tabs.Trigger
            value="input"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none"
          >
            键盘预设
          </Tabs.Trigger>
          <Tabs.Trigger
            value="trigger"
            className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none"
          >
            触发器
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="scene" className="flex-1 overflow-auto p-4">
          <SceneList />
        </Tabs.Content>
        
        <Tabs.Content value="software" className="flex-1 overflow-auto p-4">
          <SoftwarePresetList />
        </Tabs.Content>

        <Tabs.Content value="input" className="flex-1 overflow-auto p-4">
          <InputPresetList />
        </Tabs.Content>

        <Tabs.Content value="trigger" className="flex-1 overflow-auto p-4">
          <TriggerBindingList />
        </Tabs.Content>
      </Tabs.Root>

      <div className="flex gap-2 p-4 border-t">
        <Button type="button" variant="outline" onClick={() => setIsExportDialogOpen(true)}>
          导出配置
        </Button>
        <Button type="button" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
          导入配置
        </Button>
      </div>

      <Dialog.Root open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-96">
            <Dialog.Title className="text-lg font-semibold mb-4">导出配置</Dialog.Title>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={exportModules['software-presets']}
                  onCheckedChange={(checked) => setExportModules({ ...exportModules, 'software-presets': checked === true })}
                />
                <span>软件预设</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={exportModules['input-presets']}
                  onCheckedChange={(checked) => setExportModules({ ...exportModules, 'input-presets': checked === true })}
                />
                <span>键盘预设</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={exportModules.scenes}
                  onCheckedChange={(checked) => setExportModules({ ...exportModules, scenes: checked === true })}
                />
                <span>场景编排</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={exportModules['trigger-bindings']}
                  onCheckedChange={(checked) => setExportModules({ ...exportModules, 'trigger-bindings': checked === true })}
                />
                <span>触发器绑定</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">取消</Button>
              </Dialog.Close>
              <Button type="button" onClick={handleExport}>
                导出
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[480px]">
            <Dialog.Title className="text-lg font-semibold mb-4">导入配置</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">导入模式</label>
                <RadioGroup value={importMode} onValueChange={(value) => setImportMode(value as typeof importMode)} className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="append" />
                    <span>追加</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="overwrite" />
                    <span>覆盖</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <RadioGroupItem value="merge" />
                    <span>智能合并</span>
                  </label>
                </RadioGroup>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">配置数据 (.lccfg JSON)</label>
                <Textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="粘贴导出的配置 JSON 数据..."
                  className="w-full h-40 font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">取消</Button>
              </Dialog.Close>
              <Button type="button" onClick={handleImport}>
                导入
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}
