import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Space, SpaceButton } from '../../stores/configStore'
import type { SpaceDeviceSummary, SpaceLogEntry } from './spacePanelTypes'
import { SpaceSurface } from './SpaceSurface'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

interface SpaceDetailWorkbenchProps {
  currentSpace: Space
  viewDevices: SpaceDeviceSummary[]
  currentLogs: SpaceLogEntry[]
  logHighlighted: boolean
  onEdit: () => void
  onDelete: () => void
  onExecuteButton: (button: SpaceButton) => void
  onClearLogs: () => void
}

export function SpaceDetailWorkbench({
  currentSpace,
  viewDevices,
  currentLogs,
  logHighlighted,
  onEdit,
  onDelete,
  onExecuteButton,
  onClearLogs
}: SpaceDetailWorkbenchProps) {
  const logViewportRef = useRef<HTMLDivElement>(null)
  const onlineCount = viewDevices.filter((device) => device.isOnline).length

  useEffect(() => {
    if (!logViewportRef.current) return
    logViewportRef.current.scrollTop = logViewportRef.current.scrollHeight
  }, [currentLogs])

  return (
    <div className="flex h-full flex-col gap-4 pr-1 overflow-y-auto text-[#0f172a]">
      <SpaceSurface tone="hero" className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="mt-2 break-all text-[28px] font-semibold tracking-[-0.05em] text-[#0f172a]">{currentSpace.name}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6f84]">
              {currentSpace.description || '为这组设备准备一套常用触发器，集中处理高频动作。'}
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="w-10 h-10 px-2 rounded-full border-[#d7e1ee] bg-white text-[#1f2937] hover:bg-[#f5f8fc]">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1" align="end">
              <Button type="button" variant="ghost" className="w-full justify-start text-[#1f2937] hover:bg-[#f5f8fc] hover:text-[#1f2937]" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </Button>
              <Button type="button" variant="ghost" className="w-full justify-start text-[#b42336] hover:bg-[#fff4f5] hover:text-[#b42336]" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
            </PopoverContent>
          </Popover>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MetricPill label="设备覆盖" value={`${viewDevices.length} 台`} hint={`${onlineCount} 台在线`} />
          <MetricPill label="快捷按钮" value={`${currentSpace.buttons.length} 个`} hint="直接触发空间动作" />
          <MetricPill label="反馈状态" value={currentLogs.length > 0 ? '有最近日志' : '等待执行'} hint={currentLogs.length > 0 ? '可在底部查看结果' : '执行后会高亮反馈'} />
        </div>
      </SpaceSurface>

      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.3fr)]">
        <SpaceSurface tone="accent" className="flex min-h-0 flex-col px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#0f172a]">快捷操作</div>
            </div>
            {/* <div className="rounded-full border border-[#cfdcff] bg-[#e9f1ff] px-3 py-1 text-xs text-[#4661a8]">
              立即执行
            </div> */}
          </div>
          <div className="mt-2 text-sm leading-6 text-[#5f6f84]">按钮区域是空间的主操作面。点按后会把对应 triggerKey 发送给当前空间内的设备。</div>
          <div className="mt-4 grid min-h-0 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
            {currentSpace.buttons.length > 0 ? (
              currentSpace.buttons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => onExecuteButton(button)}
                  className="group rounded-[22px] border border-[#d8e1ec] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 text-left transition duration-200 hover:border-[#aabff0] hover:bg-[linear-gradient(180deg,#f7faff_0%,#eef5ff_100%)] hover:shadow-[0_14px_28px_rgba(95,122,203,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-all text-base font-semibold tracking-[-0.03em] text-[#0f172a]">{button.name}</div>
                      <div className="mt-2 break-all font-mono text-xs text-[#64748b]">{button.triggerKey}</div>
                    </div>
                    <span className="rounded-full border border-[#d7e1ee] bg-white px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#5b6f9f] transition group-hover:border-[#aac0ef]">
                      执行
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="sm:col-span-2 2xl:col-span-3">
                <EmptyState title="还没有快捷按钮" description="进入编辑工作台后，为这个空间配置常用触发器。" />
              </div>
            )}
          </div>
        </SpaceSurface>

        <SpaceSurface tone="default" className="flex min-h-0 flex-col px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#0f172a]">设备概览</div>
            </div>
            <div className="rounded-full border border-[#d8e1ec] bg-[#f8fbff] px-3 py-1 text-xs text-[#5f6f84]">
              在线 {onlineCount} / {viewDevices.length}
            </div>
          </div>
          <div className="mt-4 grid min-h-0 gap-2 overflow-y-auto pr-1">
            {viewDevices.length > 0 ? (
              viewDevices.map((device) => (
                <div
                  key={device.key}
                  className={cn(
                    'rounded-[18px] border px-4 py-3',
                    device.isOnline
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-[#dce5ef] bg-[#f8fafc]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#0f172a]">{device.displayName}</div>
                      <div className="mt-1 text-xs text-[#64748b]">{device.address}</div>
                    </div>
                    <div
                      className={cn(
                        'rounded-full px-2 py-1 text-[11px] font-medium',
                        device.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-[#eef2f7] text-[#64748b]'
                      )}
                    >
                      {device.isMissing ? '缺失' : device.isOnline ? '在线' : '离线'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="还没有设备" description="先进入编辑工作台，为这个空间选择一组设备。" />
            )}
          </div>
        </SpaceSurface>        
        
        <SpaceSurface
          tone={currentLogs.length > 0 || logHighlighted ? 'default' : 'muted'}
          className={cn(
            'px-5 py-5 transition duration-300',
            logHighlighted && 'border-[#b9caf2] shadow-[0_18px_36px_rgba(95,122,203,0.14)]'
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#0f172a]">执行日志</div>
              <div className="mt-1 text-sm text-[#64748b]">
                {currentLogs.length > 0 ? '最近执行结果会集中显示在这里。' : '日志默认收敛显示，执行按钮后会自动成为反馈焦点。'}
              </div>
            </div>
            <Button type="button" variant="outline" className="border-[#d7e1ee] bg-white text-[#1f2937] hover:bg-[#f5f8fc]" onClick={onClearLogs}>
              清空日志
            </Button>
          </div>
          <div
            ref={logViewportRef}
            className={cn(
              'mt-4 h-56 overflow-y-auto rounded-[20px] border px-4 py-4',
              currentLogs.length > 0 ? 'border-[#dbe4ef] bg-[#fbfdff]' : 'border-[#dce5ef] bg-[#f8fafc]'
            )}
          >
            {currentLogs.length > 0 ? (
              <div className="space-y-2 text-sm">
                {currentLogs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      'flex gap-3 rounded-2xl border px-3 py-3',
                      log.type === 'error'
                        ? 'border-red-200 bg-red-50 text-[#991b1b]'
                        : log.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-[#166534]'
                          : 'border-[#dce5ef] bg-white text-[#0f172a]'
                    )}
                  >
                    <span className="shrink-0 font-mono text-xs text-[#64748b]">[{log.time}]</span>
                    <span className="leading-6">{log.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无日志" description="执行任意一个空间按钮后，这里会给出成功、失败和上下文反馈。" />
            )}
          </div>
        </SpaceSurface>
      </div>

    </div>
  )
}

function MetricPill({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[20px] border border-[#dce5ef] bg-white/80 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#7b8798]">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#0f172a]">{value}</div>
      <div className="mt-1 text-xs text-[#64748b]">{hint}</div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#d7e1ee] bg-[#f8fafc] px-4 py-6">
      <div className="text-sm font-medium text-[#0f172a]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[#64748b]">{description}</div>
    </div>
  )
}
