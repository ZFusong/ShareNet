import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { useDeviceStore } from "../../stores/deviceStore";
import textIconPng from "@/assets/text-icon.png";
import imageIconPng from "@/assets/image-icon.png";
import fileIconPng from "@/assets/file-icon.png";
import { Button } from "@/components/ui/button";
import { Collapse } from "@/components/ui/collapse";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useShareStore,
  type ContentType,
  type ShareMessage as Message,
} from "../../stores/shareStore";

type PickedFile = {
  name: string;
  path: string;
  size: number;
  file: File;
  sourcePath?: string;
};

type MessageGroup = {
  key: string;
  items: Message[];
};

type HistoryFilter = "received" | "sent";

const COLLAPSED_MEDIA_PREVIEW_COUNT = 4;
const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  text: "文字",
  image: "图片",
  file: "文件",
};

const HISTORY_FILTER_OPTIONS: Array<{ key: HistoryFilter; label: string }> = [
  { key: "received", label: "接收的" },
  { key: "sent", label: "我发送的" },
];

const buildDefaultSubject = (deviceName: string, contentType: ContentType) =>
  `${deviceName || ""}的${CONTENT_TYPE_LABELS[contentType]}分享`;

export function ResourcePanel() {
  const [contentType, setContentType] = useState<ContentType>("text");
  const [textContent, setTextContent] = useState("");
  const [shareSubject, setShareSubject] = useState("");
  const [subjectTouched, setSubjectTouched] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([]);
  const [sendTarget, setSendTarget] = useState<
    "broadcast" | "selected" | "group"
  >("broadcast");
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupTargetId, setGroupTargetId] = useState("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("received");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [historyViewportHeight, setHistoryViewportHeight] = useState(0);

  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const historyViewportRef = useRef<HTMLDivElement>(null);

  const {
    devices,
    deviceGroups,
    selectedDevices,
    toggleSelectDevice,
    selectAll,
    deselectAll,
    localDevice,
  } = useDeviceStore();
  const {
    messages,
    prependMessage,
    clearMessages,
    updateImageMessage,
    updateFileMessage,
  } = useShareStore();

  const selectedCount = selectedDevices.size;
  const defaultShareSubject = buildDefaultSubject(
    localDevice?.name?.trim() || "",
    contentType,
  );

  useEffect(() => {
    if (!subjectTouched) {
      setShareSubject(defaultShareSubject);
    }
  }, [defaultShareSubject, subjectTouched]);

  useEffect(() => {
    if (!composerOpen) return;
    const frame = window.requestAnimationFrame(() =>
      textInputRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [composerOpen, contentType]);

  const onlineDevices = devices.filter((d) => d.status !== "offline");
  const getDeviceKey = (d: { ip: string; port: number }) => `${d.ip}:${d.port}`;
  const groupsForFilter = deviceGroups.map((group) => ({
    group,
    devices: onlineDevices.filter((d) =>
      group.deviceKeys.includes(getDeviceKey(d)),
    ),
  }));
  const filteredDevices =
    groupFilter === "all"
      ? onlineDevices
      : groupsForFilter.find((entry) => entry.group.id === groupFilter)
          ?.devices || [];

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type === "text/plain") {
          item.getAsString((text) => {
            setContentType("text");
            setTextContent((prev) => prev + text);
          });
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    const viewport = historyViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const updateHeight = () => setHistoryViewportHeight(viewport.clientHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const senderDevice = () =>
    localDevice || {
      id: "local",
      name: "Local",
      ip: "127.0.0.1",
      port: 0,
      role: "bidirectional" as const,
      tags: [],
      status: "online" as const,
      lastSeen: Date.now(),
    };

  const createMessageId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const nativePath = (file: File) =>
    window.electronAPI?.getPathForFile(file) ||
    (file as File & { path?: string }).path;
  const formatSize = (bytes: number) =>
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  const getPreviewImage = (message: Message) =>
    message.content || message.thumbnail || null;

  const sendMessageToTargets = useCallback(
    async (message: any) => {
      let targets =
        sendTarget === "broadcast"
          ? devices
          : devices.filter((d) => selectedDevices.has(getDeviceKey(d)));

      if (sendTarget === "group") {
        if (groupTargetId === "all") {
          toast.error("请先选择分组");
          return false;
        }

        const targetGroup = deviceGroups.find(
          (group) => group.id === groupTargetId,
        );
        if (!targetGroup || targetGroup.deviceKeys.length === 0) {
          toast.error("所选分组下暂无设备");
          return false;
        }

        targets = devices.filter((device) =>
          targetGroup.deviceKeys.includes(getDeviceKey(device)),
        );
      }

      if (targets.length === 0) {
        toast.error("没有可发送的目标设备");
        return false;
      }

      let failed = 0;
      for (const device of targets) {
        const connected = await window.electronAPI?.tcpConnect(
          device.ip,
          device.port,
          senderDevice(),
        );
        if (!connected?.success) {
          failed += 1;
          continue;
        }

        const sent = await window.electronAPI?.tcpSend(
          device.ip,
          device.port,
          message,
        );
        if (!sent?.success) failed += 1;
      }

      if (failed > 0) {
        toast.error(`发送失败：${failed} 台设备`);
        return false;
      }

      return true;
    },
    [deviceGroups, devices, groupTargetId, selectedDevices, sendTarget],
  );

  const addFiles = (files: FileList, type: "image" | "file") => {
    const next: PickedFile[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (type === "image" && !file.type.startsWith("image/")) continue;

      const sourcePath = nativePath(file);
      if (!sourcePath) {
        toast.error(
          `${type === "image" ? "图片" : "文件"} ${file.name} 缺少本地路径，暂不支持发送`,
        );
        continue;
      }

      next.push({
        name: file.name,
        path: URL.createObjectURL(file),
        size: file.size,
        file,
        sourcePath,
      });
    }

    if (next.length > 0) setSelectedFiles((prev) => [...prev, ...next]);
  };

  const createThumbnail = (file: PickedFile) =>
    new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(240 / img.width, 240 / img.height, 1);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法生成缩略图"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error(`无法读取图片 ${file.name}`));
      img.src = file.path;
    });

  const handleRevealFile = async (filePath?: string) => {
    if (!filePath) {
      toast.error("当前文件路径无效");
      return;
    }
    if (!window.electronAPI?.revealFile) {
      toast.error("打开所在位置功能尚未加载，请重启客户端");
      return;
    }

    const result = await window.electronAPI.revealFile(filePath);
    if (!result?.success) toast.error(result?.error || "无法打开文件所在位置");
  };

  const sendText = async () => {
    if (!textContent.trim()) return false;

    const content = textContent;
    const sender = senderDevice();
    const subject =
      shareSubject.trim() || buildDefaultSubject(sender.name, "text");
    const ok = await sendMessageToTargets({
      msg_type: "SHARE_TEXT",
      payload: { content, subject },
    });

    if (!ok) return false;

    prependMessage({
      id: createMessageId(),
      type: "text",
      content,
      from: sender.ip,
      fromPort: sender.port,
      fromName: sender.name,
      subject,
      timestamp: Date.now(),
      isSelf: true,
    });
    setTextContent("");
    return true;
  };

  const sendImages = async () => {
    if (sendTarget === "selected" && selectedCount === 0) {
      toast.error("请先选择设备");
      return false;
    }
    if (sendTarget === "group" && groupTargetId === "all") {
      toast.error("请先选择分组");
      return false;
    }

    let failed = false;
    const sender = senderDevice();
    const subject =
      shareSubject.trim() || buildDefaultSubject(sender.name, "image");
    const batchId = `img-batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    for (const file of selectedFiles) {
      if (!file.sourcePath) {
        toast.error(`图片 ${file.name} 缺少本地路径，无法发送`);
        failed = true;
        break;
      }

      const thumbnail = await createThumbnail(file);
      const shareId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const registered = await window.electronAPI?.registerSharedImage({
        shareId,
        filePath: file.sourcePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || "image/png",
        thumbnail,
        createdAt: Date.now(),
      });

      if (!registered?.success) {
        toast.error(registered?.error || "图片注册失败");
        failed = true;
        break;
      }

      const ok = await sendMessageToTargets({
        msg_type: "IMAGE_OFFER",
        payload: {
          shareId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.file.type || "image/png",
          thumbnail,
          createdAt: Date.now(),
          batchId,
          subject,
        },
      });

      if (!ok) {
        failed = true;
        break;
      }

      prependMessage({
        id: createMessageId(),
        type: "image",
        content: file.path,
        thumbnail,
        from: sender.ip,
        fromPort: sender.port,
        fromName: sender.name,
        timestamp: Date.now(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || "image/png",
        shareId,
        subject,
        imageStatus: "offered",
        progress: 0,
        isSelf: true,
        batchId,
      });
    }

    if (failed) return false;

    setSelectedFiles([]);
    toast.success(`已发送 ${selectedFiles.length} 张图片`);
    return true;
  };

  const sendFiles = async () => {
    if (sendTarget === "selected" && selectedCount === 0) {
      toast.error("请先选择设备");
      return false;
    }
    if (sendTarget === "group" && groupTargetId === "all") {
      toast.error("请先选择分组");
      return false;
    }

    let failed = false;
    const sender = senderDevice();
    const subject =
      shareSubject.trim() || buildDefaultSubject(sender.name, "file");
    const batchId = `file-batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    for (const file of selectedFiles) {
      if (!file.sourcePath) {
        toast.error(`文件 ${file.name} 缺少本地路径，无法发送`);
        failed = true;
        break;
      }

      const shareId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const registered = await window.electronAPI?.registerSharedFile?.({
        shareId,
        filePath: file.sourcePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || "application/octet-stream",
        createdAt: Date.now(),
      });

      if (!registered?.success) {
        toast.error(registered?.error || "文件注册失败");
        failed = true;
        break;
      }

      const ok = await sendMessageToTargets({
        msg_type: "FILE_OFFER",
        payload: {
          shareId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.file.type || "application/octet-stream",
          createdAt: Date.now(),
          batchId,
          subject,
        },
      });

      if (!ok) {
        failed = true;
        break;
      }

      prependMessage({
        id: createMessageId(),
        type: "file",
        content: file.sourcePath || "",
        from: sender.ip,
        fromPort: sender.port,
        fromName: sender.name,
        timestamp: Date.now(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.file.type || "application/octet-stream",
        shareId,
        subject,
        fileStatus: "offered",
        progress: 0,
        isSelf: true,
        batchId,
      });
    }

    if (failed) return false;

    setSelectedFiles([]);
    toast.success(`已发送 ${selectedFiles.length} 个文件`);
    return true;
  };

  const handleSend = async () => {
    const ok =
      contentType === "text"
        ? await sendText()
        : contentType === "image"
          ? await sendImages()
          : await sendFiles();
    if (ok) {
      setComposerOpen(false);
      setTimeout(() => textInputRef.current?.focus(), 0);
    }
  };

  const handleDownloadImage = async (message: Message) => {
    if (!message.shareId || !message.fromPort) {
      toast.error("当前图片缺少下载信息");
      return;
    }

    updateImageMessage(
      {
        shareId: message.shareId,
        fromIp: message.from,
        fromPort: message.fromPort,
      },
      (current) => ({
        ...current,
        imageStatus: "downloading",
        progress: 0,
      }),
    );

    const connected = await window.electronAPI?.tcpConnect(
      message.from,
      message.fromPort,
      senderDevice(),
    );
    if (!connected?.success) {
      updateImageMessage(
        {
          shareId: message.shareId,
          fromIp: message.from,
          fromPort: message.fromPort,
        },
        (current) => ({
          ...current,
          imageStatus: current.downloadPath ? "downloaded" : "offered",
          progress: 0,
        }),
      );
      toast.error("无法连接发送方设备");
      return;
    }

    const sent = await window.electronAPI?.tcpSend(
      message.from,
      message.fromPort,
      {
        msg_type: "IMAGE_DOWNLOAD_REQUEST",
        payload: { shareId: message.shareId },
      },
    );

    if (!sent?.success) {
      updateImageMessage(
        {
          shareId: message.shareId,
          fromIp: message.from,
          fromPort: message.fromPort,
        },
        (current) => ({
          ...current,
          imageStatus: current.downloadPath ? "downloaded" : "offered",
          progress: 0,
        }),
      );
      toast.error("下载请求发送失败");
    }
  };

  const handleDownloadFile = async (message: Message) => {
    if (!message.shareId || !message.fromPort) {
      toast.error("当前文件缺少下载信息");
      return;
    }

    updateFileMessage(
      {
        shareId: message.shareId,
        fromIp: message.from,
        fromPort: message.fromPort,
      },
      (current) => ({
        ...current,
        fileStatus: "downloading",
        progress: 0,
      }),
    );

    const connected = await window.electronAPI?.tcpConnect(
      message.from,
      message.fromPort,
      senderDevice(),
    );
    if (!connected?.success) {
      updateFileMessage(
        {
          shareId: message.shareId,
          fromIp: message.from,
          fromPort: message.fromPort,
        },
        (current) => ({
          ...current,
          fileStatus: current.downloadPath ? "downloaded" : "offered",
          progress: 0,
        }),
      );
      toast.error("无法连接发送方设备");
      return;
    }

    const sent = await window.electronAPI?.tcpSend(
      message.from,
      message.fromPort,
      {
        msg_type: "FILE_DOWNLOAD_REQUEST",
        payload: { shareId: message.shareId },
      },
    );

    if (!sent?.success) {
      updateFileMessage(
        {
          shareId: message.shareId,
          fromIp: message.from,
          fromPort: message.fromPort,
        },
        (current) => ({
          ...current,
          fileStatus: current.downloadPath ? "downloaded" : "offered",
          progress: 0,
        }),
      );
      toast.error("下载请求发送失败");
    }
  };

  const visibleMessages = useMemo(
    () =>
      messages.filter((message) =>
        historyFilter === "sent" ? Boolean(message.isSelf) : !message.isSelf,
      ),
    [historyFilter, messages],
  );

  const groupedMessages = useMemo(
    () =>
      visibleMessages.reduce<MessageGroup[]>((groups, message) => {
        const key = message.batchId
          ? `${message.type}:${message.from}:${message.fromPort || 0}:${message.batchId}`
          : message.id;
        const existing = groups.find((group) => group.key === key);
        if (existing) {
          existing.items.push(message);
          return groups;
        }

        groups.push({ key, items: [message] });
        return groups;
      }, []),
    [visibleMessages],
  );

  const setGroupExpanded = (groupKey: string, open: boolean) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (open) next.add(groupKey);
      else next.delete(groupKey);
      return next;
    });
  };

  const historyCardBodyMaxHeight = Math.max(240, historyViewportHeight - 220);
  const historySummaryTitle =
    historyFilter === "received" ? "接收资源流" : "发出资源流";

  return (
    <section id="resource-panel" className="panel h-full">
      <div className="resource-panel-shell h-full p-4">
        <div className="grid h-full min-h-0 grid-cols-1">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#d8e1ec] bg-[#f8fbff] shadow-[rgba(15,23,42,0.12)_0px_20px_48px,rgba(255,255,255,0.85)_0px_0px_0px_1px_inset]">
            <div className="resource-panel-topbar border-b border-[#d8e1ec] px-5 py-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-row items-stretch gap-3 justify-between">
                  <div className="flex flex-wrap gap-2">
                    {HISTORY_FILTER_OPTIONS.map((option) => {
                      const active = historyFilter === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setHistoryFilter(option.key)}
                          className={`group rounded-full border px-4 py-2 text-left transition ${
                            active
                              ? "border-[#0ea5e9] bg-[#ffffff] text-[#0f172a] shadow-[rgba(14,165,233,0.14)_0px_8px_24px]"
                              : "border-[#d8e1ec] bg-[#ffffff] text-[#475569] hover:border-[#0ea5e9]/50 hover:text-[#0f172a]"
                          }`}
                        >
                          <div className="text-[13px] font-medium">
                            {option.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <AlertDialog.Root
                      open={clearOpen}
                      onOpenChange={setClearOpen}
                    >
                      <AlertDialog.Trigger asChild>
                        <Button
                          className="rounded-md border border-[#d8e1ec] bg-transparent px-4 text-xs text-[#0f172a] hover:bg-sky-50"
                          size={"sm"}
                        >
                          清理记录
                        </Button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Portal>
                        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-white/72 backdrop-blur-sm" />
                        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#d8e1ec] bg-[#ffffff] p-6 text-[#0f172a] shadow-[rgba(15,23,42,0.12)_0px_20px_48px]">
                          <AlertDialog.Title className="mb-2 text-[24px] font-semibold leading-[1.2] tracking-[-0.6px]">
                            清理分享记录
                          </AlertDialog.Title>
                          <AlertDialog.Description className="mb-5 text-sm leading-6 text-[#475569]">
                            确定要清理所有分享记录吗？此操作无法撤销。
                          </AlertDialog.Description>
                          <div className="flex justify-end gap-2">
                            <AlertDialog.Cancel className="rounded-md border border-[#d8e1ec] px-4 py-2 text-sm text-[#0f172a] hover:bg-sky-50">
                              取消
                            </AlertDialog.Cancel>
                            <AlertDialog.Action
                              onClick={() => {
                                clearMessages();
                                setClearOpen(false);
                              }}
                              className="rounded-md border border-[#dc2626] px-4 py-2 text-sm text-[#dc2626] hover:bg-[#dc2626]/10"
                            >
                              清理
                            </AlertDialog.Action>
                          </div>
                        </AlertDialog.Content>
                      </AlertDialog.Portal>
                    </AlertDialog.Root>
                    <Button
                      onClick={() => setComposerOpen(true)}
                      className="rounded-md border border-[#0ea5e9] bg-[#ffffff] px-5 text-sm font-medium text-[#0369a1] hover:bg-sky-50"
                      size={"sm"}
                    >
                      创建分享
                    </Button>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex-1 min-h-0 p-5">
              <div className="flex h-full min-h-0 overflow-hidden rounded-[20px] border border-[#d8e1ec] bg-[#ffffff]">
                <div
                  ref={historyViewportRef}
                  className="relative h-full w-full overflow-y-auto p-4 sm:p-5"
                >
                  {groupedMessages.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                      <div className="text-[24px] font-medium leading-[1.2] tracking-[-0.6px] text-[#0f172a]">
                        {historyFilter === "received"
                          ? "暂时没有接收记录"
                          : "暂时没有自己发送的记录"}
                      </div>
                      <div className="max-w-md text-sm leading-6 text-[#475569]">
                        {historyFilter === "received"
                          ? "切换到“我发送的”可以查看自己分享出去的内容。"
                          : "点击右上角“创建分享”即可发起新的分享。"}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedMessages.map((group) => {
                        const first = group.items[0];
                        const isBatch = group.items.length > 1;
                        const isExpanded = expandedGroups.has(group.key);
                        const offeredFiles = group.items.filter(
                          (item) =>
                            item.type === "file" &&
                            item.fileStatus === "offered" &&
                            !item.isSelf,
                        );

                        return (
                          <Collapse.Root
                            key={group.key}
                            open={isExpanded}
                            onOpenChange={(open) =>
                              setGroupExpanded(group.key, open)
                            }
                          >
                            <article className="overflow-hidden rounded-[18px] border border-[#d8e1ec] bg-[#f8fbff] transition hover:border-[#0ea5e9]/60 hover:shadow-[rgba(14,165,233,0.12)_0px_10px_30px]">
                              <Collapse.Trigger className="w-full px-4 py-4 text-left hover:bg-white/[0.02]">
                                <div className="flex min-w-0 items-start gap-4">
                                  <img
                                    src={
                                      first.type === "text"
                                        ? textIconPng
                                        : first.type === "image"
                                          ? imageIconPng
                                          : fileIconPng
                                    }
                                    alt={first.type}
                                    className="h-12 w-12 shrink-0 rounded-lg border border-[#d8e1ec] bg-[#ffffff] p-2"
                                  />
                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                      <div className="min-w-0">
                                        <div className="truncate text-base font-medium text-[#0f172a]">
                                          {first.subject ||
                                            buildDefaultSubject(
                                              first.fromName || first.from,
                                              first.type,
                                            )}
                                        </div>
                                        <div className="truncate font-mono text-[12px] text-[#64748b]">
                                          {first.fromName || first.from}
                                        </div>
                                      </div>
                                      {first.isSelf && (
                                        <span className="shrink-0 rounded-full border border-[#0ea5e9]/40 px-2 py-0.5 text-[11px] font-medium text-[#0369a1]">
                                          我发送的
                                        </span>
                                      )}
                                      {!first.isSelf && (
                                        <span className="shrink-0 rounded-full border border-[#d8e1ec] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
                                          已接收
                                        </span>
                                      )}
                                      <span className="shrink-0 rounded-full border border-[#d8e1ec] px-2 py-0.5 text-[11px] text-[#64748b]">
                                        {first.type === "text"
                                          ? "文字"
                                          : first.type === "image"
                                            ? "图片"
                                            : "文件"}
                                        {isBatch
                                          ? ` · ${group.items.length}`
                                          : ""}
                                      </span>
                                    </div>
                                    <div className="font-mono text-[12px] text-[#64748b]">
                                      {new Date(
                                        first.timestamp,
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </Collapse.Trigger>

                              <Collapse.Content className="px-4 pb-4">
                                <div className="overflow-hidden rounded-xl border border-[#d8e1ec] bg-[#ffffff] p-3">
                                  <div
                                    className="space-y-3 overflow-y-auto"
                                    style={{
                                      maxHeight: `${historyCardBodyMaxHeight - 24}px`,
                                    }}
                                  >
                                    {first.type === "text" && (
                                      <div className="space-y-3">
                                        <Button
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              first.content,
                                            );
                                            toast.success("已复制到剪贴板");
                                          }}
                                          size={"xs"}
                                          className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
                                        >
                                          复制
                                        </Button>
                                        <p
                                          className="break-words whitespace-pre-wrap font-mono text-sm leading-7 text-[#0f172a]"
                                          style={
                                            isExpanded
                                              ? undefined
                                              : {
                                                  display: "-webkit-box",
                                                  WebkitLineClamp: 4,
                                                  WebkitBoxOrient: "vertical",
                                                  overflow: "hidden",
                                                }
                                          }
                                        >
                                          {first.content}
                                        </p>
                                      </div>
                                    )}

                                    {first.type === "image" && (
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {group.items.filter(
                                            (item) =>
                                              item.type === "image" &&
                                              item.imageStatus === "offered" &&
                                              !item.isSelf,
                                          ).length > 1 && (
                                            <Button
                                              onClick={() => {
                                                for (const item of group.items) {
                                                  if (
                                                    item.type === "image" &&
                                                    item.imageStatus ===
                                                      "offered" &&
                                                    !item.isSelf
                                                  ) {
                                                    void handleDownloadImage(
                                                      item,
                                                    );
                                                  }
                                                }
                                              }}
                                              size={"xs"}
                                              className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
                                            >
                                              下载全部
                                            </Button>
                                          )}

                                          {isBatch && (
                                            <div className="text-xs text-[#64748b]">
                                              本次共 {group.items.length} 张图片
                                            </div>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                          {group.items
                                            .slice(
                                              0,
                                              isExpanded
                                                ? group.items.length
                                                : COLLAPSED_MEDIA_PREVIEW_COUNT,
                                            )
                                            .map((msg) => (
                                              <div
                                                key={msg.id}
                                                className="space-y-2 rounded-xl border border-[#d8e1ec] bg-[#f8fbff] p-2.5"
                                              >
                                                {msg.thumbnail && (
                                                  <img
                                                    src={msg.thumbnail}
                                                    alt="offer"
                                                    className={`${isExpanded ? "max-h-44" : "h-24"} w-full cursor-pointer rounded-lg border border-[#d8e1ec] object-cover hover:opacity-80`}
                                                    onClick={() =>
                                                      setPreviewImage(
                                                        getPreviewImage(msg),
                                                      )
                                                    }
                                                  />
                                                )}
                                                <div className="break-all text-sm text-[#0f172a]">
                                                  {msg.fileName}
                                                </div>
                                                <div className="font-mono text-xs text-[#64748b]">
                                                  {formatSize(
                                                    msg.fileSize || 0,
                                                  )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                  {msg.imageStatus ===
                                                    "offered" &&
                                                    !msg.isSelf && (
                                                      <Button
                                                        onClick={() =>
                                                          handleDownloadImage(
                                                            msg,
                                                          )
                                                        }
                                                        className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
                                                        size={"xs"}
                                                      >
                                                        下载原图
                                                      </Button>
                                                    )}
                                                  {msg.imageStatus ===
                                                    "downloading" && (
                                                    <span className="text-xs text-[#64748b]">
                                                      下载中 {msg.progress || 0}
                                                      %
                                                    </span>
                                                  )}
                                                  {msg.imageStatus ===
                                                    "downloaded" && (
                                                    <Button
                                                      onClick={() =>
                                                        handleSaveImage(
                                                          msg.content,
                                                          msg.fileName ||
                                                            "image",
                                                        )
                                                      }
                                                      className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
                                                      size={"xs"}
                                                    >
                                                      另存为
                                                    </Button>
                                                  )}
                                                  {msg.imageStatus ===
                                                    "downloaded" &&
                                                    msg.downloadPath && (
                                                      <Button
                                                        onClick={() =>
                                                          handleRevealFile(
                                                            msg.downloadPath,
                                                          )
                                                        }
                                                        className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
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

                                    {first.type === "file" && (
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {offeredFiles.length > 1 && (
                                            <Button
                                              onClick={() => {
                                                for (const item of offeredFiles)
                                                  void handleDownloadFile(item);
                                              }}
                                              size={"xs"}
                                              className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
                                            >
                                              下载全部
                                            </Button>
                                          )}

                                          {isBatch && (
                                            <div className="text-xs text-[#64748b]">
                                              本次共 {group.items.length} 个文件
                                            </div>
                                          )}
                                        </div>

                                        {group.items
                                          .slice(
                                            0,
                                            isExpanded
                                              ? group.items.length
                                              : COLLAPSED_MEDIA_PREVIEW_COUNT,
                                          )
                                          .map((msg) => (
                                            <div
                                              key={msg.id}
                                              className="flex items-center justify-between gap-3 rounded-xl border border-[#d8e1ec] bg-[#f8fbff] p-2.5"
                                            >
                                              <div className="flex min-w-0 gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d8e1ec] bg-[#ffffff] font-mono text-[10px] font-semibold tracking-[0.18em] text-[#64748b]">
                                                  FILE
                                                </div>
                                                <div className="min-w-0">
                                                  <div className="break-all text-sm text-[#0f172a]">
                                                    {msg.fileName}
                                                  </div>
                                                  <div className="font-mono text-xs text-[#64748b]">
                                                    {formatSize(
                                                      msg.fileSize || 0,
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                {msg.fileStatus === "offered" &&
                                                  !msg.isSelf && (
                                                    <Button
                                                      onClick={() =>
                                                        handleDownloadFile(msg)
                                                      }
                                                      className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
                                                      size={"xs"}
                                                    >
                                                      下载
                                                    </Button>
                                                  )}
                                                {msg.fileStatus ===
                                                  "downloading" && (
                                                  <span className="text-xs text-[#64748b]">
                                                    下载中 {msg.progress || 0}%
                                                  </span>
                                                )}
                                                {msg.fileStatus ===
                                                  "downloaded" &&
                                                  msg.downloadPath && (
                                                    <Button
                                                      onClick={() =>
                                                        handleRevealFile(
                                                          msg.downloadPath,
                                                        )
                                                      }
                                                      className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50"
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
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogPrimitive.Root
              open={composerOpen}
              onOpenChange={setComposerOpen}
            >
              <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="resource-composer-overlay fixed inset-0 z-50" />
                <DialogPrimitive.Content className="resource-composer-content fixed right-4 top-4 z-50 flex h-[calc(100vh-2rem)] w-[640px] min-w-[640px] max-w-[640px] origin-top-right flex-col overflow-hidden rounded-[24px] border border-[#d8e1ec] bg-[#f8fbff] p-0 text-[#0f172a] shadow-[rgba(15,23,42,0.12)_0px_20px_48px,rgba(255,255,255,0.85)_0px_0px_0px_1px_inset] max-[720px]:right-2 max-[720px]:top-2 max-[720px]:h-[calc(100vh-1rem)] max-[720px]:w-[calc(100vw-1rem)] max-[720px]:min-w-0 max-[720px]:max-w-none">
                  <div className="border-b border-[#d8e1ec] px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <DialogPrimitive.Title className="text-[24px] font-semibold leading-[1.15] tracking-[-0.6px] text-[#0f172a]">
                          创建分享
                        </DialogPrimitive.Title>
                      </div>
                      <DialogPrimitive.Close asChild>
                        <Button className="rounded-md border border-[#d8e1ec] bg-transparent px-3 text-sm text-[#0f172a] hover:bg-sky-50">
                          关闭
                        </Button>
                      </DialogPrimitive.Close>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-5">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-[#d8e1ec] bg-[#ffffff] p-4">
                        <div className="flex items-center space-x-2 rounded-lg">
                          <label className="shrink-0 text-sm font-medium text-[#0f172a]">
                            主题名称
                          </label>
                          <Input
                            className="h-10 flex-1 border-[#d8e1ec] bg-[#f8fbff] text-[#0f172a] placeholder:text-[#64748b] focus-visible:ring-[#0ea5e9] focus-visible:ring-offset-0"
                            value={shareSubject}
                            onChange={(e) => {
                              setShareSubject(e.target.value);
                              setSubjectTouched(true);
                            }}
                            placeholder={defaultShareSubject}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#d8e1ec] bg-[#ffffff] p-4">
                        <div className="flex flex-wrap gap-2">
                          {(["text", "image", "file"] as ContentType[]).map(
                            (type) => (
                              <Button
                                key={type}
                                className={`rounded-md px-5 py-2 text-sm ${
                                  contentType === type
                                    ? "border border-[#0ea5e9] bg-[#f8fbff] text-[#0369a1] hover:bg-[#f8fbff]"
                                    : "border border-[#d8e1ec] bg-transparent text-[#475569] hover:bg-sky-50 hover:text-[#0f172a]"
                                }`}
                                size={"sm"}
                                onClick={() => {
                                  setContentType(type);
                                  setSelectedFiles([]);
                                }}
                              >
                                {type === "text"
                                  ? "文字"
                                  : type === "image"
                                    ? "图片"
                                    : "文件"}
                              </Button>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="min-h-[340px]">
                        {contentType === "text" && (
                          <div className="h-[340px] rounded-2xl border border-[#d8e1ec] bg-[#ffffff] p-4">
                            <Textarea
                              ref={textInputRef}
                              className="h-[270px] w-full resize-none rounded-xl border border-[#d8e1ec] bg-[#f8fbff] p-3 font-mono text-sm text-[#0f172a] placeholder:text-[#64748b] focus-visible:ring-[#0ea5e9] focus-visible:ring-offset-0"
                              placeholder="输入文字内容... (支持 Ctrl+V 粘贴)"
                              value={textContent}
                              onChange={(e) => setTextContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.ctrlKey && e.key === "Enter")
                                  void handleSend();
                              }}
                            />
                            <div className="mt-2 text-xs text-[#64748b]">
                              按 Ctrl+Enter 发送
                            </div>
                          </div>
                        )}

                        {contentType === "image" && (
                          <div className="flex h-[340px] flex-col space-y-3 rounded-2xl border border-[#d8e1ec] bg-[#ffffff] p-4">
                            <div
                              className="flex min-h-[168px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8e1ec] p-8 text-center transition hover:border-[#0ea5e9]/50"
                              onClick={() => imageInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                addFiles(e.dataTransfer.files, "image");
                              }}
                            >
                              <p className="text-[#0f172a]">
                                拖拽图片到这里，或点击选择
                              </p>
                              <p className="mt-1 text-xs text-[#64748b]">
                                可一次发送多张图片，接收方按张下载原图
                              </p>
                              <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files)
                                    addFiles(e.target.files, "image");
                                  e.target.value = "";
                                }}
                              />
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col space-y-2">
                              <div className="text-xs text-[#64748b]">
                                {selectedFiles.length > 0
                                  ? `已选 ${selectedFiles.length} 张图片`
                                  : "选择后的图片会显示在这里"}
                              </div>
                              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                {selectedFiles.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-2 p-1">
                                    {selectedFiles.map((file, index) => (
                                      <div
                                        key={`${file.name}-${index}`}
                                        className="group relative"
                                      >
                                        <img
                                          src={file.path}
                                          alt={file.name}
                                          className="h-20 w-full rounded-xl border border-[#d8e1ec] object-cover"
                                        />
                                        <Button
                                          onClick={() =>
                                            setSelectedFiles((prev) =>
                                              prev.filter(
                                                (_, i) => i !== index,
                                              ),
                                            )
                                          }
                                          className="absolute -right-1 -top-1 h-5 w-5 rounded-full border border-[#dc2626] bg-[#f8fbff] p-0 text-xs text-[#dc2626] opacity-0 hover:bg-[#dc2626]/10 group-hover:opacity-100"
                                        >
                                          ×
                                        </Button>
                                        <div className="truncate text-xs text-[#475569]">
                                          {file.name}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#d8e1ec] text-xs text-[#64748b]">
                                    暂未选择图片
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {contentType === "file" && (
                          <div className="flex h-[340px] flex-col space-y-3 rounded-2xl border border-[#d8e1ec] bg-[#ffffff] p-4">
                            <div
                              className="flex min-h-[168px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8e1ec] p-8 text-center transition hover:border-[#0ea5e9]/50"
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                addFiles(e.dataTransfer.files, "file");
                              }}
                            >
                              <p className="text-[#0f172a]">
                                拖拽文件到这里，或点击选择
                              </p>
                              <p className="mt-1 text-xs text-[#64748b]">
                                可一次发送多个文件，接收方可下载全部或单个下载
                              </p>
                              <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files)
                                    addFiles(e.target.files, "file");
                                  e.target.value = "";
                                }}
                              />
                            </div>

                            <div className="flex min-h-0 flex-1 flex-col space-y-2">
                              <div className="text-xs text-[#64748b]">
                                {selectedFiles.length > 0
                                  ? `已选 ${selectedFiles.length} 个文件`
                                  : "选择后的文件会显示在这里"}
                              </div>
                              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                {selectedFiles.length > 0 ? (
                                  <div className="space-y-1">
                                    {selectedFiles.map((file, index) => (
                                      <div
                                        key={`${file.name}-${index}`}
                                        className="flex items-center justify-between rounded-xl border border-[#d8e1ec] bg-[#f8fbff] p-2"
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate text-sm text-[#0f172a]">
                                            {file.name}
                                          </div>
                                          <div className="font-mono text-xs text-[#64748b]">
                                            {formatSize(file.size)}
                                          </div>
                                        </div>
                                        <Button
                                          onClick={() =>
                                            setSelectedFiles((prev) =>
                                              prev.filter(
                                                (_, i) => i !== index,
                                              ),
                                            )
                                          }
                                          className="h-7 rounded-md border border-[#dc2626] bg-transparent px-2 text-[#dc2626] hover:bg-[#dc2626]/10"
                                        >
                                          ×
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#d8e1ec] text-xs text-[#64748b]">
                                    暂未选择文件
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-[#d8e1ec] bg-[#ffffff] p-4">
                        <RadioGroup
                          value={sendTarget}
                          onValueChange={(value) =>
                            setSendTarget(value as typeof sendTarget)
                          }
                          className="flex flex-wrap items-center gap-4"
                        >
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#0f172a]">
                            <RadioGroupItem value="broadcast" />
                            <span>广播</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#0f172a]">
                            <RadioGroupItem value="selected" />
                            <span>已选设备</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#0f172a]">
                            <RadioGroupItem value="group" />
                            <span>分组设备</span>
                          </label>

                          {sendTarget === "selected" && (
                            <Dialog.Root
                              open={pickerOpen}
                              onOpenChange={setPickerOpen}
                            >
                              <Dialog.Trigger asChild>
                                <Button className="rounded-md border border-[#d8e1ec] bg-transparent text-xs text-[#0369a1] hover:bg-sky-50">
                                  已选 {selectedCount} 个设备
                                </Button>
                              </Dialog.Trigger>
                              <Dialog.Portal>
                                <Dialog.Overlay className="fixed inset-0 z-50 bg-white/72 backdrop-blur-sm" />
                                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#d8e1ec] bg-[#ffffff] p-4 text-[#0f172a] shadow-[rgba(15,23,42,0.12)_0px_20px_48px]">
                                  <Dialog.Title className="mb-3 text-sm font-medium">
                                    选择设备
                                  </Dialog.Title>
                                  <div className="mb-3 flex gap-2">
                                    <Button
                                      onClick={selectAll}
                                      className="rounded-md border border-[#d8e1ec] bg-transparent px-2 py-1 text-xs text-[#0f172a] hover:bg-sky-50"
                                    >
                                      全选
                                    </Button>
                                    <Button
                                      onClick={deselectAll}
                                      className="rounded-md border border-[#d8e1ec] bg-transparent px-2 py-1 text-xs text-[#0f172a] hover:bg-sky-50"
                                    >
                                      清空
                                    </Button>
                                  </div>
                                  <div className="mb-3 flex items-center gap-2">
                                    <span className="text-xs text-[#64748b]">
                                      分组
                                    </span>
                                    <Select.Root
                                      value={groupFilter}
                                      onValueChange={setGroupFilter}
                                    >
                                      <Select.Trigger className="flex w-48 items-center justify-between gap-2 rounded-md border border-[#d8e1ec] bg-[#f8fbff] px-2 py-1 text-xs text-[#0f172a]">
                                        <Select.Value />
                                        <Select.Icon>▼</Select.Icon>
                                      </Select.Trigger>
                                      <Select.Portal>
                                        <Select.Content
                                          className="z-50 rounded-md border border-[#d8e1ec] bg-[#ffffff] text-[#0f172a] shadow-[rgba(15,23,42,0.12)_0px_20px_48px]"
                                          position="popper"
                                          side="bottom"
                                          align="start"
                                          sideOffset={4}
                                          avoidCollisions={false}
                                        >
                                          <Select.Viewport className="p-1">
                                            <Select.Item
                                              value="all"
                                              className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-sky-50"
                                            >
                                              <Select.ItemText>
                                                全部在线分组
                                              </Select.ItemText>
                                            </Select.Item>
                                            {groupsForFilter.map(
                                              ({ group }) => (
                                                <Select.Item
                                                  key={group.id}
                                                  value={group.id}
                                                  className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-sky-50"
                                                >
                                                  <Select.ItemText>
                                                    {group.name}
                                                  </Select.ItemText>
                                                </Select.Item>
                                              ),
                                            )}
                                          </Select.Viewport>
                                        </Select.Content>
                                      </Select.Portal>
                                    </Select.Root>
                                  </div>
                                  <div className="max-h-60 overflow-y-auto rounded-md border border-[#d8e1ec]">
                                    {filteredDevices.length === 0 ? (
                                      <div className="p-3 text-xs text-[#64748b]">
                                        暂无在线设备
                                      </div>
                                    ) : (
                                      filteredDevices.map((device) => (
                                        <label
                                          key={device.id}
                                          className="flex cursor-pointer items-center gap-2 border-b border-[#d8e1ec] p-2 last:border-b-0"
                                        >
                                          <Checkbox
                                            checked={selectedDevices.has(
                                              getDeviceKey(device),
                                            )}
                                            onCheckedChange={() =>
                                              toggleSelectDevice(
                                                getDeviceKey(device),
                                              )
                                            }
                                          />
                                          <span className="text-sm text-[#0f172a]">
                                            {device.name}
                                          </span>
                                          <span className="font-mono text-xs text-[#64748b]">
                                            {device.ip}:{device.port}
                                          </span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <Dialog.Close asChild>
                                      <Button className="rounded-md border border-[#0ea5e9] bg-[#f8fbff] px-3 py-1 text-sm text-[#0369a1] hover:bg-sky-50">
                                        完成
                                      </Button>
                                    </Dialog.Close>
                                  </div>
                                </Dialog.Content>
                              </Dialog.Portal>
                            </Dialog.Root>
                          )}

                          {sendTarget === "group" && (
                            <Select.Root
                              value={groupTargetId}
                              onValueChange={setGroupTargetId}
                            >
                              <Select.Trigger className="flex w-28 items-center justify-between gap-2 rounded-md border border-[#d8e1ec] bg-[#f8fbff] px-2 py-1 text-xs text-[#0f172a]">
                                <Select.Value />
                                <Select.Icon>▼</Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Content
                                  className="z-50 rounded-md border border-[#d8e1ec] bg-[#ffffff] text-[#0f172a] shadow-[rgba(15,23,42,0.12)_0px_20px_48px]"
                                  position="popper"
                                  side="bottom"
                                  align="start"
                                  sideOffset={4}
                                  avoidCollisions={false}
                                >
                                  <Select.Viewport className="p-1">
                                    <Select.Item
                                      value="all"
                                      className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-sky-50"
                                    >
                                      <Select.ItemText>
                                        选择分组
                                      </Select.ItemText>
                                    </Select.Item>
                                    {groupsForFilter.map(({ group }) => (
                                      <Select.Item
                                        key={group.id}
                                        value={group.id}
                                        className="cursor-pointer rounded px-3 py-2 text-sm hover:bg-sky-50"
                                      >
                                        <Select.ItemText>
                                          {group.name}
                                        </Select.ItemText>
                                      </Select.Item>
                                    ))}
                                  </Select.Viewport>
                                </Select.Content>
                              </Select.Portal>
                            </Select.Root>
                          )}
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#d8e1ec] px-5 py-4">
                    <Button
                      onClick={() => void handleSend()}
                      disabled={
                        contentType === "text"
                          ? !textContent.trim()
                          : selectedFiles.length === 0
                      }
                      className="w-full rounded-md border border-[#0ea5e9] bg-[#ffffff] py-3 font-medium text-[#0369a1] hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      发送
                    </Button>
                  </div>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
          </div>
        </div>
      </div>

      <Dialog.Root
        open={!!previewImage}
        onOpenChange={() => setPreviewImage(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-white/78 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#d8e1ec] bg-[#f8fbff] p-3 shadow-[rgba(15,23,42,0.12)_0px_20px_48px]">
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[80vh] max-w-full rounded-md object-contain"
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function handleSaveImage(imageUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = fileName;
  link.click();
}
