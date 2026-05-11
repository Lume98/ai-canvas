# 会话驱动 AI 出图画布 MVP

创建日期：2026-05-12

## 结论

当前项目的 MVP 不应继续按“本地无限画布 demo”演化，而应收敛为“单会话、多轮 AI 出图、结果可恢复”的会话驱动系统。

主数据模型：

`conversation -> message -> draw_task -> image_asset`

画布仅作为当前会话图片结果的空间投影视图，不作为主数据源。

## MVP 目标

本阶段只解决以下问题：

1. 用户进入页面后拥有一个当前会话。
2. 用户可以在一个对话里连续发送多轮 prompt。
3. 每轮 prompt 触发一个异步出图任务。
4. 任务状态可追踪，刷新页面后可恢复。
5. 生成结果以消息流和画布两种方式呈现。
6. 点击消息可以聚焦到对应图片，点击图片可以反查对应消息。

本阶段不做：

1. 多会话切换 UI。
2. 真实无限画布产品能力，例如分组、连线、图层、协作。
3. 手动拖拽布局持久化。
4. 基于图片的变体编辑和引用链。

## 设计判断

### 为什么不能继续以画布为中心

当前前端将 `results` 和 `canvasItems` 保存在内存状态中，刷新即丢失；同时主流程走同步 `/images/generate`，与现有异步任务系统割裂。这说明当前实现是“图片墙 + 本地排布”，不是“会话内多轮出图”。

如果继续把画布位置当主数据，后续会出现以下问题：

1. 无法定义“某张图属于哪轮对话”。
2. 无法稳定恢复任务与历史。
3. 无法支持一条 assistant 消息对应多张图。
4. 无法支撑后续变体、重试、引用父图。

### 为什么应以会话为中心

对用户而言，最小语义单元不是“画布节点”，而是“我在这个对话里发了一句 prompt，系统回了几张图”。因此：

1. `message` 承载语义。
2. `draw_task` 承载执行状态。
3. `image_asset` 承载实际结果。
4. `canvas_node` 如果未来需要，只承载视图位置。

## 数据模型

### conversations

- `id`
- `title`
- `created_at`
- `updated_at`

用途：

- 表示当前对话容器。
- 第一版只需支持创建并读取单个当前会话。

### messages

- `id`
- `conversation_id`
- `role`
- `type`
- `text`
- `status`
- `created_at`
- `updated_at`

枚举建议：

- `role`: `user | assistant`
- `type`: `prompt | image_result | error`
- `status`: `pending | running | succeeded | failed`

用途：

- 用户 prompt 形成一条 `user/prompt` 消息。
- 系统创建一条 `assistant/image_result` 消息作为任务占位。
- 任务完成后由该 assistant 消息关联生成图片。

### draw_tasks

在现有 `draw_tasks` 基础上新增：

- `conversation_id`
- `request_message_id`
- `reply_message_id`
- `output_count`
- `parent_asset_id`

保留现有字段：

- `prompt`
- `model`
- `size`
- `quality`
- `status`
- `progress`
- `attempts`
- `error_message`
- `created_at`
- `updated_at`
- `started_at`
- `finished_at`

用途：

- 作为 worker 队列与执行边界。
- 每个任务绑定一次会话上下文和一对请求/响应消息。

### image_assets

- `id`
- `task_id`
- `conversation_id`
- `message_id`
- `url`
- `width`
- `height`
- `sort_order`
- `created_at`

用途：

- 一个任务可以产出一张或多张图。
- assistant 消息通过该表拿到图片集合。

## API 设计

### `POST /v1/conversations`

用途：

- 创建会话。

返回：

- `conversation`

### `GET /v1/conversations/:conversationId`

用途：

- 获取会话基本信息。

### `GET /v1/conversations/:conversationId/messages`

用途：

- 获取该会话的消息流。

返回要求：

- assistant 消息应聚合返回 `assets[]`。
- 前端不再从全局历史或本地状态拼装结果。

### `POST /v1/draw-tasks`

请求体建议：

```json
{
  "conversationId": "conversation_123",
  "prompt": "一张极简香水海报",
  "model": "gpt-image-2",
  "size": "1024x1024",
  "quality": "auto",
  "outputCount": 1
}
```

创建行为：

1. 创建 `user` 消息。
2. 创建 `assistant pending` 消息。
3. 创建 `draw_task`。
4. 返回 `task`、`requestMessageId`、`replyMessageId`。

### `GET /v1/draw-tasks/:taskId`

用途：

- 查询任务状态。

返回要求：

- 保留原有任务字段。
- 成功时补充 `messageId` 和 `assets[]`。

## 前端状态模型

页面状态应从当前的本地数组状态切换为服务端会话状态。

建议主状态：

- `currentConversationId`
- `messages`
- `selectedAssetId`
- `viewportState`
- `draftPrompt`
- `generationParams`
- `pendingTaskIds`

衍生状态：

- `canvasAssets`
  - 从 `messages[].assets` 投影出来
- `selectedMessage`
  - 由 `selectedAssetId` 反查

## 前端组件边界

### ConversationShell

职责：

- 管理当前会话加载。
- 管理消息拉取与任务轮询。
- 负责提交 prompt。

### ConversationTimeline

职责：

- 只渲染消息流。
- 不处理任务创建逻辑。

### CanvasViewport

职责：

- 只渲染当前会话图片。
- 负责选中、聚焦、基础拖拽。
- 第一版拖拽仅存在前端内存，不持久化。

### PromptComposer

职责：

- 只负责输入参数与提交事件。
- 提交目标切换为 `/api/draw-tasks`。

## 交互流程

1. 页面启动时读取或创建当前会话。
2. 拉取当前会话消息流。
3. 用户提交 prompt。
4. 后端创建用户消息、占位 assistant 消息与任务。
5. 前端开始轮询任务状态。
6. 任务成功后，assistant 消息带上 `assets[]`。
7. 画布根据 `assets[]` 自动布局新图。
8. 点击消息聚焦图片；点击图片定位消息。

## 仓库实施顺序

1. 新建 `conversations`、`messages`、`image_assets` 表。
2. 扩展 `draw_tasks` 表与序列化结构。
3. 新增 worker 的 conversation/message API。
4. 改造 `POST /draw-tasks` 创建完整关联关系。
5. 改造 `GET /draw-tasks/:id` 返回关联资源。
6. web 侧新增 `/api/conversations/*` 代理。
7. 页面状态切换为会话驱动。
8. 画布从 `messages[].assets` 生成展示节点。

## 主要风险与主动防御

### 设计漏洞

1. 现有 `draw_tasks.result_filename` 是单结果结构，未来多图输出会返工。
2. 前端自建 `resultId`、`itemId` 导致刷新恢复和任务关联不可靠。
3. 当前“历史”是全局历史，不是会话历史，语义错误。

### 边界条件

1. 任务失败时 assistant 消息必须仍然存在，并展示失败状态。
2. 页面刷新时 pending/running 任务必须能恢复轮询。
3. 如果图片尺寸为 `auto`，资源表允许宽高为空，待结果解析后补写。

### 隐性耦合

1. 不能让画布布局字段反向决定消息结构。
2. 不能让同步 `/images/generate` 与异步 `/draw-tasks` 同时作为主流程。

### 长期维护成本

1. 如果现在不拆开 `message` 和 `image_asset`，后续做一条消息多图、变体链、引用前图都会扩散修改。
2. 如果现在就持久化画布拖拽位置，会过早引入视图层和语义层耦合。

## 本次执行范围

本轮代码改造目标：

1. 先实现后端会话驱动最小模型和 API。
2. 再把前端主流程切换到会话任务流。
3. 保留现有画布交互，但把输入数据源改为服务端会话结果。
