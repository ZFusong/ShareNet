/**
 * ShareNet - Console Panel
 * 操作台面板 - 设备列表和指令编排
 */

import { useState, useEffect, useRef } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { useConfigStore, type Scene, type SoftwarePreset, type InputPreset } from '../../stores/configStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'

type CommandType = 'scene' | 'software' | 'input'

interface ExecutionLog {
  id: string
  time: string
  message: string
  type: 'info' | 'success' | 'error'
}

export function ConsolePanel() {
  const [commandType, setCommandType] = useState<CommandType>('scene')
  const [selectedScene, setSelectedScene] = useState<string>('')
  const [selectedSoftware, setSelectedSoftware] = useState<string>('')
  const [selectedInput, setSelectedInput] = useState<string>('')
  const [executeNow, setExecuteNow] = useState(true)
  const [scheduleTime, setScheduleTime] = useState<string>('')
  const [tempAdjustments, setTempAdjustments] = useState<Record<string, unknown>>({})
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const logContainerRef = useRef<HTMLDivElement>(null)

  const { scenes, softwarePresets, inputPresets, loadPresets } = useConfigStore()

  useEffect(() => {
    loadPresets('scene')
    loadPresets('software')
    loadPresets('input')
  }, [loadPresets])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const newLog: ExecutionLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toLocaleTimeString(),
      message,
      type
    }
    setLogs((prev) => [...prev, newLog])
  }

  const getSelectedPreset = () => {
    if (commandType === 'scene') {
      return scenes.find((s) => s.id === selectedScene)
    } else if (commandType === 'software') {
      return softwarePresets.find((s) => s.id === selectedSoftware)
    } else if (commandType === 'input') {
      return inputPresets.find((s) => s.id === selectedInput)
    }
    return null
  }

  const getPresetSteps = () => {
    const preset = getSelectedPreset()
    if (!preset) return []

    if (commandType === 'scene') {
      const scene = preset as Scene
      const steps: Array<{ index: number; type: string; name: string; config?: Record<string, unknown> }> = []

      scene.steps?.forEach((step, index) => {
        if (step.type === 'software') {
          const sw = softwarePresets.find((s) => s.id === step.presetId)
          steps.push({
            index: index + 1,
            type: '软件',
            name: sw?.name || step.presetId || '未知',
            config: step.config
          })
        } else if (step.type === 'input') {
          const ip = inputPresets.find((s) => s.id === step.presetId)
          steps.push({
            index: index + 1,
            type: '键鼠',
            name: ip?.name || step.presetId || '未知',
            config: step.config
          })
        } else if (step.type === 'delay') {
          steps.push({
            index: index + 1,
            type: '延迟',
            name: `${step.delay || 0}ms`,
            config: step.config
          })
        }
      })

      return steps
    } else if (commandType === 'software') {
      const sw = preset as SoftwarePreset
      return [{
        index: 1,
        type: '软件',
        name: sw.name,
        config: { path: sw.path, args: sw.args }
      }]
    } else if (commandType === 'input') {
      const ip = preset as InputPreset
      return ip.steps.map((step, index) => ({
        index: index + 1,
        type: step.type,
        name: step.type,
        config: step.data
      }))
    }

    return []
  }

  const handleSend = () => {
    const preset = getSelectedPreset()
    if (!preset) {
      addLog('请选择一个要执行的预设', 'error')
      return
    }

    const presetName = 'name' in preset ? preset.name : 'Unknown'
    const targetDevices = '已选择设备'

    if (scheduleTime) {
      addLog(`已安排 [${presetName}] 在 ${scheduleTime} 执行到 ${targetDevices}`, 'info')
    } else if (executeNow) {
      addLog(`发送指令: 执行 [${presetName}] 到 ${targetDevices}`, 'success')
      // TODO: 实际发送指令
    } else {
      addLog(`已发送 [${presetName}] 到 ${targetDevices} (仅发送)`, 'info')
    }
  }

  const handleQuickAction = (type: 'software' | 'input', presetId: string) => {
    const preset = type === 'software'
      ? softwarePresets.find((s) => s.id === presetId)
      : inputPresets.find((s) => s.id === presetId)

    if (preset) {
      addLog(`快捷执行: ${('name' in preset ? preset.name : 'Unknown')}`, 'info')
    }
  }

  const steps = getPresetSteps()

  return (
    <section id="console-panel" className="panel active h-full">
      <div className="h-full flex flex-col">
        <div className="flex-1 p-4 overflow-auto">
          <div className="command-panel space-y-4">
            {/* Command Type Selection */}
            <RadioGroup value={commandType} onValueChange={(value) => setCommandType(value as CommandType)} className="command-type flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="scene" />
                <span className="text-sm">场景</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="software" />
                <span className="text-sm">软件</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="input" />
                <span className="text-sm">键鼠</span>
              </label>
            </RadioGroup>

            {/* Quick Actions - Software Presets */}
            {commandType === 'scene' && softwarePresets.length > 0 && (
              <div className="quick-actions">
                <span className="text-xs text-muted-foreground mr-2">软件:</span>
                <div className="inline-flex flex-wrap gap-1">
                  {softwarePresets.slice(0, 5).map((preset) => (
                    <Button
                      key={preset.id}
                      onClick={() => handleQuickAction('software', preset.id)}
                      className="px-2 py-0.5 text-xs bg-secondary rounded hover:bg-secondary/80 transition-colors"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions - Input Presets */}
            {commandType === 'scene' && inputPresets.length > 0 && (
              <div className="quick-actions">
                <span className="text-xs text-muted-foreground mr-2">键鼠:</span>
                <div className="inline-flex flex-wrap gap-1">
                  {inputPresets.slice(0, 5).map((preset) => (
                    <Button
                      key={preset.id}
                      onClick={() => handleQuickAction('input', preset.id)}
                      className="px-2 py-0.5 text-xs bg-secondary rounded hover:bg-secondary/80 transition-colors"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Scene/Preset Selector */}
            <div id="command-selector" className="command-selector">
              <Select.Root
                value={commandType === 'scene' ? selectedScene : commandType === 'software' ? selectedSoftware : selectedInput}
                onValueChange={(value) => {
                  if (commandType === 'scene') setSelectedScene(value)
                  else if (commandType === 'software') setSelectedSoftware(value)
                  else setSelectedInput(value)
                }}
              >
                <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border rounded bg-background text-sm">
                  <Select.Value placeholder={
                    commandType === 'scene' ? '选择场景...' :
                    commandType === 'software' ? '选择软件...' : '选择键鼠...'
                  } />
                  <Select.Icon />
                </Select.Trigger>

                <Select.Portal>
                  <Select.Content className="bg-background border rounded shadow-lg z-50">
                    <Select.Viewport className="p-1">
                      {commandType === 'scene' && scenes.map((scene) => (
                        <Select.Item
                          key={scene.id}
                          value={scene.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded"
                        >
                          <Select.ItemText>{scene.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                      {commandType === 'software' && softwarePresets.map((preset) => (
                        <Select.Item
                          key={preset.id}
                          value={preset.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded"
                        >
                          <Select.ItemText>{preset.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                      {commandType === 'input' && inputPresets.map((preset) => (
                        <Select.Item
                          key={preset.id}
                          value={preset.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded"
                        >
                          <Select.ItemText>{preset.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Temporary Adjustments */}
            {commandType === 'scene' && selectedScene && (
              <Popover.Root open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <Popover.Trigger asChild>
                  <Button className="text-xs text-primary hover:underline">
                    临时调整
                  </Button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content className="bg-background border rounded shadow-lg p-3 w-64 z-50">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">延迟调整 (ms)</label>
                      <Input
                        type="number"
                        className="w-full h-8 px-2 py-1 text-sm"
                        placeholder="全局延迟"
                        value={(tempAdjustments.delay as number) || ''}
                        onChange={(e) => setTempAdjustments({
                          ...tempAdjustments,
                          delay: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                    <Popover.Arrow className="fill-border" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}

            {/* Steps Preview */}
            <div id="steps-preview" className="steps-preview min-h-[100px] border rounded p-3 bg-secondary/30">
              {steps.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground mb-2">步骤预览 ({steps.length} 步)</div>
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 flex items-center justify-center bg-primary/20 rounded-full text-xs">
                        {step.index}
                      </span>
                      <span className="px-1.5 py-0.5 bg-secondary text-xs rounded">{step.type}</span>
                      <span className="truncate">{step.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">请选择要执行的预设</div>
              )}
            </div>

            {/* Execution Options */}
            <div className="execution-options flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={executeNow} onCheckedChange={(checked) => setExecuteNow(checked === true)} />
                <span className="text-sm">立即执行</span>
              </label>

              {!executeNow && (
                <label className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">定时:</span>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-8 px-2 py-1 text-sm"
                  />
                </label>
              )}

              <Button
                onClick={handleSend}
                className="ml-auto px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                {executeNow ? '发送并执行' : '仅发送'}
              </Button>
            </div>
          </div>

          {/* Execution Log */}
          <div className="execution-log mt-4">
            <h4 className="mb-2 font-medium text-sm">执行日志</h4>
            <div
              ref={logContainerRef}
              id="log-list"
              className="log-list h-[150px] overflow-y-auto border rounded p-2 text-sm space-y-1"
            >
              {logs.length > 0 ? logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex gap-2 ${
                    log.type === 'error' ? 'text-red-500' :
                    log.type === 'success' ? 'text-green-500' : 'text-foreground'
                  }`}
                >
                  <span className="text-muted-foreground text-xs shrink-0">[{log.time}]</span>
                  <span>{log.message}</span>
                </div>
              )) : (
                <div className="text-muted-foreground">暂无日志</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}


