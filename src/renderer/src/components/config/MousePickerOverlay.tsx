import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Button } from '../ui/button'

type CapturePoint = {
  screenX: number
  screenY: number
}

const toNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === '') {
    return null
  }

  const next = Number(value)
  return Number.isFinite(next) ? Math.round(next) : null
}

const parseInitialPoint = (): CapturePoint | null => {
  const searchParams = new URLSearchParams(window.location.search)
  const screenX = toNumber(searchParams.get('initialX'))
  const screenY = toNumber(searchParams.get('initialY'))

  if (screenX === null || screenY === null) {
    return null
  }

  return { screenX, screenY }
}

const pointText = (point: CapturePoint | null) => (point ? `${point.screenX}, ${point.screenY}` : '--')

const toCapturePoint = (point: { x: number; y: number }): CapturePoint => ({
  screenX: Math.round(point.x),
  screenY: Math.round(point.y)
})

export function MousePickerOverlay() {
  const pickerId = useMemo(() => new URLSearchParams(window.location.search).get('pickerId') || '', [])
  const [currentPoint, setCurrentPoint] = useState<CapturePoint | null>(parseInitialPoint)
  const [selectedPoint, setSelectedPoint] = useState<CapturePoint | null>(parseInitialPoint)
  const controlsRef = useRef<HTMLDivElement | null>(null)

  const readCursorPoint = useCallback(async () => {
    const point = await window.electronAPI?.getCursorScreenPoint?.()
    if (!point) {
      return null
    }

    const nextPoint = toCapturePoint(point)
    setCurrentPoint(nextPoint)
    return nextPoint
  }, [])

  const handleSample = useCallback(async () => {
    const point = (await readCursorPoint()) || currentPoint
    if (!point) {
      return
    }

    setSelectedPoint(point)
  }, [currentPoint, readCursorPoint])

  const handleConfirm = useCallback(async () => {
    const point = selectedPoint || currentPoint || (await readCursorPoint())
    if (!point || !pickerId) {
      return
    }

    window.electronAPI?.confirmMousePicker?.(pickerId, point)
  }, [currentPoint, pickerId, readCursorPoint, selectedPoint])

  const handleCancel = useCallback(() => {
    if (!pickerId) {
      return
    }

    window.electronAPI?.cancelMousePicker?.(pickerId)
  }, [pickerId])

  useEffect(() => {
    let cancelled = false
    let pending = false

    const poll = async () => {
      if (cancelled || pending) {
        return
      }

      pending = true
      try {
        const point = await window.electronAPI?.getCursorScreenPoint?.()
        if (!cancelled && point) {
          setCurrentPoint(toCapturePoint(point))
        }
      } finally {
        pending = false
      }
    }

    void poll()
    const timer = window.setInterval(() => {
      void poll()
    }, 33)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleCancel()
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        void handleConfirm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancel, handleConfirm])

  const handleMouseDownCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return
      }

      if (controlsRef.current?.contains(event.target as Node)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      void handleSample()
    },
    [handleSample]
  )

  return (
    <div
      className="fixed inset-0 cursor-crosshair select-none bg-black/40 text-white"
      onMouseDownCapture={handleMouseDownCapture}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0.45)_70%)]" />

      <div ref={controlsRef} className="absolute left-6 top-6 max-w-sm rounded-xl border border-white/20 bg-black/65 p-4 shadow-2xl backdrop-blur-sm">
        <div className="text-base font-semibold">全屏鼠标选点</div>
        <div className="mt-2 space-y-1 text-sm text-white/80">
          <p>左键采样，可重复更新坐标。</p>
          <p>Enter 确认当前已选坐标，Esc 取消。</p>
        </div>

        <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          <div>当前坐标: {pointText(currentPoint)}</div>
          <div>已选坐标: {pointText(selectedPoint)}</div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleConfirm()}>
            确认
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}
