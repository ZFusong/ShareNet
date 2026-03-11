# Specification: console-panel

## ADDED Requirements

### Requirement: 设备选择区
系统 SHALL 提供设备选择界面。

#### Scenario: 显示设备列表
- **WHEN** 打开操作台
- **THEN** 显示来自设备管理模块的设备列表

#### Scenario: 批量选择状态显示
- **WHEN** 用户选择多个设备
- **THEN** 显示已选设备数量

#### Scenario: 已选设备统计
- **WHEN** 选择设备
- **THEN** 统计区域显示已选设备数和设备名

### Requirement: 指令编排区
系统 SHALL 提供指令编排功能。

#### Scenario: 场景选择下拉框
- **WHEN** 打开场景选择
- **THEN** 下拉框读取本地 scenes.json

#### Scenario: 场景步骤预览
- **WHEN** 选择场景
- **THEN** 显示场景步骤预览（只读）

#### Scenario: 查看步骤详情
- **WHEN** 点击步骤
- **THEN** 显示步骤详情

#### Scenario: 临时调整延迟
- **WHEN** 单次执行需要调整
- **THEN** 可以修改延迟或跳过某步

#### Scenario: 快捷操作
- **WHEN** 用户快速选择
- **THEN** 可以直接选择软件预设/键鼠预设单发

### Requirement: 执行控制
系统 SHALL 提供执行控制功能。

#### Scenario: 立即执行模式
- **WHEN** 用户选择立即执行
- **THEN** 发送后立即在目标设备执行

#### Scenario: 定时执行模式
- **WHEN** 用户选择定时执行
- **THEN** 指定时间到达后执行

#### Scenario: 发送并执行
- **WHEN** 用户点击发送并执行
- **THEN** 发送指令到目标设备并立即执行

#### Scenario: 仅发送
- **WHEN** 用户点击仅发送
- **THEN** 发送指令到目标设备，对方手动触发执行

#### Scenario: 执行日志显示
- **WHEN** 执行过程中
- **THEN** 实时显示发送状态、对方确认、执行进度