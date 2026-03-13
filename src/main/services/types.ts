/**
 * ShareNet - Network Types
 * 网络通讯类型定义
 */

export interface DeviceInfo {
  id: string
  name: string
  ip: string
  port: number
  role: 'controller' | 'controlled' | 'bidirectional'
  tags: string[]
  status: 'online' | 'offline' | 'busy'
  lastSeen: number
  avatar?: string
}

export interface DiscoveryMessage {
  msg_type: 'DISCOVERY'
  sender: DeviceInfo
  payload: {
    version: string
    capabilities: string[]
  }
  timestamp: number
  request_id: string
}

export interface HeartbeatMessage {
  msg_type: 'HEARTBEAT'
  sender: DeviceInfo
  payload: {
    status: 'online' | 'busy'
  }
  timestamp: number
  request_id: string
}

export interface AckMessage {
  msg_type: 'ACK'
  sender: DeviceInfo
  payload: {
    original_request_id: string
    status: 'success' | 'error'
    message?: string
  }
  timestamp: number
  request_id: string
}

export interface BaseMessage {
  msg_type: string
  sender: DeviceInfo
  payload: any
  timestamp: number
  request_id: string
}

export type NetworkMessage = DiscoveryMessage | HeartbeatMessage | BaseMessage

export interface UDPServiceConfig {
  port: number
  broadcastInterval: number
  heartbeatInterval: number
  offlineThreshold: number
}