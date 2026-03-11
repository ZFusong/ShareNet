# Specification: execution-engine

## ADDED Requirements

### Requirement: 指令接收与解析
系统 SHALL 监听 TCP 指令消息并解析执行。

#### Scenario: 监听指令消息
- **WHEN** TCP 服务收到 COMMAND 消息
- **THEN** 系统解析消息内容

#### Scenario: 验证发送方权限
- **WHEN** 收到指令
- **THEN** 验证发送方在白名单或允许控制开关开启

#### Scenario: 解析指令类型
- **WHEN** 解析指令
- **THEN** 识别 EXECUTE_SOFTWARE / EXECUTE_INPUT / EXECUTE_SCENE 类型

### Requirement: 软件启动执行
系统 SHALL 根据指令启动本地软件。

#### Scenario: 根据名称匹配预设
- **WHEN** 收到 EXECUTE_SOFTWARE 指令
- **THEN** 根据 name 匹配本地 software-presets

#### Scenario: 支持启动参数
- **WHEN** 执行软件时
- **THEN** 支持 args 参数和工作目录

#### Scenario: 检测重复启动
- **WHEN** 执行软件前
- **THEN** 检测是否已运行，避免重复启动

#### Scenario: 延迟执行
- **WHEN** 指令指定延迟时间
- **THEN** 支持毫秒级延迟执行

### Requirement: 键鼠模拟执行
系统 SHALL 执行键鼠模拟操作。

#### Scenario: 键盘模拟
- **WHEN** 执行键鼠动作
- **THEN** 使用 Windows API (SendInput) 模拟键盘

#### Scenario: 鼠标模拟
- **WHEN** 执行鼠标动作
- **THEN** 模拟鼠标点击、移动

#### Scenario: 支持的动作类型
- **WHEN** 定义键鼠动作
- **THEN** 支持 keyCombo, keyPress, mouseClick, mouseMove, textInput, delay

#### Scenario: 坐标模式
- **WHEN** 执行鼠标动作
- **THEN** 支持绝对坐标（屏幕）和相对坐标（窗口）

### Requirement: 场景编排执行
系统 SHALL 执行场景编排中的步骤队列。

#### Scenario: 串行队列执行
- **WHEN** 执行场景
- **THEN** 按步骤顺序依次执行

#### Scenario: 步骤间延迟
- **WHEN** 步骤配置延迟
- **THEN** 按延迟时间等待后执行下一步

#### Scenario: 执行状态反馈
- **WHEN** 执行过程中
- **THEN** 实时返回开始/进度/完成/错误状态

#### Scenario: 单步失败处理
- **WHEN** 单步执行失败
- **THEN** 根据配置继续或中止

### Requirement: 执行反馈
系统 SHALL 向指令发送方反馈执行结果。

#### Scenario: 实时状态返回
- **WHEN** 执行状态变化
- **THEN** 实时返回状态到发送方

#### Scenario: 本地操作日志
- **WHEN** 执行操作时
- **THEN** 记录时间、来源、指令、结果到本地日志