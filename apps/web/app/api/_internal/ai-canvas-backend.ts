import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"

import { dataDir, initDatabase, prisma } from "@/db"
import type {
  Conversation as PrismaConversation,
  DrawTask as PrismaDrawTask,
  ImageAsset as PrismaImageAsset,
  Message as PrismaMessage,
} from "@/generated/prisma/client"

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
  if (
    typeof outputCount !== "number" ||
    !Number.isInteger(outputCount) ||
    outputCount < 1 ||
    outputCount > 4
  ) {
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

  const endpoint = new URL(
    sourceImageBytes ? "images/edits" : "images/generations",
    `${baseUrl}/`,
  )
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

function serializeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.toISOString()
  return typeof value === "string" && value ? new Date(value).toISOString() : null
}

function serializeRequiredDate(value: Date | string) {
  return serializeDate(value) ?? new Date(0).toISOString()
}

function serializeConversation(row: PrismaConversation): ConversationRecord {
  return {
    id: row.id,
    title: row.title,
    createdAt: serializeRequiredDate(row.createdAt),
    updatedAt: serializeRequiredDate(row.updatedAt),
  }
}

function serializeTask(row: PrismaDrawTask, assets: ImageAssetRecord[]): DrawTaskRecord {
  const resultFilename = row.resultFilename || null

  return {
    id: row.id,
    conversationId: toNullableString(row.conversationId),
    requestMessageId: toNullableString(row.requestMessageId),
    replyMessageId: toNullableString(row.replyMessageId),
    prompt: row.prompt,
    model: row.model,
    size: row.size,
    quality: row.quality,
    outputCount: row.outputCount,
    branchMode: toNullableBranchMode(row.branchMode),
    parentAssetId: toNullableString(row.parentAssetId),
    status: row.status as DrawTaskStatus,
    progress: row.progress,
    resultUrl: resultFilename ? buildGeneratedImageUrl(resultFilename) : null,
    errorMessage: toNullableString(row.errorMessage),
    attempts: row.attempts,
    createdAt: serializeRequiredDate(row.createdAt),
    updatedAt: serializeRequiredDate(row.updatedAt),
    startedAt: serializeDate(row.startedAt),
    finishedAt: serializeDate(row.finishedAt),
    assets,
  }
}

function serializeAsset(row: PrismaImageAsset): ImageAssetRecord {
  const filename = row.filename
  return {
    id: row.id,
    taskId: row.taskId,
    conversationId: row.conversationId,
    messageId: row.messageId,
    filename,
    url: buildGeneratedImageUrl(filename),
    width: row.width,
    height: row.height,
    sortOrder: row.sortOrder,
    createdAt: serializeRequiredDate(row.createdAt),
  }
}

function serializeMessage(
  row: PrismaMessage,
  assets: ImageAssetRecord[],
  task?: DrawTaskRecord,
): ConversationMessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "user" | "assistant",
    type: row.type as "prompt" | "image_result" | "error",
    text: toNullableString(row.text),
    status: row.status as MessageStatus,
    sortOrder: row.sortOrder,
    createdAt: serializeRequiredDate(row.createdAt),
    updatedAt: serializeRequiredDate(row.updatedAt),
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

async function listAssetsByTaskIds(taskIds: string[]) {
  if (taskIds.length === 0) return new Map<string, ImageAssetRecord[]>()
  const rows = await prisma.imageAsset.findMany({
    where: { taskId: { in: taskIds } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  })
  const map = new Map<string, ImageAssetRecord[]>()
  for (const row of rows) {
    const asset = serializeAsset(row)
    map.set(asset.taskId, [...(map.get(asset.taskId) ?? []), asset])
  }
  return map
}

async function listAssetsByMessageIds(messageIds: string[]) {
  if (messageIds.length === 0) return new Map<string, ImageAssetRecord[]>()
  const rows = await prisma.imageAsset.findMany({
    where: { messageId: { in: messageIds } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  })
  const map = new Map<string, ImageAssetRecord[]>()
  for (const row of rows) {
    const asset = serializeAsset(row)
    map.set(asset.messageId, [...(map.get(asset.messageId) ?? []), asset])
  }
  return map
}

async function listTasksByReplyMessageIds(replyMessageIds: string[]) {
  if (replyMessageIds.length === 0) return new Map<string, DrawTaskRecord>()
  const rows = await prisma.drawTask.findMany({
    where: { replyMessageId: { in: replyMessageIds } },
  })
  const assetsByTaskId = await listAssetsByTaskIds(rows.map((row) => row.id))
  const map = new Map<string, DrawTaskRecord>()
  for (const row of rows) {
    const task = serializeTask(row, assetsByTaskId.get(row.id) ?? [])
    const replyMessageId = toNullableString(row.replyMessageId)
    if (replyMessageId) map.set(replyMessageId, task)
  }
  return map
}

async function getProviderConfigRecord() {
  await initDatabase()
  const row = await prisma.providerConfig.findUnique({ where: { id: 1 } })

  if (!row) {
    return {
      apiKey: "",
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      hasApiKey: false,
      updatedAt: null,
    } satisfies ProviderConfigRecord
  }

  return {
    apiKey: row.apiKey,
    baseUrl: row.baseUrl,
    hasApiKey: true,
    updatedAt: serializeDate(row.updatedAt),
  } satisfies ProviderConfigRecord
}

async function readSourceImageBytes(parentAssetId: string) {
  await initDatabase()
  const row = await prisma.imageAsset.findUnique({
    where: { id: parentAssetId },
    select: { filename: true },
  })

  if (!row?.filename) {
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
  return NextResponse.json({ config: await getProviderConfigRecord() })
}

export async function saveProviderConfig(request: Request) {
  const payload = await readJson(request)
  const input = validateProviderConfigInput(payload)
  if ("message" in input) return errorResponse(input)

  await initDatabase()
  await prisma.providerConfig.upsert({
    where: { id: 1 },
    create: { id: 1, apiKey: input.apiKey, baseUrl: input.baseUrl },
    update: { apiKey: input.apiKey, baseUrl: input.baseUrl },
  })

  return NextResponse.json({ config: await getProviderConfigRecord() })
}

export async function clearProviderConfig() {
  await initDatabase()
  await prisma.providerConfig.deleteMany({ where: { id: 1 } })
  return NextResponse.json({ config: await getProviderConfigRecord() })
}

export async function createConversation(request: Request) {
  const payload = asObject(await readJson(request))
  const title = asTrimmedString(payload?.title) || "未命名会话"
  const conversationId = buildId("conversation")
  await initDatabase()
  const row = await prisma.conversation.create({
    data: { id: conversationId, title },
  })

  return NextResponse.json({ conversation: serializeConversation(row) }, { status: 201 })
}

export async function listConversations() {
  await initDatabase()
  const rows = await prisma.conversation.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  })

  return NextResponse.json({
    conversations: rows.map(serializeConversation),
  })
}

export async function readConversation(conversationId: string) {
  await initDatabase()
  const row = await prisma.conversation.findUnique({ where: { id: conversationId } })

  if (!row) {
    return errorResponse(apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE))
  }

  return NextResponse.json({ conversation: serializeConversation(row) })
}

export async function readConversationMessages(conversationId: string) {
  await initDatabase()
  const conversationExists = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })

  if (!conversationExists) {
    return errorResponse(apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE))
  }

  const messageRows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  })

  const messageIds = messageRows.map((row) => row.id)
  const [assetsByMessageId, tasksByReplyMessageId] = await Promise.all([
    listAssetsByMessageIds(messageIds),
    listTasksByReplyMessageIds(messageIds),
  ])

  return NextResponse.json({
    messages: messageRows.map((row) =>
      serializeMessage(
        row,
        assetsByMessageId.get(row.id) ?? [],
        tasksByReplyMessageId.get(row.id),
      ),
    ),
  })
}

export async function listDrawTasks() {
  await initDatabase()
  const rows = await prisma.drawTask.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  })

  const assetsByTaskId = await listAssetsByTaskIds(rows.map((row) => row.id))

  return NextResponse.json({
    tasks: rows.map((row) => serializeTask(row, assetsByTaskId.get(row.id) ?? [])),
  })
}

export async function readDrawTask(taskId: string) {
  await initDatabase()
  const row = await prisma.drawTask.findUnique({ where: { id: taskId } })

  if (!row) {
    return errorResponse(apiError("任务不存在。", 404))
  }

  const assetsByTaskId = await listAssetsByTaskIds([taskId])
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
  await initDatabase()
  const taskId = buildId("task")
  const requestMessageId = buildId("message")
  const replyMessageId = buildId("message")

  await prisma.$transaction(async (tx) => {
    const conversationExists = await tx.conversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true },
    })

    if (!conversationExists) {
      throw apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE)
    }

    const nextSortOrderAggregate = await tx.message.aggregate({
      where: { conversationId: input.conversationId },
      _max: { sortOrder: true },
    })
    const nextSortOrder = (nextSortOrderAggregate._max.sortOrder ?? 0) + 1

    await tx.message.create({
      data: {
        id: requestMessageId,
        conversationId: input.conversationId,
        role: "user",
        type: "prompt",
        text: input.prompt,
        status: "succeeded",
        sortOrder: nextSortOrder,
      },
    })

    await tx.message.create({
      data: {
        id: replyMessageId,
        conversationId: input.conversationId,
        role: "assistant",
        type: "image_result",
        text: null,
        status: "pending",
        sortOrder: nextSortOrder + 1,
      },
    })

    await tx.drawTask.create({
      data: {
        id: taskId,
        conversationId: input.conversationId,
        requestMessageId,
        replyMessageId,
        prompt: input.prompt,
        model: input.model,
        size: input.size,
        quality: input.quality,
        outputCount: input.outputCount,
        branchMode: input.branchMode,
        parentAssetId: input.parentAssetId,
        status: "queued",
        progress: 0,
        attempts: 1,
        startedAt: new Date(),
      },
    })

    await tx.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    })
  })

  try {
    const providerConfig = await getProviderConfigRecord()
    const sourceImageBytes = input.parentAssetId
      ? await readSourceImageBytes(input.parentAssetId)
      : undefined
    const imageBytesList = await generateOpenAiImages(
      input,
      providerConfig,
      sourceImageBytes,
    )
    const persistedImages = await Promise.all(
      imageBytesList.map((imageBytes) => saveGeneratedImage(imageBytes)),
    )

    await prisma.$transaction(async (tx) => {
      await tx.drawTask.update({
        where: { id: taskId },
        data: {
          status: "succeeded",
          progress: 100,
          resultFilename: persistedImages[0]?.filename ?? null,
          errorMessage: null,
          finishedAt: new Date(),
        },
      })

      await tx.message.update({
        where: { id: replyMessageId },
        data: { status: "succeeded" },
      })

      await tx.imageAsset.deleteMany({ where: { taskId } })

      if (persistedImages.length > 0) {
        await tx.imageAsset.createMany({
          data: persistedImages.map((image, index) => ({
            id: buildId("asset"),
            taskId,
            conversationId: input.conversationId,
            messageId: replyMessageId,
            filename: image.filename,
            width: image.width,
            height: image.height,
            sortOrder: index,
          })),
        })
      }
    })
  } catch (error) {
    const normalizedError = normalizeError(error)

    await prisma.$transaction(async (tx) => {
      await tx.drawTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          errorMessage: normalizedError.message,
          finishedAt: new Date(),
        },
      })

      await tx.message.update({
        where: { id: replyMessageId },
        data: { status: "failed" },
      })
    })
  }

  const taskRow = await prisma.drawTask.findUniqueOrThrow({ where: { id: taskId } })
  const assetsByTaskId = await listAssetsByTaskIds([taskId])
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
    const providerConfig = await getProviderConfigRecord()
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
