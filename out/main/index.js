"use strict";
const electron = require("electron");
const path = require("path");
const os = require("os");
const log = {
  info: (...args) => console.log("[INFO]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
  warn: (...args) => console.warn("[WARN]", ...args)
};
process.on("uncaughtException", (error) => {
  log.error("Uncaught Exception:", error);
  electron.app.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled Rejection at:", promise, "reason:", reason);
});
log.info("=== ShareNet 启动 ===");
log.info("App version:", electron.app.getVersion());
log.info("Electron version:", process.versions.electron);
log.info("Node version:", process.versions.node);
let mainWindow = null;
function createWindow() {
  log.info("创建主窗口...");
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    title: "ShareNet - 局域网通讯工具",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    log.info("主窗口已显示");
  });
  const menuTemplate = [
    {
      label: "文件",
      submenu: [
        { label: "设置", click: () => mainWindow?.webContents.send("open-settings") },
        { type: "separator" },
        { label: "退出", role: "quit" }
      ]
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" }
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "关于",
          click: () => mainWindow?.webContents.send("show-about")
        },
        {
          label: "文档",
          click: async () => {
            await electron.shell.openExternal("https://github.com/sharenet");
          }
        }
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(menuTemplate);
  electron.Menu.setApplicationMenu(menu);
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    log.info("主窗口关闭");
    mainWindow = null;
  });
  mainWindow.webContents.on("did-finish-load", () => {
    log.info("页面加载完成");
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    log.error("页面加载失败:", errorCode, errorDescription);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
}
electron.app.whenReady().then(() => {
  log.info("应用就绪");
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  log.info("所有窗口关闭");
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  log.info("=== ShareNet 关闭 ===");
});
electron.ipcMain.handle("get-app-info", () => {
  return {
    name: electron.app.getName(),
    version: electron.app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform
  };
});
electron.ipcMain.handle("get-user-data-path", () => {
  return electron.app.getPath("userData");
});
electron.ipcMain.handle("get-local-ip", () => {
  const interfaces = os.networkInterfaces() || {};
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
});
electron.ipcMain.handle("get-hostname", () => {
  return os.hostname();
});
log.info("主进程初始化完成");
