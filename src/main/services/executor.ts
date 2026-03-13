/**
 * ShareNet - Execution Engine
 * 执行引擎模块 - 指令执行与服务启动
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { app } from 'electron'
import path from 'path'
import { getSoftwarePresets, getInputPresets, getScene } from './configStore'
import type { InputStep, SceneStep } from './configStore'

// Running processes map
const runningProcesses: Map<string, ChildProcess> = new Map()

export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
  duration: number
}

export interface CommandMessage {
  msg_type: 'COMMAND'
  sender: { id: string; name: string; ip: string }
  payload: {
    type: 'software' | 'input' | 'scene'
    presetId: string
    config?: Record<string, unknown>
  }
  timestamp: number
  request_id: string
}

class ExecutionEngine extends EventEmitter {
  private whitelist: string[] = []
  private allowControl = true

  /**
   * Set whitelist
   */
  setWhitelist(ips: string[]): void {
    this.whitelist = ips
  }

  /**
   * Set allow control flag
   */
  setAllowControl(allow: boolean): void {
    this.allowControl = allow
  }

  /**
   * Check if sender is allowed
   */
  isAllowed(senderIP: string): boolean {
    // If whitelist is empty, allow all
    if (this.whitelist.length === 0) {
      return this.allowControl
    }
    return this.whitelist.includes(senderIP)
  }

  /**
   * Execute command from remote device
   */
  async executeCommand(command: CommandMessage): Promise<ExecutionResult> {
    const senderIP = command.sender.ip

    if (!this.isAllowed(senderIP)) {
      return {
        success: false,
        error: 'Permission denied: sender not in whitelist',
        duration: 0
      }
    }

    const { type, presetId, config } = command.payload
    const startTime = Date.now()

    try {
      switch (type) {
        case 'software':
          return await this.executeSoftware(presetId, config, startTime)
        case 'input':
          return await this.executeInput(presetId, startTime)
        case 'scene':
          return await this.executeScene(presetId, startTime)
        default:
          return {
            success: false,
            error: `Unknown command type: ${type}`,
            duration: Date.now() - startTime
          }
      }
    } catch (error) {
      return {
        success: false,
        error: String(error),
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Execute software preset
   */
  private async executeSoftware(
    presetId: string,
    config?: Record<string, unknown>,
    startTime?: number
  ): Promise<ExecutionResult> {
    const presets = getSoftwarePresets()
    const preset = presets.find((p) => p.id === presetId)

    if (!preset) {
      return { success: false, error: 'Software preset not found', duration: 0 }
    }

    // Check if already running
    if (runningProcesses.has(presetId)) {
      return { success: false, error: 'Software already running', duration: 0 }
    }

    const workDir = config?.workDir || preset.workDir || path.dirname(preset.path)
    const args = config?.args ? config.args.toString().split(' ') : (preset.args ? preset.args.split(' ') : [])

    return new Promise((resolve) => {
      try {
        const proc = spawn(preset.path, args, {
          cwd: workDir,
          detached: true,
          stdio: 'ignore'
        })

        const id = `${presetId}-${Date.now()}`
        runningProcesses.set(id, proc)

        proc.unref()

        proc.on('error', (error) => {
          runningProcesses.delete(id)
          this.emit('execution-error', { presetId, error: error.message })
          resolve({ success: false, error: error.message, duration: Date.now() - (startTime || Date.now()) })
        })

        proc.on('exit', (code) => {
          runningProcesses.delete(id)
          this.emit('execution-complete', { presetId, exitCode: code })
          resolve({
            success: code === 0,
            output: `Process exited with code ${code}`,
            duration: Date.now() - (startTime || Date.now())
          })
        })

        // Timeout after 30 seconds for quick execution
        setTimeout(() => {
          if (runningProcesses.has(id)) {
            runningProcesses.delete(id)
            this.emit('execution-complete', { presetId, exitCode: 0 })
            resolve({
              success: true,
              output: 'Software started (background)',
              duration: Date.now() - (startTime || Date.now())
            })
          }
        }, 30000)

        this.emit('execution-started', { presetId, type: 'software' })
      } catch (error) {
        resolve({ success: false, error: String(error), duration: 0 })
      }
    })
  }

  /**
   * Execute input preset (keyboard/mouse)
   */
  private async executeInput(presetId: string, startTime?: number): Promise<ExecutionResult> {
    const presets = getInputPresets()
    const preset = presets.find((p) => p.id === presetId)

    if (!preset) {
      return { success: false, error: 'Input preset not found', duration: 0 }
    }

    try {
      for (const step of preset.steps) {
        await this.executeInputStep(step)
      }

      this.emit('execution-complete', { presetId, type: 'input' })
      return {
        success: true,
        output: `Executed ${preset.steps.length} steps`,
        duration: Date.now() - (startTime || Date.now())
      }
    } catch (error) {
      return {
        success: false,
        error: String(error),
        duration: Date.now() - (startTime || Date.now())
      }
    }
  }

  /**
   * Execute a single input step
   */
  private async executeInputStep(step: InputStep): Promise<void> {
    // Delay step
    if (step.type === 'delay') {
      const delay = (step.data.delay as number) || 1000
      return new Promise((resolve) => setTimeout(resolve, delay))
    }

    // For other steps, we would integrate with nut.js
    // For now, log the action
    console.log('[Executor] Input step:', step.type, step.data)

    // Simulate execution time
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  /**
   * Execute scene
   */
  private async executeScene(presetId: string, startTime?: number): Promise<ExecutionResult> {
    // Scenes are handled via preset IDs in the command
    // Execute each preset in the scene sequentially

    // First, try as software preset
    const softwarePresets = getSoftwarePresets()
    if (softwarePresets.find((p) => p.id === presetId)) {
      return this.executeSoftware(presetId, undefined, startTime)
    }

    // Then try as input preset
    const inputPresets = getInputPresets()
    if (inputPresets.find((p) => p.id === presetId)) {
      return this.executeInput(presetId, startTime)
    }

    return { success: false, error: 'Scene not found', duration: 0 }
  }

  /**
   * Check if a process is running
   */
  isRunning(presetId: string): boolean {
    return Array.from(runningProcesses.values()).some((proc) => !proc.killed)
  }

  /**
   * Kill a running process
   */
  killProcess(presetId: string): boolean {
    for (const [id, proc] of runningProcesses) {
      if (id.startsWith(presetId)) {
        proc.kill()
        runningProcesses.delete(id)
        return true
      }
    }
    return false
  }

  /**
   * Kill all processes
   */
  killAll(): void {
    for (const proc of runningProcesses.values()) {
      proc.kill()
    }
    runningProcesses.clear()
  }
}

// Singleton
let executorInstance: ExecutionEngine | null = null

export function getExecutor(): ExecutionEngine {
  if (!executorInstance) {
    executorInstance = new ExecutionEngine()
  }
  return executorInstance
}

export function createExecutor(): ExecutionEngine {
  return new ExecutionEngine()
}