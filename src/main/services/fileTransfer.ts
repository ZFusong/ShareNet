/**
 * ShareNet - File Transfer Service
 * 文件分片传输服务
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

export interface FileTransferConfig {
  chunkSize: number // 1MB default
  maxConcurrent: number
  maxRetries: number
}

const DEFAULT_CONFIG: FileTransferConfig = {
  chunkSize: 1024 * 1024, // 1MB
  maxConcurrent: 3,
  maxRetries: 3
}

export interface TransferProgress {
  fileId: string
  fileName: string
  fileSize: number
  transferred: number
  chunkCount: number
  progress: number // 0-100
  speed: number // bytes per second
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused'
}

export interface FileChunk {
  fileId: string
  chunkIndex: number
  totalChunks: number
  data: string // base64
  md5: string
}

export interface FileStartInfo {
  fileId: string
  fileName: string
  fileSize: number
  chunkCount: number
  md5: string
}

export interface FileEndInfo {
  fileId: string
  md5: string
  success: boolean
}

interface TransferTask {
  id: string
  fileId: string
  filePath: string
  fileName: string
  fileSize: number
  totalChunks: number
  transferredChunks: number
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused'
  md5: string
  startTime: number
  lastUpdateTime: number
  speed: number
  sender: 'local' | 'remote'
  targetIP?: string
}

export class FileTransferService extends EventEmitter {
  private config: FileTransferConfig
  private tasks: Map<string, TransferTask> = new Map()
  private queue: TransferTask[] = []
  private activeCount = 0
  private receivedFiles: Map<string, string> = new Map() // fileId -> tempPath

  constructor(config: Partial<FileTransferConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Calculate file MD5
   */
  private async calculateFileMD5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const stream = fs.createReadStream(filePath)

      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  /**
   * Calculate chunk MD5
   */
  private calculateChunkMD5(data: Buffer): string {
    return crypto.createHash('md5').update(data).digest('hex')
  }

  /**
   * Prepare file for sending
   */
  async prepareFile(filePath: string): Promise<FileStartInfo> {
    const stats = fs.statSync(filePath)
    const fileName = path.basename(filePath)
    const fileSize = stats.size
    const chunkCount = Math.ceil(fileSize / this.config.chunkSize)
    const md5 = await this.calculateFileMD5(filePath)

    const fileId = uuidv4()

    return {
      fileId,
      fileName,
      fileSize,
      chunkCount,
      md5
    }
  }

  /**
   * Send file to target
   */
  async sendFile(
    filePath: string,
    targetIP: string,
    onChunk?: (chunk: FileChunk, progress: TransferProgress) => void
  ): Promise<string> {
    const stats = fs.statSync(filePath)
    const fileName = path.basename(filePath)
    const fileSize = stats.size
    const chunkCount = Math.ceil(fileSize / this.config.chunkSize)
    const md5 = await this.calculateFileMD5(filePath)
    const fileId = uuidv4()

    const task: TransferTask = {
      id: uuidv4(),
      fileId,
      filePath,
      fileName,
      fileSize,
      totalChunks: chunkCount,
      transferredChunks: 0,
      status: 'transferring',
      md5,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      speed: 0,
      sender: 'local',
      targetIP
    }

    this.tasks.set(fileId, task)
    this.emit('transferStarted', task)

    // Send file start info
    const startInfo: FileStartInfo = {
      fileId,
      fileName,
      fileSize,
      chunkCount,
      md5
    }

    // Read and send chunks
    const fd = fs.openSync(filePath, 'r')
    const buffer = Buffer.alloc(this.config.chunkSize)

    try {
      for (let i = 0; i < chunkCount; i++) {
        const bytesRead = fs.readSync(fd, buffer, 0, this.config.chunkSize, i * this.config.chunkSize)
        const chunkData = buffer.slice(0, bytesRead)

        const chunk: FileChunk = {
          fileId,
          chunkIndex: i,
          totalChunks: chunkCount,
          data: chunkData.toString('base64'),
          md5: this.calculateChunkMD5(chunkData)
        }

        task.transferredChunks = i + 1
        task.lastUpdateTime = Date.now()
        task.speed = (task.transferredChunks * this.config.chunkSize * 1000) / (Date.now() - task.startTime + 1)

        const progress = this.getProgress(task)

        if (onChunk) {
          onChunk(chunk, progress)
        }

        this.emit('chunkSent', chunk, progress)

        // Progress update
        this.emit('progress', progress)
      }

      task.status = 'completed'
      this.emit('transferCompleted', task)
    } catch (error) {
      task.status = 'failed'
      this.emit('transferFailed', task, error)
      throw error
    } finally {
      fs.closeSync(fd)
    }

    return fileId
  }

  /**
   * Receive file chunk
   */
  receiveChunk(chunk: FileChunk, saveDir: string): TransferProgress | null {
    let task = this.tasks.get(chunk.fileId)

    // Create task if not exists (incoming file)
    if (!task) {
      task = {
        id: chunk.fileId,
        fileId: chunk.fileId,
        filePath: '',
        fileName: '',
        fileSize: 0,
        totalChunks: chunk.totalChunks,
        transferredChunks: 0,
        status: 'transferring',
        md5: '',
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        speed: 0,
        sender: 'remote'
      }
      this.tasks.set(chunk.fileId, task)
      this.emit('transferStarted', task)
    }

    // Ensure save directory exists
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true })
    }

    // Save chunk to temporary file
    const chunkPath = path.join(saveDir, `${chunk.fileId}.chunk.${chunk.chunkIndex}`)
    const data = Buffer.from(chunk.data, 'base64')
    fs.writeFileSync(chunkPath, data)

    task.transferredChunks = chunk.chunkIndex + 1
    task.lastUpdateTime = Date.now()
    task.speed = (task.transferredChunks * this.config.chunkSize * 1000) / (Date.now() - task.startTime + 1)

    const progress = this.getProgress(task)
    this.emit('progress', progress)

    return progress
  }

  /**
   * Complete file receiving
   */
  async completeReceive(fileId: string, expectedMD5: string, savePath: string): Promise<boolean> {
    const task = this.tasks.get(fileId)
    if (!task) return false

    try {
      // Reassemble chunks
      const saveDir = path.dirname(savePath)
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true })
      }

      const writeStream = fs.createWriteStream(savePath)

      for (let i = 0; i < task.totalChunks; i++) {
        const chunkPath = path.join(saveDir, `${fileId}.chunk.${i}`)
        const chunkData = fs.readFileSync(chunkPath)
        writeStream.write(chunkData)

        // Clean up chunk file
        fs.unlinkSync(chunkPath)
      }

      writeStream.end()

      // Verify MD5
      const actualMD5 = await this.calculateFileMD5(savePath)

      if (actualMD5 !== expectedMD5) {
        task.status = 'failed'
        fs.unlinkSync(savePath)
        this.emit('transferFailed', task, new Error('MD5 mismatch'))
        return false
      }

      task.status = 'completed'
      task.filePath = savePath
      this.emit('transferCompleted', task)

      return true
    } catch (error) {
      task.status = 'failed'
      this.emit('transferFailed', task, error)
      return false
    }
  }

  /**
   * Get transfer progress
   */
  private getProgress(task: TransferTask): TransferProgress {
    const transferred = task.transferredChunks * this.config.chunkSize
    const progress = (task.transferredChunks / task.totalChunks) * 100

    return {
      fileId: task.fileId,
      fileName: task.fileName,
      fileSize: task.fileSize,
      transferred: Math.min(transferred, task.fileSize),
      chunkCount: task.totalChunks,
      progress,
      speed: task.speed,
      status: task.status
    }
  }

  /**
   * Get progress for a specific file
   */
  getFileProgress(fileId: string): TransferProgress | null {
    const task = this.tasks.get(fileId)
    return task ? this.getProgress(task) : null
  }

  /**
   * Get all active transfers
   */
  getActiveTransfers(): TransferProgress[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.status === 'transferring')
      .map((t) => this.getProgress(t))
  }

  /**
   * Pause transfer
   */
  pauseTransfer(fileId: string): boolean {
    const task = this.tasks.get(fileId)
    if (task && task.status === 'transferring') {
      task.status = 'paused'
      this.emit('transferPaused', task)
      return true
    }
    return false
  }

  /**
   * Resume transfer
   */
  resumeTransfer(fileId: string): boolean {
    const task = this.tasks.get(fileId)
    if (task && task.status === 'paused') {
      task.status = 'transferring'
      this.emit('transferResumed', task)
      return true
    }
    return false
  }

  /**
   * Cancel transfer
   */
  cancelTransfer(fileId: string): boolean {
    const task = this.tasks.get(fileId)
    if (task) {
      task.status = 'failed'
      this.tasks.delete(fileId)
      this.emit('transferCancelled', task)
      return true
    }
    return false
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FileTransferConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get configuration
   */
  getConfig(): FileTransferConfig {
    return { ...this.config }
  }

  /**
   * Get transfer history
   */
  getTransferHistory(): TransferProgress[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.status === 'completed' || t.status === 'failed')
      .map((t) => this.getProgress(t))
  }
}

// Singleton
let fileTransferInstance: FileTransferService | null = null

export function getFileTransferService(config?: Partial<FileTransferConfig>): FileTransferService {
  if (!fileTransferInstance) {
    fileTransferInstance = new FileTransferService(config)
  }
  return fileTransferInstance
}

export function createFileTransferService(config?: Partial<FileTransferConfig>): FileTransferService {
  return new FileTransferService(config)
}