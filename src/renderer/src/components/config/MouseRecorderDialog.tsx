/**
 * ShareNet - Mouse Recorder Dialog
 * 鼠标坐标录制器
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
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
  const [isRecording, setIsRecording] = useState(false)
  const [currentPoint, setCurrentPoint] = useState<CapturePoint | null>(null)
  const [clickPoint, setClickPoint] = useState<CapturePoint | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isRecording) return
      setCurrentPoint({
        screenX: event.screenX,
        screenY: event.screenY
      })
    },
    [isRecording]
  )

  const capturePoint = useCallback((screenX: number, screenY: number) => {
    const nextPoint = { screenX, screenY }
    setCurrentPoint(nextPoint)
    setClickPoint(nextPoint)
  }, [])

  const finishRecording = useCallback(() => {
    setIsRecording(false)
  }, [])

  const handleStartRecording = useCallback(() => {
    setCurrentPoint(initialPoint)
    setClickPoint(null)
    setIsRecording(true)
  }, [initialPoint])

  const useCapturedPoint = useCallback(() => {
    const pointToSave = clickPoint || currentPoint || emptyPoint
    onCapture(createMoveStep(pointToSave))
    setIsRecording(false)
    onOpenChange(false)
  }, [clickPoint, currentPoint, onCapture, onOpenChange])

  useEffect(() => {
    if (!open) {
      setIsRecording(false)
      setCurrentPoint(null)
      setClickPoint(null)
      return
    }

    setIsRecording(false)
    setCurrentPoint(initialPoint)
    setClickPoint(null)
  }, [open, initialPoint])

  useEffect(() => {
    if (!open || !isRecording) return

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return

      const contentElement = contentRef.current
      if (contentElement?.contains(event.target as Node)) return

      event.preventDefault()
      event.stopPropagation()
      capturePoint(event.screenX, event.screenY)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleDocumentMouseDown, true)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleDocumentMouseDown, true)
    }
  }, [capturePoint, handleMouseMove, isRecording, open])

  const renderedCurrentPoint = useMemo(() => pointText(currentPoint), [currentPoint])
  const renderedClickPoint = useMemo(() => pointText(clickPoint), [clickPoint])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} disableOutsideClickToClose={isRecording}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" disableOutsideClickToClose={isRecording} />
        <Dialog.Content
          ref={contentRef}
          className="fixed left-1/2 top-1/2 z-[52] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg"
          disableOutsideClickToClose={isRecording}
          hideCloseButton={isRecording}
        >
          <Dialog.Title className="text-lg font-semibold">鼠标录制器</Dialog.Title>
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            <p>点击开始后，当前坐标会持续更新；点击屏幕左键会更新点击坐标。</p>
            <p>继续点击左键会继续更新点击坐标。</p>
          </div>

          <div className="mt-4 space-y-2 rounded-md border bg-secondary/20 p-3 text-sm">
            <div>当前状态: {isRecording ? '录制中' : '待开始'}</div>
            <div className="text-muted-foreground">当前坐标: {renderedCurrentPoint}</div>
            <div className="text-muted-foreground">点击坐标: {renderedClickPoint}</div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            {!isRecording && (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button type="button" onClick={handleStartRecording}>
                  开始录制
                </Button>
                <Button type="button" variant="secondary" onClick={useCapturedPoint}>
                  使用坐标
                </Button>
              </>
            )}

            {isRecording && (
              <Button type="button" onClick={finishRecording}>
                结束
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
