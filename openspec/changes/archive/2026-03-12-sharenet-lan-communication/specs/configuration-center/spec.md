# Specification: configuration-center

## ADDED Requirements

### Requirement: 配置存储架构
系统 SHALL 使用 electron-store 实现配置存储。

#### Scenario: 配置目录结构
- **WHEN** 应用首次启动
- **THEN** 在 userData 目录下创建 config/ 目录

#### Scenario: 配置文件创建
- **WHEN** 首次运行时
- **THEN** 创建 settings.json, software-presets.json, input-presets.json, scenes.json

### Requirement: 软件预设管理
系统 SHALL 支持软件预设的增删改查。

#### Scenario: 软件预设字段
- **WHEN** 创建设件预设
- **THEN** 包含 id, name, path, args, workingDir, icon 字段

#### Scenario: 新增软件预设
- **WHEN** 用户填写信息并保存
- **THEN** 预设添加到 software-presets.json

#### Scenario: 编辑软件预设
- **WHEN** 用户修改预设信息并保存
- **THEN** 预设更新到配置文件中

#### Scenario: 删除软件预设
- **WHEN** 用户删除预设
- **THEN** 预设从配置文件中移除

#### Scenario: 查询软件预设
- **WHEN** 读取预设列表时
- **THEN** 返回所有软件预设

### Requirement: 键鼠预设管理
系统 SHALL 支持键鼠预设的增删改查，支持录制和手动编辑。

#### Scenario: 键鼠预设字段
- **WHEN** 创建键鼠预设
- **THEN** 包含 id, name, actions 字段

#### Scenario: 键鼠动作类型
- **WHEN** 定义键鼠动作
- **THEN** 支持 keyCombo, keyPress, mouseClick, mouseMove, textInput, delay

### Requirement: 场景编排管理
系统 SHALL 支持场景编排的增删改查，支持拖拽排序。

#### Scenario: 场景字段
- **WHEN** 创建场景
- **THEN** 包含 id, name, steps 字段

#### Scenario: 步骤定义
- **WHEN** 定义场景步骤
- **THEN** 包含 type (software/input/scene), refId, delay

#### Scenario: 拖拽排序
- **WHEN** 用户拖动步骤
- **THEN** 步骤顺序更新

### Requirement: ID生成规范
系统 SHALL 按规范生成唯一ID。

#### Scenario: 软件预设ID生成
- **WHEN** 创建软件预设
- **THEN** ID格式为 sw-{timestamp}-{random}

#### Scenario: 键鼠预设ID生成
- **WHEN** 创建键鼠预设
- **THEN** ID格式为 ip-{timestamp}-{random}

#### Scenario: 场景ID生成
- **WHEN** 创建场景
- **THEN** ID格式为 sc-{timestamp}-{random}

### Requirement: 导出功能
系统 SHALL 支持导出配置到 .lccfg 文件。

#### Scenario: 导出范围选择
- **WHEN** 用户点击导出
- **THEN** 显示多选：软件预设/键鼠预设/场景编排/全局设置

#### Scenario: 精细选择
- **WHEN** 用户选择导出范围
- **THEN** 在分类内选择具体项

#### Scenario: 生成导出文件
- **WHEN** 用户确认导出
- **THEN** 生成 .lccfg 文件（JSON格式）

#### Scenario: 导出元信息
- **WHEN** 生成导出文件
- **THEN** 包含 version, exportedAt, exportedBy, modules, itemCount

### Requirement: 导入功能
系统 SHALL 支持从 .lccfg 文件导入配置。

#### Scenario: 文件解析
- **WHEN** 用户选择 .lccfg 文件
- **THEN** 解析并显示预览（类型、数量、冲突标记）

#### Scenario: 追加模式导入
- **WHEN** 选择追加模式
- **THEN** 保留现有配置，冲突项重命名

#### Scenario: 覆盖模式导入
- **WHEN** 选择覆盖模式
- **THEN** ID冲突项替换，其他保留

#### Scenario: 智能合并模式
- **WHEN** 选择智能合并模式
- **THEN** 逐条确认冲突（跳过/覆盖/重命名）

### Requirement: 冲突检测
系统 SHALL 检测导入时的配置冲突。

#### Scenario: ID冲突检测
- **WHEN** 导入配置
- **THEN** ID冲突视为同一配置

#### Scenario: Name冲突检测
- **WHEN** 导入配置
- **THEN** Name冲突提示重名，建议改名

#### Scenario: 依赖检查
- **WHEN** 导入场景
- **THEN** 检查引用的软件/键鼠预设是否存在

### Requirement: 导入结果报告
系统 SHALL 显示导入结果统计。

#### Scenario: 显示导入结果
- **WHEN** 导入完成
- **THEN** 显示成功/失败/跳过项统计