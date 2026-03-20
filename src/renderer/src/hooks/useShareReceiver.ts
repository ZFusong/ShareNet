import { useEffect } from 'react'
import { toast } from 'sonner'
import { useShareStore } from '../stores/shareStore'

type IncomingMessage = {
  msg_type?: string
  payload?: Record<string, unknown>
  timestamp?: number
}

type IncomingDevice = {
  ip?: string
  port?: number
  name?: string
}

const CONTENT_TYPE_LABELS = {
  text: '文字',
  image: '图片',
  file: '文件'
} as const

const buildDefaultSubject = (deviceName: string, contentType: keyof typeof CONTENT_TYPE_LABELS) =>
  `${deviceName || ''}的${CONTENT_TYPE_LABELS[contentType]}分享`

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function useShareReceiver() {
  const { prependMessage, updateImageMessage, updateFileMessage } = useShareStore()

  useEffect(() => {
    window.electronAPI?.onTcpMessage((rawMessage: unknown, rawFrom: unknown) => {
      const message = (rawMessage || {}) as IncomingMessage
      const payload = (message.payload || {}) as Record<string, unknown>
      const from = (rawFrom || {}) as IncomingDevice

      if (message.msg_type === 'SHARE_TEXT') {
        prependMessage({
          id: createMessageId(),
          type: 'text',
          content: String(payload.content || ''),
          from: from.ip || 'unknown',
          fromPort: from.port,
          fromName: from.name || 'Unknown',
          subject: String(payload.subject || buildDefaultSubject(from.name || 'Unknown', 'text')),
          timestamp: message.timestamp || Date.now()
        })
        return
      }

      if (message.msg_type === 'IMAGE_OFFER') {
        prependMessage({
          id: createMessageId(),
          type: 'image',
          content: String(payload.thumbnail || ''),
          thumbnail: String(payload.thumbnail || ''),
          from: from.ip || 'unknown',
          fromPort: from.port,
          fromName: from.name || 'Unknown',
          subject: String(payload.subject || buildDefaultSubject(from.name || 'Unknown', 'image')),
          timestamp: Number(payload.createdAt || message.timestamp || Date.now()),
          fileName: payload.fileName ? String(payload.fileName) : undefined,
          fileSize: Number(payload.fileSize || 0) || undefined,
          mimeType: payload.mimeType ? String(payload.mimeType) : undefined,
          shareId: payload.shareId ? String(payload.shareId) : undefined,
          imageStatus: 'offered',
          progress: 0,
          batchId: payload.batchId ? String(payload.batchId) : undefined
        })
        return
      }

      if (message.msg_type === 'IMAGE_DOWNLOAD_ERROR') {
        updateImageMessage({ shareId: String(payload.shareId || ''), fromIp: from.ip, fromPort: from.port }, (current) => ({
          ...current,
          imageStatus: current.downloadPath ? 'downloaded' : 'offered',
          progress: 0
        }))
        toast.error(String(payload.message || '图片下载失败'))
        return
      }

      if (message.msg_type === 'FILE_OFFER') {
        prependMessage({
          id: createMessageId(),
          type: 'file',
          content: '',
          from: from.ip || 'unknown',
          fromPort: from.port,
          fromName: from.name || 'Unknown',
          subject: String(payload.subject || buildDefaultSubject(from.name || 'Unknown', 'file')),
          timestamp: Number(payload.createdAt || message.timestamp || Date.now()),
          fileName: payload.fileName ? String(payload.fileName) : undefined,
          fileSize: Number(payload.fileSize || 0) || undefined,
          mimeType: payload.mimeType ? String(payload.mimeType) : undefined,
          shareId: payload.shareId ? String(payload.shareId) : undefined,
          fileStatus: 'offered',
          progress: 0,
          batchId: payload.batchId ? String(payload.batchId) : undefined
        })
        return
      }

      if (message.msg_type === 'FILE_DOWNLOAD_ERROR') {
        updateFileMessage({ shareId: String(payload.shareId || ''), fromIp: from.ip, fromPort: from.port }, (current) => ({
          ...current,
          fileStatus: current.downloadPath ? 'downloaded' : 'offered',
          progress: 0
        }))
        toast.error(String(payload.message || '文件下载失败'))
      }
    })

    window.electronAPI?.onImageDownloadProgress?.((payload: unknown) => {
      const event = payload as { shareId: string; fromIp?: string; fromPort?: number; progress?: number }
      updateImageMessage(event, (current) => ({ ...current, imageStatus: 'downloading', progress: event.progress || 0 }))
    })
    window.electronAPI?.onImageDownloadComplete?.((payload: unknown) => {
      const event = payload as {
        shareId: string
        fromIp?: string
        fromPort?: number
        path?: string
        dataUrl?: string
        fileName?: string
        fileSize?: number
        mimeType?: string
      }
      updateImageMessage(event, (current) => ({
        ...current,
        imageStatus: 'downloaded',
        progress: 100,
        content: event.dataUrl || current.content,
        downloadPath: event.path,
        fileName: event.fileName || current.fileName,
        fileSize: event.fileSize || current.fileSize,
        mimeType: event.mimeType || current.mimeType
      }))
      toast.success(`图片已下载到 ${event.path}`)
    })
    window.electronAPI?.onImageDownloadError?.((payload: unknown) => {
      const event = payload as { shareId: string; fromIp?: string; fromPort?: number; error?: string }
      updateImageMessage(event, (current) => ({
        ...current,
        imageStatus: current.downloadPath ? 'downloaded' : 'offered',
        progress: 0
      }))
      toast.error(event.error || '图片下载失败')
    })
    window.electronAPI?.onFileDownloadProgress?.((payload: unknown) => {
      const event = payload as { shareId: string; fromIp?: string; fromPort?: number; progress?: number }
      updateFileMessage(event, (current) => ({ ...current, fileStatus: 'downloading', progress: event.progress || 0 }))
    })
    window.electronAPI?.onFileDownloadComplete?.((payload: unknown) => {
      const event = payload as {
        shareId: string
        fromIp?: string
        fromPort?: number
        path?: string
        fileName?: string
        fileSize?: number
        mimeType?: string
      }
      updateFileMessage(event, (current) => ({
        ...current,
        fileStatus: 'downloaded',
        progress: 100,
        content: event.path || current.content,
        downloadPath: event.path,
        fileName: event.fileName || current.fileName,
        fileSize: event.fileSize || current.fileSize,
        mimeType: event.mimeType || current.mimeType
      }))
      toast.success(`文件已下载到 ${event.path}`)
    })
    window.electronAPI?.onFileDownloadError?.((payload: unknown) => {
      const event = payload as { shareId: string; fromIp?: string; fromPort?: number; error?: string }
      updateFileMessage(event, (current) => ({
        ...current,
        fileStatus: current.downloadPath ? 'downloaded' : 'offered',
        progress: 0
      }))
      toast.error(event.error || '文件下载失败')
    })

    return () => {
      window.electronAPI?.removeAllListeners?.('tcp-message')
      window.electronAPI?.removeAllListeners?.('image-download-progress')
      window.electronAPI?.removeAllListeners?.('image-download-complete')
      window.electronAPI?.removeAllListeners?.('image-download-error')
      window.electronAPI?.removeAllListeners?.('file-download-progress')
      window.electronAPI?.removeAllListeners?.('file-download-complete')
      window.electronAPI?.removeAllListeners?.('file-download-error')
    }
  }, [prependMessage, updateFileMessage, updateImageMessage])
}
