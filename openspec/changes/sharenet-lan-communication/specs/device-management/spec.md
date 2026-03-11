# Specification: device-management

## ADDED Requirements

### Requirement: 设备对象模型
系统 SHALL 定义设备对象模型，包含设备标识信息。

#### Scenario: 设备对象字段完整
- **WHEN** 创建设备对象时
- **THEN** 包含 deviceId, deviceName, ip, tcpPort, role, tags, status, lastSeen, capabilities

### Requirement: 设备发现面板UI
系统 SHALL 提供设备发现面板，显示在线设备列表。

#### Scenario: 显示设备列表
- **WHEN** 设备发现面板打开时
- **THEN** 显示所有已发现设备的名称、IP、状态、角色

#### Scenario: 设备状态标签
- **WHEN** 设备状态变化时
- **THEN** 显示对应的状态标签（在线/离线/忙碌）

### Requirement: 分组筛选功能
系统 SHALL 提供分组筛选功能。

#### Scenario: 按角色筛选
- **WHEN** 用户选择"主控/被控/双向"筛选
- **THEN** 列表显示对应角色的设备

#### Scenario: 按标签筛选
- **WHEN** 用户选择标签筛选
- **THEN** 列表显示包含该标签的设备

#### Scenario: 显示全部设备
- **WHEN** 用户选择"全部"
- **THEN** 显示所有设备（包括离线）

### Requirement: 批量选择功能
系统 SHALL 支持批量选择设备。

#### Scenario: 全选设备
- **WHEN** 用户点击"全选"
- **THEN** 所有在线设备被选中

#### Scenario: 反选设备
- **WHEN** 用户点击"反选"
- **THEN** 已选中的取消选中，未选中的选中

#### Scenario: 多选设备
- **WHEN** 用户按住Ctrl点击设备
- **THEN** 设备被添加到选中列表

### Requirement: 刷新功能
系统 SHALL 提供手动刷新设备列表功能。

#### Scenario: 手动刷新
- **WHEN** 用户点击刷新按钮
- **THEN** 立即发送广播请求，获取最新设备列表

### Requirement: 手动添加设备
系统 SHALL 支持手动添加IP地址作为备用发现方式。

#### Scenario: 手动添加设备
- **WHEN** 用户输入IP地址并点击添加
- **THEN** 设备添加到列表，状态显示为手动添加

### Requirement: 状态同步
系统 SHALL 实时同步设备状态。

#### Scenario: 心跳更新状态
- **WHEN** 收到设备心跳
- **THEN** 更新设备最后在线时间，状态为在线

#### Scenario: 执行时标记忙碌
- **WHEN** 设备正在执行指令
- **THEN** 设备状态标记为"忙碌"

#### Scenario: 执行完成恢复
- **WHEN** 设备指令执行完成
- **THEN** 设备状态恢复为"在线"

### Requirement: 离线设备保留
系统 SHALL 在设备离线后保留缓存信息。

#### Scenario: 离线设备显示
- **WHEN** 设备离线
- **THEN** 设备保留在列表，显示最后在线时间

#### Scenario: 清除离线设备
- **WHEN** 用户点击清除离线设备
- **THEN** 离线设备从列表移除