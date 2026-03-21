import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { toast } from 'sonner'
import { useDeviceStore } from '../../stores/deviceStore'
import textIconPng from '@/assets/text-icon.png'
import imageIconPng from '@/assets/image-icon.png'
import fileIconPng from '@/assets/file-icon.png'
import { Button } from '@/components/ui/button'
import { Collapse } from '@/components/ui/collapse'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useShareStore, type ContentType, type ShareMessage as Message } from '../../stores/shareStore'

type PickedFile = {
  name: string
  path: string
  size: number
  file: File
  sourcePath?: string
}

type MessageGroup = {
  key: string
  items: Message[]
}

const COLLAPSED_MEDIA_PREVIEW_COUNT = 4
const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  text: '文字',
  image: '图片',
  file: '文件'
}

const buildDefaultSubject = (deviceName: string, contentType: ContentType) =>
  `${deviceName || ''}的${CONTENT_TYPE_LABELS[contentType]}分享`

export function ResourcePanel() {
  const [contentType, setContentType] = useState<ContentType>('text')
  const [textContent, setTextContent] = useState('')
  const [shareSubject, setShareSubject] = useState('')
  const [subjectTouched, setSubjectTouched] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([])
  const [sendTarget, setSendTarget] = useState<'broadcast' | 'selected' | 'group'>('broadcast')
  const [groupFilter, setGroupFilter] = useState('all')
  const [groupTargetId, setGroupTargetId] = useState('all')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [historyViewportHeight, setHistoryViewportHeight] = useState(0)

  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const historyViewportRef = useRef<HTMLDivElement>(null)

  const { devices, deviceGroups, selectedDevices, toggleSelectDevice, selectAll, deselectAll, localDevice } =
    useDeviceStore()
  const { messages, prependMessage, clearMessages, updateImageMessage, updateFileMessage } = useShareStore()

  const selectedCount = selectedDevices.size
  const defaultShareSubject = buildDefaultSubject(localDevice?.name?.trim() || '', contentType)

  useEffect(() => {
    if (!subjectTouched) {
      setShareSubject(defaultShareSubject)
    }
  }, [defaultShareSubject, subjectTouched])

  const onlineDevices = devices.filter((d) => d.status !== 'offline')
  const getDeviceKey = (d: { ip: string; port: number }) => `${d.ip}:${d.port}`
  const groupsForFilter = deviceGroups.map((group) => ({
    group,
    devices: onlineDevices.filter((d) => group.deviceKeys.includes(getDeviceKey(d)))
  }))
  const filteredDevices =
    groupFilter === 'all' ? onlineDevices : groupsForFilter.find((entry) => entry.group.id === groupFilter)?.devices || []

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
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

  useEffect(() => {
    const viewport = historyViewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return

    const updateHeight = () => setHistoryViewportHeight(viewport.clientHeight)
    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const senderDevice = () =>
    localDevice || {
      id: 'local',
      name: 'Local',
      ip: '127.0.0.1',
      port: 0,
      role: 'bidirectional' as const,
      tags: [],
      status: 'online' as const,
      lastSeen: Date.now()
    }

  const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const nativePath = (file: File) => window.electronAPI?.getPathForFile(file) || (file as File & { path?: string }).path
  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  const getPreviewImage = (message: Message) => message.content || message.thumbnail || null

  const sendMessageToTargets = useCallback(
    async (message: any) => {
      let targets = sendTarget === 'broadcast' ? devices : devices.filter((d) => selectedDevices.has(getDeviceKey(d)))

      if (sendTarget === 'group') {
        if (groupTargetId === 'all') {
          toast.error('请先选择分组')
          return false
        }

        const targetGroup = deviceGroups.find((group) => group.id === groupTargetId)
        if (!targetGroup || targetGroup.deviceKeys.length === 0) {
          toast.error('所选分组下暂无设备')
          return false
        }

        targets = devices.filter((device) => targetGroup.deviceKeys.includes(getDeviceKey(device)))
      }

      if (targets.length === 0) {
        toast.error('没有可发送的目标设备')
        return false
      }

      let failed = 0
      for (const device of targets) {
        const connected = await window.electronAPI?.tcpConnect(device.ip, device.port, senderDevice())
        if (!connected?.success) {
          failed += 1
          continue
        }

        const sent = await window.electronAPI?.tcpSend(device.ip, device.port, message)
        if (!sent?.success) failed += 1
      }

      if (failed > 0) {
        toast.error(`发送失败：${failed} 台设备`)
        return false
      }

      return true
    },
    [deviceGroups, devices, groupTargetId, selectedDevices, sendTarget]
  )

  const addFiles = (files: FileList, type: 'image' | 'file') => {
    const next: PickedFile[] = []

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      if (type === 'image' && !file.type.startsWith('image/')) continue

      const sourcePath = nativePath(file)
      if (!sourcePath) {
        toast.error(`${type === 'image' ? '图片' : '文件'} ${file.name} 缺少本地路径，暂不支持发送`)
        continue
      }

      next.push({
        name: file.name,
        path: URL.createObjectURL(file),
        size: file.size,
        file,
        sourcePath
      })
    }

    if (next.length > 0) setSelectedFiles((prev) => [...prev, ...next])
  }

  const createThumbnail = (file: PickedFile) =>
    new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(240 / img.width, 240 / img.height, 1)
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法生成缩略图'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => reject(new Error(`无法读取图片 ${file.name}`))
      img.src = file.path
    })

  const handleRevealFile = async (filePath?: string) => {
    if (!filePath) {
      toast.error('当前文件路径无效')
      return
    }
    if (!window.electronAPI?.revealFile) {
      toast.error('打开所在位置功能尚未加载，请重启客户端')
      return
    }

    const result = await window.electronAPI.revealFile(filePath)
    if (!result?.success) toast.error(result?.error || '无法打开文件所在位置')
  }

  const sendText = async () => {
    if (!textContent.trim()) return

    const content = textContent
    const sender = senderDevice()
    const subject = shareSubject.trim() || buildDefaultSubject(sender.name, 'text')
    const ok = await sendMessageToTargets({ msg_type: 'SHARE_TEXT', payload: { content, subject } })

    if (ok) {
      prependMessage({
        id: createMessageId(),
        type: 'text',
        content,
        from: sender.ip,
        fromPort: sender.port,
        fromName: sender.name,
        subject,
        timestamp: Date.now(),
        isSelf: true
      })
      setTextContent('')
      textInputRef.current?.focus()
    }
  }

  const sendImages = async () => {
    if (sendTarget === 'selected' && selectedCount === 0) {
      toast.error('请先选择设备')
      return
    }
    if (sendTarget === 'group' && groupTargetId === 'all') {
      toast.error('请先选择分组')
      return
    }

    let failed = false
    const sender = senderDevice()
    const subject = shareSubject.trim() || buildDefaultSubject(sender.name, 'image')
    const batchId = `img-batch-${Date.now()}-${Math.random().toString(36).slice(2)}`

    for (const file of selectedFiles) {
      if (!file.sourcePath) {
        toast.error(`图片 ${file.name} 缺少本地路径，无法发送`)
        failed = true
        break
      }

      const thumbnail = await createThumbnail(file)
      const shareId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const registered = await window.electronAPI?.registerSharedImage({
        shareId,
        filePath: file.sourcePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || 'image/png',
        thumbnail,
        createdAt: Date.now()
      })

      if (!registered?.success) {
        toast.error(registered?.error || '图片注册失败')
        failed = true
        break
      }

      const ok = await sendMessageToTargets({
        msg_type: 'IMAGE_OFFER',
        payload: {
          shareId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.file.type || 'image/png',
          thumbnail,
          createdAt: Date.now(),
          batchId,
          subject
        }
      })

      if (!ok) {
        failed = true
        break
      }

      prependMessage({
        id: createMessageId(),
        type: 'image',
        content: file.path,
        thumbnail,
        from: sender.ip,
        fromPort: sender.port,
        fromName: sender.name,
        timestamp: Date.now(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || 'image/png',
        shareId,
        subject,
        imageStatus: 'offered',
        progress: 0,
        isSelf: true,
        batchId
      })
    }

    if (!failed) {
      setSelectedFiles([])
      toast.success(`已发送 ${selectedFiles.length} 张图片`)
    }
  }

  const sendFiles = async () => {
    if (sendTarget === 'selected' && selectedCount === 0) {
      toast.error('请先选择设备')
      return
    }
    if (sendTarget === 'group' && groupTargetId === 'all') {
      toast.error('请先选择分组')
      return
    }

    let failed = false
    const sender = senderDevice()
    const subject = shareSubject.trim() || buildDefaultSubject(sender.name, 'file')
    const batchId = `file-batch-${Date.now()}-${Math.random().toString(36).slice(2)}`

    for (const file of selectedFiles) {
      if (!file.sourcePath) {
        toast.error(`文件 ${file.name} 缺少本地路径，无法发送`)
        failed = true
        break
      }

      const shareId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const registered = await window.electronAPI?.registerSharedFile?.({
        shareId,
        filePath: file.sourcePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || 'application/octet-stream',
        createdAt: Date.now()
      })

      if (!registered?.success) {
        toast.error(registered?.error || '文件注册失败')
        failed = true
        break
      }

      const ok = await sendMessageToTargets({
        msg_type: 'FILE_OFFER',
        payload: {
          shareId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.file.type || 'application/octet-stream',
          createdAt: Date.now(),
          batchId,
          subject
        }
      })

      if (!ok) {
        failed = true
        break
      }

      prependMessage({
        id: createMessageId(),
        type: 'file',
        content: file.sourcePath || '',
        from: sender.ip,
        fromPort: sender.port,
        fromName: sender.name,
        timestamp: Date.now(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || 'application/octet-stream',
        shareId,
        subject,
        fileStatus: 'offered',
        progress: 0,
        isSelf: true,
        batchId
      })
    }

    if (!failed) {
      setSelectedFiles([])
      toast.success(`已发送 ${selectedFiles.length} 个文件`)
    }
  }

  const handleSend = async () => {
    if (contentType === 'text') return sendText()
    if (contentType === 'image') return sendImages()
    return sendFiles()
  }

  const handleDownloadImage = async (message: Message) => {
    if (!message.shareId || !message.fromPort) {
      toast.error('当前图片缺少下载信息')
      return
    }

    updateImageMessage({ shareId: message.shareId, fromIp: message.from, fromPort: message.fromPort }, (current) => ({
      ...current,
      imageStatus: 'downloading',
      progress: 0
    }))

    const connected = await window.electronAPI?.tcpConnect(message.from, message.fromPort, senderDevice())
    if (!connected?.success) {
      updateImageMessage({ shareId: message.shareId, fromIp: message.from, fromPort: message.fromPort }, (current) => ({
        ...current,
        imageStatus: current.downloadPath ? 'downloaded' : 'offered',
        progress: 0
      }))
      toast.error('无法连接发送方设备')
      return
    }

    const sent = await window.electronAPI?.tcpSend(message.from, message.fromPort, {
      msg_type: 'IMAGE_DOWNLOAD_REQUEST',
      payload: { shareId: message.shareId }
    })

    if (!sent?.success) {
      updateImageMessage({ shareId: message.shareId, fromIp: message.from, fromPort: message.fromPort }, (current) => ({
        ...current,
        imageStatus: current.downloadPath ? 'downloaded' : 'offered',
        progress: 0
      }))
      toast.error('下载请求发送失败')
    }
  }

  const handleDownloadFile = async (message: Message) => {
    if (!message.shareId || !message.fromPort) {
      toast.error('当前文件缺少下载信息')
      return
    }

    updateFileMessage({ shareId: message.shareId, fromIp: message.from, fromPort: message.fromPort }, (current) => ({
      ...current,
      fileStatus: 'downloading',
      progress: 0
    }))

    const connected = await window.electronAPI?.tcpConnect(message.from, message.fromPort, senderDevice())
    if (!connected?.success) {
      updateFileMessage({ shareId: message.shareId, fromIp: message.from, fromPort: message.fromPort }, (current) => ({
        ...current,
        fileStatus: current.downloadPath ? 'downloaded' : 'offered',
        progress: 0
      }))
      toast.error('无法连接发送方设备')
      return
    }

    const sent = await window.electronAPI?.tcpSend(message.from, message.fromPort, {
      msg_type: 'FILE_DOWNLOAD_REQUEST',
      payload: { shareId: message.shareId }
    })

    if (!sent?.success) {
      updateFileMessage({ shareId: message.shareId, fromIp: message.from, fromPort: message.fromPort }, (current) => ({
        ...current,
        fileStatus: current.downloadPath ? 'downloaded' : 'offered',
        progress: 0
      }))
      toast.error('下载请求发送失败')
    }
  }

  const groupedMessages = useMemo(
    () =>
      messages.reduce<MessageGroup[]>((groups, message) => {
        const key = message.batchId ? `${message.type}:${message.from}:${message.fromPort || 0}:${message.batchId}` : message.id
        const existing = groups.find((group) => group.key === key)
        if (existing) {
          existing.items.push(message)
          return groups
        }

        groups.push({ key, items: [message] })
        return groups
      }, []),
    [messages]
  )

  const setGroupExpanded = (groupKey: string, open: boolean) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (open) next.add(groupKey)
      else next.delete(groupKey)
      return next
    })
  }

  const historyCardBodyMaxHeight = Math.max(200, historyViewportHeight - 140)

  return (
    <section id="resource-panel" className="panel h-full">
      <div className="h-full p-4">
        <div className="grid h-full min-h-0 grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex h-full min-h-0 flex-col rounded-lg border bg-secondary/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">分享记录</h3>
              <AlertDialog.Root open={clearOpen} onOpenChange={setClearOpen}>
                <AlertDialog.Trigger asChild>
                  <Button className="text-xs text-muted-foreground hover:text-foreground" size={"xs"}>清理</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Portal>
                  <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                  <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded border bg-background p-6 shadow-lg">
                    <AlertDialog.Title className="mb-2 font-medium">清理分享记录</AlertDialog.Title>
                    <AlertDialog.Description className="mb-4 text-sm text-muted-foreground">
                      确定要清理所有分享记录吗？此操作无法撤销。
                    </AlertDialog.Description>
                    <div className="flex justify-end gap-2">
                      <AlertDialog.Cancel className="rounded border px-4 py-2 text-sm hover:bg-secondary">
                        取消
                      </AlertDialog.Cancel>
                      <AlertDialog.Action
                        onClick={() => {
                          clearMessages()
                          setClearOpen(false)
                        }}
                        className="rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red/90"
                      >
                        清理
                      </AlertDialog.Action>
                    </div>
                  </AlertDialog.Content>
                </AlertDialog.Portal>
              </AlertDialog.Root>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden rounded bg-background/40">
              <div ref={historyViewportRef} className=" relative h-full overflow-y-auto">
                {groupedMessages.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    暂无分享记录
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groupedMessages.map((group) => {
                      const first = group.items[0]
                      const isBatch = group.items.length > 1
                      const isExpanded = expandedGroups.has(group.key)
                      const offeredFiles = group.items.filter(
                        (item) => item.type === 'file' && item.fileStatus === 'offered' && !item.isSelf
                      )

                      return (
                        <Collapse.Root
                          key={group.key}
                          open={isExpanded}
                          onOpenChange={(open) => setGroupExpanded(group.key, open)}
                        >
                          <article className="rounded-xl border bg-background shadow-sm">
                            <Collapse.Trigger className="w-full px-4 py-3 hover:bg-background/80">
                              <div className="flex min-w-0 items-start gap-3">
                                <img
                                  src={
                                    first.type === 'text'
                                      ? textIconPng
                                      : first.type === 'image'
                                      ? imageIconPng
                                      : fileIconPng
                                  }
                                  alt={first.type}
                                  className="h-10 w-10 shrink-0 rounded-md p-1"
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">
                                        {first.subject || buildDefaultSubject(first.fromName || first.from, first.type)}
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {first.fromName || first.from}
                                      </div>
                                    </div>
                                    {first.isSelf && (
                                      <span className="shrink-0 rounded-md border border-green-200 bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                        本机
                                      </span>
                                    )}
                                    <span className="shrink-0 rounded-md border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                                      {first.type === 'text' ? '文字' : first.type === 'image' ? '图片' : '文件'}
                                      {isBatch ? ` · ${group.items.length}` : ''}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(first.timestamp).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </Collapse.Trigger>

                            <Collapse.Content className="px-4 pb-4">
                              <div className="overflow-hidden rounded-lg border bg-background/70 p-3">
                                <div
                                  className="space-y-3 overflow-y-auto"
                                  style={{ maxHeight: `${historyCardBodyMaxHeight - 24}px` }}
                                >
                                  {first.type === 'text' && (
                                    <div>
                                      <Button
                                        onClick={() => {
                                          navigator.clipboard.writeText(first.content)
                                          toast.success('已复制到剪贴板')
                                        }}
                                        size={"xs"}
                                        className="text-xs text-primary"
                                      >
                                        复制
                                      </Button>
                                      <p
                                        className="break-words whitespace-pre-wrap text-sm"
                                        style={
                                          isExpanded
                                            ? undefined
                                            : {
                                                display: '-webkit-box',
                                                WebkitLineClamp: 4,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                              }
                                        }
                                      >
                                        {first.content}
                                      </p>
                                    </div>
                                  )}

                                  {first.type === 'image' && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        {group.items.filter((item) => item.type === 'image' && item.imageStatus === 'offered' && !item.isSelf).length > 1 && (
                                          <Button
                                            onClick={() => {
                                              for (const item of group.items) {
                                                if (item.type === 'image' && item.imageStatus === 'offered' && !item.isSelf) {
                                                  void handleDownloadImage(item)
                                                }
                                              }
                                            }}
                                            size={"xs"}
                                            className="text-xs text-primary"
                                          >
                                            下载全部
                                          </Button>
                                        )}

                                        {isBatch && <div className="text-xs text-muted-foreground">本次共 {group.items.length} 张图片</div>}
                                      </div>
                                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {group.items
                                          .slice(0, isExpanded ? group.items.length : COLLAPSED_MEDIA_PREVIEW_COUNT)
                                          .map((msg) => (
                                            <div key={msg.id} className="space-y-2 rounded border bg-background/90 p-2">
                                              {msg.thumbnail && (
                                                <img
                                                  src={msg.thumbnail}
                                                  alt="offer"
                                                  className={`${isExpanded ? 'max-h-40' : 'h-16'} w-full cursor-pointer rounded object-cover hover:opacity-80`}
                                                  onClick={() => setPreviewImage(getPreviewImage(msg))}
                                                />
                                              )}
                                              <div className="break-all text-sm">{msg.fileName}</div>
                                              <div className="text-xs text-muted-foreground">{formatSize(msg.fileSize || 0)}</div>
                                              <div className="flex flex-wrap items-center gap-2">
                                                {msg.imageStatus === 'offered' && !msg.isSelf && (
                                                  <Button
                                                    onClick={() => handleDownloadImage(msg)}
                                                    className="text-xs text-primary"
                                                    size={"xs"}
                                                  >
                                                    下载原图
                                                  </Button>
                                                )}
                                                {msg.imageStatus === 'downloading' && (
                                                  <span className="text-xs text-muted-foreground">下载中 {msg.progress || 0}%</span>
                                                )}
                                                {msg.imageStatus === 'downloaded' && (
                                                  <Button
                                                    onClick={() => handleSaveImage(msg.content, msg.fileName || 'image')}
                                                    className="text-xs text-primary"
                                                    size={"xs"}
                                                  >
                                                    另存为
                                                  </Button>
                                                )}
                                                {msg.imageStatus === 'downloaded' && msg.downloadPath && (
                                                  <Button
                                                    onClick={() => handleRevealFile(msg.downloadPath)}
                                                    className="text-xs text-primary"
                                                    size={"xs"}
                                                  >
                                                    打开所在位置
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {first.type === 'file' && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        {offeredFiles.length > 1 && (
                                          <Button
                                            onClick={() => {
                                              for (const item of offeredFiles) void handleDownloadFile(item)
                                            }}
                                            size={"xs"}
                                            className="text-xs text-primary"
                                          >
                                            下载全部
                                          </Button>
                                        )}

                                        {isBatch && <div className="text-xs text-muted-foreground">本次共 {group.items.length} 个文件</div>}
                                      </div>

                                      {group.items
                                        .slice(0, isExpanded ? group.items.length : COLLAPSED_MEDIA_PREVIEW_COUNT)
                                        .map((msg) => (
                                          <div
                                            key={msg.id}
                                            className="flex items-center justify-between gap-3 rounded border bg-background/90 p-1"
                                          >
                                            <div className="flex min-w-0 gap-3">
                                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-secondary text-[10px] font-semibold tracking-wide text-muted-foreground">
                                                FILE
                                              </div>
                                              <div className="min-w-0">
                                                <div className="break-all text-sm">{msg.fileName}</div>
                                                <div className="text-xs text-muted-foreground">{formatSize(msg.fileSize || 0)}</div>
                                              </div>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                              {msg.fileStatus === 'offered' && !msg.isSelf && (
                                                <Button
                                                  onClick={() => handleDownloadFile(msg)}
                                                  className="text-xs text-primary"
                                                  size={"xs"}
                                                >
                                                  下载
                                                </Button>
                                              )}
                                              {msg.fileStatus === 'downloading' && (
                                                <span className="text-xs text-muted-foreground">下载中 {msg.progress || 0}%</span>
                                              )}
                                              {msg.fileStatus === 'downloaded' && msg.downloadPath && (
                                                <Button
                                                  onClick={() => handleRevealFile(msg.downloadPath)}
                                                  className="text-xs text-primary"
                                                  size={"xs"}
                                                >
                                                  打开所在位置
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Collapse.Content>
                          </article>
                        </Collapse.Root>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-secondary/40">
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 rounded-lg px-3">
                  <label className="text-sm font-medium">主题名称</label>
                  <Input
                    className="h-8 flex-1"
                    value={shareSubject}
                    onChange={(e) => {
                      setShareSubject(e.target.value)
                      setSubjectTouched(true)
                    }}
                    placeholder={defaultShareSubject}
                  />
                </div>

                <div className="flex gap-2">
                  {(['text', 'image', 'file'] as ContentType[]).map((type) => (
                    <Button
                      key={type}
                      className={`rounded px-6 py-2 text-sm ${
                        contentType === type ? 'bg-primary text-primary-foreground hover:bg-primary' : 'bg-secondary hover:bg-secondary'
                      }`}
                      size={"sm"}
                      onClick={() => {
                        setContentType(type)
                        setSelectedFiles([])
                      }}
                    >
                      {type === 'text' ? '文字' : type === 'image' ? '图片' : '文件'}
                    </Button>
                  ))}
                </div>

                {contentType === 'text' && (
                  <div>
                    <Textarea
                      ref={textInputRef}
                      className="h-40 w-full resize-none rounded border bg-background p-3 text-sm"
                      placeholder="输入文字内容... (支持 Ctrl+V 粘贴)"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.ctrlKey && e.key === 'Enter') void sendText()
                      }}
                    />
                    <div className="mt-1 text-xs text-muted-foreground">按 Ctrl+Enter 发送</div>
                  </div>
                )}

                {contentType === 'image' && (
                  <div className="space-y-3">
                    <div
                      className="cursor-pointer rounded border-2 border-dashed border-border p-8 text-center hover:border-primary/50"
                      onClick={() => imageInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        addFiles(e.dataTransfer.files, 'image')
                      }}
                    >
                      <p className="text-muted-foreground">拖拽图片到这里，或点击选择</p>
                      <p className="mt-1 text-xs text-muted-foreground">可一次发送多张图片，接收方按张下载原图</p>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) addFiles(e.target.files, 'image')
                          e.target.value = ''
                        }}
                      />
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">已选 {selectedFiles.length} 张图片</div>
                        <div className=" max-h-60 overflow-y-auto pr-1">
                          <div className="grid grid-cols-3 gap-2 p-1">
                            {selectedFiles.map((file, index) => (
                              <div key={`${file.name}-${index}`} className="group relative">
                                <img src={file.path} alt={file.name} className="h-20 w-full rounded border object-cover" />
                                <Button
                                  onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white opacity-0 group-hover:opacity-100"
                                >
                                  ×
                                </Button>
                                <div className="truncate text-xs">{file.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {contentType === 'file' && (
                  <div className="space-y-3">
                    <div
                      className="cursor-pointer rounded border-2 border-dashed border-border p-8 text-center hover:border-primary/50"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        addFiles(e.dataTransfer.files, 'file')
                      }}
                    >
                      <p className="text-muted-foreground">拖拽文件到这里，或点击选择</p>
                      <p className="mt-1 text-xs text-muted-foreground">可一次发送多个文件，接收方可下载全部或单个下载</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) addFiles(e.target.files, 'file')
                          e.target.value = ''
                        }}
                      />
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">已选 {selectedFiles.length} 个文件</div>
                        <div className="max-h-60 overflow-y-auto pr-1">
                          <div className="space-y-1">
                            {selectedFiles.map((file, index) => (
                              <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded bg-secondary p-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm">{file.name}</div>
                                  <div className="text-xs text-muted-foreground">{formatSize(file.size)}</div>
                                </div>
                                <Button
                                  onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                                  className="text-red-500"
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <RadioGroup
                  value={sendTarget}
                  onValueChange={(value) => setSendTarget(value as typeof sendTarget)}
                  className="flex h-6 items-center gap-4"
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem value="broadcast" />
                    <span className="text-sm">广播</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem value="selected" />
                    <span className="text-sm">已选设备</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem value="group" />
                    <span className="text-sm">分组设备</span>
                  </label>

                  {sendTarget === 'selected' && (
                    <Dialog.Root open={pickerOpen} onOpenChange={setPickerOpen}>
                      <Dialog.Trigger asChild>
                        <Button className="text-xs text-primary">已选 {selectedCount} 个设备</Button>
                      </Dialog.Trigger>
                      <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded border bg-background p-4 shadow-lg">
                          <Dialog.Title className="mb-3 text-sm font-medium">选择设备</Dialog.Title>
                          <div className="mb-3 flex gap-2">
                            <Button onClick={selectAll} className="rounded border px-2 py-1 text-xs hover:bg-secondary">
                              全选
                            </Button>
                            <Button onClick={deselectAll} className="rounded border px-2 py-1 text-xs hover:bg-secondary">
                              清空
                            </Button>
                          </div>
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">分组</span>
                            <Select.Root value={groupFilter} onValueChange={setGroupFilter}>
                              <Select.Trigger className="flex w-48 items-center justify-between gap-2 rounded border bg-background px-2 py-1 text-xs">
                                <Select.Value />
                                <Select.Icon>▼</Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Content
                                  className="z-50 rounded border bg-background shadow-lg"
                                  position="popper"
                                  side="bottom"
                                  align="start"
                                  sideOffset={4}
                                  avoidCollisions={false}
                                >
                                  <Select.Viewport className="p-1">
                                    <Select.Item value="all" className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-accent">
                                      <Select.ItemText>全部在线分组</Select.ItemText>
                                    </Select.Item>
                                    {groupsForFilter.map(({ group }) => (
                                      <Select.Item
                                        key={group.id}
                                        value={group.id}
                                        className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-accent"
                                      >
                                        <Select.ItemText>{group.name}</Select.ItemText>
                                      </Select.Item>
                                    ))}
                                  </Select.Viewport>
                                </Select.Content>
                              </Select.Portal>
                            </Select.Root>
                          </div>
                          <div className="max-h-60 overflow-y-auto rounded border">
                            {filteredDevices.length === 0 ? (
                              <div className="p-3 text-xs text-muted-foreground">暂无在线设备</div>
                            ) : (
                              filteredDevices.map((device) => (
                                <label
                                  key={device.id}
                                  className="flex cursor-pointer items-center gap-2 border-b p-2 last:border-b-0"
                                >
                                  <Checkbox
                                    checked={selectedDevices.has(getDeviceKey(device))}
                                    onCheckedChange={() => toggleSelectDevice(getDeviceKey(device))}
                                  />
                                  <span className="text-sm">{device.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {device.ip}:{device.port}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Dialog.Close asChild>
                              <Button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">完成</Button>
                            </Dialog.Close>
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  )}

                  {sendTarget === 'group' && (
                    <Select.Root value={groupTargetId} onValueChange={setGroupTargetId}>
                      <Select.Trigger className="flex w-28 items-center justify-between gap-2 rounded border bg-background px-2 py-1 text-xs">
                        <Select.Value />
                        <Select.Icon>▼</Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="z-50 rounded border bg-background shadow-lg"
                          position="popper"
                          side="bottom"
                          align="start"
                          sideOffset={4}
                          avoidCollisions={false}
                        >
                          <Select.Viewport className="p-1">
                            <Select.Item value="all" className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-accent">
                              <Select.ItemText>选择分组</Select.ItemText>
                            </Select.Item>
                            {groupsForFilter.map(({ group }) => (
                              <Select.Item
                                key={group.id}
                                value={group.id}
                                className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-accent"
                              >
                                <Select.ItemText>{group.name}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  )}
                </RadioGroup>

                <Button
                  onClick={() => void handleSend()}
                  disabled={contentType === 'text' ? !textContent.trim() : selectedFiles.length === 0}
                  className="w-full rounded bg-primary py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog.Root open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] max-w-[90vw] -translate-x-1/2 -translate-y-1/2">
            {previewImage && <img src={previewImage} alt="Preview" className="max-h-[80vh] max-w-full object-contain" />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function handleSaveImage(imageUrl: string, fileName: string) {
  const link = document.createElement('a')
  link.href = imageUrl
  link.download = fileName
  link.click()
}


