# Specification: network-discovery

## ADDED Requirements

### Requirement: UDP广播服务可用
系统 SHALL 提供 UDP 广播服务，用于在局域网内发现其他设备。

#### Scenario: 启动UDP服务
- **WHEN** 应用启动时
- **THEN** 系统在配置端口（默认8888）启动 UDP 监听

#### Scenario: 发送广播消息
- **WHEN** 应用运行期间
- **THEN** 系统每隔配置间隔（默认5秒）广播本机信息

#### Scenario: 接收广播消息
- **WHEN** 接收到其他设备的广播
- **THEN** 系统解析消息并更新设备列表

### Requirement: 设备信息广播
系统 SHALL 定时广播本机信息，包含设备名、IP、TCP端口、角色。

#### Scenario: 广播内容完整
- **WHEN** 发送广播时
- **THEN** 消息包含 deviceId, deviceName, ip, tcpPort, role, timestamp

### Requirement: 在线设备列表维护
系统 SHALL 维护在线设备列表，记录设备状态。

#### Scenario: 新设备发现
- **WHEN** 收到新设备广播
- **THEN** 设备添加到列表，状态为"在线"

#### Scenario: 设备离线判定
- **WHEN** 超过15秒未收到某设备广播
- **THEN** 设备状态标记为"离线"

### Requirement: 心跳机制
系统 SHALL 实现心跳检测机制，确保设备状态实时准确。

#### Scenario: 正常心跳
- **WHEN** 设备在线时
- **THEN** 每5秒收到一次心跳广播

#### Scenario: 设备离线
- **WHEN** 设备离线超过15秒
- **THEN** 设备从在线列表移除，显示最后在线时间

### Requirement: 端口可配置
系统 SHALL 支持自定义 UDP 端口。

#### Scenario: 修改UDP端口
- **WHEN** 用户在设置中修改UDP端口并重启
- **THEN** 系统使用新端口进行广播和监听