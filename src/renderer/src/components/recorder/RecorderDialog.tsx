/**
 * ShareNet - Recorder Dialog
 * 键鼠录制器组件
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { type InputStep } from '../../stores/configStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, steps: InputStep[]) => void
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'preview'

export function RecorderDialog({ open, onOpenChange, onSave }: Props) {
  const [state, setState] = useState<RecorderState>('idle')
  const [steps, setSteps] = useState<InputStep[]>([])
  const [stepName, setStepName] = useState('')
  const [lastStepTime, setLastStepTime] = useState<number>(Date.now())
  const previewIndex = useRef(0)
  const previewInterval = useRef<NodeJS.Timeout | null>(null)

  // Keyboard event handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state !== 'recording') return

    const now = Date.now()
    const delay = now - lastStepTime

    const step: InputStep = {
      type: e.ctrlKey || e.altKey || e.shiftKey ? 'keyCombo' : 'keyPress',
      data: {
        key: e.key,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      },
      delay
    }

    setSteps((prev) => [...prev, step])
    setLastStepTime(now)
  }, [state, lastStepTime])

  // Mouse event handler
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (state !== 'recording') return

    const now = Date.now()
    const delay = now - lastStepTime

    const step: InputStep = {
      type: 'mouseClick',
      data: {
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY
      },
      delay
    }

    setSteps((prev) => [...prev, step])
    setLastStepTime(now)
  }, [state, lastStepTime])

  useEffect(() => {
    if (state === 'recording') {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('mousedown', handleMouseDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [state, handleKeyDown, handleMouseDown])

  const startRecording = () => {
    setSteps([])
    setLastStepTime(Date.now())
    setState('recording')
  }

  const pauseRecording = () => {
    setState('paused')
  }

  const resumeRecording = () => {
    setLastStepTime(Date.now())
    setState('recording')
  }

  const stopRecording = () => {
    setState('idle')
  }

  const startPreview = () => {
    previewIndex.current = 0
    setState('preview')

    previewInterval.current = setInterval(() => {
      if (previewIndex.current >= steps.length) {
        if (previewInterval.current) clearInterval(previewInterval.current)
        setState('idle')
        return
      }

      const step = steps[previewIndex.current]
      console.log('[Preview]', step.type, step.data)
      previewIndex.current++
    }, 500)
  }

  const handleSave = () => {
    if (!stepName.trim()) return
    onSave(stepName, steps)
    setStepName('')
    setSteps([])
    onOpenChange(false)
  }

  const handleDeleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const getStepLabel = (step: InputStep, index: number) => {
    const labels = {
      keyCombo: '组合键',
      keyPress: '按键',
      mouseClick: '鼠标点击',
      mouseMove: '鼠标移动',
      textInput: '文字输入',
      delay: '延迟'
    }

    let detail = ''
    if (step.type === 'keyPress' || step.type === 'keyCombo') {
      const keys = []
      if (step.data.ctrlKey) keys.push('Ctrl')
      if (step.data.altKey) keys.push('Alt')
      if (step.data.shiftKey) keys.push('Shift')
      keys.push(step.data.key as string)
      detail = keys.join('+')
    } else if (step.type === 'mouseClick') {
      const buttons = ['左键', '中键', '右键']
      detail = buttons[step.data.button as number] || '未知'
    } else if (step.type === 'delay') {
      detail = `${step.data.delay}ms`
    }

    return `${index + 1}. ${labels[step.type]} ${detail ? `- ${detail}` : ''}`
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg z-50 w-[600px] max-h-[80vh] flex flex-col">
          <Dialog.Title className="text-lg font-semibold mb-4">键鼠录制器</Dialog.Title>

          {/* Recording Controls */}
          <div className="flex gap-2 mb-4">
            <ToggleGroup.Root
              type="single"
              value={state}
              className="flex gap-1"
            >
              <ToggleGroup.Item
                value="idle"
                className="px-3 py-1.5 text-sm rounded bg-secondary"
                disabled={state !== 'idle'}
              >
                空闲
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="recording"
                className={`px-3 py-1.5 text-sm rounded ${
                  state === 'recording' ? 'bg-red-500 text-white' : 'bg-secondary'
                }`}
                onClick={state === 'idle' ? startRecording : undefined}
              >
                {state === 'paused' ? '继续' : '录制'}
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="paused"
                className="px-3 py-1.5 text-sm rounded bg-yellow-500 text-white"
                onClick={state === 'recording' ? pauseRecording : undefined}
                disabled={state !== 'recording'}
              >
                暂停
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="preview"
                className="px-3 py-1.5 text-sm rounded bg-secondary"
                onClick={steps.length > 0 ? startPreview : undefined}
                disabled={steps.length === 0 || state !== 'idle'}
              >
                预览
              </ToggleGroup.Item>
            </ToggleGroup.Root>

            {(state === 'recording' || state === 'paused') && (
              <button
                onClick={stopRecording}
                className="px-3 py-1.5 text-sm rounded bg-destructive text-white"
              >
                停止
              </button>
            )}
          </div>

          {/* Status */}
          <div className="text-sm text-muted-foreground mb-4">
            {state === 'idle' && '点击"录制"开始录制键鼠操作'}
            {state === 'recording' && '正在录制... 请执行键鼠操作'}
            {state === 'paused' && '录制已暂停'}
            {state === 'preview' && '预览模式'}
          </div>

          {/* Steps List */}
          <ScrollArea.Root className="flex-1 min-h-[200px] border rounded">
            <ScrollArea.Viewport className="w-full h-full p-2">
              {steps.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无录制步骤
                </div>
              ) : (
                <ContextMenu.Root>
                  <ContextMenu.Trigger asChild>
                    <div className="space-y-1">
                      {steps.map((step, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-accent rounded text-sm cursor-pointer"
                        >
                          {getStepLabel(step, index)}
                          {step.delay && step.delay > 0 && (
                            <span className="text-muted-foreground ml-2">
                              (延迟 {step.delay}ms)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Content className="bg-background border rounded p-1 shadow-lg">
                      <ContextMenu.Item
                        className="px-2 py-1 text-sm hover:bg-accent cursor-pointer"
                        onClick={() => {
                          // Add delay before this step
                          const newSteps = [...steps]
                          newSteps.splice(0, 0, {
                            type: 'delay',
                            data: { delay: 1000 },
                            delay: 0
                          })
                          setSteps(newSteps)
                        }}
                      >
                        插入延迟
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className="px-2 py-1 text-sm hover:bg-accent cursor-pointer text-destructive"
                        onClick={() => handleDeleteStep(0)}
                      >
                        清空所有
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-2">
              <ScrollArea.Thumb className="bg-border rounded-full" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          {/* Save Form */}
          <div className="mt-4 pt-4 border-t">
            <input
              type="text"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="输入预设名称保存..."
              className="w-full px-3 py-2 border rounded mb-2"
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="btn-secondary">取消</button>
              </Dialog.Close>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={!stepName.trim() || steps.length === 0}
              >
                保存预设
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}