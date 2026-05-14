# Python Worker 下线并入 Next.js 计划

## 结论

将当前 Python worker 承担的持久化、图片生成、Provider 配置、图片读取能力整体迁入 `apps/web` 的 Node runtime。第一阶段删除异步队列与后台消费模型，统一为同步生成图片并立即落库，前端保留会话与历史，但任务状态简化为同步完成或失败。

## 目标边界

- 保留 SQLite 与本地文件存储语义：
  - 数据库继续使用 `.data/ai-canvas.sqlite`
  - 图片继续存储到 `.data/generated-images`
- API 路径尽量不变，减少前端改动成本
- 不在本阶段恢复后台异步执行
- 不在本阶段引入对象存储、消息队列或密钥托管

## 现状问题

- `apps/web` 之前同时存在 BFF 路由与 `mock-api.ts` 内存实现，后端语义并不真实
- `apps/worker` 持有 SQLite schema、Provider 配置、图片落盘、OpenAI Images 调用，形成第二套后端
- 前端依赖 `queued/running` 轮询流，和“同步 mock 结算”耦合，状态机存在伪语义
- 根脚本和文档依赖 worker 启动门闩，运行入口复杂且脆弱

## 设计决策

### 1. 后端统一到 `apps/web`

在 `apps/web` 内新增 Node 侧领域服务，直接承接原 worker 职责：

- Provider 配置服务：读写 `provider_config`
- 会话服务：读写 `conversations`、`messages`
- 绘图任务服务：同步执行图片生成并写入 `draw_tasks`
- 图片资产服务：读写 `image_assets` 与本地图片文件

### 2. 保留分表建模

继续保留：

- `conversations`
- `messages`
- `draw_tasks`
- `image_assets`
- `provider_config`

原因：

- 当前同步化只是执行方式变化，不应把消息与任务揉平
- 后续如果恢复异步执行或增强编辑链路，不需要再次拆表

### 3. 删除执行中的异步状态机

`POST /api/draw-tasks` 改为同步执行：

- 创建任务与消息记录
- 立即调用 OpenAI Images API
- 成功则写 `succeeded`
- 失败则写 `failed`

保留 `GET /api/draw-tasks/[id]` 与消息历史读取，仅作为结果读取接口，不再承载轮询中的中间态。

### 4. 继续生成沿用 `parentAssetId + branchMode`

保留产品层“继续生成”入口：

- 通过 `parentAssetId` 找到来源图片
- 读取本地 PNG
- 按 `branchMode` 编译执行提示词
- 直接走 `images.edit`

### 5. Node runtime 显式化

所有文件系统、SQLite、图片读取相关 API 路由必须运行在 Node runtime：

- 不能落到 Edge runtime
- 文件名读取必须做白名单校验和目录穿越防御

## 公开接口约束

以下 API 路径保持不变：

- `/api/provider-config`
- `/api/conversations`
- `/api/conversations/[conversationId]`
- `/api/conversations/[conversationId]/messages`
- `/api/draw-tasks`
- `/api/draw-tasks/[taskId]`
- `/api/images/generate`
- `/api/generated-images/[filename]`

语义变化：

- `POST /api/draw-tasks` 返回仍包含 `task`
- 但返回的 `task.status` 应直接是最终态，不再先返回 `queued`
- 前端不能再假设存在稳定的 `queued/running` 过渡态

## 实施清单

### 一、服务层迁移

- 在 `apps/web/lib/server` 下建立 Node 服务层
- 复用原 SQLite schema，并补充初始化/迁移逻辑
- 用 Node 侧实现替换 `mock-api.ts`
- 将 OpenAI Images 调用迁到 Node 服务中
- 将图片落盘与图片读取迁到 Node 服务中

### 二、路由替换

将以下 route handler 全部切到真实 Node 服务：

- Provider 配置
- 会话创建与列表
- 会话详情
- 会话消息列表
- 绘图任务创建与查询
- 单图生成
- 本地图片读取

### 三、前端收缩

- 删除依赖后台 worker 的轮询逻辑
- 保留本地提交中的短暂生成态
- 服务端返回后直接刷新消息与图片资产
- 删除“等待后台执行完成”的假状态机

### 四、仓库清理

- 删除 `apps/worker` 源码
- 删除 `scripts/wait-worker-ready.mjs`
- 更新根脚本，移除 worker 启动依赖
- 更新 README 和运行说明
- 删除 `mock-api.ts`，避免形成第三套后端语义

## 验收项

### Provider 配置

- 保存 API Key 与 Base URL 正常
- 读取配置正常
- 清空配置正常
- 非法 Base URL 被拒绝

### 会话与消息

- 创建会话成功
- 发起同步生成后，自动写入用户 prompt 消息与 assistant 结果消息
- 失败时 assistant 消息状态为 `failed`

### 图片生成

- `POST /api/images/generate` 可生成并落盘图片
- `POST /api/draw-tasks` 可同步生成任务并落库
- `parentAssetId + branchMode` 路径可读取来源图并继续生成

### 图片读取

- `/api/generated-images/[filename]` 返回真实图片内容
- 非法文件名返回 404
- 不存在文件返回 404

### 持久化

- 应用重启后会话、任务、图片映射仍可读取

### 回归

- 前端创建任务、查看历史、打开会话详情不再依赖 Python worker
- `pnpm dev` 与 `pnpm server` 不再依赖 worker 门闩

## 风险与缺陷

- 同步生成会把上游 OpenAI 延迟直接暴露到前端，这是去 worker 后的显性代价
- `provider_config` 仍然是 SQLite 明文存储，只是迁移位置变了，安全问题没有被根治
- 单机 SQLite + 本地文件系统仍然只适合单实例部署，多实例一致性问题没有解决
- 如果未来恢复异步能力，需要重新引入任务租约、超时回收和失败重试，不应在当前同步实现上硬叠

## 实施完成定义

满足以下条件即可认定第一阶段完成：

1. `apps/web` 已独立承担 Provider 配置、持久化、图片生成、图片读取
2. `apps/worker` 不再参与运行时路径
3. API 路径对前端保持兼容
4. 前端不再依赖轮询式中间态
5. 本地开发与生产式本地运行不再需要 worker 启动门闩
