/**
 * ShareNet - Mouse Recorder Dialog
 * 鼠标坐标录制器
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import type { MouseStep } from '../../stores/configStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (step: MouseStep) => void
  initialPoint?: CapturePoint | null
}

type CapturePoint = {
  screenX: number
  screenY: number
}

const emptyPoint: CapturePoint = {
  screenX: 0,
  screenY: 0
}

const createMoveStep = (point: CapturePoint): MouseStep => ({
  type: 'mouseMove',
  data: {
    ...point,
    note: ''
  }
})

const pointText = (point: CapturePoint | null) => (point ? `${point.screenX}, ${point.screenY}` : '--')

export function MouseRecorderDialog({ open, onOpenChange, onCapture, initialPoint = null }: Props) {
  const [isPicking, setIsPicking] = useState(false)
  const [lastPoint, setLastPoint] = useState<CapturePoint | null>(initialPoint)

  useEffect(() => {
    if (!open) {
      setIsPicking(false)
      setLastPoint(initialPoint)
      return
    }

    setIsPicking(false)
    setLastPoint(initialPoint)
  }, [initialPoint, open])

  const handleStartRecording = useCallback(async () => {
    setIsPicking(true)

    try {
      const result = await window.electronAPI?.startMousePicker?.(initialPoint)
      if (result?.confirmed && result.point) {
        setLastPoint(result.point)
        onCapture(createMoveStep(result.point))
        onOpenChange(false)
      }
    } finally {
      setIsPicking(false)
    }
  }, [initialPoint, onCapture, onOpenChange])

  const useCurrentPoint = useCallback(() => {
    onCapture(createMoveStep(lastPoint || initialPoint || emptyPoint))
    onOpenChange(false)
  }, [initialPoint, lastPoint, onCapture, onOpenChange])

  const renderedPoint = useMemo(() => pointText(lastPoint), [lastPoint])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} disableOutsideClickToClose={isPicking}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" disableOutsideClickToClose={isPicking} />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[52] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
          disableOutsideClickToClose={isPicking}
          hideCloseButton={isPicking}
        >
          <Dialog.Title className="text-lg font-semibold">鼠标录制器</Dialog.Title>
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            <p>开始录制后会弹出覆盖所有显示器的全屏选点层。</p>
            <p>在遮罩上左键可重复更新坐标，Enter 确认，Esc 取消。</p>
          </div>

          <div className="mt-4 space-y-2 rounded-md border bg-secondary/20 p-3 text-sm">
            <div>当前状态: {isPicking ? '全屏选点中' : '待开始'}</div>
            <div className="text-muted-foreground">最近坐标: {renderedPoint}</div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            {!isPicking && (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="button" onClick={() => void handleStartRecording()}>
                  开始录制
                </Button>
                <Button type="button" variant="secondary" onClick={useCurrentPoint}>
                  使用当前坐标
                </Button>
              </>
            )}

            {isPicking && (
              <Button type="button" variant="outline" disabled>
                录制中...
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
