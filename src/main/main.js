/**
 * ShareNet - 主进程入口
 * 局域网通讯与控制工具
 */

const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const log = require('electron-log');

// 配置日志
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.console.level = 'debug';

// 捕获未处理的异常
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  app.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

log.info('=== ShareNet 启动 ===');
log.info('App version:', app.getVersion());
log.info('Electron version:', process.versions.electron);
log.info('Node version:', process.versions.node);

let mainWindow = null;

function createWindow() {
  log.info('创建主窗口...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ShareNet - 局域网通讯工具',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 创建菜单
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        { label: '设置', click: () => mainWindow.webContents.send('open-settings') },
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
        { label: '关于', click: () => mainWindow.webContents.send('show-about') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // 加载页面
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    log.info('主窗口关闭');
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('页面加载完成');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('页面加载失败:', errorCode, errorDescription);
  });
}

// 应用就绪
app.whenReady().then(() => {
  log.info('应用就绪');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 窗口全部关闭
app.on('window-all-closed', () => {
  log.info('所有窗口关闭');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('=== ShareNet 关闭 ===');
});

// IPC 处理器 - 获取应用信息
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform
  };
});

// IPC 处理器 - 获取用户数据路径
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

// IPC 处理器 - 获取本地 IP
ipcMain.handle('get-local-ip', () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
});

log.info('主进程初始化完成');