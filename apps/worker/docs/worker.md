# AI Canvas Worker 文档

## 结论

`ai-canvas-worker` 是 AI Canvas 的 Python 后台适配层。它不承担前端交互，也不直接耦合 Next.js 页面；它负责接收绘图任务、保存 Provider 配置、调用 OpenAI 兼容图像接口、落盘生成图片，并通过 HTTP 暴露任务与图片资源。

当前实现适合单机开发和轻量部署。它的持久化边界是 SQLite 数据库和本地文件系统；如果后续要支持多实例、远程对象存储或严格密钥治理，需要替换对应适配器。

## 系统边界

```txt
Next.js App
  |
  | HTTP
  v
WorkerServer
  |
  +-- SQLiteDrawTaskStore       draw_tasks / provider_config
  +-- GeneratedImageStore       generated-images/*.png
  +-- DrawTaskRunner
        |
        v
      OpenAI images.generate
```

核心模块：

- `cli.py`：命令行入口，负责初始化存储、启动服务、入队和消费任务。
- `server.py`：HTTP 服务，负责请求解析、校验、路由分发和后台 worker 线程。
- `store.py`：SQLite 适配器，负责任务表和 Provider 配置表。
- `image_storage.py`：本地 PNG 文件存储适配器。
- `openai_images.py`：OpenAI 兼容图像生成适配器。
- `validation.py`：输入契约和默认值。
- `runner.py`：任务执行包装，统一成功/失败结果。
- `task.py`：任务领域模型和状态枚举。

## 运行模型

### 启动服务

```bash
pnpm --filter worker dev
```

等价于：

```bash
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite \
UV_CACHE_DIR=.uv-cache \
uv run ai-canvas-worker serve
```

默认监听：

```txt
http://127.0.0.1:8766
```

### 初始化存储

```bash
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite \
UV_CACHE_DIR=.uv-cache \
uv run ai-canvas-worker init-db
```

`init-db` 会创建：

- SQLite 数据库文件。
- `draw_tasks` 表。
- `provider_config` 表。
- 生成图片目录。

### 手动入队并消费

```bash
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite \
UV_CACHE_DIR=.uv-cache \
uv run ai-canvas-worker enqueue --prompt "A quiet product photo"
```

```bash
AI_CANVAS_DATABASE_PATH=../../.data/ai-canvas.sqlite \
UV_CACHE_DIR=.uv-cache \
uv run ai-canvas-worker work --once
```

`work --once` 只领取一个 queued 任务；没有任务时直接退出。

## 配置

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `AI_CANVAS_DATABASE_PATH` | `./.data/ai-canvas.sqlite` | SQLite 数据库路径。 |
| `AI_CANVAS_GENERATED_IMAGES_DIR` | 数据库同级目录下的 `generated-images` | 生成图片落盘目录。 |
| `AI_CANVAS_WORKER_HOST` | `127.0.0.1` | HTTP 服务监听地址。 |
| `AI_CANVAS_WORKER_PORT` | `8766` | HTTP 服务监听端口。 |
| `UV_CACHE_DIR` | 由 uv 默认决定 | uv 依赖缓存目录；仓库脚本使用 `.uv-cache`。 |

Provider 配置存储在 SQLite 的 `provider_config` 表中：

- `apiKey`：OpenAI 或兼容服务 API Key。
- `baseUrl`：OpenAI 兼容 API Base URL，默认 `https://api.openai.com/v1`。

## HTTP API

### 健康检查

```http
GET /v1/health
```

响应：

```json
{
  "ok": true
}
```

### Provider 配置

```http
GET /v1/provider-config
```

响应：

```json
{
  "config": {
    "apiKey": "",
    "baseUrl": "https://api.openai.com/v1",
    "hasApiKey": false,
    "updatedAt": null
  }
}
```

```http
POST /v1/provider-config
Content-Type: application/json

{
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1"
}
```

校验规则：

- `apiKey` 必填。
- `baseUrl` 可省略；省略时使用默认 OpenAI 地址。
- `baseUrl` 只接受 `http://` 或 `https://`。
- 保存前会移除末尾 `/`。

```http
DELETE /v1/provider-config
```

删除后返回默认配置。

### 创建绘图任务

```http
POST /v1/draw-tasks
Content-Type: application/json

{
  "prompt": "A quiet product photo",
  "model": "gpt-image-2",
  "size": "1024x1024",
  "quality": "auto"
}
```

字段规则：

| 字段 | 默认值 | 规则 |
| --- | --- | --- |
| `prompt` | 无 | 必填，去除首尾空白后不能为空，最长 2400 字符。 |
| `model` | `gpt-image-2` | `gpt-image-2`、`gpt-image-1.5`、`gpt-image-1`。 |
| `size` | `1024x1024` | `1024x1024`、`1536x1024`、`1024x1536`、`auto`。 |
| `quality` | `auto` | `auto`、`high`、`medium`、`low`。 |

成功响应状态码为 `201`：

```json
{
  "task": {
    "id": "uuid",
    "prompt": "A quiet product photo",
    "model": "gpt-image-2",
    "size": "1024x1024",
    "quality": "auto",
    "status": "queued",
    "progress": 0,
    "resultUrl": null,
    "errorMessage": null,
    "attempts": 0,
    "createdAt": "2026-05-10 12:00:00",
    "updatedAt": "2026-05-10 12:00:00",
    "startedAt": null,
    "finishedAt": null
  }
}
```

### 查询任务

```http
GET /v1/draw-tasks
```

返回最近 50 条任务，按创建时间倒序。

```http
GET /v1/draw-tasks/:taskId
```

任务不存在时返回 `404`。

### 同步生成图片

```http
POST /v1/images/generate
Content-Type: application/json

{
  "prompt": "A quiet product photo",
  "model": "gpt-image-2",
  "size": "1024x1024",
  "quality": "auto"
}
```

该接口不创建任务，直接调用 Provider 并保存图片。成功响应：

```json
{
  "image": "/v1/generated-images/hexfilename.png"
}
```

### 读取生成图片

```http
GET /v1/generated-images/:filename
```

只允许读取由 worker 生成的 PNG 文件名：

```txt
32 位小写十六进制字符 + .png
```

响应头包含：

```txt
Content-Type: image/png
Cache-Control: public, max-age=31536000, immutable
X-Content-Type-Options: nosniff
```

## 任务状态机

```txt
queued -> running -> succeeded
                 \-> failed
```

代码中定义了 `canceled`，但当前 HTTP API 和 CLI 没有取消任务入口。

状态字段含义：

- `queued`：任务已创建，等待 worker 领取。
- `running`：worker 通过 `claim_next_task()` 原子领取任务。
- `succeeded`：图片生成并保存成功，HTTP 响应中的 `resultUrl` 指向 `/v1/generated-images/...png`。
- `failed`：生成或保存失败，`errorMessage` 保存错误信息。
- `canceled`：保留状态，当前未被实际写入。

领取策略：

- 只领取 `queued` 状态任务。
- 按 `created_at ASC` 领取最早任务。
- 领取时 `attempts + 1`。
- 成功时 `progress = 100`。
- 失败后不会自动重试，因为失败状态不会再次被领取。

## 数据存储

### draw_tasks

关键字段：

- `id`：任务主键。
- `prompt`、`model`、`size`、`quality`：图像生成参数。
- `status`：任务状态。
- `progress`：当前只有创建时 `0` 和成功时 `100`。
- `result_filename`：生成图片文件名。HTTP API 会在响应边界转换为 `resultUrl` 公开路径。
- `error_message`：失败原因。
- `attempts`：被领取次数。
- `created_at`、`updated_at`、`started_at`、`finished_at`：时间戳。

### provider_config

当前设计为单行表：

```sql
id INTEGER PRIMARY KEY CHECK (id = 1)
```

这意味着整个 worker 只有一份 Provider 配置。

### 图片文件

图片以 PNG 保存到 `AI_CANVAS_GENERATED_IMAGES_DIR`。文件名由 `uuid4().hex` 生成，公开路径固定为：

```txt
/v1/generated-images/{filename}.png
```

## 错误模型

常见错误：

- 请求体不是合法 JSON：`400`。
- 请求体不是对象：`400`。
- 提示词为空或过长：`400`。
- 模型、尺寸、质量不在允许列表：`400`。
- 未配置 API Key：`401`。
- OpenAI 接口错误：透传上游状态码和错误消息。
- OpenAI 超时或网络错误：默认 `502`。
- 图片保存失败：默认 `500`。
- 任务或图片不存在：`404`。

## 设计漏洞与维护成本

当前实现有几个需要主动管理的边界：

- `GET /v1/provider-config` 会返回完整 `apiKey`。这便于本地开发，但不适合暴露在不可信网络中；生产环境应只返回 `hasApiKey`、`baseUrl` 和 `updatedAt`。
- `provider_config` 明文存储 API Key。长期应接入密钥管理或至少引入本机加密策略。
- 后台 worker 是 `ThreadingHTTPServer` 内的 daemon thread。进程退出、崩溃或部署滚动时不会做任务恢复；`running` 任务也没有超时回收机制。
- 失败任务不会自动重试。`attempts` 目前只记录领取次数，不驱动重试策略。
- `progress` 没有中间态，前端不能基于它展示真实生成进度。
- SQLite + 本地文件系统适合单机。如果多实例运行，任务领取、图片路径和配置一致性都需要重新建模。
- `baseUrl` 只校验协议，不校验域名可信性；如果开放给多用户，会形成 SSRF 风险入口。
- `/v1/images/generate` 是同步接口，调用耗时受上游图像生成影响；面向用户请求时应优先使用 `/v1/draw-tasks` 异步任务流。

## 扩展方向

如果要扩展到生产化，可以按以下顺序拆边界：

1. Provider 配置：从 SQLite 明文表迁移到密钥服务，HTTP 响应隐藏 `apiKey`。
2. 任务队列：将 `SQLiteDrawTaskStore` 替换为队列或具备租约机制的任务表。
3. 图片存储：将 `GeneratedImageStore` 替换为对象存储适配器。
4. 状态恢复：增加 `running` 超时回收和失败重试策略。
5. API 契约：把当前隐式 JSON 契约沉淀为 OpenAPI 或类型共享包。
