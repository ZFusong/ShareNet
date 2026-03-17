/**
 * ShareNet - TCP Server
 * TCP 服务端模块 - 消息传输
 */

import net from 'net'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import type { DeviceInfo, BaseMessage, NetworkMessage } from './types'

export interface TCPMessageHandler {
  onMessage: (message: NetworkMessage, from: DeviceInfo) => void
  onAck?: (originalRequestId: string, status: 'success' | 'error', message?: string) => void
  onConnect?: (device: DeviceInfo) => void
  onDisconnect?: (device: DeviceInfo) => void
}

export interface TCPServerConfig {
  port: number
  maxConnections: number
  timeout: number
}

const DEFAULT_CONFIG: TCPServerConfig = {
  port: 8889,
  maxConnections: 50,
  timeout: 30000 // 30 seconds
}

interface ClientConnection {
  id: string
  device: DeviceInfo
  socket: net.Socket
  lastActive: number
}

export class TCPServer extends EventEmitter {
  private server: net.Server | null = null
  private config: TCPServerConfig
  private clients: Map<string, ClientConnection> = new Map()
  private messageHandlers: TCPMessageHandler[] = []
  private isRunning = false

  constructor(config: Partial<TCPServerConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Register message handler
   */
  onMessage(handler: TCPMessageHandler): void {
    this.messageHandlers.push(handler)
  }

  /**
   * Remove message handler
   */
  offMessage(handler: TCPMessageHandler): void {
    const index = this.messageHandlers.indexOf(handler)
    if (index > -1) {
      this.messageHandlers.splice(index, 1)
    }
  }

  /**
   * Start TCP server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[TCP] Server already running')
      return
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket)
      })

      this.server.on('error', (err) => {
        console.error('[TCP] Server error:', err)
        this.emit('error', err)
        reject(err)
      })

      this.server.on('listening', () => {
        const address = this.server?.address()
        const addrInfo = typeof address === 'object' && address !== null ? address : null
        console.log(`[TCP] Listening on ${addrInfo ? addrInfo.address : '0.0.0.0'}:${addrInfo ? addrInfo.port : this.config.port}`)
        this.isRunning = true
        this.emit('ready')
        resolve()
      })

      this.server.on('close', () => {
        console.log('[TCP] Server closed')
        this.isRunning = false
        this.emit('stopped')
      })

      this.server.maxConnections = this.config.maxConnections
      this.server.listen(this.config.port, '0.0.0.0')
    })
  }

  /**
   * Stop TCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) return

    // Close all client connections
    for (const [id, client] of this.clients) {
      client.socket.destroy()
    }
    this.clients.clear()

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.server = null
        this.isRunning = false
        resolve()
      })
    })
  }

  /**
   * Handle incoming connection
   */
  private handleConnection(socket: net.Socket): void {
    const clientId = uuidv4()
    console.log(`[TCP] New connection from ${socket.remoteAddress}:${socket.remotePort}`)

    // Set socket timeout
    socket.setTimeout(this.config.timeout)

    const client: ClientConnection = {
      id: clientId,
      device: {
        id: '',
        name: 'Unknown',
        ip: socket.remoteAddress || '',
        port: 0,
        role: 'controlled',
        tags: [],
        status: 'online',
        lastSeen: Date.now()
      },
      socket,
      lastActive: Date.now()
    }

    // Handle socket events
    socket.on('data', (data) => {
      this.handleData(client, data)
    })

    socket.on('close', () => {
      this.handleClose(client)
    })

    socket.on('error', (err) => {
      console.error(`[TCP] Socket error for ${clientId}:`, err)
      this.handleClose(client)
    })

    socket.on('timeout', () => {
      console.log(`[TCP] Connection timeout: ${clientId}`)
      socket.destroy()
    })

    this.clients.set(clientId, client)
    this.emit('clientConnected', client)
  }

  /**
   * Handle incoming data
   */
  private handleData(client: ClientConnection, data: Buffer): void {
    client.lastActive = Date.now()

    try {
      // Split by newline to handle multiple messages
      const messages = data.toString().split('\n').filter(Boolean)

      for (const msgStr of messages) {
        const message: NetworkMessage = JSON.parse(msgStr)

        // Handle ACK messages specially
        if (message.msg_type === 'ACK' && message.payload.original_request_id) {
          const ackPayload = message.payload as { original_request_id: string; status: 'success' | 'error'; message?: string }
          for (const handler of this.messageHandlers) {
            if (handler.onAck) {
              handler.onAck(ackPayload.original_request_id, ackPayload.status, ackPayload.message)
            }
          }
          this.emit('ack', ackPayload.original_request_id, ackPayload.status, ackPayload.message)
          continue
        }

        // Update client device info if this is a discovery message
        if (message.msg_type === 'DISCOVERY') {
          client.device = message.sender
          this.emit('deviceIdentified', client)
        }

        // Notify handlers
        for (const handler of this.messageHandlers) {
          handler.onMessage(message, client.device)
        }

        this.emit('message', message, client.device)
      }
    } catch (error) {
      console.error('[TCP] Failed to parse message:', error)
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(client: ClientConnection): void {
    this.clients.delete(client.id)
    console.log(`[TCP] Connection closed: ${client.id}`)
    this.emit('clientDisconnected', client)

    // Notify handlers
    for (const handler of this.messageHandlers) {
      if (handler.onDisconnect) {
        handler.onDisconnect(client.device)
      }
    }
  }

  /**
   * Send message to a specific client
   */
  sendMessage(targetIP: string, message: NetworkMessage, targetPort?: number): Promise<boolean> {
    return new Promise((resolve) => {
      const client = Array.from(this.clients.values()).find(
        (c) => c.device.ip === targetIP && (targetPort ? c.device.port === targetPort : true)
      )

      if (!client) {
        console.log(`[TCP] Client not found: ${targetIP}${targetPort ? `:${targetPort}` : ''}`)
        resolve(false)
        return
      }

      const data = JSON.stringify(message) + '\n'
      client.socket.write(data, (err) => {
        if (err) {
          console.error(`[TCP] Failed to send to ${targetIP}${targetPort ? `:${targetPort}` : ''}:`, err)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastMessage(message: NetworkMessage): Promise<number> {
    return new Promise((resolve) => {
      let successCount = 0
      const data = JSON.stringify(message) + '\n'

      const sendPromises = Array.from(this.clients.values()).map((client) => {
        return new Promise<void>((res) => {
          client.socket.write(data, (err) => {
            if (!err) successCount++
            res()
          })
        })
      })

      Promise.all(sendPromises).then(() => resolve(successCount))
    })
  }

  /**
   * Connect to a remote TCP server
   */
  async connectTo(host: string, port: number, deviceInfo: DeviceInfo): Promise<string | null> {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      const clientId = uuidv4()
      let client: ClientConnection | null = null

      socket.connect(port, host, () => {
        console.log(`[TCP] Connected to ${host}:${port}`)

        client = {
          id: clientId,
          device: { ...deviceInfo, ip: host, port },
          socket,
          lastActive: Date.now()
        }

        this.clients.set(clientId, client)

        // Send discovery message
        const discoveryMsg: NetworkMessage = {
          msg_type: 'DISCOVERY',
          sender: deviceInfo,
          payload: { version: '1.0.0', capabilities: ['control', 'share'] },
          timestamp: Date.now(),
          request_id: uuidv4()
        }
        socket.write(JSON.stringify(discoveryMsg) + '\n')

        this.emit('connected', client)
        resolve(clientId)
      })

      socket.on('error', (err) => {
        console.error(`[TCP] Connection error to ${host}:${port}:`, err)
        resolve(null)
      })

      socket.on('close', () => {
        const client = this.clients.get(clientId)
        if (client) {
          this.clients.delete(clientId)
          this.emit('disconnected', client)
        }
      })

      socket.on('data', (data) => {
        const current = client || this.clients.get(clientId)
        if (current) {
          this.handleData(current, data)
        }
      })
    })
  }

  /**
   * Get all connected clients
   */
  getClients(): ClientConnection[] {
    return Array.from(this.clients.values())
  }

  /**
   * Get client by ID
   */
  getClient(id: string): ClientConnection | undefined {
    return this.clients.get(id)
  }

  /**
   * Get client by IP
   */
  getClientByIP(ip: string): ClientConnection | undefined {
    return Array.from(this.clients.values()).find((c) => c.device.ip === ip)
  }

  /**
   * Send ACK message to a client
   */
  sendAck(targetIP: string, originalRequestId: string, status: 'success' | 'error', message?: string): Promise<boolean> {
    const ackMessage: NetworkMessage = {
      msg_type: 'ACK',
      sender: {
        id: '',
        name: 'Local',
        ip: '0.0.0.0',
        port: this.config.port,
        role: 'bidirectional',
        tags: [],
        status: 'online',
        lastSeen: Date.now()
      },
      payload: {
        original_request_id: originalRequestId,
        status,
        message
      },
      timestamp: Date.now(),
      request_id: uuidv4()
    }

    return this.sendMessage(targetIP, ackMessage)
  }

  /**
   * Broadcast ACK message
   */
  broadcastAck(originalRequestId: string, status: 'success' | 'error', message?: string): Promise<number> {
    const ackMessage: NetworkMessage = {
      msg_type: 'ACK',
      sender: {
        id: '',
        name: 'Local',
        ip: '0.0.0.0',
        port: this.config.port,
        role: 'bidirectional',
        tags: [],
        status: 'online',
        lastSeen: Date.now()
      },
      payload: {
        original_request_id: originalRequestId,
        status,
        message
      },
      timestamp: Date.now(),
      request_id: uuidv4()
    }

    return this.broadcastMessage(ackMessage)
  }

  /**
   * Disconnect a client
   */
  disconnect(id: string): boolean {
    const client = this.clients.get(id)
    if (client) {
      client.socket.destroy()
      return true
    }
    return false
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TCPServerConfig>): void {
    const wasRunning = this.isRunning
    this.config = { ...this.config, ...config }

    if (wasRunning) {
      this.stop().then(() => this.start())
    }
  }

  /**
   * Get current config
   */
  getConfig(): TCPServerConfig {
    return { ...this.config }
  }

  /**
   * Check if server is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.clients.size
  }
}

// Singleton instance
let tcpServerInstance: TCPServer | null = null

/**
 * Get TCP server singleton
 */
export function getTCPServer(config?: Partial<TCPServerConfig>): TCPServer {
  if (!tcpServerInstance) {
    tcpServerInstance = new TCPServer(config)
  }
  return tcpServerInstance
}

/**
 * Create new TCP server instance
 */
export function createTCPServer(config?: Partial<TCPServerConfig>): TCPServer {
  return new TCPServer(config)
}
