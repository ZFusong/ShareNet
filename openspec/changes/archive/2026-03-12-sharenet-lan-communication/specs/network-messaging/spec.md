# Specification: network-messaging

## ADDED Requirements

### Requirement: TCP服务端可用
系统 SHALL 提供 TCP 服务端，用于接收指令和分享消息。

#### Scenario: 启动TCP服务
- **WHEN** 应用启动时
- **THEN** 系统在配置端口（默认8889）启动 TCP 监听

#### Scenario: 接收连接请求
- **WHEN** 其他设备连接到本机TCP端口
- **THEN** 系统接受连接并创建通信通道

### Requirement: 消息协议定义
系统 SHALL 定义统一的 JSON 消息协议格式。

#### Scenario: 消息格式正确
- **WHEN** 发送或接收消息时
- **THEN** 消息包含 msg_type, sender, payload, timestamp, request_id

### Requirement: 支持的消息类型
系统 SHALL 支持以下消息类型：DISCOVERY, COMMAND, SHARE_TEXT, SHARE_IMAGE, SHARE_FILE, HEARTBEAT, ACK。

#### Scenario: 接收COMMAND消息
- **WHEN** 收到 COMMAND 类型消息
- **THEN** 系统解析 payload 并执行相应指令

#### Scenario: 接收SHARE消息
- **WHEN** 收到 SHARE_TEXT/SHARE_IMAGE/SHARE_FILE 消息
- **THEN** 系统接收内容并保存到接收历史

### Requirement: 文件分片传输
系统 SHALL 支持大文件分片传输。

#### Scenario: 大文件传输
- **WHEN** 传输大于10MB的文件
- **THEN** 文件被分片为1MB/片进行传输

#### Scenario: 文件传输进度
- **WHEN** 传输文件时
- **THEN** 接收方实时显示传输进度

### Requirement: 断点续传
系统 SHALL 支持断点续传功能。

#### Scenario: 传输中断后重连
- **WHEN** 文件传输中断后重新连接
- **THEN** 接收方可以从断点处继续接收

### Requirement: MD5校验
系统 SHALL 在文件传输完成后进行 MD5 校验。

#### Scenario: 校验成功
- **WHEN** MD5 校验通过
- **THEN** 文件标记为传输完成

#### Scenario: 校验失败
- **WHEN** MD5 校验失败
- **THEN** 提示用户传输失败，可重试

### Requirement: 传输队列管理
系统 SHALL 管理文件传输队列，支持并发控制。

#### Scenario: 多文件同时传输
- **WHEN** 多个文件同时传输
- **THEN** 并发数不超过配置值（默认3个）

### Requirement: ACK确认机制
系统 SHALL 对接收到的消息返回 ACK 确认。

#### Scenario: 消息确认
- **WHEN** 收到消息
- **THEN** 发送方收到 ACK 确认

### Requirement: 端口可配置
系统 SHALL 支持自定义 TCP 端口。

#### Scenario: 修改TCP端口
- **WHEN** 用户在设置中修改TCP端口并重启
- **THEN** 系统使用新端口进行监听