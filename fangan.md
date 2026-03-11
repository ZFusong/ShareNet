局域网通讯软件方案文档
一、基础信息
表格
项目	内容
平台	Windows优先
技术栈	Electron + Node.js
使用场景	内部简单使用，无中心服务器
网络架构	P2P直连，UDP发现+TCP传输
二、模块清单
模块A：网络通讯层
功能：设备发现、连接管理、消息传输
子任务：
UDP广播服务（端口可配置，默认8888）
定时广播本机信息（设备名、IP、TCP端口、角色）
监听其他设备广播，维护在线设备列表
心跳机制：5秒间隔，15秒离线判定
TCP服务端（端口可配置，默认8889）
接收指令消息（COMMAND类型）
接收分享消息（SHARE类型）
文件分片传输支持
消息协议定义
基础字段：msg_type, sender, payload, timestamp, request_id
类型：DISCOVERY / COMMAND / SHARE_TEXT / SHARE_IMAGE / SHARE_FILE / HEARTBEAT / ACK
模块B：设备管理
功能：设备发现列表、状态显示、分组管理
子任务：
设备对象模型
字段：deviceId, deviceName, ip, tcpPort, role, tags, status, lastSeen, capabilities
设备发现面板UI
在线设备列表（名称、IP、状态标签、角色标识）
分组筛选（全部/主控/被控/双向，按标签筛选）
批量选择（全选/反选/多选）
刷新按钮、手动添加IP（备用）
状态同步
接收心跳更新在线状态
执行指令时标记"忙碌"状态
离线设备保留缓存，显示最后在线时间
模块C：配置中心（核心模块）
功能：本地配置存储、预设管理、导入导出
子任务：
配置存储架构（electron-store + JSON）
存储路径：userData/config/
文件清单：
settings.json（全局设置，不参与导出）
software-presets.json（软件预设）
input-presets.json（键鼠预设）
scenes.json（场景编排）
ID生成规范
软件预设：sw-{timestamp}-{random}
键鼠预设：ip-{timestamp}-{random}
场景：sc-{timestamp}-{random}
配置编辑器UI
软件预设：增删改查，字段（name, path, args, workingDir, icon）
键鼠预设：增删改查，支持录制和手动编辑
场景编排：步骤队列管理，拖拽排序，延迟设置
导出功能
导出范围选择：多选（软件预设/键鼠预设/场景编排/全局设置）
精细选择：在分类内选择具体项
导出文件格式：.lccfg（JSON，包含exportMeta和data）
导出元信息：version, exportedAt, exportedBy, modules, itemCount
导入功能
文件解析：读取.lccfg，显示预览
导入模式：
追加模式：保留现有，添加新配置，冲突项跳过或重命名
覆盖模式：ID冲突替换，其他保留
智能合并：逐条确认冲突（跳过/覆盖/重命名）
冲突检测：
ID冲突：视为同一配置
Name冲突：提示重名，建议改名
依赖检查：场景导入时检查引用的软件/键鼠预设是否存在
导入结果报告：成功/失败/跳过项统计
模块D：执行引擎
功能：接收指令、解析执行、反馈结果
子任务：
指令接收与解析
监听TCP指令消息
验证发送方权限（白名单/允许控制开关）
解析指令类型：EXECUTE_SOFTWARE / EXECUTE_INPUT / EXECUTE_SCENE
软件启动执行
根据name匹配本地software-presets
支持启动参数、工作目录
检测是否已运行，避免重复启动
延迟执行支持（毫秒级）
键鼠模拟执行
Windows API：SendInput（推荐）或 keybd_event/mouse_event
支持类型：keyCombo, keyPress, mouseClick, mouseMove, textInput, delay
坐标模式：绝对坐标（屏幕）和相对坐标（窗口）
场景编排执行
串行队列执行，支持步骤间延迟
执行状态反馈（开始/进度/完成/错误）
错误处理：单步失败可配置继续或中止
执行反馈
实时返回执行状态到发送方
本地记录操作日志（时间、来源、指令、结果）
模块E：键鼠录制器
功能：可视化录制键鼠操作，生成预设
子任务：
录制控制
开始/暂停/停止录制
全局热键触发（避免软件内操作干扰）
录制内容
键盘：按键、组合键、释放顺序
鼠标：点击（位置、按钮）、移动轨迹（可选记录）、滚轮
时间：记录操作间隔，生成delay步骤
后期编辑
步骤列表展示（类型、摘要、延迟）
增删改步骤
调整延迟时间
预览回放（本机测试执行）
保存为预设
命名、选择分类、生成ID
模块F：操作台（主控界面）
功能：选择设备、编排指令、发送执行
子任务：
设备选择区
设备列表（来自模块B）
批量选择状态显示
已选设备统计
指令编排区
场景选择下拉框（读取本地scenes.json）
场景步骤预览（只读，点击可查看详情）
临时调整：单次执行可修改延迟或跳过某步
快捷操作：直接选择软件预设/键鼠预设单发
执行控制
执行模式：立即执行 / 定时执行（指定时间）
发送按钮：发送并执行 / 仅发送（不执行，对方手动触发）
执行日志：实时显示发送状态、对方确认、执行进度
模块G：资源站（分享模块）
功能：文字、图片、文件的局域网分享
子任务：
发送端
内容类型切换：文字/图片/文件
文字：输入框，支持多行
图片：拖拽/粘贴/截图导入，压缩选项（原图/高质量/预览）
文件：拖拽选择，显示大小
目标选择：广播/多选设备
接收端
消息列表：时间倒序，显示发送者、类型、时间、大小
预览功能：
文字：展开显示，一键复制
图片：缩略图，点击查看原图，保存/复制
文件：信息显示，下载按钮，进度显示
存储管理：默认保存到userData/received/，支持清理
传输机制
小文件（<10MB）：直接内存传输
大文件：分片（1MB/片）+ 断点续传 + MD5校验
传输队列：并发数限制（默认3个并发）
模块H：系统设置
功能：全局配置、安全策略、日志查看
子任务：
本机信息设置
设备名称、头像、角色（主控/被控/双向）、标签
网络设置
UDP端口、TCP端口、广播间隔
安全设置
允许被控制：总开关
IP白名单列表
操作确认模式：敏感操作弹窗确认/静默执行
日志与调试
运行日志查看（按日期筛选）
操作审计日志
日志级别设置
打开配置目录按钮
三、数据存储规范
存储路径
plain
复制
Windows: C:\Users\<username>\AppData\Roaming\<app-name>\
├── config/
│   ├── settings.json
│   ├── software-presets.json
│   ├── input-presets.json
│   ├── scenes.json
│   └── import-history.json（可选）
├── cache/
│   └── devices-cache.json（可选）
├── logs/
│   ├── app-YYYY-MM-DD.log
│   └── operations.log
└── received/
    ├── images/
    └── files/
核心数据结构
settings.json
JSON
复制
{
  "device": { "name": "", "role": "", "tags": [] },
  "network": { "udpPort": 8888, "tcpPort": 8889, "broadcastInterval": 5000 },
  "security": { "allowControl": true, "whitelist": [], "requireConfirm": false }
}
software-presets.json
JSON
复制
[{ "id": "sw-xxx", "name": "", "path": "", "args": "", "workingDir": "", "icon": "" }]
input-presets.json
JSON
复制
[{ "id": "ip-xxx", "name": "", "actions": [{ "type": "", ... }] }]
scenes.json
JSON
复制
[{ "id": "sc-xxx", "name": "", "steps": [{ "type": "", "refId": "", "delay": 0 }] }]
四、UI界面清单
表格
界面	类型	核心功能
主窗口	多标签页	容纳操作台/资源站/控制台
操作台	主标签	设备列表 + 指令编排 + 执行控制
资源站	主标签	发送区 + 接收历史
控制台	主标签	配置编辑 + 系统设置
键鼠录制器	独立窗口/弹窗	录制控制 + 步骤编辑 + 保存
导入预览	弹窗	文件解析 + 冲突显示 + 模式选择
导出设置	弹窗	范围选择 + 精细选择 + 文件名
五、关键交互流程
流程1：发送场景指令
plain
复制
1. 操作台选择目标设备（多选）
2. 选择场景（下拉框读取scenes.json）
3. 点击"立即执行"
4. TCP发送指令到各设备
5. 各设备接收，解析sceneRef
6. 本地匹配steps，按序执行
7. 实时反馈执行状态到发送方
8. 发送方日志显示完成/失败
流程2：导出键鼠预设
plain
复制
1. 控制台进入配置中心
2. 选择"键鼠预设"标签
3. 选择要导出的项（多选）
4. 点击"导出选中"
5. 选择保存路径，确认文件名
6. 生成.lccfg文件
流程3：导入配置（追加模式）
plain
复制
1. 控制台点击"导入配置"
2. 选择.lccfg文件
3. 解析显示预览（类型、数量、冲突标记）
4. 选择"追加导入"模式
5. 冲突项自动重命名（name加-1后缀）
6. 执行导入，更新本地JSON
7. 显示结果报告
六、技术依赖清单
表格
功能	推荐库/方案	说明
配置存储	electron-store	自动管理userData路径
UDP/TCP	Node.js dgram/net	原生模块，无需安装
键鼠模拟	@nut-tree/nut.js 或 node-gyp编译原生模块	Windows SendInput封装
文件传输	原生fs + crypto（MD5）	分片读写，校验哈希
图片处理	sharp（可选）	压缩/缩略图生成
日志记录	electron-log	自动轮转，分级写入