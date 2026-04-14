import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Space, SpaceButton } from '../../stores/configStore'
import type { ButtonDraft, SpaceDeviceSummary, SpaceFormData } from './spacePanelTypes'
import { SpaceSurface } from './SpaceSurface'

interface SpaceEditorWorkbenchProps {
  mode: 'create' | 'edit'
  currentSpace: Space | null
  formData: SpaceFormData
  buttonDraft: ButtonDraft
  editingButtonId: string
  formDevices: SpaceDeviceSummary[]
  triggerOptions: string[]
  onChangeField: (field: 'name' | 'description', value: string) => void
  onOpenDeviceSelector: () => void
  onChangeButtonDraft: (field: 'name' | 'triggerKey', value: string) => void
  onSaveButton: () => void
  onResetButtonDraft: () => void
  onEditButton: (button: SpaceButton) => void
  onDeleteButton: (buttonId: string) => void
  onCancel: () => void
  onSaveSpace: () => void
  onDeleteSpace: () => void
}

export function SpaceEditorWorkbench({
  mode,
  currentSpace,
  formData,
  buttonDraft,
  editingButtonId,
  formDevices,
  triggerOptions,
  onChangeField,
  onOpenDeviceSelector,
  onChangeButtonDraft,
  onSaveButton,
  onResetButtonDraft,
  onEditButton,
  onDeleteButton,
  onCancel,
  onSaveSpace,
  onDeleteSpace
}: SpaceEditorWorkbenchProps) {
  return (
    <div className="flex h-full flex-col gap-4 pr-1 text-[#0f172a]">
      <SpaceSurface tone="hero" className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.05em] text-[#0f172a]">
              {mode === 'create' ? '新建空间' : `编辑空间 · ${currentSpace?.name ?? ''}`}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6f84]">
              在这里定义空间的名字、覆盖设备，以及一组可以直接复用的操作按钮。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === 'edit' && currentSpace && (
              <Button type="button" variant="outline" className="border-[#f0ccd2] bg-white text-[#b42336] hover:bg-[#fff4f5]" onClick={onDeleteSpace}>
                删除空间
              </Button>
            )}
            <Button type="button" variant="outline" className="border-[#d7e1ee] bg-white text-[#1f2937] hover:bg-[#f5f8fc]" onClick={onCancel}>
              返回详情
            </Button>
            <Button type="button" className="bg-[#5f7acb] text-white hover:bg-[#526ebf]" onClick={onSaveSpace}>
              {mode === 'create' ? '创建空间' : '保存空间'}
            </Button>
          </div>
        </div>
      </SpaceSurface>

      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <SpaceSurface tone="default" className="px-5 py-5">
            <SectionKicker label="" title="基础信息" description="定义空间的名称和使用场景，让它在侧边栏里可以被快速识别。" />
            <div className="mt-2 space-y-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#334155]">空间名称 *</label>
                <Input
                  value={formData.name}
                  onChange={(event) => onChangeField('name', event.target.value)}
                  placeholder="例如：会议室常用控制"
                  className="border-[#d7e1ee] bg-white text-[#0f172a] placeholder:text-[#94a3b8]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#334155]">空间描述</label>
                <Textarea
                  value={formData.description}
                  onChange={(event) => onChangeField('description', event.target.value)}
                  placeholder="说明这个空间的用途、适用场景"
                  className="min-h-[60px] border-[#d7e1ee] bg-white text-[#0f172a] placeholder:text-[#94a3b8]"
                />
              </div>
            </div>
          </SpaceSurface>

          <SpaceSurface tone="default" className="px-5 py-5">
            <SectionKicker label="" title="设备配置" description="为这个空间圈定会被触发器影响的设备范围。" />
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="rounded-full border border-[#d8e1ec] bg-[#f8fbff] px-3 py-1 text-xs text-[#5f6f84]">
                已选 {formDevices.length} 台
              </div>
              <Button type="button" variant="outline" className="border-[#d7e1ee] bg-white text-[#1f2937] hover:bg-[#f5f8fc]" onClick={onOpenDeviceSelector}>
                选择设备
              </Button>
            </div>
            <div className="mt-2 grid gap-2">
              {formDevices.length > 0 ? (
                formDevices.map((device) => (
                  <div
                    key={device.key}
                    className={cn(
                      'rounded-[18px] border px-4 py-3',
                      device.isOnline ? 'border-emerald-200 bg-emerald-50' : 'border-[#dce5ef] bg-[#f8fafc]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#0f172a]">{device.displayName}</div>
                        <div className="mt-1 text-xs text-[#64748b]">{device.address}</div>
                      </div>
                      <div className={cn('rounded-full px-2 py-1 text-[11px] font-medium', device.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-[#eef2f7] text-[#64748b]')}>
                        {device.isMissing ? '缺失' : device.isOnline ? '在线' : '离线'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EditorEmptyState title="尚未选择设备" description="点右上角“选择设备”，把这个空间要覆盖的设备装配进来。" />
              )}
            </div>
          </SpaceSurface>
          <SpaceSurface tone="muted" className="flex flex-1 flex-col px-5 py-5">
            <SectionKicker label="" title="按钮编排" description="先编辑草稿，再把按钮加入空间。编辑态只管理结构，不直接执行触发器。" />

            <div className="mt-4 grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
              <Input
                value={buttonDraft.name}
                onChange={(event) => onChangeButtonDraft('name', event.target.value)}
                placeholder="按钮名称"
                className="border-[#d7e1ee] bg-white text-[#0f172a] placeholder:text-[#94a3b8]"
              />
              <div className="flex flex-row gap-2 xl:flex-row">
                <Input
                  value={buttonDraft.triggerKey}
                  onChange={(event) => onChangeButtonDraft('triggerKey', event.target.value)}
                  placeholder="triggerKey"
                  className="border-[#d7e1ee] bg-white text-[#0f172a] placeholder:text-[#94a3b8]"
                />
                {triggerOptions.length > 0 && (
                  <Select.Root
                    value=""
                    onValueChange={(value) => {
                      if (!value) return
                      onChangeButtonDraft('triggerKey', value)
                      if (!buttonDraft.name) {
                        onChangeButtonDraft('name', value)
                      }
                    }}
                  >
                    <Select.Trigger className="w-full border-[#d7e1ee] bg-white text-[#0f172a] xl:w-[220px]">
                      <Select.Value placeholder="从本机触发器中选" />
                      <Select.Icon />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content>
                        {triggerOptions.map((option) => (
                          <Select.Item key={option} value={option}>
                            {option}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" className="bg-[#5f7acb] text-white hover:bg-[#526ebf]" onClick={onSaveButton}>
                  {editingButtonId ? '更新按钮' : '新增按钮'}
                </Button>
                {editingButtonId && (
                  <Button type="button" variant="outline" className="border-[#d7e1ee] bg-white text-[#1f2937] hover:bg-[#f5f8fc]" onClick={onResetButtonDraft}>
                    取消编辑
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 min-h-0 flex-1 overflow-y-auto pr-1">
              {formData.buttons.length > 0 ? (
                formData.buttons.map((button) => (
                  <div key={button.id} className="flex flex-wrap items-center gap-3 rounded-[20px] border border-[#dce5ef] bg-white px-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#0f172a]">{button.name}</div>
                      <div className="mt-1 truncate font-mono text-xs text-[#64748b]">{button.triggerKey}</div>
                    </div>
                    <Button type="button" variant="outline" className="border-[#d7e1ee] bg-white text-[#1f2937] hover:bg-[#f5f8fc]" onClick={() => onEditButton(button)}>
                      编辑
                    </Button>
                    <Button type="button" variant="outline" className="border-[#f0ccd2] bg-white text-[#b42336] hover:bg-[#fff4f5]" onClick={() => onDeleteButton(button.id)}>
                      删除
                    </Button>
                  </div>
                ))
              ) : (
                <EditorEmptyState title="还没有按钮" description="为这个空间添加一组常用 triggerKey，详情态里就会直接出现可执行按钮。" />
              )}
            </div>
          </SpaceSurface>
        </div>
      </div>
    </div>
  )
}

function SectionKicker({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#7b8798]">{label}</div>
      <div className="mt-0 text-lg font-semibold tracking-[-0.03em] text-[#0f172a]">{title}</div>
      <div className="mt-1 text-sm leading-6 text-[#64748b]">{description}</div>
    </div>
  )
}

function EditorEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#d7e1ee] bg-[#f8fafc] px-4 py-6">
      <div className="text-sm font-medium text-[#0f172a]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[#64748b]">{description}</div>
    </div>
  )
}
