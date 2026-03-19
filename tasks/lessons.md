# Lessons

- 当仓库同时存在 src/preload/index.ts 和遗留的 src/main/preload.js 时，新增桥接 API 不能只改一处，必须确认运行时真正加载的 preload 实现并同步更新。
