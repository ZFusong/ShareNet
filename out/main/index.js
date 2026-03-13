"use strict";
const electron = require("electron");
const os = require("os");
const dgram = require("dgram");
const events = require("events");
const uuid = require("uuid");
const net = require("net");
const Store = require("electron-store");
const child_process = require("child_process");
const path = require("path");
const fs = require("fs");
const DEFAULT_CONFIG$1 = {
  port: 8888,
  broadcastInterval: 5e3,
  // 5 seconds
  heartbeatInterval: 5e3,
  // 5 seconds
  offlineThreshold: 15e3
  // 15 seconds
};
class UDPService extends events.EventEmitter {
  socket = null;
  config;
  deviceList = /* @__PURE__ */ new Map();
  localDevice = null;
  broadcastTimer = null;
  heartbeatTimer = null;
  cleanupTimer = null;
  isRunning = false;
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG$1, ...config };
  }
  /**
   * Initialize local device info
   */
  async initialize(localInfo) {
    const localIP = this.getLocalIP();
    const hostname = os.hostname();
    this.localDevice = {
      id: localInfo.id || uuid.v4(),
      name: localInfo.name || hostname,
      ip: localIP,
      port: this.config.port,
      role: localInfo.role || "bidirectional",
      tags: localInfo.tags || [],
      status: "online",
      lastSeen: Date.now(),
      avatar: localInfo.avatar
    };
    return this.localDevice;
  }
  /**
   * Get local IP address
   */
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "127.0.0.1";
  }
  /**
   * Start UDP service
   */
  async start() {
    if (this.isRunning) {
      console.log("[UDP] Service already running");
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
        this.socket.on("error", (err) => {
          console.error("[UDP] Socket error:", err);
          this.emit("error", err);
        });
        this.socket.on("message", (msg, rinfo) => {
          this.handleMessage(msg, rinfo);
        });
        this.socket.on("listening", () => {
          const address = this.socket?.address();
          console.log(`[UDP] Listening on ${address?.address}:${address?.port}`);
          this.socket?.setBroadcast(true);
          this.isRunning = true;
          this.startBroadcasting();
          this.startHeartbeat();
          this.startCleanup();
          this.emit("ready");
          resolve();
        });
        this.socket.bind(this.config.port);
      } catch (error) {
        reject(error);
      }
    });
  }
  /**
   * Stop UDP service
   */
  async stop() {
    if (!this.isRunning) return;
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.socket) {
      return new Promise((resolve) => {
        this.socket?.close(() => {
          console.log("[UDP] Service stopped");
          this.socket = null;
          this.isRunning = false;
          this.emit("stopped");
          resolve();
        });
      });
    }
  }
  /**
   * Start broadcasting device info
   */
  startBroadcasting() {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
    }
    this.broadcastDiscovery();
    this.broadcastTimer = setInterval(() => {
      this.broadcastDiscovery();
    }, this.config.broadcastInterval);
  }
  /**
   * Send discovery broadcast
   */
  broadcastDiscovery() {
    if (!this.socket || !this.localDevice) return;
    const message = {
      msg_type: "DISCOVERY",
      sender: this.localDevice,
      payload: {
        version: "1.0.0",
        capabilities: ["control", "share"]
      },
      timestamp: Date.now(),
      request_id: uuid.v4()
    };
    const broadcastAddress = this.getBroadcastAddress();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    this.socket.send(messageBuffer, this.config.port, broadcastAddress, (err) => {
      if (err) {
        console.error("[UDP] Broadcast error:", err);
      }
    });
  }
  /**
   * Get broadcast address for local network
   */
  getBroadcastAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal && iface.netmask) {
          const ipParts = iface.address.split(".").map(Number);
          const maskParts = iface.netmask.split(".").map(Number);
          const broadcastParts = ipParts.map((ip, i) => ip | ~maskParts[i] & 255);
          return broadcastParts.join(".");
        }
      }
    }
    return "255.255.255.255";
  }
  /**
   * Start heartbeat timer
   */
  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }
  /**
   * Send heartbeat message
   */
  sendHeartbeat() {
    if (!this.socket || !this.localDevice) return;
    const message = {
      msg_type: "HEARTBEAT",
      sender: this.localDevice,
      payload: {
        status: "online"
      },
      timestamp: Date.now(),
      request_id: uuid.v4()
    };
    const broadcastAddress = this.getBroadcastAddress();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    this.socket.send(messageBuffer, this.config.port, broadcastAddress, (err) => {
      if (err) {
        console.error("[UDP] Heartbeat error:", err);
      }
    });
  }
  /**
   * Start cleanup timer to remove offline devices
   */
  startCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanupOfflineDevices();
    }, 5e3);
  }
  /**
   * Clean up offline devices
   */
  cleanupOfflineDevices() {
    const now = Date.now();
    const offlineDevices = [];
    for (const [id, device] of this.deviceList) {
      if (now - device.lastSeen > this.config.offlineThreshold) {
        offlineDevices.push(device);
        this.deviceList.delete(id);
      }
    }
    if (offlineDevices.length > 0) {
      console.log(`[UDP] Removed ${offlineDevices.length} offline devices`);
      this.emit("devicesRemoved", offlineDevices);
      this.emit("devicesUpdated", this.getDeviceList());
    }
  }
  /**
   * Handle incoming UDP message
   */
  handleMessage(msg, rinfo) {
    try {
      const message = JSON.parse(msg.toString());
      if (this.localDevice && message.sender.ip === this.localDevice.ip) {
        return;
      }
      switch (message.msg_type) {
        case "DISCOVERY":
          this.handleDiscovery(message);
          break;
        case "HEARTBEAT":
          this.handleHeartbeat(message);
          break;
        default:
          console.log("[UDP] Unknown message type:", message.msg_type);
      }
    } catch (error) {
      console.error("[UDP] Failed to parse message:", error);
    }
  }
  /**
   * Handle discovery message
   */
  handleDiscovery(message) {
    const device = message.sender;
    const existingDevice = this.deviceList.get(device.id);
    if (existingDevice) {
      existingDevice.lastSeen = Date.now();
      existingDevice.status = "online";
      this.emit("deviceUpdated", existingDevice);
    } else {
      device.lastSeen = Date.now();
      device.status = "online";
      this.deviceList.set(device.id, device);
      this.emit("deviceAdded", device);
    }
    this.emit("devicesUpdated", this.getDeviceList());
  }
  /**
   * Handle heartbeat message
   */
  handleHeartbeat(message) {
    const device = message.sender;
    const existingDevice = this.deviceList.get(device.id);
    if (existingDevice) {
      existingDevice.lastSeen = Date.now();
      existingDevice.status = message.payload.status || "online";
      this.emit("deviceUpdated", existingDevice);
      this.emit("devicesUpdated", this.getDeviceList());
    }
  }
  /**
   * Get device list
   */
  getDeviceList() {
    return Array.from(this.deviceList.values());
  }
  /**
   * Get device by ID
   */
  getDevice(id) {
    return this.deviceList.get(id);
  }
  /**
   * Get local device info
   */
  getLocalDevice() {
    return this.localDevice;
  }
  /**
   * Update local device info
   */
  updateLocalDevice(info) {
    if (this.localDevice) {
      this.localDevice = { ...this.localDevice, ...info };
      this.broadcastDiscovery();
    }
  }
  /**
   * Update configuration
   */
  updateConfig(config) {
    const wasRunning = this.isRunning;
    this.config = { ...this.config, ...config };
    if (wasRunning) {
      this.stop().then(() => this.start());
    }
  }
  /**
   * Get current config
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Check if service is running
   */
  isActive() {
    return this.isRunning;
  }
  /**
   * Manually add a device (for manual IP addition)
   */
  addDevice(device) {
    device.lastSeen = Date.now();
    device.status = "online";
    this.deviceList.set(device.id, device);
    this.emit("deviceAdded", device);
    this.emit("devicesUpdated", this.getDeviceList());
  }
  /**
   * Remove a device
   */
  removeDevice(id) {
    const device = this.deviceList.get(id);
    if (device) {
      this.deviceList.delete(id);
      this.emit("devicesRemoved", [device]);
      this.emit("devicesUpdated", this.getDeviceList());
      return true;
    }
    return false;
  }
}
let udpServiceInstance = null;
function getUDPService(config) {
  if (!udpServiceInstance) {
    udpServiceInstance = new UDPService(config);
  }
  return udpServiceInstance;
}
const DEFAULT_CONFIG = {
  port: 8889,
  maxConnections: 50,
  timeout: 3e4
  // 30 seconds
};
class TCPServer extends events.EventEmitter {
  server = null;
  config;
  clients = /* @__PURE__ */ new Map();
  messageHandlers = [];
  isRunning = false;
  constructor(config = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * Register message handler
   */
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }
  /**
   * Remove message handler
   */
  offMessage(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }
  /**
   * Start TCP server
   */
  async start() {
    if (this.isRunning) {
      console.log("[TCP] Server already running");
      return;
    }
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });
      this.server.on("error", (err) => {
        console.error("[TCP] Server error:", err);
        this.emit("error", err);
        reject(err);
      });
      this.server.on("listening", () => {
        const address = this.server?.address();
        console.log(`[TCP] Listening on ${address instanceof net.AddressInfo ? address.address : "0.0.0.0"}:${address instanceof net.AddressInfo ? address.port : this.config.port}`);
        this.isRunning = true;
        this.emit("ready");
        resolve();
      });
      this.server.on("close", () => {
        console.log("[TCP] Server closed");
        this.isRunning = false;
        this.emit("stopped");
      });
      this.server.maxConnections = this.config.maxConnections;
      this.server.listen(this.config.port, "0.0.0.0");
    });
  }
  /**
   * Stop TCP server
   */
  async stop() {
    if (!this.isRunning || !this.server) return;
    for (const [id, client2] of this.clients) {
      client2.socket.destroy();
    }
    this.clients.clear();
    return new Promise((resolve) => {
      this.server?.close(() => {
        this.server = null;
        this.isRunning = false;
        resolve();
      });
    });
  }
  /**
   * Handle incoming connection
   */
  handleConnection(socket) {
    const clientId = uuid.v4();
    console.log(`[TCP] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
    socket.setTimeout(this.config.timeout);
    const client2 = {
      id: clientId,
      device: {
        id: "",
        name: "Unknown",
        ip: socket.remoteAddress || "",
        port: 0,
        role: "controlled",
        tags: [],
        status: "online",
        lastSeen: Date.now()
      },
      socket,
      lastActive: Date.now()
    };
    socket.on("data", (data) => {
      this.handleData(client2, data);
    });
    socket.on("close", () => {
      this.handleClose(client2);
    });
    socket.on("error", (err) => {
      console.error(`[TCP] Socket error for ${clientId}:`, err);
      this.handleClose(client2);
    });
    socket.on("timeout", () => {
      console.log(`[TCP] Connection timeout: ${clientId}`);
      socket.destroy();
    });
    this.clients.set(clientId, client2);
    this.emit("clientConnected", client2);
  }
  /**
   * Handle incoming data
   */
  handleData(client2, data) {
    client2.lastActive = Date.now();
    try {
      const messages = data.toString().split("\n").filter(Boolean);
      for (const msgStr of messages) {
        const message = JSON.parse(msgStr);
        if (message.msg_type === "ACK" && message.payload.original_request_id) {
          const ackPayload = message.payload;
          for (const handler of this.messageHandlers) {
            if (handler.onAck) {
              handler.onAck(ackPayload.original_request_id, ackPayload.status, ackPayload.message);
            }
          }
          this.emit("ack", ackPayload.original_request_id, ackPayload.status, ackPayload.message);
          continue;
        }
        if (message.msg_type === "DISCOVERY") {
          client2.device = message.sender;
          this.emit("deviceIdentified", client2);
        }
        for (const handler of this.messageHandlers) {
          handler.onMessage(message, client2.device);
        }
        this.emit("message", message, client2.device);
      }
    } catch (error) {
      console.error("[TCP] Failed to parse message:", error);
    }
  }
  /**
   * Handle connection close
   */
  handleClose(client2) {
    this.clients.delete(client2.id);
    console.log(`[TCP] Connection closed: ${client2.id}`);
    this.emit("clientDisconnected", client2);
    for (const handler of this.messageHandlers) {
      if (handler.onDisconnect) {
        handler.onDisconnect(client2.device);
      }
    }
  }
  /**
   * Send message to a specific client
   */
  sendMessage(targetIP, message) {
    return new Promise((resolve) => {
      const client2 = Array.from(this.clients.values()).find(
        (c) => c.device.ip === targetIP
      );
      if (!client2) {
        console.log(`[TCP] Client not found: ${targetIP}`);
        resolve(false);
        return;
      }
      const data = JSON.stringify(message) + "\n";
      client2.socket.write(data, (err) => {
        if (err) {
          console.error(`[TCP] Failed to send to ${targetIP}:`, err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(message) {
    return new Promise((resolve) => {
      let successCount = 0;
      const data = JSON.stringify(message) + "\n";
      const sendPromises = Array.from(this.clients.values()).map((client2) => {
        return new Promise((res) => {
          client2.socket.write(data, (err) => {
            if (!err) successCount++;
            res();
          });
        });
      });
      Promise.all(sendPromises).then(() => resolve(successCount));
    });
  }
  /**
   * Connect to a remote TCP server
   */
  async connectTo(host, port, deviceInfo) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const clientId = uuid.v4();
      socket.connect(port, host, () => {
        console.log(`[TCP] Connected to ${host}:${port}`);
        const client2 = {
          id: clientId,
          device: { ...deviceInfo, ip: host },
          socket,
          lastActive: Date.now()
        };
        this.clients.set(clientId, client2);
        const discoveryMsg = {
          msg_type: "DISCOVERY",
          sender: deviceInfo,
          payload: { version: "1.0.0", capabilities: ["control", "share"] },
          timestamp: Date.now(),
          request_id: uuid.v4()
        };
        socket.write(JSON.stringify(discoveryMsg) + "\n");
        this.emit("connected", client2);
        resolve(clientId);
      });
      socket.on("error", (err) => {
        console.error(`[TCP] Connection error to ${host}:${port}:`, err);
        resolve(null);
      });
      socket.on("close", () => {
        const client2 = this.clients.get(clientId);
        if (client2) {
          this.clients.delete(clientId);
          this.emit("disconnected", client2);
        }
      });
      socket.on("data", (data) => {
        this.handleData(client, data);
      });
    });
  }
  /**
   * Get all connected clients
   */
  getClients() {
    return Array.from(this.clients.values());
  }
  /**
   * Get client by ID
   */
  getClient(id) {
    return this.clients.get(id);
  }
  /**
   * Get client by IP
   */
  getClientByIP(ip) {
    return Array.from(this.clients.values()).find((c) => c.device.ip === ip);
  }
  /**
   * Send ACK message to a client
   */
  sendAck(targetIP, originalRequestId, status, message) {
    const ackMessage = {
      msg_type: "ACK",
      sender: {
        id: "",
        name: "Local",
        ip: "0.0.0.0",
        port: this.config.port,
        role: "bidirectional",
        tags: [],
        status: "online",
        lastSeen: Date.now()
      },
      payload: {
        original_request_id: originalRequestId,
        status,
        message
      },
      timestamp: Date.now(),
      request_id: uuid.v4()
    };
    return this.sendMessage(targetIP, ackMessage);
  }
  /**
   * Broadcast ACK message
   */
  broadcastAck(originalRequestId, status, message) {
    const ackMessage = {
      msg_type: "ACK",
      sender: {
        id: "",
        name: "Local",
        ip: "0.0.0.0",
        port: this.config.port,
        role: "bidirectional",
        tags: [],
        status: "online",
        lastSeen: Date.now()
      },
      payload: {
        original_request_id: originalRequestId,
        status,
        message
      },
      timestamp: Date.now(),
      request_id: uuid.v4()
    };
    return this.broadcastMessage(ackMessage);
  }
  /**
   * Disconnect a client
   */
  disconnect(id) {
    const client2 = this.clients.get(id);
    if (client2) {
      client2.socket.destroy();
      return true;
    }
    return false;
  }
  /**
   * Update configuration
   */
  updateConfig(config) {
    const wasRunning = this.isRunning;
    this.config = { ...this.config, ...config };
    if (wasRunning) {
      this.stop().then(() => this.start());
    }
  }
  /**
   * Get current config
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Check if server is running
   */
  isActive() {
    return this.isRunning;
  }
  /**
   * Get connection count
   */
  getConnectionCount() {
    return this.clients.size;
  }
}
let tcpServerInstance = null;
function getTCPServer(config) {
  if (!tcpServerInstance) {
    tcpServerInstance = new TCPServer(config);
  }
  return tcpServerInstance;
}
const defaultSettings = {
  device: {
    name: "",
    role: "bidirectional",
    tags: []
  },
  network: {
    udpPort: 8888,
    tcpPort: 8889,
    broadcastInterval: 5e3
  },
  security: {
    allowControl: true,
    whitelist: [],
    confirmMode: true
  },
  ui: {
    theme: "system",
    logLevel: "info"
  }
};
const store = new Store({
  name: "sharenet-config",
  defaults: {
    settings: defaultSettings,
    "software-presets": [],
    "input-presets": [],
    scenes: [],
    offlineDevices: {}
  }
});
function getSettings() {
  return store.get("settings", defaultSettings);
}
function setSettings(settings) {
  const current = getSettings();
  store.set("settings", { ...current, ...settings });
}
function getSetting(key) {
  return getSettings()[key];
}
function setSetting(key, value) {
  const current = getSettings();
  store.set("settings", { ...current, [key]: value });
}
function getSoftwarePresets() {
  return store.get("software-presets", []);
}
function saveSoftwarePreset(preset) {
  const presets = getSoftwarePresets();
  const now = Date.now();
  const newPreset = {
    ...preset,
    id: `sw-${now}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  };
  presets.push(newPreset);
  store.set("software-presets", presets);
  return newPreset;
}
function updateSoftwarePreset(id, updates) {
  const presets = getSoftwarePresets();
  const index = presets.findIndex((p) => p.id === id);
  if (index === -1) return null;
  presets[index] = {
    ...presets[index],
    ...updates,
    updatedAt: Date.now()
  };
  store.set("software-presets", presets);
  return presets[index];
}
function deleteSoftwarePreset(id) {
  const presets = getSoftwarePresets();
  const filtered = presets.filter((p) => p.id !== id);
  if (filtered.length === presets.length) return false;
  store.set("software-presets", filtered);
  return true;
}
function getInputPresets() {
  return store.get("input-presets", []);
}
function saveInputPreset(preset) {
  const presets = getInputPresets();
  const now = Date.now();
  const newPreset = {
    ...preset,
    id: `ip-${now}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  };
  presets.push(newPreset);
  store.set("input-presets", presets);
  return newPreset;
}
function updateInputPreset(id, updates) {
  const presets = getInputPresets();
  const index = presets.findIndex((p) => p.id === id);
  if (index === -1) return null;
  presets[index] = {
    ...presets[index],
    ...updates,
    updatedAt: Date.now()
  };
  store.set("input-presets", presets);
  return presets[index];
}
function deleteInputPreset(id) {
  const presets = getInputPresets();
  const filtered = presets.filter((p) => p.id !== id);
  if (filtered.length === presets.length) return false;
  store.set("input-presets", filtered);
  return true;
}
function getScenes() {
  return store.get("scenes", []);
}
function saveScene(scene) {
  const scenes = getScenes();
  const now = Date.now();
  const newScene = {
    ...scene,
    id: `sc-${now}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: now,
    updatedAt: now
  };
  scenes.push(newScene);
  store.set("scenes", scenes);
  return newScene;
}
function updateScene(id, updates) {
  const scenes = getScenes();
  const index = scenes.findIndex((s) => s.id === id);
  if (index === -1) return null;
  scenes[index] = {
    ...scenes[index],
    ...updates,
    updatedAt: Date.now()
  };
  store.set("scenes", scenes);
  return scenes[index];
}
function deleteScene(id) {
  const scenes = getScenes();
  const filtered = scenes.filter((s) => s.id !== id);
  if (filtered.length === scenes.length) return false;
  store.set("scenes", filtered);
  return true;
}
function exportConfig(modules) {
  const data = {
    exportMeta: {
      version: "1.0.0",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exportedBy: getSettings().device.name || "ShareNet",
      modules,
      itemCount: {}
    },
    data: {}
  };
  if (modules.includes("software-presets")) {
    data.data["software-presets"] = getSoftwarePresets();
    data.exportMeta.itemCount = {
      ...data.exportMeta.itemCount,
      "software-presets": getSoftwarePresets().length
    };
  }
  if (modules.includes("input-presets")) {
    data.data["input-presets"] = getInputPresets();
    data.exportMeta.itemCount = {
      ...data.exportMeta.itemCount,
      "input-presets": getInputPresets().length
    };
  }
  if (modules.includes("scenes")) {
    data.data["scenes"] = getScenes();
    data.exportMeta.itemCount = {
      ...data.exportMeta.itemCount,
      scenes: getScenes().length
    };
  }
  return data;
}
function importConfig(config, mode) {
  const result = {
    success: true,
    imported: {},
    errors: [],
    conflicts: []
  };
  if (config.data["software-presets"] && Array.isArray(config.data["software-presets"])) {
    const imported = importPresets(
      config.data["software-presets"],
      getSoftwarePresets(),
      mode,
      "software-presets"
    );
    result.imported["software-presets"] = imported.count;
    result.errors.push(...imported.errors);
    result.conflicts.push(...imported.conflicts);
    store.set("software-presets", imported.items);
  }
  if (config.data["input-presets"] && Array.isArray(config.data["input-presets"])) {
    const imported = importPresets(
      config.data["input-presets"],
      getInputPresets(),
      mode,
      "input-presets"
    );
    result.imported["input-presets"] = imported.count;
    result.errors.push(...imported.errors);
    result.conflicts.push(...imported.conflicts);
    store.set("input-presets", imported.items);
  }
  if (config.data["scenes"] && Array.isArray(config.data["scenes"])) {
    const imported = importPresets(
      config.data["scenes"],
      getScenes(),
      mode,
      "scenes"
    );
    result.imported["scenes"] = imported.count;
    result.errors.push(...imported.errors);
    result.conflicts.push(...imported.conflicts);
    store.set("scenes", imported.items);
  }
  result.success = result.errors.length === 0;
  return result;
}
function importPresets(items, existing, mode, type) {
  const result = {
    items: [...existing],
    count: 0,
    errors: [],
    conflicts: []
  };
  for (const item of items) {
    try {
      const existingIndex = existing.findIndex((e) => e.id === item.id);
      if (mode === "append") {
        if (existingIndex === -1) {
          const nameExists = existing.some((e) => e.name === item.name);
          if (nameExists) {
            result.conflicts.push({
              type,
              oldName: item.name,
              newName: `${item.name}-1`
            });
            result.items.push({ ...item, name: `${item.name}-1` });
          } else {
            result.items.push(item);
          }
          result.count++;
        }
      } else if (mode === "overwrite") {
        if (existingIndex !== -1) {
          result.items[existingIndex] = item;
        } else {
          result.items.push(item);
        }
        result.count++;
      } else if (mode === "merge") {
        if (existingIndex === -1) {
          result.items.push(item);
          result.count++;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to import ${type} "${item.name}": ${error}`);
    }
  }
  return result;
}
function checkDependencies(scene) {
  const missing = [];
  const softwarePresets = getSoftwarePresets();
  const inputPresets = getInputPresets();
  for (const presetId of scene.softwarePresetIds) {
    if (!softwarePresets.find((p) => p.id === presetId)) {
      missing.push(`软件预设: ${presetId}`);
    }
  }
  for (const presetId of scene.inputPresetIds) {
    if (!inputPresets.find((p) => p.id === presetId)) {
      missing.push(`键鼠预设: ${presetId}`);
    }
  }
  return {
    valid: missing.length === 0,
    missing
  };
}
const runningProcesses = /* @__PURE__ */ new Map();
class ExecutionEngine extends events.EventEmitter {
  whitelist = [];
  allowControl = true;
  /**
   * Set whitelist
   */
  setWhitelist(ips) {
    this.whitelist = ips;
  }
  /**
   * Set allow control flag
   */
  setAllowControl(allow) {
    this.allowControl = allow;
  }
  /**
   * Check if sender is allowed
   */
  isAllowed(senderIP) {
    if (this.whitelist.length === 0) {
      return this.allowControl;
    }
    return this.whitelist.includes(senderIP);
  }
  /**
   * Execute command from remote device
   */
  async executeCommand(command) {
    const senderIP = command.sender.ip;
    if (!this.isAllowed(senderIP)) {
      return {
        success: false,
        error: "Permission denied: sender not in whitelist",
        duration: 0
      };
    }
    const { type, presetId, config } = command.payload;
    const startTime = Date.now();
    try {
      switch (type) {
        case "software":
          return await this.executeSoftware(presetId, config, startTime);
        case "input":
          return await this.executeInput(presetId, startTime);
        case "scene":
          return await this.executeScene(presetId, startTime);
        default:
          return {
            success: false,
            error: `Unknown command type: ${type}`,
            duration: Date.now() - startTime
          };
      }
    } catch (error) {
      return {
        success: false,
        error: String(error),
        duration: Date.now() - startTime
      };
    }
  }
  /**
   * Execute software preset
   */
  async executeSoftware(presetId, config, startTime) {
    const presets = getSoftwarePresets();
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) {
      return { success: false, error: "Software preset not found", duration: 0 };
    }
    if (runningProcesses.has(presetId)) {
      return { success: false, error: "Software already running", duration: 0 };
    }
    const workDir = config?.workDir || preset.workDir || path.dirname(preset.path);
    const args = config?.args ? config.args.toString().split(" ") : preset.args ? preset.args.split(" ") : [];
    return new Promise((resolve) => {
      try {
        const proc = child_process.spawn(preset.path, args, {
          cwd: workDir,
          detached: true,
          stdio: "ignore"
        });
        const id = `${presetId}-${Date.now()}`;
        runningProcesses.set(id, proc);
        proc.unref();
        proc.on("error", (error) => {
          runningProcesses.delete(id);
          this.emit("execution-error", { presetId, error: error.message });
          resolve({ success: false, error: error.message, duration: Date.now() - (startTime || Date.now()) });
        });
        proc.on("exit", (code) => {
          runningProcesses.delete(id);
          this.emit("execution-complete", { presetId, exitCode: code });
          resolve({
            success: code === 0,
            output: `Process exited with code ${code}`,
            duration: Date.now() - (startTime || Date.now())
          });
        });
        setTimeout(() => {
          if (runningProcesses.has(id)) {
            runningProcesses.delete(id);
            this.emit("execution-complete", { presetId, exitCode: 0 });
            resolve({
              success: true,
              output: "Software started (background)",
              duration: Date.now() - (startTime || Date.now())
            });
          }
        }, 3e4);
        this.emit("execution-started", { presetId, type: "software" });
      } catch (error) {
        resolve({ success: false, error: String(error), duration: 0 });
      }
    });
  }
  /**
   * Execute input preset (keyboard/mouse)
   */
  async executeInput(presetId, startTime) {
    const presets = getInputPresets();
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) {
      return { success: false, error: "Input preset not found", duration: 0 };
    }
    try {
      for (const step of preset.steps) {
        await this.executeInputStep(step);
      }
      this.emit("execution-complete", { presetId, type: "input" });
      return {
        success: true,
        output: `Executed ${preset.steps.length} steps`,
        duration: Date.now() - (startTime || Date.now())
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        duration: Date.now() - (startTime || Date.now())
      };
    }
  }
  /**
   * Execute a single input step
   */
  async executeInputStep(step) {
    if (step.type === "delay") {
      const delay = step.data.delay || 1e3;
      return new Promise((resolve) => setTimeout(resolve, delay));
    }
    console.log("[Executor] Input step:", step.type, step.data);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  /**
   * Execute scene
   */
  async executeScene(presetId, startTime) {
    const softwarePresets = getSoftwarePresets();
    if (softwarePresets.find((p) => p.id === presetId)) {
      return this.executeSoftware(presetId, void 0, startTime);
    }
    const inputPresets = getInputPresets();
    if (inputPresets.find((p) => p.id === presetId)) {
      return this.executeInput(presetId, startTime);
    }
    return { success: false, error: "Scene not found", duration: 0 };
  }
  /**
   * Check if a process is running
   */
  isRunning(presetId) {
    return Array.from(runningProcesses.values()).some((proc) => !proc.killed);
  }
  /**
   * Kill a running process
   */
  killProcess(presetId) {
    for (const [id, proc] of runningProcesses) {
      if (id.startsWith(presetId)) {
        proc.kill();
        runningProcesses.delete(id);
        return true;
      }
    }
    return false;
  }
  /**
   * Kill all processes
   */
  killAll() {
    for (const proc of runningProcesses.values()) {
      proc.kill();
    }
    runningProcesses.clear();
  }
}
let executorInstance = null;
function getExecutor() {
  if (!executorInstance) {
    executorInstance = new ExecutionEngine();
  }
  return executorInstance;
}
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
let udpService = null;
electron.ipcMain.handle("udp-start", async (_event, config) => {
  try {
    udpService = getUDPService(config);
    await udpService.start();
    log.info("UDP service started");
    return { success: true };
  } catch (error) {
    log.error("Failed to start UDP service:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("udp-stop", async () => {
  try {
    if (udpService) {
      await udpService.stop();
      udpService = null;
    }
    return { success: true };
  } catch (error) {
    log.error("Failed to stop UDP service:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("udp-get-devices", () => {
  if (!udpService) return [];
  return udpService.getDeviceList();
});
electron.ipcMain.handle("udp-get-local-device", () => {
  if (!udpService) return null;
  return udpService.getLocalDevice();
});
electron.ipcMain.handle("udp-init-local-device", async (_event, deviceInfo) => {
  if (!udpService) {
    udpService = getUDPService();
  }
  try {
    const device = await udpService.initialize(deviceInfo);
    return { success: true, device };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("udp-update-local-device", (_event, info) => {
  if (!udpService) return { success: false, error: "UDP service not running" };
  udpService.updateLocalDevice(info);
  return { success: true };
});
electron.ipcMain.handle("udp-add-device", (_event, device) => {
  if (!udpService) return { success: false, error: "UDP service not running" };
  udpService.addDevice(device);
  return { success: true };
});
electron.ipcMain.handle("udp-remove-device", (_event, id) => {
  if (!udpService) return { success: false, error: "UDP service not running" };
  return { success: udpService.removeDevice(id) };
});
electron.ipcMain.handle("udp-get-config", () => {
  if (!udpService) return null;
  return udpService.getConfig();
});
electron.ipcMain.handle("udp-update-config", (_event, config) => {
  if (!udpService) return { success: false, error: "UDP service not running" };
  udpService.updateConfig(config);
  return { success: true };
});
electron.ipcMain.on("udp-subscribe", (event) => {
  if (!udpService) return;
  const sendDevicesUpdate = () => {
    event.sender.send("udp-devices-updated", udpService?.getDeviceList() || []);
  };
  udpService.on("devicesUpdated", sendDevicesUpdate);
  udpService.on("deviceAdded", (device) => {
    event.sender.send("udp-device-added", device);
  });
  udpService.on("deviceUpdated", (device) => {
    event.sender.send("udp-device-updated", device);
  });
  udpService.on("devicesRemoved", (devices) => {
    event.sender.send("udp-devices-removed", devices);
  });
});
let tcpServer = null;
electron.ipcMain.handle("tcp-start", async (_event, config) => {
  try {
    tcpServer = getTCPServer(config);
    tcpServer.on("message", (message, from) => {
      mainWindow?.webContents.send("tcp-message", message, from);
    });
    await tcpServer.start();
    log.info("TCP server started");
    return { success: true };
  } catch (error) {
    log.error("Failed to start TCP server:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("tcp-stop", async () => {
  try {
    if (tcpServer) {
      await tcpServer.stop();
      tcpServer = null;
    }
    return { success: true };
  } catch (error) {
    log.error("Failed to stop TCP server:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("tcp-send", async (_event, targetIP, message) => {
  if (!tcpServer) return { success: false, error: "TCP server not running" };
  const fullMessage = {
    ...message,
    timestamp: Date.now(),
    request_id: uuid.v4()
  };
  const success = await tcpServer.sendMessage(targetIP, fullMessage);
  return { success };
});
electron.ipcMain.handle("tcp-broadcast", async (_event, message) => {
  if (!tcpServer) return { success: false, error: "TCP server not running" };
  const fullMessage = {
    ...message,
    timestamp: Date.now(),
    request_id: uuid.v4()
  };
  const count = await tcpServer.broadcastMessage(fullMessage);
  return { success: true, count };
});
electron.ipcMain.handle("tcp-connect", async (_event, host, port, deviceInfo) => {
  if (!tcpServer) {
    tcpServer = getTCPServer();
    await tcpServer.start();
  }
  const clientId = await tcpServer.connectTo(host, port, deviceInfo);
  return { success: !!clientId, clientId };
});
electron.ipcMain.handle("tcp-get-connections", () => {
  if (!tcpServer) return 0;
  return tcpServer.getConnectionCount();
});
electron.ipcMain.handle("tcp-get-config", () => {
  if (!tcpServer) return null;
  return tcpServer.getConfig();
});
electron.ipcMain.handle("tcp-update-config", (_event, config) => {
  if (!tcpServer) return { success: false, error: "TCP server not running" };
  tcpServer.updateConfig(config);
  return { success: true };
});
electron.ipcMain.handle("get-settings", () => getSettings());
electron.ipcMain.handle("set-settings", (_event, settings) => {
  setSettings(settings);
  return { success: true };
});
electron.ipcMain.handle("get-setting", (_event, key) => {
  return getSetting(key);
});
electron.ipcMain.handle("set-setting", (_event, key, value) => {
  setSetting(key, value);
  return { success: true };
});
electron.ipcMain.handle("get-presets", (_event, type) => {
  switch (type) {
    case "software":
      return getSoftwarePresets();
    case "input":
      return getInputPresets();
    case "scene":
      return getScenes();
    default:
      return [];
  }
});
electron.ipcMain.handle("save-preset", (_event, type, preset) => {
  try {
    switch (type) {
      case "software":
        return { success: true, preset: saveSoftwarePreset(preset) };
      case "input":
        return { success: true, preset: saveInputPreset(preset) };
      case "scene":
        return { success: true, preset: saveScene(preset) };
      default:
        return { success: false, error: "Invalid preset type" };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("update-preset", (_event, type, id, updates) => {
  try {
    switch (type) {
      case "software":
        return { success: true, preset: updateSoftwarePreset(id, updates) };
      case "input":
        return { success: true, preset: updateInputPreset(id, updates) };
      case "scene":
        return { success: true, preset: updateScene(id, updates) };
      default:
        return { success: false, error: "Invalid preset type" };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("delete-preset", (_event, type, id) => {
  try {
    let success = false;
    switch (type) {
      case "software":
        success = deleteSoftwarePreset(id);
        break;
      case "input":
        success = deleteInputPreset(id);
        break;
      case "scene":
        success = deleteScene(id);
        break;
    }
    return { success };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("export-config", (_event, modules) => {
  try {
    return { success: true, data: exportConfig(modules) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("import-config", (_event, data, mode) => {
  try {
    const result = importConfig(data, mode);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("check-scene-dependencies", (_event, scene) => {
  return checkDependencies(scene);
});
electron.ipcMain.handle("execute-local", async (_event, command) => {
  try {
    const executor = getExecutor();
    const result = await executor.executeCommand({
      msg_type: "COMMAND",
      sender: { id: "local", name: "Local", ip: "127.0.0.1" },
      payload: command,
      timestamp: Date.now(),
      request_id: uuid.v4()
    });
    return { success: result.success, output: result.output, error: result.error, duration: result.duration };
  } catch (error) {
    return { success: false, error: String(error), duration: 0 };
  }
});
electron.ipcMain.handle("is-running", (_event, presetId) => {
  const executor = getExecutor();
  return executor.isRunning(presetId);
});
electron.ipcMain.handle("kill-process", (_event, presetId) => {
  const executor = getExecutor();
  return { success: executor.killProcess(presetId) };
});
electron.ipcMain.handle("set-whitelist", (_event, ips) => {
  const executor = getExecutor();
  executor.setWhitelist(ips);
  return { success: true };
});
electron.ipcMain.handle("set-allow-control", (_event, allow) => {
  const executor = getExecutor();
  executor.setAllowControl(allow);
  return { success: true };
});
const getReceivedDir = () => {
  const userDataPath = electron.app.getPath("userData");
  const receivedDir = path.join(userDataPath, "received");
  if (!fs.existsSync(receivedDir)) {
    fs.mkdirSync(receivedDir, { recursive: true });
  }
  return receivedDir;
};
const ensureReceivedSubdir = (type) => {
  const receivedDir = getReceivedDir();
  const subDir = path.join(receivedDir, type);
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }
  return subDir;
};
electron.ipcMain.handle("get-received-files", (_event, type) => {
  try {
    const baseDir = type ? ensureReceivedSubdir(type) : getReceivedDir();
    const files = [];
    const readDir = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          files.push({
            name: item,
            path: fullPath,
            size: stat.size,
            createdAt: stat.birthtimeMs,
            type: path.basename(dir)
          });
        }
      }
    };
    if (type) {
      readDir(baseDir);
    } else {
      const textDir = ensureReceivedSubdir("text");
      const imageDir = ensureReceivedSubdir("image");
      const fileDir = ensureReceivedSubdir("file");
      readDir(textDir);
      readDir(imageDir);
      readDir(fileDir);
    }
    return { success: true, files };
  } catch (error) {
    return { success: false, error: String(error), files: [] };
  }
});
electron.ipcMain.handle("save-received", (_event, data) => {
  try {
    const subDir = ensureReceivedSubdir(data.type);
    const timestamp = Date.now();
    let fileName = data.fileName || `${timestamp}`;
    if (data.type === "text") {
      fileName += ".txt";
      const filePath = path.join(subDir, fileName);
      fs.writeFileSync(filePath, data.content, "utf-8");
      return { success: true, path: filePath };
    } else if (data.type === "image") {
      const base64Data = data.content.replace(/^data:image\/\w+;base64,/, "");
      const ext = data.fileName?.split(".").pop() || "png";
      fileName = `${timestamp}.${ext}`;
      const filePath = path.join(subDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      return { success: true, path: filePath };
    } else {
      fileName = data.fileName || `file-${timestamp}`;
      const filePath = path.join(subDir, fileName);
      if (typeof data.content === "string" && fs.existsSync(data.content)) {
        fs.copyFileSync(data.content, filePath);
      } else if (typeof data.content === "string" && data.content.startsWith("data:")) {
        const base64Data = data.content.replace(/^data:.*?;base64,/, "");
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      }
      return { success: true, path: filePath };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("delete-received", (_event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: "File not found" };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("open-received-location", () => {
  const receivedDir = getReceivedDir();
  electron.shell.openPath(receivedDir);
  return { success: true };
});
electron.ipcMain.handle("get-storage-usage", () => {
  try {
    const receivedDir = getReceivedDir();
    let totalSize = 0;
    let fileCount = 0;
    const calculateSize = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          totalSize += stat.size;
          fileCount++;
        }
      }
    };
    calculateSize(path.join(receivedDir, "text"));
    calculateSize(path.join(receivedDir, "image"));
    calculateSize(path.join(receivedDir, "file"));
    return {
      success: true,
      usage: {
        totalSize,
        fileCount,
        formatted: formatBytes(totalSize)
      }
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
electron.ipcMain.on("subscribe-execution-events", (event) => {
  const executor = getExecutor();
  executor.on("execution-started", (data) => {
    event.sender.send("execution-started", data);
  });
  executor.on("execution-complete", (data) => {
    event.sender.send("execution-complete", data);
  });
  executor.on("execution-error", (data) => {
    event.sender.send("execution-error", data);
  });
});
log.info("主进程初始化完成");
