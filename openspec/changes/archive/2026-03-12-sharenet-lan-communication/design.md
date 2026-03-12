# Design: ShareNet 局域网通讯软件

## Context

本项目为全新构建的局域网通讯软件，基于 **Electron + React + Vite + Tailwind CSS + Radix UI** 技术栈。方案文档(fangan.md)定义了8个核心模块，需实现 P2P 直连架构的设备发现、远程控制、资源分享功能。

**技术约束：**
- 平台：Windows 优先
- 网络：无中心服务器，P2P直连
- 通讯：UDP 发现(8888) + TCP 传输(8889)
- 前端：React 18 + Vite 5 + Tailwind CSS 3 + Radix UI

## Goals / Non-Goals

**Goals:**
- 实现可靠的 UDP 设备发现与 TCP 消息传输机制
- 构建完整的设备管理、配置中心、执行引擎
- 提供现代化 UI 操作界面（React + Tailwind + Radix UI）
- 支持键鼠录制与回放
- 实现文件的可靠传输（分片+断点续传）

**Non-Goals:**
- 跨平台支持（仅 Windows）
- 复杂身份认证（简化白名单机制）
- 云端同步（纯局域网）
- 音视频传输

## Decisions

### D1: 网络架构 - P2P直连 vs 有中心服务器

**决定：P2P直连**

| 方案 | 优点 | 缺点 |
|------|------|------|
| P2P直连 | 无需服务器，部署简单 | 需处理防火墙/NAT |
| 有中心服务器 | 稳定可靠 | 需要服务器基础设施 |

**理由**：方案明确要求"无中心服务器"，P2P 直连更符合内部简单使用场景。

### D2: 前端框架 - React + Vite

**决定：Electron + React + Vite**

**理由**：
- Vite 提供极快的开发启动和热更新
- React 生态丰富，组件复用方便
- 与 Electron 集成成熟

### D3: UI 组件库 - Radix UI + Tailwind CSS

**决定：Radix UI + Tailwind CSS**

**理由**：
- Radix UI 提供无样式、可访问的基础组件
- Tailwind CSS 快速构建现代化 UI
- 组合使用：Radix 处理交互逻辑，Tailwind 处理样式
- 避免样式冲突，组件库升级不影响样式

**Radix UI 组件使用规划：**
- Tabs: 主界面标签切换
- Dialog: 弹窗、录制器
- Select: 下拉选择
- Checkbox: 设备多选
- Toast: 通知提示
- ScrollArea: 滚动区域
- ContextMenu: 右键菜单
- Popover: 临时调整面板
- AlertDialog: 确认对话框
- Badge: 状态标签

### D4: 键鼠模拟方案 - @nut-tree/nut.js

**决定：@nut-tree/nut.js**

**理由**：
- 成熟稳定的 Windows SendInput 封装
- 跨平台支持（未来可能）
- 活跃维护

### D5: 配置存储 - electron-store

**决定：electron-store**

**理由**：
- 自动管理 userData 路径
- 支持默认值、验证
- 社区成熟

### D6: 进程架构 - 主进程 + 渲染进程（标准 Electron + React）

```
┌─────────────────────────────────────────────────┐
│                   主进程                        │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ UDP服务     │  │ TCP服务     │              │
│  │ (发现设备)  │  │ (消息传输)  │              │
│  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ 配置管理    │  │ 执行引擎    │              │
│  │ (electron   │  │ (键鼠模拟/  │              │
│  │  -store)    │  │  软件启动)  │              │
│  └─────────────┘  └─────────────┘              │
│         │                │                     │
│         │      IPC       │                     │
│         ▼                ▼                     │
│  ┌─────────────────────────────────┐           │
│  │       渲染进程 (React UI)       │           │
│  │  操作台 | 资源站 | 配置中心 | 设置 │        │
│  └─────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
```

### D7: 消息协议设计

**决定：统一 JSON 协议格式**

```typescript
interface BaseMessage {
  msg_type: 'DISCOVERY' | 'COMMAND' | 'SHARE_TEXT' | 'SHARE_IMAGE' | 'SHARE_FILE' | 'HEARTBEAT' | 'ACK';
  sender: DeviceInfo;
  payload: any;
  timestamp: number;
  request_id: string;
}
```

**分片传输协议：**
```
1. 发送方: FILE_START { fileId, fileName, fileSize, chunkCount, md5 }
2. 接收方: ACK { request_id, status: 'accepted' }
3. 循环: FILE_CHUNK { fileId, chunkIndex, data(base64) }
4. 发送方: FILE_END { fileId, md5 }
5. 接收方: 校验MD5，返回 ACK
```

### D8: ID 生成规范

**决定：时间戳+随机数**

| 类型 | 格式 | 示例 |
|------|------|------|
| 软件预设 | sw-{timestamp}-{random} | sw-1709548800000-a1b2 |
| 键鼠预设 | ip-{timestamp}-{random} | ip-1709548800000-c3d4 |
| 场景 | sc-{timestamp}-{random} | sc-1709548800000-e5f6 |
| 设备 | {deviceName}-{random} | DESKTOP-A1B2 |

### D9: 导入导出 .lccfg 格式

**决定：JSON 封装格式**

```json
{
  "exportMeta": {
    "version": "1.0.0",
    "exportedAt": "2024-03-11T12:00:00Z",
    "exportedBy": "设备名",
    "modules": ["software-presets", "input-presets", "scenes"],
    "itemCount": { "software-presets": 5, "input-presets": 3 }
  },
  "data": {
    "software-presets": [...],
    "input-presets": [...],
    "scenes": [...]
  }
}
```

**导入模式：**
- 追加：保留现有，冲突项重命名（name + "-1"）
- 覆盖：ID 冲突则替换
- 智能合并：逐条确认冲突

## Project Structure

```
sharenet/
├── electron/
│   ├── main.ts           # Electron 主进程入口
│   ├── preload.ts        # Preload 脚本
│   ├── ipc/              # IPC 处理器
│   └── services/         # 主进程服务
│       ├── udpService.ts
│       ├── tcpServer.ts
│       ├── configStore.ts
│       └── executor.ts
├── src/
│   ├── main.tsx          # React 入口
│   ├── App.tsx           # 根组件
│   ├── components/       # React 组件
│   │   ├── ui/           # Radix UI 包装组件
│   │   ├── console/      # 操作台模块
│   │   ├── resource/     # 资源站模块
│   │   ├── config/       # 配置中心模块
│   │   └── settings/     # 系统设置模块
│   ├── hooks/            # React Hooks
│   ├── stores/           # 状态管理 (Zustand)
│   ├── lib/              # 工具函数
│   └── types/            # TypeScript 类型
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── electron-builder.json
```

## Risks / Trade-offs

### R1: 防火墙/ NAT 穿透

**[风险]**: 企业网络中 UDP/TCP 可能被防火墙阻止

**缓解**:
- 文档说明需开放端口
- 提供备用手动 IP 添加功能
- 非核心功能，不阻塞发布

### R2: 键鼠录制权限

**[风险]**: Windows UAC 或安全软件可能阻止键鼠模拟

**缓解**:
- 文档说明以管理员运行
- 捕获异常并提示用户
- 提供纯软件执行模式

### R3: 大文件传输稳定性

**[风险]**: 网络不稳定时大文件传输可能失败

**缓解**:
- 实现断点续传
- MD5 校验确保完整性
- 显示传输进度

### R4: 多设备指令同步

**[风险]**: 同时向多设备发送指令，无事务保证

**缓解**:
- 独立发送，独立反馈
- 批量操作视为多个独立操作

## Open Questions

1. **Q1**: 是否需要支持多显示屏？（键鼠坐标系统）
2. **Q2**: 传输压缩算法选择？（图片压缩级别）
3. **Q3**: 是否需要离线消息队列？（网络中断时）
4. **Q4**: 日志保留策略？（默认7天？30天？）