# Specification: system-settings

## ADDED Requirements

### Requirement: 本机信息设置
系统 SHALL 提供本机信息配置功能。

#### Scenario: 设置设备名称
- **WHEN** 用户修改设备名称
- **THEN** 设备名称更新，广播信息同步

#### Scenario: 设置设备头像
- **WHEN** 用户选择头像
- **THEN** 头像更新

#### Scenario: 设置角色
- **WHEN** 用户选择角色
- **THEN** 设置为主控/被控/双向

#### Scenario: 设置标签
- **WHEN** 用户添加/删除标签
- **THEN** 标签更新

### Requirement: 网络设置
系统 SHALL 提供网络配置功能。

#### Scenario: 设置UDP端口
- **WHEN** 用户修改UDP端口
- **THEN** 端口配置更新

#### Scenario: 设置TCP端口
- **WHEN** 用户修改TCP端口
- **THEN** 端口配置更新

#### Scenario: 设置广播间隔
- **WHEN** 用户修改广播间隔
- **THEN** 广播频率更新

### Requirement: 安全设置
系统 SHALL 提供安全策略配置。

#### Scenario: 允许被控制开关
- **WHEN** 用户开启/关闭允许被控制
- **THEN** 控制本机的权限状态改变

#### Scenario: IP白名单管理
- **WHEN** 用户管理白名单
- **THEN** 只允许白名单内的IP控制本机

#### Scenario: 操作确认模式
- **WHEN** 用户设置确认模式
- **THEN** 敏感操作时弹窗确认或静默执行

### Requirement: 日志与调试
系统 SHALL 提供日志查看功能。

#### Scenario: 运行日志查看
- **WHEN** 用户打开日志查看
- **THEN** 显示按日期筛选的运行日志

#### Scenario: 操作审计日志
- **WHEN** 用户查看审计日志
- **THEN** 显示操作记录（时间、来源、操作、结果）

#### Scenario: 日志级别设置
- **WHEN** 用户设置日志级别
- **THEN** 按级别过滤日志显示

#### Scenario: 打开配置目录
- **WHEN** 用户点击打开配置目录
- **THEN** 打开 userData 目录