import { DatabaseSync } from "node:sqlite"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { NextResponse } from "next/server"

import {
  branchModes,
  type BranchMode,
} from "@/components/domain/branch-mode"

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"
const ALLOWED_MODELS = new Set(["gpt-image-2", "gpt-image-1.5", "gpt-image-1"])
const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"])
const ALLOWED_QUALITIES = new Set(["auto", "high", "medium", "low"])
const BRANCH_SOURCE_COMPATIBLE_MODELS = new Set(["gpt-image-1.5", "gpt-image-1"])
const ALLOWED_BRANCH_MODES = new Set(branchModes)
const PNG_SIGNATURE = "\x89PNG\r\n\x1a\n"
const GENERATED_IMAGE_FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.png$/
const CONVERSATION_NOT_FOUND_CODE = "CONVERSATION_NOT_FOUND"

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url))
const dataDir = path.join(repoRoot, ".data")
const databasePath = path.join(dataDir, "ai-canvas.sqlite")
const generatedImagesDir = path.join(dataDir, "generated-images")

type ProviderConfigRecord = {
  apiKey: string
  baseUrl: string
  hasApiKey: boolean
  updatedAt: string | null
}

type DrawTaskStatus = "queued" | "running" | "succeeded" | "failed" | "canceled"
type MessageStatus = "pending" | "running" | "succeeded" | "failed"

type ConversationRecord = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

type ImageAssetRecord = {
  id: string
  taskId: string
  conversationId: string
  messageId: string
  filename: string
  url: string
  width: number
  height: number
  sortOrder: number
  createdAt: string
}

type DrawTaskRecord = {
  id: string
  conversationId: string | null
  requestMessageId: string | null
  replyMessageId: string | null
  prompt: string
  model: string
  size: string
  quality: string
  outputCount: number
  branchMode: BranchMode | null
  parentAssetId: string | null
  status: DrawTaskStatus
  progress: number
  resultUrl: string | null
  errorMessage: string | null
  attempts: number
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
  assets: ImageAssetRecord[]
}

type ConversationMessageRecord = {
  id: string
  conversationId: string
  role: "user" | "assistant"
  type: "prompt" | "image_result" | "error"
  text: string | null
  status: MessageStatus
  sortOrder: number
  createdAt: string
  updatedAt: string
  assets: ImageAssetRecord[]
  task?: DrawTaskRecord
}

type DrawTaskInput = {
  conversationId: string
  prompt: string
  model: string
  size: string
  quality: string
  outputCount: number
  branchMode: BranchMode | null
  parentAssetId: string | null
}

type StandaloneImageInput = {
  prompt: string
  model: string
  size: string
  quality: string
}

type PersistedImage = {
  filename: string
  width: number
  height: number
}

type ApiError = {
  message: string
  status: number
  code?: string
}

type ProviderConfigInput = {
  apiKey: string
  baseUrl: string
}

const BRANCH_MODE_INSTRUCTIONS: Record<BranchMode, string> = {
  evolve:
    "请基于参考图继续延展，保留整体视觉气质、材质语言与系列感，允许调整构图、镜头、细节与陪体，但不要无关地替换主题。",
  preserve:
    "请严格围绕参考图中的主体进行修改，尽量保持主体身份、核心轮廓、关键造型与辨识特征，仅按提示词做局部调整、补充或润饰。",
  transform:
    "请把参考图作为创作起点进行大幅改造，可以重构场景、风格、色彩与表现手法，但仍应与参考图存在可追溯的视觉关联。",
}

let database: DatabaseSync | null = null

function getDatabase() {
  if (database) return database

  database = new DatabaseSync(databasePath)
  database.exec("PRAGMA journal_mode = WAL")
  database.exec("PRAGMA busy_timeout = 5000")
  database.exec("PRAGMA foreign_keys = ON")
  initSchema(database)
  return database
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT,
      status TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS draw_tasks (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      request_message_id TEXT,
      reply_message_id TEXT,
      prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      size TEXT NOT NULL,
      quality TEXT NOT NULL,
      output_count INTEGER NOT NULL DEFAULT 1,
      branch_mode TEXT,
      parent_asset_id TEXT,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      result_filename TEXT,
      error_message TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS image_assets (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES draw_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS provider_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      api_key TEXT NOT NULL,
      base_url TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
    ON messages(conversation_id, sort_order, created_at);

    CREATE INDEX IF NOT EXISTS idx_draw_tasks_status_created_at
    ON draw_tasks(status, created_at);

    CREATE INDEX IF NOT EXISTS idx_draw_tasks_conversation_created_at
    ON draw_tasks(conversation_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_draw_tasks_reply_message_id
    ON draw_tasks(reply_message_id);

    CREATE INDEX IF NOT EXISTS idx_image_assets_message_sort_order
    ON image_assets(message_id, sort_order);
  `)

  migrateColumn(db, "messages", "sort_order", "INTEGER NOT NULL DEFAULT 0")
  migrateColumn(db, "draw_tasks", "conversation_id", "TEXT")
  migrateColumn(db, "draw_tasks", "request_message_id", "TEXT")
  migrateColumn(db, "draw_tasks", "reply_message_id", "TEXT")
  migrateColumn(db, "draw_tasks", "output_count", "INTEGER NOT NULL DEFAULT 1")
  migrateColumn(db, "draw_tasks", "branch_mode", "TEXT")
  migrateColumn(db, "draw_tasks", "parent_asset_id", "TEXT")
  migrateColumn(db, "draw_tasks", "result_filename", "TEXT")
}

function migrateColumn(
  db: DatabaseSync,
  tableName: string,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>

  if (columns.some((column) => column.name === columnName)) return
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`)
}

function buildId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`
}

function normalizeBaseUrl(value: unknown) {
  const baseUrl = typeof value === "string" ? value.trim().replace(/\/+$/, "") : ""
  return baseUrl || DEFAULT_OPENAI_BASE_URL
}

function isValidHttpBaseUrl(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function errorResponse(error: ApiError) {
  return NextResponse.json(
    { error: error.message, ...(error.code ? { code: error.code } : {}) },
    { status: error.status },
  )
}

function apiError(message: string, status = 400, code?: string): ApiError {
  return { message, status, code }
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown
  } catch {
    return {}
  }
}

function validateProviderConfigInput(payload: unknown): ProviderConfigInput | ApiError {
  const data = asObject(payload)
  if (!data) return apiError("请求体不是有效对象。")

  const apiKey = asTrimmedString(data.apiKey)
  const baseUrl = normalizeBaseUrl(data.baseUrl)

  if (!apiKey) return apiError("API Key 不能为空。")
  if (!isValidHttpBaseUrl(baseUrl)) {
    return apiError("Base URL 无效，仅支持 http 或 https 地址。")
  }

  return { apiKey, baseUrl }
}

function validateStandaloneImageInput(payload: unknown): StandaloneImageInput | ApiError {
  const data = asObject(payload)
  if (!data) return apiError("请求体不是有效对象。")

  const prompt = asTrimmedString(data.prompt)
  const model = asTrimmedString(data.model || "gpt-image-2")
  const size = asTrimmedString(data.size || "1024x1024")
  const quality = asTrimmedString(data.quality || "auto")

  if (!prompt) return apiError("提示词不能为空。")
  if (prompt.length > 2400) return apiError("提示词过长，请控制在 2400 个字符以内。")
  if (!ALLOWED_MODELS.has(model)) return apiError("不支持的图像模型。")
  if (!ALLOWED_SIZES.has(size)) return apiError("不支持的图像尺寸。")
  if (!ALLOWED_QUALITIES.has(quality)) return apiError("不支持的图像质量。")

  return { prompt, model, size, quality }
}

function validateDrawTaskInput(payload: unknown): DrawTaskInput | ApiError {
  const imageInput = validateStandaloneImageInput(payload)
  if ("message" in imageInput) return imageInput

  const data = asObject(payload)
  if (!data) return apiError("请求体不是有效对象。")

  const conversationId = asTrimmedString(data.conversationId)
  if (!conversationId) return apiError("conversationId 不能为空。")

  const rawOutputCount = data.outputCount
  const outputCount = rawOutputCount === undefined ? 1 : rawOutputCount
  if (typeof outputCount !== "number" || !Number.isInteger(outputCount) || outputCount < 1 || outputCount > 4) {
    return apiError("输出图片数量仅支持 1 到 4。")
  }

  const rawBranchMode = data.branchMode
  const branchMode =
    typeof rawBranchMode === "string" && rawBranchMode.trim() ? rawBranchMode.trim() : null

  if (branchMode !== null && !ALLOWED_BRANCH_MODES.has(branchMode as BranchMode)) {
    return apiError("不支持的分支模式。")
  }

  const parentAssetId = asTrimmedString(data.parentAssetId) || null

  if (parentAssetId && !BRANCH_SOURCE_COMPATIBLE_MODELS.has(imageInput.model)) {
    return apiError(
      "当前模型不支持基于来源图继续生成，请切换到 GPT Image 1.5 或 GPT Image 1。",
    )
  }

  return {
    ...imageInput,
    conversationId,
    outputCount,
    branchMode: parentAssetId ? (branchMode as BranchMode | null) : null,
    parentAssetId,
  }
}

function compileBranchPrompt(prompt: string, branchMode: BranchMode | null) {
  if (!branchMode) return prompt.trim()
  return `${BRANCH_MODE_INSTRUCTIONS[branchMode]}\n\n用户目标：${prompt.trim()}`
}

function getPngSize(imageBytes: Uint8Array) {
  const signature = Buffer.from(imageBytes.subarray(0, 8)).toString("latin1")
  if (signature !== PNG_SIGNATURE) {
    throw apiError("OpenAI 响应中的图像不是 PNG 格式。", 502)
  }

  const width = Buffer.from(imageBytes.subarray(16, 20)).readUInt32BE(0)
  const height = Buffer.from(imageBytes.subarray(20, 24)).readUInt32BE(0)
  return { width, height }
}

async function saveGeneratedImage(imageBytes: Uint8Array): Promise<PersistedImage> {
  await mkdir(generatedImagesDir, { recursive: true })

  const { width, height } = getPngSize(imageBytes)
  const filename = `${buildId("image")}.png`
  const filePath = path.join(generatedImagesDir, filename)

  await writeFile(filePath, imageBytes)
  return { filename, width, height }
}

function buildGeneratedImageUrl(filename: string) {
  return `/api/generated-images/${encodeURIComponent(filename)}`
}

async function generateOpenAiImages(
  input: StandaloneImageInput & {
    outputCount: number
    branchMode?: BranchMode | null
    parentAssetId?: string | null
  },
  providerConfig: ProviderConfigRecord,
  sourceImageBytes?: Uint8Array,
) {
  if (!providerConfig.apiKey) {
    throw apiError("缺少 OpenAI API Key，请先在页面左侧配置。", 401)
  }

  const baseUrl = normalizeBaseUrl(providerConfig.baseUrl)
  if (!isValidHttpBaseUrl(baseUrl)) {
    throw apiError("Base URL 无效，仅支持 http 或 https 地址。", 400)
  }

  const endpoint = new URL(sourceImageBytes ? "images/edits" : "images/generations", `${baseUrl}/`)
  const prompt = compileBranchPrompt(input.prompt, input.branchMode ?? null)

  const response = sourceImageBytes
    ? await postEditRequest(endpoint, providerConfig.apiKey, {
        model: input.model,
        prompt,
        n: input.outputCount,
        size: input.size,
        quality: input.quality,
        image: sourceImageBytes,
      })
    : await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          prompt,
          n: input.outputCount,
          size: input.size,
          quality: input.quality,
          output_format: "png",
          response_format: "b64_json",
        }),
      })

  if (!response.ok) {
    throw await parseOpenAiError(response)
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string | null }>
  }

  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    throw apiError("OpenAI 响应中没有图像数据。", 502)
  }

  return payload.data.map((item) => {
    if (!item.b64_json) {
      throw apiError("OpenAI 响应中没有图像数据。", 502)
    }

    const imageBytes = Uint8Array.from(Buffer.from(item.b64_json, "base64"))
    getPngSize(imageBytes)
    return imageBytes
  })
}

async function postEditRequest(
  endpoint: URL,
  apiKey: string,
  input: {
    model: string
    prompt: string
    n: number
    size: string
    quality: string
    image: Uint8Array
  },
) {
  const formData = new FormData()
  formData.set("model", input.model)
  formData.set("prompt", input.prompt)
  formData.set("n", String(input.n))
  formData.set("size", input.size)
  formData.set("quality", input.quality)
  formData.set("output_format", "png")
  formData.set("response_format", "b64_json")
  formData.set(
    "image",
    new File([Buffer.from(input.image)], "source.png", { type: "image/png" }),
  )

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })
}

async function parseOpenAiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as { error?: { message?: string } }
    const message = payload.error?.message
    if (typeof message === "string" && message) {
      return apiError(message, response.status)
    }
  } catch {
    // Fall through to generic HTTP status message.
  }

  return apiError(`OpenAI 接口返回 ${response.status}。`, response.status)
}

function serializeConversation(row: Record<string, unknown>): ConversationRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function serializeTask(row: Record<string, unknown>, assets: ImageAssetRecord[]): DrawTaskRecord {
  const resultFilename =
    typeof row.result_filename === "string" && row.result_filename ? row.result_filename : null

  return {
    id: String(row.id),
    conversationId: toNullableString(row.conversation_id),
    requestMessageId: toNullableString(row.request_message_id),
    replyMessageId: toNullableString(row.reply_message_id),
    prompt: String(row.prompt),
    model: String(row.model),
    size: String(row.size),
    quality: String(row.quality),
    outputCount: Number(row.output_count ?? 1),
    branchMode: toNullableBranchMode(row.branch_mode),
    parentAssetId: toNullableString(row.parent_asset_id),
    status: String(row.status) as DrawTaskStatus,
    progress: Number(row.progress ?? 0),
    resultUrl: resultFilename ? buildGeneratedImageUrl(resultFilename) : null,
    errorMessage: toNullableString(row.error_message),
    attempts: Number(row.attempts ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    startedAt: toNullableString(row.started_at),
    finishedAt: toNullableString(row.finished_at),
    assets,
  }
}

function serializeAsset(row: Record<string, unknown>): ImageAssetRecord {
  const filename = String(row.filename)
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    conversationId: String(row.conversation_id),
    messageId: String(row.message_id),
    filename,
    url: buildGeneratedImageUrl(filename),
    width: Number(row.width),
    height: Number(row.height),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
  }
}

function serializeMessage(
  row: Record<string, unknown>,
  assets: ImageAssetRecord[],
  task?: DrawTaskRecord,
): ConversationMessageRecord {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: String(row.role) as "user" | "assistant",
    type: String(row.type) as "prompt" | "image_result" | "error",
    text: toNullableString(row.text),
    status: String(row.status) as MessageStatus,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    assets,
    ...(task ? { task } : {}),
  }
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value ? value : null
}

function toNullableBranchMode(value: unknown) {
  return typeof value === "string" && ALLOWED_BRANCH_MODES.has(value as BranchMode)
    ? (value as BranchMode)
    : null
}

function listAssetsByTaskIds(db: DatabaseSync, taskIds: string[]) {
  if (taskIds.length === 0) return new Map<string, ImageAssetRecord[]>()
  const statement = db.prepare(`
    SELECT *
    FROM image_assets
    WHERE task_id IN (${taskIds.map(() => "?").join(", ")})
    ORDER BY sort_order ASC, created_at ASC, id ASC
  `)
  const rows = statement.all(...taskIds) as Array<Record<string, unknown>>
  const map = new Map<string, ImageAssetRecord[]>()
  for (const row of rows) {
    const asset = serializeAsset(row)
    map.set(asset.taskId, [...(map.get(asset.taskId) ?? []), asset])
  }
  return map
}

function listAssetsByMessageIds(db: DatabaseSync, messageIds: string[]) {
  if (messageIds.length === 0) return new Map<string, ImageAssetRecord[]>()
  const statement = db.prepare(`
    SELECT *
    FROM image_assets
    WHERE message_id IN (${messageIds.map(() => "?").join(", ")})
    ORDER BY sort_order ASC, created_at ASC, id ASC
  `)
  const rows = statement.all(...messageIds) as Array<Record<string, unknown>>
  const map = new Map<string, ImageAssetRecord[]>()
  for (const row of rows) {
    const asset = serializeAsset(row)
    map.set(asset.messageId, [...(map.get(asset.messageId) ?? []), asset])
  }
  return map
}

function listTasksByReplyMessageIds(db: DatabaseSync, replyMessageIds: string[]) {
  if (replyMessageIds.length === 0) return new Map<string, DrawTaskRecord>()
  const statement = db.prepare(`
    SELECT *
    FROM draw_tasks
    WHERE reply_message_id IN (${replyMessageIds.map(() => "?").join(", ")})
  `)
  const rows = statement.all(...replyMessageIds) as Array<Record<string, unknown>>
  const assetsByTaskId = listAssetsByTaskIds(
    db,
    rows.map((row) => String(row.id)),
  )
  const map = new Map<string, DrawTaskRecord>()
  for (const row of rows) {
    const task = serializeTask(row, assetsByTaskId.get(String(row.id)) ?? [])
    const replyMessageId = toNullableString(row.reply_message_id)
    if (replyMessageId) map.set(replyMessageId, task)
  }
  return map
}

function getProviderConfigRecord() {
  const db = getDatabase()
  const row = db
    .prepare(`
      SELECT api_key, base_url, updated_at
      FROM provider_config
      WHERE id = 1
    `)
    .get() as Record<string, unknown> | undefined

  if (!row) {
    return {
      apiKey: "",
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      hasApiKey: false,
      updatedAt: null,
    } satisfies ProviderConfigRecord
  }

  return {
    apiKey: String(row.api_key),
    baseUrl: String(row.base_url),
    hasApiKey: true,
    updatedAt: String(row.updated_at),
  } satisfies ProviderConfigRecord
}

async function readSourceImageBytes(parentAssetId: string) {
  const db = getDatabase()
  const row = db
    .prepare(`
      SELECT filename
      FROM image_assets
      WHERE id = ?
    `)
    .get(parentAssetId) as Record<string, unknown> | undefined

  if (!row?.filename || typeof row.filename !== "string") {
    throw apiError("来源图片不存在，无法继续生成。", 404)
  }

  const filePath = resolveGeneratedImagePath(row.filename)
  if (!filePath) {
    throw apiError("来源图片不存在，无法继续生成。", 404)
  }

  try {
    return new Uint8Array(await readFile(filePath))
  } catch {
    throw apiError("来源图片文件不存在，无法继续生成。", 404)
  }
}

function resolveGeneratedImagePath(filename: string) {
  if (!GENERATED_IMAGE_FILENAME_PATTERN.test(filename)) return null
  const resolvedPath = path.resolve(generatedImagesDir, filename)
  if (!resolvedPath.startsWith(path.resolve(generatedImagesDir) + path.sep)) return null
  return resolvedPath
}

export async function getProviderConfig() {
  return NextResponse.json({ config: getProviderConfigRecord() })
}

export async function saveProviderConfig(request: Request) {
  const payload = await readJson(request)
  const input = validateProviderConfigInput(payload)
  if ("message" in input) return errorResponse(input)

  const db = getDatabase()
  db.prepare(`
    INSERT INTO provider_config (id, api_key, base_url, updated_at)
    VALUES (1, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      api_key = excluded.api_key,
      base_url = excluded.base_url,
      updated_at = CURRENT_TIMESTAMP
  `).run(input.apiKey, input.baseUrl)

  return NextResponse.json({ config: getProviderConfigRecord() })
}

export async function clearProviderConfig() {
  getDatabase().prepare("DELETE FROM provider_config WHERE id = 1").run()
  return NextResponse.json({ config: getProviderConfigRecord() })
}

export async function createConversation(request: Request) {
  const payload = asObject(await readJson(request))
  const title = asTrimmedString(payload?.title) || "未命名会话"
  const db = getDatabase()
  const conversationId = buildId("conversation")
  db.prepare(`
    INSERT INTO conversations (id, title)
    VALUES (?, ?)
  `).run(conversationId, title)

  const row = db
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(conversationId) as Record<string, unknown>

  return NextResponse.json({ conversation: serializeConversation(row) }, { status: 201 })
}

export async function listConversations() {
  const rows = getDatabase()
    .prepare(`
      SELECT *
      FROM conversations
      ORDER BY updated_at DESC, id DESC
    `)
    .all() as Array<Record<string, unknown>>

  return NextResponse.json({
    conversations: rows.map(serializeConversation),
  })
}

export async function readConversation(conversationId: string) {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM conversations
      WHERE id = ?
    `)
    .get(conversationId) as Record<string, unknown> | undefined

  if (!row) {
    return errorResponse(apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE))
  }

  return NextResponse.json({ conversation: serializeConversation(row) })
}

export async function readConversationMessages(conversationId: string) {
  const db = getDatabase()
  const conversationExists = db
    .prepare("SELECT 1 FROM conversations WHERE id = ?")
    .get(conversationId)

  if (!conversationExists) {
    return errorResponse(apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE))
  }

  const messageRows = db
    .prepare(`
      SELECT *
      FROM messages
      WHERE conversation_id = ?
      ORDER BY sort_order ASC, created_at ASC, id ASC
    `)
    .all(conversationId) as Array<Record<string, unknown>>

  const messageIds = messageRows.map((row) => String(row.id))
  const assetsByMessageId = listAssetsByMessageIds(db, messageIds)
  const tasksByReplyMessageId = listTasksByReplyMessageIds(db, messageIds)

  return NextResponse.json({
    messages: messageRows.map((row) =>
      serializeMessage(
        row,
        assetsByMessageId.get(String(row.id)) ?? [],
        tasksByReplyMessageId.get(String(row.id)),
      ),
    ),
  })
}

export async function listDrawTasks() {
  const db = getDatabase()
  const rows = db
    .prepare(`
      SELECT *
      FROM draw_tasks
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    `)
    .all() as Array<Record<string, unknown>>

  const assetsByTaskId = listAssetsByTaskIds(
    db,
    rows.map((row) => String(row.id)),
  )

  return NextResponse.json({
    tasks: rows.map((row) => serializeTask(row, assetsByTaskId.get(String(row.id)) ?? [])),
  })
}

export async function readDrawTask(taskId: string) {
  const db = getDatabase()
  const row = db
    .prepare(`
      SELECT *
      FROM draw_tasks
      WHERE id = ?
    `)
    .get(taskId) as Record<string, unknown> | undefined

  if (!row) {
    return errorResponse(apiError("任务不存在。", 404))
  }

  const assetsByTaskId = listAssetsByTaskIds(db, [taskId])
  return NextResponse.json({
    task: serializeTask(row, assetsByTaskId.get(taskId) ?? []),
  })
}

export async function createDrawTask(request: Request) {
  const payload = await readJson(request)
  const input = validateDrawTaskInput(payload)
  if ("message" in input) return errorResponse(input)

  try {
    const task = await createSynchronousDrawTask(input)
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    return errorResponse(normalizeError(error))
  }
}

async function createSynchronousDrawTask(input: DrawTaskInput): Promise<DrawTaskRecord> {
  const db = getDatabase()
  const conversationExists = db
    .prepare("SELECT 1 FROM conversations WHERE id = ?")
    .get(input.conversationId)

  if (!conversationExists) {
    throw apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE)
  }

  const taskId = buildId("task")
  const requestMessageId = buildId("message")
  const replyMessageId = buildId("message")
  const nextSortOrderRow = db
    .prepare(`
      SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order
      FROM messages
      WHERE conversation_id = ?
    `)
    .get(input.conversationId) as { max_sort_order: number }
  const nextSortOrder = Number(nextSortOrderRow.max_sort_order ?? 0) + 1

  db.prepare(`
    INSERT INTO messages (
      id, conversation_id, role, type, text, status, sort_order
    ) VALUES (?, ?, 'user', 'prompt', ?, 'succeeded', ?)
  `).run(requestMessageId, input.conversationId, input.prompt, nextSortOrder)

  db.prepare(`
    INSERT INTO messages (
      id, conversation_id, role, type, text, status, sort_order
    ) VALUES (?, ?, 'assistant', 'image_result', NULL, 'pending', ?)
  `).run(replyMessageId, input.conversationId, nextSortOrder + 1)

  db.prepare(`
    INSERT INTO draw_tasks (
      id, conversation_id, request_message_id, reply_message_id, prompt, model, size,
      quality, output_count, branch_mode, parent_asset_id, status, progress, attempts,
      started_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    taskId,
    input.conversationId,
    requestMessageId,
    replyMessageId,
    input.prompt,
    input.model,
    input.size,
    input.quality,
    input.outputCount,
    input.branchMode,
    input.parentAssetId,
  )

  db.prepare(`
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(input.conversationId)

  try {
    const providerConfig = getProviderConfigRecord()
    const sourceImageBytes = input.parentAssetId
      ? await readSourceImageBytes(input.parentAssetId)
      : undefined
    const imageBytesList = await generateOpenAiImages(input, providerConfig, sourceImageBytes)
    const persistedImages = await Promise.all(imageBytesList.map((imageBytes) => saveGeneratedImage(imageBytes)))

    db.prepare(`
      UPDATE draw_tasks
      SET status = 'succeeded',
          progress = 100,
          result_filename = ?,
          error_message = NULL,
          finished_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(persistedImages[0]?.filename ?? null, taskId)

    db.prepare(`
      UPDATE messages
      SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(replyMessageId)

    db.prepare("DELETE FROM image_assets WHERE task_id = ?").run(taskId)

    const insertAssetStatement = db.prepare(`
      INSERT INTO image_assets (
        id, task_id, conversation_id, message_id, filename, width, height, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const [index, image] of persistedImages.entries()) {
      insertAssetStatement.run(
        buildId("asset"),
        taskId,
        input.conversationId,
        replyMessageId,
        image.filename,
        image.width,
        image.height,
        index,
      )
    }
  } catch (error) {
    const normalizedError = normalizeError(error)

    db.prepare(`
      UPDATE draw_tasks
      SET status = 'failed',
          error_message = ?,
          finished_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(normalizedError.message, taskId)

    db.prepare(`
      UPDATE messages
      SET status = 'failed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(replyMessageId)
  }

  const taskRow = db
    .prepare("SELECT * FROM draw_tasks WHERE id = ?")
    .get(taskId) as Record<string, unknown>
  const assetsByTaskId = listAssetsByTaskIds(db, [taskId])
  return serializeTask(taskRow, assetsByTaskId.get(taskId) ?? [])
}

function normalizeError(error: unknown): ApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "status" in error &&
    typeof error.message === "string" &&
    typeof error.status === "number"
  ) {
    return error as ApiError
  }

  if (error instanceof Error) {
    return apiError(error.message || "请求失败。", 500)
  }

  return apiError("请求失败。", 500)
}

export async function generateImage(request: Request) {
  const payload = await readJson(request)
  const input = validateStandaloneImageInput(payload)
  if ("message" in input) return errorResponse(input)

  try {
    const providerConfig = getProviderConfigRecord()
    const [imageBytes] = await generateOpenAiImages(
      { ...input, outputCount: 1 },
      providerConfig,
    )

    if (!imageBytes) {
      return errorResponse(apiError("未生成任何图片。", 502))
    }

    const image = await saveGeneratedImage(imageBytes)
    return NextResponse.json({ image: buildGeneratedImageUrl(image.filename) })
  } catch (error) {
    return errorResponse(normalizeError(error))
  }
}

export async function readGeneratedImage(filename: string) {
  const filePath = resolveGeneratedImagePath(filename)
  if (!filePath) {
    return errorResponse(apiError("图片不存在。", 404))
  }

  try {
    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) {
      return errorResponse(apiError("图片不存在。", 404))
    }

    const imageBuffer = await readFile(filePath)
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(imageBuffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return errorResponse(apiError("图片不存在。", 404))
  }
}
