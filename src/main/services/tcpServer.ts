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
  timeout: 30000
}

const PACKET_TYPE_JSON = 1
const PACKET_TYPE_BINARY = 2

interface BinaryPacketHeader {
  msg_type: string
  payload?: Record<string, unknown>
}

interface ClientConnection {
  id: string
  device: DeviceInfo
  socket: net.Socket
  lastActive: number
  buffer: Buffer
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

  onMessage(handler: TCPMessageHandler): void {
    this.messageHandlers.push(handler)
  }

  offMessage(handler: TCPMessageHandler): void {
    const index = this.messageHandlers.indexOf(handler)
    if (index > -1) {
      this.messageHandlers.splice(index, 1)
    }
  }

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

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) return

    for (const [, client] of this.clients) {
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

  private handleConnection(socket: net.Socket): void {
    const clientId = uuidv4()
    console.log(`[TCP] New connection from ${socket.remoteAddress}:${socket.remotePort}`)

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
      lastActive: Date.now(),
      buffer: Buffer.alloc(0)
    }

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

  private handleData(client: ClientConnection, data: Buffer): void {
    client.lastActive = Date.now()
    client.buffer = Buffer.concat([client.buffer, data])

    try {
      while (client.buffer.length >= 5) {
        const packetType = client.buffer.readUInt8(0)
        const payloadLength = client.buffer.readUInt32BE(1)
        const totalLength = 5 + payloadLength

        if (client.buffer.length < totalLength) {
          return
        }

        const payload = client.buffer.subarray(5, totalLength)
        client.buffer = client.buffer.subarray(totalLength)

        if (packetType === PACKET_TYPE_JSON) {
          const message: NetworkMessage = JSON.parse(payload.toString('utf-8'))
          this.processJsonMessage(client, message)
          continue
        }

        if (packetType === PACKET_TYPE_BINARY) {
          const headerLength = payload.readUInt32BE(0)
          const headerStart = 4
          const headerEnd = headerStart + headerLength
          const header = JSON.parse(payload.subarray(headerStart, headerEnd).toString('utf-8')) as BinaryPacketHeader
          const chunk = payload.subarray(headerEnd)
          this.emit('binaryMessage', header, chunk, client.device)
          continue
        }

        console.warn('[TCP] Unknown packet type:', packetType)
      }
    } catch (error) {
      console.error('[TCP] Failed to parse packet:', error)
      client.buffer = Buffer.alloc(0)
    }
  }

  private processJsonMessage(client: ClientConnection, message: NetworkMessage): void {
    if (message.msg_type === 'ACK' && message.payload.original_request_id) {
      const ackPayload = message.payload as { original_request_id: string; status: 'success' | 'error'; message?: string }
      for (const handler of this.messageHandlers) {
        if (handler.onAck) {
          handler.onAck(ackPayload.original_request_id, ackPayload.status, ackPayload.message)
        }
      }
      this.emit('ack', ackPayload.original_request_id, ackPayload.status, ackPayload.message)
      return
    }

    if (message.msg_type === 'DISCOVERY') {
      client.device = message.sender
      this.emit('deviceIdentified', client)
    }

    for (const handler of this.messageHandlers) {
      handler.onMessage(message, client.device)
    }

    this.emit('message', message, client.device)
  }

  private handleClose(client: ClientConnection): void {
    if (!this.clients.has(client.id)) {
      return
    }

    this.clients.delete(client.id)
    console.log(`[TCP] Connection closed: ${client.id}`)
    this.emit('clientDisconnected', client)

    for (const handler of this.messageHandlers) {
      if (handler.onDisconnect) {
        handler.onDisconnect(client.device)
      }
    }
  }

  private encodeJsonPacket(message: NetworkMessage): Buffer {
    const payload = Buffer.from(JSON.stringify(message), 'utf-8')
    const packet = Buffer.alloc(5 + payload.length)
    packet.writeUInt8(PACKET_TYPE_JSON, 0)
    packet.writeUInt32BE(payload.length, 1)
    payload.copy(packet, 5)
    return packet
  }

  private encodeBinaryPacket(header: BinaryPacketHeader, chunk: Uint8Array): Buffer {
    const headerBuffer = Buffer.from(JSON.stringify(header), 'utf-8')
    const binaryChunk = Buffer.from(chunk)
    const payloadLength = 4 + headerBuffer.length + binaryChunk.length
    const packet = Buffer.alloc(5 + payloadLength)

    packet.writeUInt8(PACKET_TYPE_BINARY, 0)
    packet.writeUInt32BE(payloadLength, 1)
    packet.writeUInt32BE(headerBuffer.length, 5)
    headerBuffer.copy(packet, 9)
    binaryChunk.copy(packet, 9 + headerBuffer.length)

    return packet
  }

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

      client.socket.write(this.encodeJsonPacket(message), (err) => {
        if (err) {
          console.error(`[TCP] Failed to send to ${targetIP}${targetPort ? `:${targetPort}` : ''}:`, err)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  sendBinaryMessage(targetIP: string, header: BinaryPacketHeader, chunk: Uint8Array, targetPort?: number): Promise<boolean> {
    return new Promise((resolve) => {
      const client = Array.from(this.clients.values()).find(
        (c) => c.device.ip === targetIP && (targetPort ? c.device.port === targetPort : true)
      )

      if (!client) {
        console.log(`[TCP] Client not found for binary send: ${targetIP}${targetPort ? `:${targetPort}` : ''}`)
        resolve(false)
        return
      }

      client.socket.write(this.encodeBinaryPacket(header, chunk), (err) => {
        if (err) {
          console.error(`[TCP] Failed binary send to ${targetIP}${targetPort ? `:${targetPort}` : ''}:`, err)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  broadcastMessage(message: NetworkMessage): Promise<number> {
    return new Promise((resolve) => {
      let successCount = 0
      const packet = this.encodeJsonPacket(message)

      const sendPromises = Array.from(this.clients.values()).map((client) => {
        return new Promise<void>((res) => {
          client.socket.write(packet, (err) => {
            if (!err) successCount += 1
            res()
          })
        })
      })

      Promise.all(sendPromises).then(() => resolve(successCount))
    })
  }

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
          lastActive: Date.now(),
          buffer: Buffer.alloc(0)
        }

        this.clients.set(clientId, client)

        const discoveryMsg: NetworkMessage = {
          msg_type: 'DISCOVERY',
          sender: deviceInfo,
          payload: { version: '1.0.0', capabilities: ['control', 'share'] },
          timestamp: Date.now(),
          request_id: uuidv4()
        }
        socket.write(this.encodeJsonPacket(discoveryMsg))

        this.emit('connected', client)
        resolve(clientId)
      })

      socket.on('error', (err) => {
        console.error(`[TCP] Connection error to ${host}:${port}:`, err)
        resolve(null)
      })

      socket.on('close', () => {
        const current = this.clients.get(clientId)
        if (current) {
          this.clients.delete(clientId)
          this.emit('disconnected', current)
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

  getClients(): ClientConnection[] {
    return Array.from(this.clients.values())
  }

  getClient(id: string): ClientConnection | undefined {
    return this.clients.get(id)
  }

  getClientByIP(ip: string): ClientConnection | undefined {
    return Array.from(this.clients.values()).find((c) => c.device.ip === ip)
  }

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

  disconnect(id: string): boolean {
    const client = this.clients.get(id)
    if (client) {
      client.socket.destroy()
      return true
    }
    return false
  }

  updateConfig(config: Partial<TCPServerConfig>): void {
    const wasRunning = this.isRunning
    this.config = { ...this.config, ...config }

    if (wasRunning) {
      this.stop().then(() => this.start())
    }
  }

  getConfig(): TCPServerConfig {
    return { ...this.config }
  }

  isActive(): boolean {
    return this.isRunning
  }

  getConnectionCount(): number {
    return this.clients.size
  }
}

let instance: TCPServer | null = null

export function getTCPServer(config?: Partial<TCPServerConfig>): TCPServer {
  if (!instance) {
    instance = new TCPServer(config)
  } else if (config) {
    instance.updateConfig(config)
  }
  return instance
}
