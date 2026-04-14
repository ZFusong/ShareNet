import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Space } from '../../stores/configStore'
import type { SpacePanelMode } from './spacePanelTypes'
import { SpaceSurface } from './SpaceSurface'

interface SpaceSidebarProps {
  spaces: Space[]
  mode: SpacePanelMode
  selectedSpaceId: string
  onCreate: () => void
  onSelectSpace: (space: Space) => void
}

export function SpaceSidebar({ spaces, mode, selectedSpaceId, onCreate, onSelectSpace }: SpaceSidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-[#dde6f0] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] px-4 py-5">
      <SpaceSurface tone="hero" className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-full">
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#0f172a]">空间</h3>
            <p className="mt-2 text-sm leading-6 text-[#516072]">把常用设备和触发器收束成一个高频操作集合。</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SidebarStat label="空间数" value={spaces.length} />
          {/* <SidebarStat label="当前模式" value={mode === 'create' ? '新建' : mode === 'edit' ? '编辑' : '详情'} /> */}
          <Button type="button" className="bg-[#5f7acb] text-white hover:bg-[#526ebf] rounded-2xl" onClick={onCreate}>
            + 新建
          </Button>
        </div>
      </SpaceSurface>

      {mode === 'create' && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 rounded-[22px] border border-dashed border-[#bfd0f3] bg-[#f8fbff] px-4 py-3 text-left transition hover:border-[#97b4ef] hover:bg-[#f2f7ff]"
        >
          <div className="text-sm font-medium text-[#0f172a]">新建草稿</div>
          <div className="mt-1 text-xs text-[#607086]">右侧工作台正在创建一个新的空间配置。</div>
        </button>
      )}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {spaces.length > 0 ? (
          spaces.map((space) => {
            const active = selectedSpaceId === space.id && mode !== 'create'
            return (
              <button
                key={space.id}
                type="button"
                onClick={() => onSelectSpace(space)}
                className={cn(
                  'w-full rounded-[20px] border px-4 py-4 text-left transition duration-200',
                  active
                    ? 'border-[#b8c9f4] bg-[linear-gradient(180deg,#f7faff_0%,#eef5ff_100%)] shadow-[0_14px_28px_rgba(100,128,190,0.12)]'
                    : 'border-[#dce5ef] bg-white hover:border-[#c9d7e8] hover:bg-[#f8fbff]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full">
                    <div className="flex justify-between">
                      <div className="break-all text-sm font-medium text-[#0f172a]">{space.name}</div>
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[11px] font-medium',
                          active ? 'bg-[#dfe7ff] text-[#4960a8]' : 'bg-[#f1f5f9] text-[#64748b]'
                        )}
                      >
                        {space.buttons.length} 按钮
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[#64748b]">{space.description || '未填写描述'}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-[#7b8798]">
                  <span>{space.deviceKeys.length} 台设备</span>
                  <span>{active ? '当前' : ''}</span>
                </div>
              </button>
            )
          })
        ) : (
          <SpaceSurface tone="muted" className="border-dashed px-4 py-6">
            <div className="text-sm text-[#64748b]">还没有空间，先新建一个工作空间。</div>
          </SpaceSurface>
        )}
      </div>
    </aside>
  )
}

function SidebarStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-evenly rounded-2xl border border-[#deE7f2] bg-white/85 px-3 py-1">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#7b8798]">{label}</div>
      <div className="text-lg font-semibold tracking-[-0.03em] text-[#0f172a]">{value}</div>
    </div>
  )
}
