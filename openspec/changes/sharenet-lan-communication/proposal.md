# Proposal: ShareNet 局域网通讯软件

## Why

企业内部需要一款简洁的局域网设备控制与资源共享工具。当前方案文档(fangan.md)定义了完整的8模块架构，包括设备发现、远程控制、键鼠录制、配置管理等核心功能。技术栈选用 Electron + Node.js，支持 Windows 平台，P2P直连架构无需中心服务器。

## What Changes

本项目将从零构建一个完整的局域网通讯与控制工具，主要变更包括：

- **新增 P2P 网络通讯层**：UDP设备发现 + TCP消息传输，支持心跳保活
- **新增设备管理系统**：在线设备列表、状态显示、分组筛选
- **新增配置中心**：软件预设/键鼠预设/场景编排的CRUD，导入导出(.lccfg)支持
- **新增执行引擎**：远程执行软件、键鼠模拟、场景步骤编排执行
- **新增键鼠录制器**：全局热键触发录制、步骤编辑、预览回放
- **新增操作台界面**：设备选择、指令编排、执行控制
- **新增资源站模块**：文字/图片/文件局域网分享
- **新增系统设置**：设备信息、网络配置、安全策略、日志管理

## Capabilities

### New Capabilities

- `network-discovery`: UDP广播发现服务，维护在线设备列表，心跳机制
- `network-messaging`: TCP消息传输，支持指令/分享/文件分片
- `device-management`: 设备列表UI、状态同步、分组筛选
- `configuration-center`: 配置存储架构、预设CRUD、导入导出
- `execution-engine`: 指令解析执行、软件启动、键鼠模拟、场景编排
- `input-recorder`: 键鼠录制、步骤编辑、预览回放
- `console-panel`: 操作台界面、设备选择、指令发送
- `resource-station`: 文字/图片/文件分享、接收管理
- `system-settings`: 本机信息、网络、安全、日志设置

### Modified Capabilities

(本项目为全新构建，无现有规格需修改)

## Impact

- **代码影响**：新增完整的前后端代码，Electron主进程+渲染进程架构
- **依赖影响**：引入 electron-store, electron-log, @nut-tree/nut.js, sharp 等
- **系统影响**：Windows 平台，UDP/TCP端口监听，文件系统读写，系统级键鼠模拟