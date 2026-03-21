/**
 * ShareNet - Main Process Entry
 * 局域网通讯与控制工具
 */

import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron'
import { join, basename, parse } from 'path'
import os from 'os'
import { getUDPService } from './services/udpService'
import { getTCPServer } from './services/tcpServer'
import type { DeviceInfo, NetworkMessage } from './services/types'
import { v4 as uuidv4 } from 'uuid'

// Simple console logging
const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args)
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
  app.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

log.info('=== ShareNet 启动 ===')
log.info('App version:', app.getVersion())
log.info('Electron version:', process.versions.electron)
log.info('Node version:', process.versions.node)

let mainWindow: BrowserWindow | null = null

interface SharedImageResource {
  shareId: string
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  thumbnail: string
  createdAt: number
}

interface SharedFileResource {
  shareId: string
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: number
}

interface IncomingImageTransfer {
  shareId: string
  fileName: string
  fileSize: number
  mimeType: string
  totalChunks: number
  receivedCount: number
  chunks: Array<Buffer | null>
  fromIp: string
  fromPort?: number
}

interface IncomingFileTransfer {
  shareId: string
  fileName: string
  fileSize: number
  mimeType: string
  totalChunks: number
  receivedCount: number
  chunks: Array<Buffer | null>
  fromIp: string
  fromPort?: number
}

const sharedImageRegistry = new Map<string, SharedImageResource>()
const sharedFileRegistry = new Map<string, SharedFileResource>()
const incomingImageTransfers = new Map<string, IncomingImageTransfer>()
const incomingFileTransfers = new Map<string, IncomingFileTransfer>()
const IMAGE_CHUNK_SIZE = 256 * 1024
const FILE_CHUNK_SIZE = 256 * 1024

const getSharedImageRegistryPath = (): string => join(app.getPath('userData'), 'shared-images.json')
const getSharedFileRegistryPath = (): string => join(app.getPath('userData'), 'shared-files.json')

const persistSharedImageRegistry = (): void => {
  try {
    writeFileSync(getSharedImageRegistryPath(), JSON.stringify(Array.from(sharedImageRegistry.values()), null, 2), 'utf-8')
  } catch (error) {
    log.error('Failed to persist shared image registry:', error)
  }
}

const persistSharedFileRegistry = (): void => {
  try {
    writeFileSync(getSharedFileRegistryPath(), JSON.stringify(Array.from(sharedFileRegistry.values()), null, 2), 'utf-8')
  } catch (error) {
    log.error('Failed to persist shared file registry:', error)
  }
}

const loadSharedImageRegistry = (): void => {
  try {
    const registryPath = getSharedImageRegistryPath()
    if (!existsSync(registryPath)) {
      return
    }

    const raw = readFileSync(registryPath, 'utf-8')
    const entries = JSON.parse(raw) as SharedImageResource[]
    let pruned = false

    sharedImageRegistry.clear()
    for (const entry of entries) {
      if (entry?.shareId && entry.filePath && existsSync(entry.filePath)) {
        sharedImageRegistry.set(entry.shareId, entry)
      } else {
        pruned = true
      }
    }

    if (pruned) {
      persistSharedImageRegistry()
    }
  } catch (error) {
    log.error('Failed to load shared image registry:', error)
  }
}

const loadSharedFileRegistry = (): void => {
  try {
    const registryPath = getSharedFileRegistryPath()
    if (!existsSync(registryPath)) {
      return
    }

    const raw = readFileSync(registryPath, 'utf-8')
    const entries = JSON.parse(raw) as SharedFileResource[]
    let pruned = false

    sharedFileRegistry.clear()
    for (const entry of entries) {
      if (entry?.shareId && entry.filePath && existsSync(entry.filePath)) {
        sharedFileRegistry.set(entry.shareId, entry)
      } else {
        pruned = true
      }
    }

    if (pruned) {
      persistSharedFileRegistry()
    }
  } catch (error) {
    log.error('Failed to load shared file registry:', error)
  }
}

const deleteSharedImage = (shareId: string): void => {
  if (sharedImageRegistry.delete(shareId)) {
    persistSharedImageRegistry()
  }
}

const deleteSharedFile = (shareId: string): void => {
  if (sharedFileRegistry.delete(shareId)) {
    persistSharedFileRegistry()
  }
}

const currentSenderDevice = (): DeviceInfo => (
  udpService?.getLocalDevice() || {
    id: 'local',
    name: 'Local',
    ip: '127.0.0.1',
    port: 0,
    role: 'bidirectional',
    tags: [],
    status: 'online',
    lastSeen: Date.now()
  }
)

function createWindow(): void {
  log.info('创建主窗口...')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ShareNet - 局域网通讯工具',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    log.info('主窗口已显示')
  })

  // Create application menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '设置', click: () => mainWindow?.webContents.send('open-settings') },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => mainWindow?.webContents.send('show-about')
        },
        {
          label: '文档',
          click: async () => {
            await shell.openExternal('https://github.com/sharenet')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    log.info('主窗口关闭')
    mainWindow = null
  })

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('页面加载完成')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log.error('页面加载失败:', errorCode, errorDescription)
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// App ready
app.whenReady().then(() => {
  log.info('应用就绪')
  loadSharedImageRegistry()
  loadSharedFileRegistry()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// All windows closed
app.on('window-all-closed', () => {
  log.info('所有窗口关闭')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  log.info('=== ShareNet 关闭 ===')
})

// IPC Handlers

// Get app info
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform
  }
})

// Get user data path
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData')
})

// Get local IP
ipcMain.handle('get-local-ip', () => {
  const interfaces = os.networkInterfaces() || {}
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
})

// Get hostname
ipcMain.handle('get-hostname', () => {
  return os.hostname()
})

// ========== UDP Service IPC Handlers ==========

let udpService: ReturnType<typeof getUDPService> | null = null

// Start UDP service
ipcMain.handle('udp-start', async (_event, config?: { port?: number }) => {
  try {
    udpService = getUDPService(config)
    udpService.removeAllListeners('error')
    udpService.on('error', (err) => {
      mainWindow?.webContents.send('network-error', { service: 'udp', error: String(err) })
    })
    await udpService.start()
    log.info('UDP service started')
    return { success: true }
  } catch (error) {
    log.error('Failed to start UDP service:', error)
    return { success: false, error: String(error) }
  }
})

// Stop UDP service
ipcMain.handle('udp-stop', async () => {
  try {
    if (udpService) {
      await udpService.stop()
      udpService = null
    }
    return { success: true }
  } catch (error) {
    log.error('Failed to stop UDP service:', error)
    return { success: false, error: String(error) }
  }
})

// Get device list
ipcMain.handle('udp-get-devices', () => {
  if (!udpService) return []
  return udpService.getDeviceList()
})

// Get local device info
ipcMain.handle('udp-get-local-device', () => {
  if (!udpService) return null
  return udpService.getLocalDevice()
})

// Initialize local device
ipcMain.handle('udp-init-local-device', async (_event, deviceInfo: Partial<DeviceInfo>) => {
  if (!udpService) {
    udpService = getUDPService()
  }
  try {
    const device = await udpService.initialize(deviceInfo)
    return { success: true, device }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Update local device
ipcMain.handle('udp-update-local-device', (_event, info: Partial<DeviceInfo>) => {
  if (!udpService) return { success: false, error: 'UDP service not running' }
  udpService.updateLocalDevice(info)
  return { success: true }
})

// Manually add device
ipcMain.handle('udp-add-device', (_event, device: DeviceInfo) => {
  if (!udpService) return { success: false, error: 'UDP service not running' }
  udpService.addDevice(device)
  return { success: true }
})

// Remove device
ipcMain.handle('udp-remove-device', (_event, id: string) => {
  if (!udpService) return { success: false, error: 'UDP service not running' }
  return { success: udpService.removeDevice(id) }
})

// Get UDP config
ipcMain.handle('udp-get-config', () => {
  if (!udpService) return null
  return udpService.getConfig()
})

// Update UDP config
ipcMain.handle('udp-update-config', (_event, config: { port?: number }) => {
  if (!udpService) return { success: false, error: 'UDP service not running' }
  udpService.updateConfig(config)
  return { success: true }
})

// Forward UDP events to renderer
ipcMain.on('udp-subscribe', (event) => {
  if (!udpService) return

  const sendDevicesUpdate = () => {
    event.sender.send('udp-devices-updated', udpService?.getDeviceList() || [])
  }

  udpService.on('devicesUpdated', sendDevicesUpdate)
  udpService.on('deviceAdded', (device: DeviceInfo) => {
    event.sender.send('udp-device-added', device)
  })
  udpService.on('deviceUpdated', (device: DeviceInfo) => {
    event.sender.send('udp-device-updated', device)
  })
  udpService.on('devicesRemoved', (devices: DeviceInfo[]) => {
    event.sender.send('udp-devices-removed', devices)
  })
})

// ========== TCP Server IPC Handlers ==========

let tcpServer: ReturnType<typeof getTCPServer> | null = null
let messageHandler: any = null

// Start TCP server
ipcMain.handle('tcp-start', async (_event, config?: { port?: number }) => {
  try {
    tcpServer = getTCPServer(config)
    tcpServer.removeAllListeners('error')
    tcpServer.removeAllListeners('message')
    tcpServer.removeAllListeners('binaryMessage')
    tcpServer.on('error', (err) => {
      mainWindow?.webContents.send('network-error', { service: 'tcp', error: String(err) })
    })

    tcpServer.on('message', async (message: NetworkMessage, from: DeviceInfo) => {
      if (message?.msg_type === 'EXECUTE_TRIGGER') {
        const triggerKey = typeof message.payload?.triggerKey === 'string' ? message.payload.triggerKey.trim() : ''

        if (!triggerKey) {
          await tcpServer?.sendMessage(from.ip, {
            msg_type: 'EXECUTE_TRIGGER_RESULT',
            sender: currentSenderDevice(),
            payload: {
              triggerKey,
              ok: false,
              message: 'triggerKey 不能为空'
            },
            timestamp: Date.now(),
            request_id: uuidv4()
          } as NetworkMessage, from.port)
          return
        }

        const sceneId = resolveSceneIdByTrigger(triggerKey)
        if (!sceneId) {
          await tcpServer?.sendMessage(from.ip, {
            msg_type: 'EXECUTE_TRIGGER_RESULT',
            sender: currentSenderDevice(),
            payload: {
              triggerKey,
              ok: false,
              message: `未找到触发器绑定: ${triggerKey}`
            },
            timestamp: Date.now(),
            request_id: uuidv4()
          } as NetworkMessage, from.port)
          return
        }

        const executor = getExecutor()
        const result = await executor.executeCommand({
          msg_type: 'COMMAND',
          sender: { id: from.id || '', name: from.name || 'Remote', ip: from.ip },
          payload: { type: 'scene', presetId: sceneId },
          timestamp: Date.now(),
          request_id: uuidv4()
        })

        await tcpServer?.sendMessage(from.ip, {
          msg_type: 'EXECUTE_TRIGGER_RESULT',
          sender: currentSenderDevice(),
          payload: {
            triggerKey,
            sceneId,
            ok: result.success,
            message: result.success ? '执行成功' : (result.error || '执行失败'),
            duration: result.duration
          },
          timestamp: Date.now(),
          request_id: uuidv4()
        } as NetworkMessage, from.port)
        return
      }

      if (message?.msg_type === 'IMAGE_DOWNLOAD_REQUEST') {
        const shareId = message.payload?.shareId
        const resource = typeof shareId === 'string' ? sharedImageRegistry.get(shareId) : null

        if (!resource || !existsSync(resource.filePath)) {
          if (typeof shareId === 'string') {
            deleteSharedImage(shareId)
          }
          if (from.ip && from.port) {
            await tcpServer?.sendMessage(from.ip, {
              msg_type: 'IMAGE_DOWNLOAD_ERROR',
              sender: currentSenderDevice(),
              payload: { shareId, message: '共享图片不存在或已不可用' },
              timestamp: Date.now(),
              request_id: uuidv4()
            } as NetworkMessage, from.port)
          }
          return
        }

        if (!from.ip || !from.port) {
          return
        }

        const fileBuffer = readFileSync(resource.filePath)
        const totalChunks = Math.ceil(fileBuffer.length / IMAGE_CHUNK_SIZE)
        let sendFailed = false

        for (let index = 0; index < totalChunks; index++) {
          const start = index * IMAGE_CHUNK_SIZE
          const end = Math.min(start + IMAGE_CHUNK_SIZE, fileBuffer.length)
          const chunk = fileBuffer.subarray(start, end)
          const ok = await tcpServer?.sendBinaryMessage(
            from.ip,
            {
              msg_type: 'IMAGE_CHUNK',
              payload: {
                shareId: resource.shareId,
                fileName: resource.fileName,
                fileSize: resource.fileSize,
                mimeType: resource.mimeType,
                chunkIndex: index,
                totalChunks
              }
            },
            chunk,
            from.port
          )

          if (!ok) {
            sendFailed = true
            break
          }
        }

        if (sendFailed) {
          await tcpServer?.sendMessage(from.ip, {
            msg_type: 'IMAGE_DOWNLOAD_ERROR',
            sender: currentSenderDevice(),
            payload: { shareId, message: '图片传输失败' },
            timestamp: Date.now(),
            request_id: uuidv4()
          } as NetworkMessage, from.port)
        }
        return
      }

      if (message?.msg_type === 'FILE_DOWNLOAD_REQUEST') {
        const shareId = message.payload?.shareId
        const resource = typeof shareId === 'string' ? sharedFileRegistry.get(shareId) : null

        if (!resource || !existsSync(resource.filePath)) {
          if (typeof shareId === 'string') {
            deleteSharedFile(shareId)
          }
          if (from.ip && from.port) {
            await tcpServer?.sendMessage(from.ip, {
              msg_type: 'FILE_DOWNLOAD_ERROR',
              sender: currentSenderDevice(),
              payload: { shareId, message: '共享文件不存在或已不可用' },
              timestamp: Date.now(),
              request_id: uuidv4()
            } as NetworkMessage, from.port)
          }
          return
        }

        if (!from.ip || !from.port) {
          return
        }

        const fileBuffer = readFileSync(resource.filePath)
        const totalChunks = Math.ceil(fileBuffer.length / FILE_CHUNK_SIZE)
        let sendFailed = false

        for (let index = 0; index < totalChunks; index++) {
          const start = index * FILE_CHUNK_SIZE
          const end = Math.min(start + FILE_CHUNK_SIZE, fileBuffer.length)
          const chunk = fileBuffer.subarray(start, end)
          const ok = await tcpServer?.sendBinaryMessage(
            from.ip,
            {
              msg_type: 'FILE_CHUNK',
              payload: {
                shareId: resource.shareId,
                fileName: resource.fileName,
                fileSize: resource.fileSize,
                mimeType: resource.mimeType,
                chunkIndex: index,
                totalChunks
              }
            },
            chunk,
            from.port
          )

          if (!ok) {
            sendFailed = true
            break
          }
        }

        if (sendFailed) {
          await tcpServer?.sendMessage(from.ip, {
            msg_type: 'FILE_DOWNLOAD_ERROR',
            sender: currentSenderDevice(),
            payload: { shareId, message: '文件传输失败' },
            timestamp: Date.now(),
            request_id: uuidv4()
          } as NetworkMessage, from.port)
        }
        return
      }

      mainWindow?.webContents.send('tcp-message', message, from)
    })

    tcpServer.on('binaryMessage', (header: { msg_type?: string; payload?: any }, chunk: Buffer, from: DeviceInfo) => {
      const payload = header.payload || {}
      const shareId = payload.shareId
      const totalChunks = payload.totalChunks
      const chunkIndex = payload.chunkIndex

      if (typeof shareId !== 'string' || typeof totalChunks !== 'number' || typeof chunkIndex !== 'number') {
        return
      }

      const transferKey = `${from.ip}:${from.port || 0}:${shareId}`

      if (header?.msg_type === 'IMAGE_CHUNK') {
        let transfer = incomingImageTransfers.get(transferKey)
        if (!transfer) {
          transfer = {
            shareId,
            fileName: payload.fileName || 'image',
            fileSize: payload.fileSize || 0,
            mimeType: payload.mimeType || 'image/png',
            totalChunks,
            receivedCount: 0,
            chunks: new Array(totalChunks).fill(null),
            fromIp: from.ip,
            fromPort: from.port
          }
          incomingImageTransfers.set(transferKey, transfer)
        }

        if (!transfer.chunks[chunkIndex]) {
          transfer.chunks[chunkIndex] = Buffer.from(chunk)
          transfer.receivedCount += 1
        }

        mainWindow?.webContents.send('image-download-progress', {
          shareId,
          fromIp: from.ip,
          fromPort: from.port,
          progress: Math.round((transfer.receivedCount / transfer.totalChunks) * 100),
          receivedCount: transfer.receivedCount,
          totalChunks: transfer.totalChunks
        })

        if (transfer.receivedCount !== transfer.totalChunks) {
          return
        }

        try {
          const downloadDir = getDownloadDir()
          const filePath = createUniqueFilePath(downloadDir, transfer.fileName)
          const completeBuffer = Buffer.concat(transfer.chunks.filter(Boolean) as Buffer[])
          writeFileSync(filePath, completeBuffer)

          mainWindow?.webContents.send('image-download-complete', {
            shareId,
            fromIp: from.ip,
            fromPort: from.port,
            fileName: transfer.fileName,
            fileSize: transfer.fileSize,
            mimeType: transfer.mimeType,
            path: filePath,
            dataUrl: 'data:' + transfer.mimeType + ';base64,' + completeBuffer.toString('base64'),
          })
        } catch (error) {
          mainWindow?.webContents.send('image-download-error', {
            shareId,
            fromIp: from.ip,
            fromPort: from.port,
            error: String(error)
          })
        } finally {
          incomingImageTransfers.delete(transferKey)
        }
        return
      }

      if (header?.msg_type !== 'FILE_CHUNK') {
        return
      }

      let transfer = incomingFileTransfers.get(transferKey)
      if (!transfer) {
        transfer = {
          shareId,
          fileName: payload.fileName || 'file',
          fileSize: payload.fileSize || 0,
          mimeType: payload.mimeType || 'application/octet-stream',
          totalChunks,
          receivedCount: 0,
          chunks: new Array(totalChunks).fill(null),
          fromIp: from.ip,
          fromPort: from.port
        }
        incomingFileTransfers.set(transferKey, transfer)
      }

      if (!transfer.chunks[chunkIndex]) {
        transfer.chunks[chunkIndex] = Buffer.from(chunk)
        transfer.receivedCount += 1
      }

      mainWindow?.webContents.send('file-download-progress', {
        shareId,
        fromIp: from.ip,
        fromPort: from.port,
        progress: Math.round((transfer.receivedCount / transfer.totalChunks) * 100),
        receivedCount: transfer.receivedCount,
        totalChunks: transfer.totalChunks
      })

      if (transfer.receivedCount !== transfer.totalChunks) {
        return
      }

      try {
        const downloadDir = getDownloadDir()
        const filePath = createUniqueFilePath(downloadDir, transfer.fileName)
        const completeBuffer = Buffer.concat(transfer.chunks.filter(Boolean) as Buffer[])
        writeFileSync(filePath, completeBuffer)

        mainWindow?.webContents.send('file-download-complete', {
          shareId,
          fromIp: from.ip,
          fromPort: from.port,
          fileName: transfer.fileName,
          fileSize: transfer.fileSize,
          mimeType: transfer.mimeType,
          path: filePath
        })
      } catch (error) {
        mainWindow?.webContents.send('file-download-error', {
          shareId,
          fromIp: from.ip,
          fromPort: from.port,
          error: String(error)
        })
      } finally {
        incomingFileTransfers.delete(transferKey)
      }
    })

    await tcpServer.start()
    log.info('TCP server started')
    return { success: true }
  } catch (error) {
    log.error('Failed to start TCP server:', error)
    return { success: false, error: String(error) }
  }
})

// Stop TCP server
ipcMain.handle('tcp-stop', async () => {
  try {
    if (tcpServer) {
      tcpServer.removeAllListeners('message')
      tcpServer.removeAllListeners('binaryMessage')
      await tcpServer.stop()
      tcpServer = null
    }
    return { success: true }
  } catch (error) {
    log.error('Failed to stop TCP server:', error)
    return { success: false, error: String(error) }
  }
})

// Send message to device
ipcMain.handle('tcp-send', async (_event, targetIP: string, portOrMessage: any, maybeMessage?: any) => {
  if (!tcpServer) return { success: false, error: 'TCP server not running' }

  const targetPort = typeof portOrMessage === 'number' ? portOrMessage : undefined
  const message = typeof portOrMessage === 'number' ? maybeMessage : portOrMessage

  const fullMessage: NetworkMessage = {
    ...message,
    timestamp: Date.now(),
    request_id: uuidv4()
  } as NetworkMessage

  const success = await tcpServer.sendMessage(targetIP, fullMessage, targetPort)
  return { success }
})

// Broadcast message
ipcMain.handle('tcp-broadcast', async (_event, message: Omit<NetworkMessage, 'timestamp' | 'request_id'>) => {
  if (!tcpServer) return { success: false, error: 'TCP server not running' }

  const fullMessage: NetworkMessage = {
    ...message,
    timestamp: Date.now(),
    request_id: uuidv4()
  } as NetworkMessage

  const count = await tcpServer.broadcastMessage(fullMessage)
  return { success: true, count }
})

// Connect to remote device
ipcMain.handle('tcp-connect', async (_event, host: string, port: number, deviceInfo: DeviceInfo) => {
  if (!tcpServer) {
    tcpServer = getTCPServer()
    await tcpServer.start()
  }

  const clientId = await tcpServer.connectTo(host, port, deviceInfo)
  return { success: !!clientId, clientId }
})

// Get TCP connection count
ipcMain.handle('tcp-get-connections', () => {
  if (!tcpServer) return 0
  return tcpServer.getConnectionCount()
})

// Get TCP config
ipcMain.handle('tcp-get-config', () => {
  if (!tcpServer) return null
  return tcpServer.getConfig()
})

// Update TCP config
ipcMain.handle('tcp-update-config', (_event, config: { port?: number }) => {
  if (!tcpServer) return { success: false, error: 'TCP server not running' }
  tcpServer.updateConfig(config)
  return { success: true }
})

// ========== Config Store IPC Handlers ==========

import {
  getSettings,
  setSettings,
  getSetting,
  setSetting,
  getSoftwarePresets,
  saveSoftwarePreset,
  updateSoftwarePreset,
  deleteSoftwarePreset,
  getInputPresets,
  saveInputPreset,
  updateInputPreset,
  deleteInputPreset,
  getMousePresets,
  saveMousePreset,
  updateMousePreset,
  deleteMousePreset,
  getScenes,
  saveScene,
  updateScene,
  deleteScene,
  getTriggerBindings,
  saveTriggerBinding,
  updateTriggerBinding,
  deleteTriggerBinding,
  resolveSceneIdByTrigger,
  exportConfig,
  importConfig,
  checkDependencies
} from './services/configStore'

// Settings
ipcMain.handle('get-settings', () => getSettings())

ipcMain.handle('set-settings', (_event, settings) => {
  setSettings(settings)
  return { success: true }
})

ipcMain.handle('get-setting', (_event, key: string) => {
  return getSetting(key as any)
})

ipcMain.handle('set-setting', (_event, key: string, value: unknown) => {
  setSetting(key as any, value as any)
  return { success: true }
})

// Software Presets
ipcMain.handle('get-presets', (_event, type: string) => {
  switch (type) {
    case 'software':
      return getSoftwarePresets()
      case 'input':
        return getInputPresets()
      case 'mouse':
        return getMousePresets()
      case 'scene':
        return getScenes()
    case 'trigger':
      return getTriggerBindings()
    default:
      return []
  }
})

ipcMain.handle('save-preset', (_event, type: string, preset: unknown) => {
  try {
    switch (type) {
      case 'software':
        return { success: true, preset: saveSoftwarePreset(preset as any) }
      case 'input':
        return { success: true, preset: saveInputPreset(preset as any) }
      case 'mouse':
        return { success: true, preset: saveMousePreset(preset as any) }
      case 'scene':
        return { success: true, preset: saveScene(preset as any) }
      case 'trigger':
        return { success: true, preset: saveTriggerBinding(preset as any) }
      default:
        return { success: false, error: 'Invalid preset type' }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('update-preset', (_event, type: string, id: string, updates: unknown) => {
  try {
    switch (type) {
      case 'software':
        return { success: true, preset: updateSoftwarePreset(id, updates as any) }
      case 'input':
        return { success: true, preset: updateInputPreset(id, updates as any) }
      case 'mouse':
        return { success: true, preset: updateMousePreset(id, updates as any) }
      case 'scene':
        return { success: true, preset: updateScene(id, updates as any) }
      case 'trigger':
        return { success: true, preset: updateTriggerBinding(id, updates as any) }
      default:
        return { success: false, error: 'Invalid preset type' }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('delete-preset', (_event, type: string, id: string) => {
  try {
    let success = false
    switch (type) {
      case 'software':
        success = deleteSoftwarePreset(id)
        break
      case 'input':
        success = deleteInputPreset(id)
        break
      case 'mouse':
        success = deleteMousePreset(id)
        break
      case 'scene':
        success = deleteScene(id)
        break
      case 'trigger':
        success = deleteTriggerBinding(id)
        break
    }
    return { success }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Export/Import
ipcMain.handle('export-config', (_event, modules: string[]) => {
  try {
    return { success: true, data: exportConfig(modules) }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('import-config', (_event, data: unknown, mode: string) => {
  try {
    const result = importConfig(data as any, mode as any)
    return { success: true, result }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Dependency Check
ipcMain.handle('check-scene-dependencies', (_event, scene: unknown) => {
  return checkDependencies(scene as any)
})

// ========== Execution Engine IPC Handlers ==========

import { getExecutor } from './services/executor'

// Execute command on local machine
ipcMain.handle('execute-local', async (_event, command: { type: string; presetId: string; config?: unknown }) => {
  try {
    const executor = getExecutor()
    const result = await executor.executeCommand({
      msg_type: 'COMMAND',
      sender: { id: 'local', name: 'Local', ip: '127.0.0.1' },
      payload: command as any,
      timestamp: Date.now(),
      request_id: uuidv4()
    })
    return { success: result.success, output: result.output, error: result.error, duration: result.duration }
  } catch (error) {
    return { success: false, error: String(error), duration: 0 }
  }
})

// Check if preset is running
ipcMain.handle('is-running', (_event, presetId: string) => {
  const executor = getExecutor()
  return executor.isRunning(presetId)
})

// Kill running process
ipcMain.handle('kill-process', (_event, presetId: string) => {
  const executor = getExecutor()
  return { success: executor.killProcess(presetId) }
})

// Set execution permissions
ipcMain.handle('set-whitelist', (_event, ips: string[]) => {
  const executor = getExecutor()
  executor.setWhitelist(ips)
  return { success: true }
})

ipcMain.handle('set-allow-control', (_event, allow: boolean) => {
  const executor = getExecutor()
  executor.setAllowControl(allow)
  return { success: true }
})

// ========== File Storage IPC Handlers ==========

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, statSync, copyFileSync } from 'fs'


const getDownloadDir = (): string => {
  const configuredDir = getSettings().downloads?.directory?.trim()
  const downloadDir = configuredDir || join(app.getPath('downloads'), 'ShareNet')
  if (!existsSync(downloadDir)) {
    mkdirSync(downloadDir, { recursive: true })
  }
  return downloadDir
}

const createUniqueFilePath = (directory: string, fileName: string): string => {
  const parsed = parse(fileName)
  let candidate = join(directory, fileName)
  let counter = 1

  while (existsSync(candidate)) {
    const suffix = ` (${counter})`
    candidate = join(directory, `${parsed.name}${suffix}${parsed.ext}`)
    counter += 1
  }

  return candidate
}

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false }
  }
  return { success: true, path: result.filePaths[0] }
})

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] })
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false }
  }
  return { success: true, path: result.filePaths[0] }
})

ipcMain.handle('register-shared-image', (_event, resource: SharedImageResource) => {
  try {
    if (!resource?.shareId || !resource?.filePath || !existsSync(resource.filePath)) {
      return { success: false, error: '图片原文件不存在' }
    }

    sharedImageRegistry.set(resource.shareId, {
      ...resource,
      createdAt: resource.createdAt || Date.now()
    })
    persistSharedImageRegistry()

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
// Get received files directory path
const getReceivedDir = (): string => {
  const userDataPath = app.getPath('userData')
  const receivedDir = join(userDataPath, 'received')
  if (!existsSync(receivedDir)) {
    mkdirSync(receivedDir, { recursive: true })
  }
  return receivedDir
}

// Ensure subdirectory structure
const ensureReceivedSubdir = (type: 'text' | 'image' | 'file'): string => {
  const receivedDir = getReceivedDir()
  const subDir = join(receivedDir, type)
  if (!existsSync(subDir)) {
    mkdirSync(subDir, { recursive: true })
  }
  return subDir
}

// Get received files list
ipcMain.handle('get-received-files', (_event, type?: 'text' | 'image' | 'file') => {
  try {
    const baseDir = type ? ensureReceivedSubdir(type) : getReceivedDir()
    const files: Array<{ name: string; path: string; size: number; createdAt: number; type: string }> = []

    const readDir = (dir: string) => {
      const items = readdirSync(dir)
      for (const item of items) {
        const fullPath = join(dir, item)
        const stat = statSync(fullPath)
        if (stat.isFile()) {
          files.push({
            name: item,
            path: fullPath,
            size: stat.size,
            createdAt: stat.birthtimeMs,
            type: basename(dir)
          })
        }
      }
    }

    if (type) {
      readDir(baseDir)
    } else {
      // Read all subdirectories
      const textDir = ensureReceivedSubdir('text')
      const imageDir = ensureReceivedSubdir('image')
      const fileDir = ensureReceivedSubdir('file')
      readDir(textDir)
      readDir(imageDir)
      readDir(fileDir)
    }

    return { success: true, files }
  } catch (error) {
    return { success: false, error: String(error), files: [] }
  }
})

// Save received content
ipcMain.handle('save-received', (_event, data: { type: 'text' | 'image' | 'file'; content: string; fileName?: string }) => {
  try {
    const subDir = ensureReceivedSubdir(data.type)
    const timestamp = Date.now()
    let fileName = data.fileName || `${timestamp}`

    if (data.type === 'text') {
      fileName += '.txt'
      const filePath = join(subDir, fileName)
      writeFileSync(filePath, data.content, 'utf-8')
      return { success: true, path: filePath }
    } else if (data.type === 'image') {
      // Handle base64 image data
      const base64Data = data.content.replace(/^data:image\/\w+;base64,/, '')
      const ext = data.fileName?.split('.').pop() || 'png'
      fileName = `${timestamp}.${ext}`
      const filePath = join(subDir, fileName)
      writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      return { success: true, path: filePath }
    } else {
      // File type - content should be a file path or buffer
      fileName = data.fileName || `file-${timestamp}`
      const filePath = join(subDir, fileName)
      if (typeof data.content === 'string' && existsSync(data.content)) {
        copyFileSync(data.content, filePath)
      } else if (typeof data.content === 'string' && data.content.startsWith('data:')) {
        const base64Data = data.content.replace(/^data:.*?;base64,/, '')
        writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      }
      return { success: true, path: filePath }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Delete received file
ipcMain.handle('delete-received', (_event, filePath: string) => {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
      return { success: true }
    }
    return { success: false, error: 'File not found' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Open received file location
ipcMain.handle('open-received-location', () => {
  const receivedDir = getReceivedDir()
  shell.openPath(receivedDir)
  return { success: true }
})

ipcMain.handle('reveal-file', (_event, filePath: string) => {
  try {
    if (!filePath || !existsSync(filePath)) {
      return { success: false, error: 'File not found' }
    }

    shell.showItemInFolder(filePath)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('register-shared-file', (_event, resource: SharedFileResource) => {
  try {
    if (!resource?.shareId || !resource?.filePath || !existsSync(resource.filePath)) {
      return { success: false, error: '文件原文件不存在' }
    }

    sharedFileRegistry.set(resource.shareId, {
      ...resource,
      createdAt: resource.createdAt || Date.now()
    })
    persistSharedFileRegistry()

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Get storage usage
ipcMain.handle('get-storage-usage', () => {
  try {
    const receivedDir = getReceivedDir()
    let totalSize = 0
    let fileCount = 0

    const calculateSize = (dir: string) => {
      const items = readdirSync(dir)
      for (const item of items) {
        const fullPath = join(dir, item)
        const stat = statSync(fullPath)
        if (stat.isFile()) {
          totalSize += stat.size
          fileCount++
        }
      }
    }

    calculateSize(join(receivedDir, 'text'))
    calculateSize(join(receivedDir, 'image'))
    calculateSize(join(receivedDir, 'file'))

    return {
      success: true,
      usage: {
        totalSize,
        fileCount,
        formatted: formatBytes(totalSize)
      }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

// Helper function
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Handle incoming TCP command messages
ipcMain.on('subscribe-execution-events', (event) => {
  const executor = getExecutor()

  executor.on('execution-started', (data) => {
    event.sender.send('execution-started', data)
  })

  executor.on('execution-complete', (data) => {
    event.sender.send('execution-complete', data)
  })

  executor.on('execution-error', (data) => {
    event.sender.send('execution-error', data)
  })
})

log.info('主进程初始化完成')











