import { create } from 'zustand'

export type ContentType = 'text' | 'image' | 'file'
export type ImageStatus = 'offered' | 'downloading' | 'downloaded'
export type FileStatus = 'offered' | 'downloading' | 'downloaded'

export type ShareMessage = {
  id: string
  type: ContentType
  content: string
  from: string
  fromPort?: number
  fromName?: string
  subject?: string
  timestamp: number
  fileName?: string
  fileSize?: number
  thumbnail?: string
  mimeType?: string
  shareId?: string
  imageStatus?: ImageStatus
  fileStatus?: FileStatus
  downloadPath?: string
  progress?: number
  isSelf?: boolean
  batchId?: string
}

export type ImageEvent = {
  shareId: string
  fromIp?: string
  fromPort?: number
  progress?: number
  path?: string
  dataUrl?: string
  error?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

export type FileEvent = {
  shareId: string
  fromIp?: string
  fromPort?: number
  progress?: number
  path?: string
  error?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

type ShareState = {
  messages: ShareMessage[]
  prependMessage: (message: ShareMessage) => void
  clearMessages: () => void
  updateImageMessage: (payload: ImageEvent, updater: (message: ShareMessage) => ShareMessage) => void
  updateFileMessage: (payload: FileEvent, updater: (message: ShareMessage) => ShareMessage) => void
}

export const useShareStore = create<ShareState>((set) => ({
  messages: [],
  prependMessage: (message) => set((state) => ({ messages: [message, ...state.messages] })),
  clearMessages: () => set({ messages: [] }),
  updateImageMessage: (payload, updater) =>
    set((state) => ({
      messages: state.messages.map((message) => {
        const sameShare = message.type === 'image' && message.shareId === payload.shareId
        const sameSender =
          (payload.fromIp ? message.from === payload.fromIp : true) &&
          (payload.fromPort ? message.fromPort === payload.fromPort : true)
        return sameShare && sameSender ? updater(message) : message
      })
    })),
  updateFileMessage: (payload, updater) =>
    set((state) => ({
      messages: state.messages.map((message) => {
        const sameShare = message.type === 'file' && message.shareId === payload.shareId
        const sameSender =
          (payload.fromIp ? message.from === payload.fromIp : true) &&
          (payload.fromPort ? message.fromPort === payload.fromPort : true)
        return sameShare && sameSender ? updater(message) : message
      })
    }))
}))
