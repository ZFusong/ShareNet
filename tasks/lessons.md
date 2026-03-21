# Lessons

- 当仓库同时存在 src/preload/index.ts 和遗留的 src/main/preload.js 时，新增桥接 API 不能只改一处，必须确认运行时真正加载的 preload 实现并同步更新。
- 当用户明确收敛“本机配置”和“远端设备配置”的边界时，要立即回头检查数据模型里是否错误引入了 `deviceKey` 一类跨设备维度，避免把本地触发器映射做成全网集中映射。
