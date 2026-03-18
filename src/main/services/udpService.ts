/**
 * ShareNet - UDP Service
 * UDP 广播服务模块 - 设备发现
 */

import dgram from 'dgram'
import os from 'os'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import type { DeviceInfo, NetworkMessage, UDPServiceConfig } from './types'

// Default configuration
const DEFAULT_CONFIG: UDPServiceConfig = {
  port: 8888,
  broadcastInterval: 5000, // 5 seconds
  heartbeatInterval: 5000, // 5 seconds
  offlineThreshold: 15000 // 15 seconds
}

export class UDPService extends EventEmitter {
  private socket: dgram.Socket | null = null
  private config: UDPServiceConfig
  private deviceList: Map<string, DeviceInfo> = new Map()
  private localDevice: DeviceInfo | null = null
  private broadcastTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(config: Partial<UDPServiceConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize local device info
   */
  async initialize(localInfo: Partial<DeviceInfo>): Promise<DeviceInfo> {
    const localIP = this.getLocalIP()
    const hostname = os.hostname()

    this.localDevice = {
      id: localInfo.id || uuidv4(),
      name: localInfo.name || hostname,
      ip: localIP,
      port: localInfo.port ?? this.config.port,
      role: localInfo.role || 'bidirectional',
      tags: localInfo.tags || [],
      status: 'online',
      lastSeen: Date.now(),
      avatar: localInfo.avatar
    }

    return this.localDevice
  }

  /**
   * Get local IP address
   */
  private getLocalIP(): string {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
    return '127.0.0.1'
  }

  /**
   * Start UDP service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[UDP] Service already running')
      return
    }

    return new Promise((resolve, reject) => {
      try {
        let settled = false
        this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

        this.socket.on('error', (err) => {
          console.error('[UDP] Socket error:', err)
          if (this.isRunning) {
            this.emit('error', err)
            return
          }
          if (!settled) {
            settled = true
            this.emit('error', err)
            this.socket?.close()
            this.socket = null
            this.isRunning = false
            reject(err)
          }
        })

        this.socket.on('message', (msg, rinfo) => {
          this.handleMessage(msg, rinfo)
        })

        this.socket.on('listening', () => {
          if (settled) return
          settled = true
          const address = this.socket?.address()
          console.log(`[UDP] Listening on ${address?.address}:${address?.port}`)

          // Enable broadcast
          this.socket?.setBroadcast(true)

          this.isRunning = true
          this.startBroadcasting()
          this.startHeartbeat()
          this.startCleanup()

          this.emit('ready')
          resolve()
        })

        this.socket.bind(this.config.port)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Stop UDP service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    // Stop all timers
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer)
      this.broadcastTimer = null
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    // Close socket
    if (this.socket) {
      return new Promise((resolve) => {
        this.socket?.close(() => {
          console.log('[UDP] Service stopped')
          this.socket = null
          this.isRunning = false
          this.emit('stopped')
          resolve()
        })
      })
    }
  }

  /**
   * Start broadcasting device info
   */
  private startBroadcasting(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer)
    }

    // Send immediate broadcast
    this.broadcastDiscovery()

    // Set up interval
    this.broadcastTimer = setInterval(() => {
      this.broadcastDiscovery()
    }, this.config.broadcastInterval)
  }

  /**
   * Send discovery broadcast
   */
  private broadcastDiscovery(): void {
    if (!this.socket || !this.localDevice) return

    const message: NetworkMessage = {
      msg_type: 'DISCOVERY',
      sender: this.localDevice,
      payload: {
        version: '1.0.0',
        capabilities: ['control', 'share']
      },
      timestamp: Date.now(),
      request_id: uuidv4()
    }

    const broadcastAddress = this.getBroadcastAddress()
    const messageBuffer = Buffer.from(JSON.stringify(message))

    this.socket.send(messageBuffer, this.config.port, broadcastAddress, (err) => {
      if (err) {
        console.error('[UDP] Broadcast error:', err)
      }
    })
  }

  /**
   * Get broadcast address for local network
   */
  private getBroadcastAddress(): string {
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal && iface.netmask) {
          // Calculate broadcast address: IP | ~netmask
          const ipParts = iface.address.split('.').map(Number)
          const maskParts = iface.netmask.split('.').map(Number)
          const broadcastParts = ipParts.map((ip, i) => ip | (~maskParts[i] & 255))
          return broadcastParts.join('.')
        }
      }
    }
    return '255.255.255.255'
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)
  }

  /**
   * Send heartbeat message
   */
  private sendHeartbeat(): void {
    if (!this.socket || !this.localDevice) return

    const message: NetworkMessage = {
      msg_type: 'HEARTBEAT',
      sender: this.localDevice,
      payload: {
        status: 'online'
      },
      timestamp: Date.now(),
      request_id: uuidv4()
    }

    const broadcastAddress = this.getBroadcastAddress()
    const messageBuffer = Buffer.from(JSON.stringify(message))

    this.socket.send(messageBuffer, this.config.port, broadcastAddress, (err) => {
      if (err) {
        console.error('[UDP] Heartbeat error:', err)
      }
    })
  }

  /**
   * Start cleanup timer to remove offline devices
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupOfflineDevices()
    }, 5000)
  }

  /**
   * Clean up offline devices
   */
  private cleanupOfflineDevices(): void {
    const now = Date.now()
    const offlineDevices: DeviceInfo[] = []

    for (const [id, device] of this.deviceList) {
      if (now - device.lastSeen > this.config.offlineThreshold) {
        offlineDevices.push(device)
        this.deviceList.delete(id)
      }
    }

    if (offlineDevices.length > 0) {
      console.log(`[UDP] Removed ${offlineDevices.length} offline devices`)
      this.emit('devicesRemoved', offlineDevices)
      this.emit('devicesUpdated', this.getDeviceList())
    }
  }

  /**
   * Handle incoming UDP message
   */
  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const message: NetworkMessage = JSON.parse(msg.toString())

      // Ignore own messages
      if (this.localDevice && message.sender.id === this.localDevice.id) {
        return
      }

      switch (message.msg_type) {
        case 'DISCOVERY':
          this.handleDiscovery(message)
          break
        case 'HEARTBEAT':
          this.handleHeartbeat(message)
          break
        default:
          console.log('[UDP] Unknown message type:', message.msg_type)
      }
    } catch (error) {
      console.error('[UDP] Failed to parse message:', error)
    }
  }

  private findDeviceByAddress(ip: string, port: number): DeviceInfo | undefined {
    for (const device of this.deviceList.values()) {
      if (device.ip === ip && device.port === port) {
        return device
      }
    }
    return undefined
  }

  /**
   * Handle discovery message
   */
  private handleDiscovery(message: NetworkMessage): void {
    const device = message.sender
    const existingDevice = this.deviceList.get(device.id) || this.findDeviceByAddress(device.ip, device.port)

    if (existingDevice) {
      // Update existing device
      const mergedDevice: DeviceInfo = {
        ...existingDevice,
        ...device,
        id: existingDevice.id,
        lastSeen: Date.now(),
        status: 'online'
      }
      this.deviceList.set(existingDevice.id, mergedDevice)
      this.emit('deviceUpdated', mergedDevice)
    } else {
      // Add new device
      device.lastSeen = Date.now()
      device.status = 'online'
      this.deviceList.set(device.id, device)
      this.emit('deviceAdded', device)
    }

    this.emit('devicesUpdated', this.getDeviceList())
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(message: NetworkMessage): void {
    const device = message.sender
    const existingDevice = this.deviceList.get(device.id) || this.findDeviceByAddress(device.ip, device.port)

    if (existingDevice) {
      const mergedDevice: DeviceInfo = {
        ...existingDevice,
        ...device,
        id: existingDevice.id,
        lastSeen: Date.now(),
        status: message.payload.status || 'online'
      }
      this.deviceList.set(existingDevice.id, mergedDevice)
      this.emit('deviceUpdated', mergedDevice)
      this.emit('devicesUpdated', this.getDeviceList())
    }
  }

  /**
   * Get device list
   */
  getDeviceList(): DeviceInfo[] {
    return Array.from(this.deviceList.values())
  }

  /**
   * Get device by ID
   */
  getDevice(id: string): DeviceInfo | undefined {
    return this.deviceList.get(id)
  }

  /**
   * Get local device info
   */
  getLocalDevice(): DeviceInfo | null {
    return this.localDevice
  }

  /**
   * Update local device info
   */
  updateLocalDevice(info: Partial<DeviceInfo>): void {
    if (this.localDevice) {
      this.localDevice = { ...this.localDevice, ...info }
      // Broadcast immediately to update others
      this.broadcastDiscovery()
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<UDPServiceConfig>): void {
    const wasRunning = this.isRunning
    this.config = { ...this.config, ...config }

    // Restart services if needed
    if (wasRunning) {
      this.stop().then(() => this.start())
    }
  }

  /**
   * Get current config
   */
  getConfig(): UDPServiceConfig {
    return { ...this.config }
  }

  /**
   * Check if service is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Manually add a device (for manual IP addition)
   */
  addDevice(device: DeviceInfo): void {
    device.lastSeen = Date.now()
    device.status = 'online'
    this.deviceList.set(device.id, device)
    this.emit('deviceAdded', device)
    this.emit('devicesUpdated', this.getDeviceList())
  }

  /**
   * Remove a device
   */
  removeDevice(id: string): boolean {
    const device = this.deviceList.get(id)
    if (device) {
      this.deviceList.delete(id)
      this.emit('devicesRemoved', [device])
      this.emit('devicesUpdated', this.getDeviceList())
      return true
    }
    return false
  }
}

// Singleton instance
let udpServiceInstance: UDPService | null = null

/**
 * Get UDP service singleton
 */
export function getUDPService(config?: Partial<UDPServiceConfig>): UDPService {
  if (!udpServiceInstance) {
    udpServiceInstance = new UDPService(config)
  } else if (config && Object.keys(config).length > 0) {
    udpServiceInstance.updateConfig(config)
  }
  return udpServiceInstance
}

/**
 * Create new UDP service instance
 */
export function createUDPService(config?: Partial<UDPServiceConfig>): UDPService {
  return new UDPService(config)
}
