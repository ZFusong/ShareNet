# Specification: resource-station

## ADDED Requirements

### Requirement: 发送端功能
系统 SHALL 提供资源发送功能。

#### Scenario: 文字发送
- **WHEN** 用户选择文字类型
- **THEN** 显示输入框，支持多行文字

#### Scenario: 图片发送
- **WHEN** 用户选择图片类型
- **THEN** 支持拖拽/粘贴/截图导入

#### Scenario: 图片压缩选项
- **WHEN** 发送图片
- **THEN** 提供压缩选项（原图/高质量/预览）

#### Scenario: 文件发送
- **WHEN** 用户选择文件类型
- **THEN** 支持拖拽选择，显示文件大小

#### Scenario: 目标选择
- **WHEN** 选择发送目标
- **THEN** 支持广播到所有设备或选择特定设备

### Requirement: 接收端功能
系统 SHALL 提供资源接收和查看功能。

#### Scenario: 消息列表显示
- **WHEN** 收到消息
- **THEN** 显示消息列表，时间倒序排列

#### Scenario: 列表信息显示
- **WHEN** 显示消息
- **THEN** 显示发送者、类型、时间、大小

#### Scenario: 文字预览
- **WHEN** 收到文字消息
- **THEN** 支持展开显示，一键复制

#### Scenario: 图片预览
- **WHEN** 收到图片消息
- **THEN** 显示缩略图，点击可查看原图

#### Scenario: 图片保存复制
- **WHEN** 查看图片
- **THEN** 支持保存到本地和复制

#### Scenario: 文件信息显示
- **WHEN** 收到文件消息
- **THEN** 显示文件信息，提供下载按钮

#### Scenario: 文件下载进度
- **WHEN** 下载文件
- **THEN** 显示下载进度

### Requirement: 存储管理
系统 SHALL 管理接收到的资源。

#### Scenario: 默认存储路径
- **WHEN** 收到资源
- **THEN** 默认保存到 userData/received/

#### Scenario: 存储目录结构
- **WHEN** 保存资源
- **THEN** 图片保存到 received/images/，文件保存到 received/files/

#### Scenario: 清理接收历史
- **WHEN** 用户点击清理
- **THEN** 清理接收目录中的文件

### Requirement: 传输机制
系统 SHALL 实现可靠的传输机制。

#### Scenario: 小文件传输
- **WHEN** 传输小于10MB的文件
- **THEN** 直接内存传输

#### Scenario: 大文件分片传输
- **WHEN** 传输大于等于10MB的文件
- **THEN** 分片为1MB/片进行传输

#### Scenario: 断点续传
- **WHEN** 传输中断
- **THEN** 支持断点续传

#### Scenario: MD5校验
- **WHEN** 文件传输完成
- **THEN** 进行MD5校验确保完整性

#### Scenario: 传输队列限制
- **WHEN** 多文件同时传输
- **THEN** 并发数不超过3个