/**
 * ShareNet - Main Process Entry
 * 局域网通讯与控制工具
 */

import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import { join } from 'path'
import os from 'os'

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

log.info('主进程初始化完成')