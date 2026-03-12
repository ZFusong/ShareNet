# Specification: input-recorder

## ADDED Requirements

### Requirement: 录制控制功能
系统 SHALL 提供录制控制界面。

#### Scenario: 开始录制
- **WHEN** 用户点击开始录制
- **THEN** 系统开始记录键鼠操作

#### Scenario: 暂停录制
- **WHEN** 用户点击暂停录制
- **THEN** 暂停记录操作，保留已录制内容

#### Scenario: 停止录制
- **WHEN** 用户点击停止录制
- **THEN** 结束录制，显示录制结果

### Requirement: 全局热键触发
系统 SHALL 支持全局热键触发录制。

#### Scenario: 全局热键开始
- **WHEN** 用户按下配置的全局热键
- **THEN** 开始录制（避免软件内操作干扰）

#### Scenario: 全局热键停止
- **WHEN** 录制中再次按下热键
- **THEN** 停止录制

### Requirement: 录制内容
系统 SHALL 记录键鼠操作的详细内容。

#### Scenario: 键盘录制
- **WHEN** 录制键盘操作
- **THEN** 记录按键、组合键、释放顺序

#### Scenario: 鼠标点击录制
- **WHEN** 录制鼠标点击
- **THEN** 记录位置（x, y）、按钮类型

#### Scenario: 鼠标移动录制
- **WHEN** 录制鼠标移动
- **THEN** 可选记录移动轨迹

#### Scenario: 滚轮录制
- **WHEN** 录制滚轮操作
- **THEN** 记录滚动方向和距离

#### Scenario: 时间间隔记录
- **WHEN** 录制操作
- **THEN** 记录操作间隔时间，生成 delay 步骤

### Requirement: 后期编辑功能
系统 SHALL 提供录制后的编辑功能。

#### Scenario: 步骤列表展示
- **WHEN** 录制完成
- **THEN** 显示步骤列表（类型、摘要、延迟）

#### Scenario: 增删改步骤
- **WHEN** 用户编辑步骤
- **THEN** 支持添加、删除、修改步骤

#### Scenario: 调整延迟时间
- **WHEN** 用户修改延迟
- **THEN** 延迟时间更新

### Requirement: 预览回放
系统 SHALL 提供本地预览回放功能。

#### Scenario: 预览执行
- **WHEN** 用户点击预览
- **THEN** 在本机执行录制内容

#### Scenario: 回放控制
- **WHEN** 预览时
- **THEN** 支持播放、暂停、停止

### Requirement: 保存为预设
系统 SHALL 将录制内容保存为键鼠预设。

#### Scenario: 命名预设
- **WHEN** 保存录制
- **THEN** 用户输入预设名称

#### Scenario: 生成ID
- **WHEN** 保存预设
- **THEN** 自动生成 ip-{timestamp}-{random} 格式ID