# Design: ShareNet 局域网通讯软件

## Context

本项目为全新构建的局域网通讯软件，基于 Electron + Node.js 技术栈。方案文档(fangan.md)定义了8个核心模块，需实现 P2P 直连架构的设备发现、远程控制、资源分享功能。

**技术约束：**
- 平台：Windows 优先
- 网络：无中心服务器，P2P直连
- 通讯：UDP 发现(8888) + TCP 传输(8889)

## Goals / Non-Goals

**Goals:**
- 实现可靠的 UDP 设备发现与 TCP 消息传输机制
- 构建完整的设备管理、配置中心、执行引擎
- 提供直观的 UI 操作界面
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

### D2: 键鼠模拟方案 - @nut-tree/nut.js vs 原生 node-gyp

**决定：@nut-tree/nut.js**

**理由**：
- 成熟稳定的 Windows SendInput 封装
- 跨平台支持（未来可能）
- 活跃维护

### D3: 配置存储 - electron-store vs 自定义 JSON

**决定：electron-store**

**理由**：
- 自动管理 userData 路径
- 支持默认值、验证
- 社区成熟

### D4: 进程架构 - 单进程 vs 多进程

**决定：主进程 + 渲染进程（标准 Electron 架构）**

```
┌─────────────────────────────────────────────────┐
│                   主进程                        │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ UDP服务     │  │ TCP服务     │              │
│  │ (发现设备)  │  │ (消息传输)  │              │
│  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐              │
│  │ 配置管理    │  │ 执行引擎    │              │
│  │ (electron  │  │ (键鼠模拟/  │              │
│  │  -store)   │  │  软件启动)  │              │
│  └─────────────┘  └─────────────┘              │
│         │                │                     │
│         │      IPC       │                     │
│         ▼                ▼                     │
│  ┌─────────────────────────────────┐           │
│  │       渲染进程 (UI)             │           │
│  │  操作台 | 资源站 | 配置中心 | 设置 │        │
│  └─────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
```

### D5: 消息协议设计

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

### D6: ID 生成规范

**决定：时间戳+随机数**

| 类型 | 格式 | 示例 |
|------|------|------|
| 软件预设 | sw-{timestamp}-{random} | sw-1709548800000-a1b2 |
| 键鼠预设 | ip-{timestamp}-{random} | ip-1709548800000-c3d4 |
| 场景 | sc-{timestamp}-{random} | sc-1709548800000-e5f6 |
| 设备 | {deviceName}-{random} | DESKTOP-A1B2 |

### D7: 导入导出 .lccfg 格式

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