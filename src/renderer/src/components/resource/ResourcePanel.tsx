/**
 * ShareNet - Resource Panel
 * 资源站面板 - 发送文字/图片/文件和分享记录
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useDeviceStore } from '../../stores/deviceStore'

type ContentType = 'text' | 'image' | 'file'
type ImageQuality = 'original' | 'high' | 'preview'

interface ReceivedMessage {
  id: string
  type: ContentType
  content: string
  from: string
  fromName?: string
  timestamp: number
  fileName?: string
  fileSize?: number
  thumbnail?: string
}

interface SelectedFile {
  name: string
  path: string
  size: number
  file: File
}

interface IncomingTransfer {
  fileId: string
  type: 'image' | 'file'
  fileName: string
  fileSize: number
  totalChunks: number
  receivedCount: number
  chunks: Array<Uint8Array | null>
}

export function ResourcePanel() {
  const [contentType, setContentType] = useState<ContentType>('text')
  const [textContent, setTextContent] = useState('')
  const [imageQuality, setImageQuality] = useState<ImageQuality>('high')
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [sendTarget, setSendTarget] = useState<'broadcast' | 'selected'>('broadcast')
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [isDevicePickerOpen, setIsDevicePickerOpen] = useState(false)
  const incomingTransfersRef = useRef<Map<string, IncomingTransfer>>(new Map())

  const { devices, selectedDevices, toggleSelectDevice, selectAll, deselectAll, localDevice } = useDeviceStore()
  const selectedCount = selectedDevices.size

  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Handle paste for text and images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              if (event.target?.result) {
                setContentType('image')
                // Store image data (in real implementation, would handle properly)
                console.log('Pasted image:', file.name || 'clipboard image')
              }
            }
            reader.readAsDataURL(file)
          }
          return
        }

        if (item.type === 'text/plain') {
          item.getAsString((text) => {
            setContentType('text')
            setTextContent((prev) => prev + text)
          })
          return
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const base64FromUint8 = (bytes: Uint8Array): string => {
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...chunk)
    }
    return btoa(binary)
  }

  const uint8FromBase64 = (base64: string): Uint8Array => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  const sendMessageToTargets = async (message: any) => {
    const sender = localDevice || {
      id: 'local',
      name: 'Local',
      ip: '127.0.0.1',
      port: 0,
      role: 'bidirectional',
      tags: [],
      status: 'online',
      lastSeen: Date.now()
    }

    const targets = sendTarget === 'broadcast'
      ? devices
      : devices.filter((d) => selectedDevices.has(d.id))

    if (targets.length === 0) {
      alert('没有可发送的目标设备')
      return
    }

    for (const device of targets) {
      await window.electronAPI?.tcpConnect(device.ip, device.port, sender)
      await window.electronAPI?.tcpSend(device.ip, device.port, message)
    }
  }

  // Subscribe to incoming TCP messages
  useEffect(() => {
    window.electronAPI?.onTcpMessage((message: any, from: any) => {
      if (message?.msg_type === 'SHARE_TEXT') {
        setReceivedMessages((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: 'text',
            content: message.payload?.content || '',
            from: from?.ip || 'unknown',
            fromName: from?.name || 'Unknown',
            timestamp: message.timestamp || Date.now()
          },
          ...prev
        ])
        return
      }

      if (message?.msg_type === 'SHARE_IMAGE' || message?.msg_type === 'SHARE_FILE') {
        const payload = message.payload || {}
        const fileId = payload.fileId
        const totalChunks = payload.totalChunks
        const chunkIndex = payload.chunkIndex
        const data = payload.data
        const fileName = payload.fileName || 'file'
        const fileSize = payload.fileSize || 0
        const type = message.msg_type === 'SHARE_IMAGE' ? 'image' : 'file'

        if (!fileId || typeof totalChunks !== 'number' || typeof chunkIndex !== 'number' || !data) {
          return
        }

        let transfer = incomingTransfersRef.current.get(fileId)
        if (!transfer) {
          transfer = {
            fileId,
            type,
            fileName,
            fileSize,
            totalChunks,
            receivedCount: 0,
            chunks: new Array(totalChunks).fill(null)
          }
          incomingTransfersRef.current.set(fileId, transfer)
        }

        if (!transfer.chunks[chunkIndex]) {
          transfer.chunks[chunkIndex] = uint8FromBase64(data)
          transfer.receivedCount += 1
        }

        if (transfer.receivedCount === transfer.totalChunks) {
          const blob = new Blob(transfer.chunks.filter(Boolean) as Uint8Array[])

          if (transfer.type === 'image') {
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : ''
              setReceivedMessages((prev) => [
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  type: 'image',
                  content: dataUrl,
                  from: from?.ip || 'unknown',
                  fromName: from?.name || 'Unknown',
                  timestamp: message.timestamp || Date.now(),
                  fileName: transfer?.fileName,
                  fileSize: transfer?.fileSize,
                  thumbnail: dataUrl
                },
                ...prev
              ])

              window.electronAPI?.saveReceived?.({
                type: 'image',
                content: dataUrl,
                fileName: transfer?.fileName
              })
            }
            reader.readAsDataURL(blob)
          } else {
            const reader = new FileReader()
            reader.onload = async () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : ''
              const saved = await window.electronAPI?.saveReceived?.({
                type: 'file',
                content: dataUrl,
                fileName: transfer?.fileName
              })

              setReceivedMessages((prev) => [
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  type: 'file',
                  content: saved?.path || '',
                  from: from?.ip || 'unknown',
                  fromName: from?.name || 'Unknown',
                  timestamp: message.timestamp || Date.now(),
                  fileName: transfer?.fileName,
                  fileSize: transfer?.fileSize
                },
                ...prev
              ])
            }
            reader.readAsDataURL(blob)
          }

          incomingTransfersRef.current.delete(fileId)
        }
      }
    })

    return () => {
      window.electronAPI?.removeAllListeners?.('tcp-message')
    }
  }, [])

  const handleTextSend = useCallback(() => {
    if (!textContent.trim()) return

    if (sendTarget === 'selected' && selectedCount === 0) {
      alert('请先选择设备')
      return
    }

    const message = {
      msg_type: 'SHARE_TEXT',
      payload: {
        content: textContent
      }
    }

    sendMessageToTargets(message)

    setTextContent('')
    textInputRef.current?.focus()
  }, [textContent, sendTarget, selectedCount, sendMessageToTargets])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles: SelectedFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      newFiles.push({
        name: file.name,
        path: URL.createObjectURL(file),
        size: file.size,
        file
      })
    }

    setSelectedFiles((prev) => [...prev, ...newFiles])
    e.target.value = '' // Reset input
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles: SelectedFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      newFiles.push({
        name: file.name,
        path: URL.createObjectURL(file),
        size: file.size,
        file
      })
    }

    setSelectedFiles((prev) => [...prev, ...newFiles])
    e.target.value = '' // Reset input
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, type: 'image' | 'file') => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const newFiles: SelectedFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (type === 'image' && !file.type.startsWith('image/')) continue

      newFiles.push({
        name: file.name,
        path: URL.createObjectURL(file),
        size: file.size,
        file
      })
    }

    if (newFiles.length > 0) {
      setContentType(type)
      setSelectedFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleSend = async () => {
    if (contentType === 'text') {
      handleTextSend()
      return
    }

    if (sendTarget === 'selected' && selectedCount === 0) {
      alert('请先选择设备')
      return
    }

    const chunkSize = 256 * 1024
    for (const item of selectedFiles) {
      const arrayBuffer = await item.file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const totalChunks = Math.ceil(bytes.length / chunkSize)
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, bytes.length)
        const chunk = bytes.subarray(start, end)
        const data = base64FromUint8(chunk)

        const message = {
          msg_type: contentType === 'image' ? 'SHARE_IMAGE' : 'SHARE_FILE',
          payload: {
            fileId,
            fileName: item.name,
            fileSize: item.size,
            chunkIndex: i,
            totalChunks,
            data,
            quality: imageQuality
          }
        }

        await sendMessageToTargets(message)
      }
    }

    setSelectedFiles([])
  }

  const handleClearReceived = () => {
    setReceivedMessages([])
    setIsClearDialogOpen(false)
  }

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content)
    // Show toast notification (would use Radix UI Toast)
    console.log('Copied to clipboard')
  }

  const handleSaveImage = (imageUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = fileName
    link.click()
  }

  const handleDownloadFile = (file: SelectedFile) => {
    const link = document.createElement('a')
    link.href = file.path
    link.download = file.name
    link.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Tooltip.Provider>
      <section id="resource-panel" className="panel h-full">
        <div className="h-full p-4">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Receive Panel */}
            <div className="flex flex-col h-full bg-secondary/40 rounded-lg border p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm">分享记录</h3>
                <AlertDialog.Root open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                  <AlertDialog.Trigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      清理
                    </button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded shadow-lg p-6 w-[90vw] max-w-md z-50">
                      <AlertDialog.Title className="font-medium mb-2">
                        清理分享记录
                      </AlertDialog.Title>
                      <AlertDialog.Description className="text-sm text-muted-foreground mb-4">
                        确定要清理所有分享记录吗？此操作无法撤销。
                      </AlertDialog.Description>
                      <div className="flex justify-end gap-2">
                        <AlertDialog.Cancel
                          onClick={() => setIsClearDialogOpen(false)}
                          className="px-4 py-2 text-sm border rounded hover:bg-secondary"
                        >
                          取消
                        </AlertDialog.Cancel>
                        <AlertDialog.Action
                          onClick={handleClearReceived}
                          className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red/90"
                        >
                          清理
                        </AlertDialog.Action>
                      </div>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>
              </div>

              <ScrollArea.Root className="flex-1 min-h-0 border rounded bg-background">
                <ScrollArea.Viewport className="h-full w-full relative">
                  {receivedMessages.length === 0 ? (
                    <div className="empty-state absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                      暂无分享记录
                    </div>
                  ) : (
                    <div className="space-y-2 p-2">
                      {receivedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3 bg-secondary/30 rounded border"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium">
                              {msg.fromName || msg.from}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleString()}
                            </span>
                          </div>

                          {/* Text Content */}
                          {msg.type === 'text' && (
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <p className="text-sm line-clamp-3 cursor-pointer">
                                  {msg.content}
                                </p>
                              </Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content
                                  className="bg-background border rounded shadow-lg px-3 py-2 text-sm z-50 max-w-sm"
                                  sideOffset={5}
                                >
                                  {msg.content}
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          )}

                          {/* Image Content */}
                          {msg.type === 'image' && msg.thumbnail && (
                            <Dialog.Root>
                              <Dialog.Trigger asChild>
                                <img
                                  src={msg.thumbnail}
                                  alt="Received"
                                  className="max-h-32 rounded cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewImage(msg.content)}
                                />
                              </Dialog.Trigger>
                              <Dialog.Portal>
                                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[90vw] max-h-[90vh] z-50">
                                  <img
                                    src={msg.content}
                                    alt="Preview"
                                    className="max-w-full max-h-[80vh] object-contain"
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <button
                                      onClick={() => handleSaveImage(msg.content, msg.fileName || 'image')}
                                      className="px-3 py-1 text-sm border rounded hover:bg-secondary"
                                    >
                                      保存
                                    </button>
                                  </div>
                                </Dialog.Content>
                              </Dialog.Portal>
                            </Dialog.Root>
                          )}

                          {/* File Content */}
                          {msg.type === 'file' && (
                            <div className="flex items-center justify-between p-2 bg-background rounded">
                              <div>
                                <div className="text-sm">{msg.fileName}</div>
                                {msg.fileSize && (
                                  <div className="text-xs text-muted-foreground">
                                    {formatFileSize(msg.fileSize)}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDownloadFile({
                                  name: msg.fileName || 'file',
                                  path: msg.content,
                                  size: msg.fileSize || 0
                                })}
                                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                              >
                                下载
                              </button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-2">
                            {msg.type === 'text' && (
                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <button
                                    onClick={() => handleCopyText(msg.content)}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    复制
                                  </button>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content className="bg-background border rounded px-2 py-1 text-xs z-50">
                                    点击复制到剪贴板
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            )}
                            {msg.type === 'image' && (
                              <button
                                onClick={() => handleSaveImage(msg.content, msg.fileName || 'image')}
                                className="text-xs text-primary hover:underline"
                              >
                                保存
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  className="flex select-none touch-none p-0.5 bg-secondary transition-colors hover:bg-background/50 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                  orientation="vertical"
                >
                  <ScrollArea.Thumb className="flex-1 bg-border rounded-full relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>

            </div>

            {/* Send Panel */}
            <div className="flex flex-col h-full bg-secondary/40 rounded-lg border p-4 overflow-auto">
              <div className="send-panel space-y-4">
              {/* Content Type Tabs */}
              <div className="content-type flex gap-2">
                {(['text', 'image', 'file'] as ContentType[]).map((type) => (
                  <button
                    key={type}
                    className={`px-4 py-2 rounded text-sm transition-colors ${
                      contentType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                    onClick={() => setContentType(type)}
                  >
                    {type === 'text' ? '文字' : type === 'image' ? '图片' : '文件'}
                  </button>
                ))}
              </div>

              {/* Text Content */}
              {contentType === 'text' && (
                <div className="content-editor">
                  <textarea
                    ref={textInputRef}
                    className="w-full h-40 p-3 border rounded resize-none text-sm bg-background"
                    placeholder="输入文字内容... (支持 Ctrl+V 粘贴)"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        handleTextSend()
                      }
                    }}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    按 Ctrl+Enter 发送
                  </div>
                </div>
              )}

              {/* Image Content */}
              {contentType === 'image' && (
                <div className="content-editor space-y-3">
                  <div
                    className="dropzone border-2 border-dashed border-border rounded p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => imageInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'image')}
                  >
                    <p className="text-muted-foreground">
                      拖拽图片到这里，或点击选择
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      支持 Ctrl+V 粘贴图片
                    </p>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>

                  {/* Selected Images */}
                  {selectedFiles.length > 0 && (
                    <div className="selected-files grid grid-cols-3 gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={file.path}
                            alt={file.name}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          <div className="text-xs truncate">{file.name}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compression Options */}
                  <div className="compression-options flex items-center gap-2">
                    <label className="text-sm">压缩:</label>
                    <select
                      value={imageQuality}
                      onChange={(e) => setImageQuality(e.target.value as ImageQuality)}
                      className="px-2 py-1 border rounded text-sm bg-background"
                    >
                      <option value="original">原图</option>
                      <option value="high">高质量</option>
                      <option value="preview">预览</option>
                    </select>
                  </div>
                </div>
              )}

              {/* File Content */}
              {contentType === 'file' && (
                <div className="content-editor space-y-3">
                  <div
                    className="dropzone border-2 border-dashed border-border rounded p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'file')}
                  >
                    <p className="text-muted-foreground">
                      拖拽文件到这里，或点击选择
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="selected-files space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-secondary/50 rounded group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">📄</span>
                            <span className="text-sm truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Send Target */}
              <div className="send-target flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="send-target"
                    value="broadcast"
                    checked={sendTarget === 'broadcast'}
                    onChange={() => setSendTarget('broadcast')}
                    className="accent-primary"
                  />
                  <span className="text-sm">广播</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="send-target"
                    value="selected"
                    checked={sendTarget === 'selected'}
                    onChange={() => setSendTarget('selected')}
                    className="accent-primary"
                  />
                  <span className="text-sm">已选设备</span>
                </label>
                {sendTarget === 'selected' && (
                  <Dialog.Root open={isDevicePickerOpen} onOpenChange={setIsDevicePickerOpen}>
                    <Dialog.Trigger asChild>
                      <button className="text-xs text-primary hover:underline">
                        已选 {selectedCount} 个设备
                      </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                      <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded shadow-lg p-4 w-[420px] max-w-[90vw] z-50">
                        <Dialog.Title className="text-sm font-medium mb-3">选择设备</Dialog.Title>
                        <div className="flex gap-2 mb-3">
                          <button onClick={selectAll} className="text-xs px-2 py-1 border rounded hover:bg-secondary">全选</button>
                          <button onClick={deselectAll} className="text-xs px-2 py-1 border rounded hover:bg-secondary">清空</button>
                        </div>
                        <div className="max-h-60 overflow-auto border rounded">
                          {devices.length === 0 ? (
                            <div className="p-3 text-xs text-muted-foreground">暂无在线设备</div>
                          ) : (
                            devices.map((device) => (
                              <label key={device.id} className="flex items-center gap-2 p-2 border-b last:border-b-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedDevices.has(device.id)}
                                  onChange={() => toggleSelectDevice(device.id)}
                                />
                                <span className="text-sm">{device.name}</span>
                                <span className="text-xs text-muted-foreground">{device.ip}:{device.port}</span>
                              </label>
                            ))
                          )}
                        </div>
                        <div className="flex justify-end mt-3">
                          <Dialog.Close asChild>
                            <button className="btn-primary text-sm">完成</button>
                          </Dialog.Close>
                        </div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={contentType !== 'text' && selectedFiles.length === 0}
                className="w-full py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                发送
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Image Preview Dialog */}
        <Dialog.Root open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[90vw] max-h-[90vh] z-50">
              {previewImage && (
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>
    </Tooltip.Provider>
  )
}
