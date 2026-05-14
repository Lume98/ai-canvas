import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import {
  BranchMode,
  branchModes,
  defaultBranchMode,
} from "@/components/domain/branch-mode"

const defaultOpenAIBaseUrl = "https://api.openai.com/v1"
const taskSettleDelayMs = 1400

type ProviderConfig = {
  apiKey: string
  baseUrl: string
  hasApiKey: boolean
  updatedAt: string | null
}

type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

type ImageAsset = {
  id: string
  taskId: string
  conversationId: string
  messageId: string
  filename: string
  url: string | null
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
  status: "queued" | "running" | "succeeded" | "failed" | "canceled"
  progress: number
  resultUrl: string | null
  errorMessage: string | null
  attempts: number
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
  assets: ImageAsset[]
}

type ConversationMessage = {
  id: string
  conversationId: string
  role: "user" | "assistant"
  type: "prompt" | "image_result" | "error"
  text: string | null
  status: "pending" | "running" | "succeeded" | "failed"
  sortOrder: number
  createdAt: string
  updatedAt: string
  assets: ImageAsset[]
  task?: DrawTaskRecord
}

type SettlingTask = {
  taskId: string
  queuedAt: number
}

type MockApiState = {
  providerConfig: ProviderConfig
  conversations: Map<string, Conversation>
  conversationMessages: Map<string, ConversationMessage[]>
  tasks: Map<string, DrawTaskRecord>
  assetsByFilename: Map<string, ImageAsset>
  settlingTasks: Map<string, SettlingTask>
}

type CreateTaskInput = {
  conversationId: string
  prompt: string
  model: string
  size: string
  quality: string
  outputCount?: number
  branchMode?: BranchMode | null
  parentAssetId?: string | null
}

type GenerateImageInput = {
  prompt: string
  model: string
  size: string
  quality: string
}

const state = createInitialState()

export function getProviderConfig() {
  return NextResponse.json({
    config: cloneProviderConfig(state.providerConfig),
  })
}

export async function saveProviderConfig(request: Request) {
  const payload = (await readJsonRecord(request)) ?? {}
  const apiKey = stringifyField(payload.apiKey).trim()

  if (!apiKey) {
    return errorResponse("API Key 不能为空。", 400)
  }

  const baseUrlInput = stringifyField(payload.baseUrl)
  const baseUrl = normalizeBaseUrl(baseUrlInput)

  if (!isValidHttpBaseUrl(baseUrl)) {
    return errorResponse("Base URL 只支持 http:// 或 https://。", 400)
  }

  state.providerConfig = {
    apiKey,
    baseUrl,
    hasApiKey: true,
    updatedAt: nowIso(),
  }

  return NextResponse.json({ config: cloneProviderConfig(state.providerConfig) })
}

export function clearProviderConfig() {
  state.providerConfig = buildDefaultProviderConfig()

  return NextResponse.json({ config: cloneProviderConfig(state.providerConfig) })
}

export async function createConversation(request: Request) {
  const payload = await readJsonRecord(request, true)
  const providedTitle = stringifyOptionalField(payload?.title)?.trim()
  const conversation = buildConversation(providedTitle || "未命名会话")

  state.conversations.set(conversation.id, conversation)
  state.conversationMessages.set(conversation.id, [])

  return NextResponse.json({ conversation }, { status: 201 })
}

export function listConversations() {
  hydrateSettledTasks()

  const conversations = Array.from(state.conversations.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map(cloneConversation)

  return NextResponse.json({ conversations })
}

export function readConversation(conversationId: string) {
  hydrateSettledTasks()

  const conversation = state.conversations.get(conversationId)

  if (!conversation) {
    return conversationNotFoundResponse()
  }

  return NextResponse.json({ conversation: cloneConversation(conversation) })
}

export function readConversationMessages(conversationId: string) {
  hydrateSettledTasks()

  if (!state.conversations.has(conversationId)) {
    return conversationNotFoundResponse()
  }

  return NextResponse.json({
    messages: cloneMessages(state.conversationMessages.get(conversationId) ?? []),
  })
}

export function listDrawTasks() {
  hydrateSettledTasks()

  const tasks = Array.from(state.tasks.values())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 50)
    .map(cloneTask)

  return NextResponse.json({ tasks })
}

export async function createDrawTask(request: Request) {
  const payload = (await readJsonRecord(request)) ?? {}
  const input = parseCreateTaskInput(payload)

  if (isErrorResult(input)) {
    return errorResponse(input.error, 400)
  }

  const conversation = state.conversations.get(input.conversationId)

  if (!conversation) {
    return conversationNotFoundResponse()
  }

  const createdTask = appendTaskToConversation(input, conversation)

  return NextResponse.json({ task: cloneTask(createdTask) }, { status: 201 })
}

export function readDrawTask(taskId: string) {
  hydrateSettledTasks()

  const task = state.tasks.get(taskId)

  if (!task) {
    return errorResponse("任务不存在。", 404)
  }

  return NextResponse.json({ task: cloneTask(task) })
}

export async function generateImage(request: Request) {
  const payload = (await readJsonRecord(request)) ?? {}
  const input = parseGenerateImageInput(payload)

  if (isErrorResult(input)) {
    return errorResponse(input.error, 400)
  }

  const asset = buildStandaloneAsset(input)

  state.assetsByFilename.set(asset.filename, asset)

  return NextResponse.json({ image: asset.url })
}

export function readGeneratedImage(filename: string) {
  hydrateSettledTasks()

  const asset = findAssetByFilename(filename)

  if (!asset) {
    return errorResponse("图片不存在。", 404)
  }

  if (!asset.url) {
    return errorResponse("图片地址不存在。", 404)
  }

  return NextResponse.redirect(asset.url, 302)
}

function createInitialState(): MockApiState {
  const initialState: MockApiState = {
    providerConfig: {
      apiKey: "mock-api-key",
      baseUrl: defaultOpenAIBaseUrl,
      hasApiKey: true,
      updatedAt: nowIso(),
    },
    conversations: new Map(),
    conversationMessages: new Map(),
    tasks: new Map(),
    assetsByFilename: new Map(),
    settlingTasks: new Map(),
  }

  const conversation = buildConversation("样例画图会话")
  initialState.conversations.set(conversation.id, conversation)
  initialState.conversationMessages.set(conversation.id, [])

  const seedTasks = [
    {
      prompt: "未来感城市屋顶花园，雨后夜景，霓虹反射，电影级广角构图",
      model: "gpt-image-2",
      size: "1536x1024",
      quality: "high",
      outputCount: 2,
    },
    {
      prompt: "极简香水产品海报，磨砂玻璃瓶，清晨侧光，电商主图风格",
      model: "gpt-image-1.5",
      size: "1024x1024",
      quality: "medium",
      outputCount: 1,
    },
  ]

  for (const taskInput of seedTasks) {
    appendTaskToConversation(taskInput, conversation, initialState, true)
  }

  return initialState
}

function appendTaskToConversation(
  input: Omit<CreateTaskInput, "conversationId">,
  conversation: Conversation,
  targetState: MockApiState = state,
  completeImmediately = false
) {
  const createdAt = nowIso()
  const messages = targetState.conversationMessages.get(conversation.id) ?? []
  const requestMessage = buildMessage({
    conversationId: conversation.id,
    role: "user",
    type: "prompt",
    text: input.prompt,
    status: "succeeded",
    sortOrder: messages.length,
    createdAt,
  })
  const replyMessage = buildMessage({
    conversationId: conversation.id,
    role: "assistant",
    type: "image_result",
    text: input.prompt,
    status: "pending",
    sortOrder: messages.length + 1,
    createdAt,
  })
  const task: DrawTaskRecord = {
    id: buildId("task"),
    conversationId: conversation.id,
    requestMessageId: requestMessage.id,
    replyMessageId: replyMessage.id,
    prompt: input.prompt,
    model: input.model,
    size: input.size,
    quality: input.quality,
    outputCount: Math.max(1, Math.min(input.outputCount ?? 1, 4)),
    branchMode: input.parentAssetId ? (input.branchMode ?? defaultBranchMode) : null,
    parentAssetId: input.parentAssetId ?? null,
    status: "queued",
    progress: 0,
    resultUrl: null,
    errorMessage: null,
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
    assets: [],
  }

  replyMessage.task = cloneTask(task)

  messages.push(requestMessage, replyMessage)
  targetState.conversationMessages.set(conversation.id, messages)
  targetState.tasks.set(task.id, task)
  targetState.conversations.set(conversation.id, {
    ...conversation,
    updatedAt: createdAt,
  })

  if (completeImmediately) {
    settleTaskNow(targetState, task.id)
  } else {
    targetState.settlingTasks.set(task.id, {
      taskId: task.id,
      queuedAt: Date.now(),
    })
  }

  return cloneTask(targetState.tasks.get(task.id)!)
}

function hydrateSettledTasks() {
  const now = Date.now()

  for (const pending of Array.from(state.settlingTasks.values())) {
    const elapsed = now - pending.queuedAt
    const task = state.tasks.get(pending.taskId)

    if (!task) {
      state.settlingTasks.delete(pending.taskId)
      continue
    }

    if (elapsed >= taskSettleDelayMs) {
      settleTaskNow(state, pending.taskId)
      state.settlingTasks.delete(pending.taskId)
      continue
    }

    if (elapsed >= 500 && task.status === "queued") {
      markTaskRunning(state, pending.taskId)
    }
  }
}

function markTaskRunning(targetState: MockApiState, taskId: string) {
  const task = targetState.tasks.get(taskId)

  if (!task || task.status !== "queued") {
    return
  }

  const updatedAt = nowIso()
  task.status = "running"
  task.progress = 45
  task.attempts = Math.max(task.attempts, 1)
  task.startedAt = task.startedAt ?? updatedAt
  task.updatedAt = updatedAt

  syncReplyMessageWithTask(targetState, task, "running")
}

function settleTaskNow(targetState: MockApiState, taskId: string) {
  const task = targetState.tasks.get(taskId)

  if (!task) {
    return
  }

  const updatedAt = nowIso()
  const dimensions = resolveGeneratedImageSize(task.size)
  const assets = Array.from({ length: task.outputCount }, (_, index) =>
    buildAsset({
      taskId: task.id,
      conversationId: task.conversationId || "",
      messageId: task.replyMessageId || "",
      prompt: task.prompt,
      width: dimensions.width,
      height: dimensions.height,
      sortOrder: index,
      createdAt: updatedAt,
    })
  )

  task.status = "succeeded"
  task.progress = 100
  task.errorMessage = null
  task.attempts = Math.max(task.attempts, 1)
  task.startedAt = task.startedAt ?? updatedAt
  task.finishedAt = updatedAt
  task.updatedAt = updatedAt
  task.assets = assets
  task.resultUrl = assets[0]?.url ?? null

  for (const asset of assets) {
    targetState.assetsByFilename.set(asset.filename, asset)
  }

  syncReplyMessageWithTask(targetState, task, "succeeded")
}

function syncReplyMessageWithTask(
  targetState: MockApiState,
  task: DrawTaskRecord,
  status: ConversationMessage["status"]
) {
  if (!task.conversationId || !task.replyMessageId) {
    return
  }

  const messages = targetState.conversationMessages.get(task.conversationId)

  if (!messages) {
    return
  }

  const replyMessage = messages.find((message) => message.id === task.replyMessageId)

  if (!replyMessage) {
    return
  }

  replyMessage.status = status
  replyMessage.updatedAt = task.updatedAt
  replyMessage.assets = task.assets.map(cloneAsset)
  replyMessage.task = cloneTask(task)

  const conversation = targetState.conversations.get(task.conversationId)

  if (conversation) {
    targetState.conversations.set(task.conversationId, {
      ...conversation,
      updatedAt: task.updatedAt,
    })
  }
}

function buildStandaloneAsset(input: GenerateImageInput) {
  const dimensions = resolveGeneratedImageSize(input.size)

  return buildAsset({
    taskId: buildId("sync"),
    conversationId: "standalone",
    messageId: "standalone",
    prompt: input.prompt,
    width: dimensions.width,
    height: dimensions.height,
    sortOrder: 0,
    createdAt: nowIso(),
  })
}

function buildAsset(input: {
  taskId: string
  conversationId: string
  messageId: string
  prompt: string
  width: number
  height: number
  sortOrder: number
  createdAt: string
}): ImageAsset {
  const slug = slugify(input.prompt)
  const assetId = buildId("asset")
  const filename = `${slug || "image"}-${assetId}.svg`
  const randomId = buildId("rand")
  const randomImageUrl = `https://picsum.photos/${input.width}/${input.height}?random=${randomId}`

  return {
    id: assetId,
    taskId: input.taskId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    filename,
    url: randomImageUrl,
    width: input.width,
    height: input.height,
    sortOrder: input.sortOrder,
    createdAt: input.createdAt,
  }
}

function buildConversation(title: string): Conversation {
  const createdAt = nowIso()

  return {
    id: buildId("conv"),
    title,
    createdAt,
    updatedAt: createdAt,
  }
}

function buildMessage(input: {
  conversationId: string
  role: ConversationMessage["role"]
  type: ConversationMessage["type"]
  text: string | null
  status: ConversationMessage["status"]
  sortOrder: number
  createdAt: string
}): ConversationMessage {
  return {
    id: buildId("msg"),
    conversationId: input.conversationId,
    role: input.role,
    type: input.type,
    text: input.text,
    status: input.status,
    sortOrder: input.sortOrder,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    assets: [],
  }
}

function findAssetByFilename(filename: string) {
  return state.assetsByFilename.get(filename) ?? null
}

function parseCreateTaskInput(payload: Record<string, unknown>) {
  const conversationId = stringifyField(payload.conversationId).trim()
  const prompt = stringifyField(payload.prompt).trim()
  const model = stringifyOptionalField(payload.model)?.trim() || "gpt-image-2"
  const size = stringifyOptionalField(payload.size)?.trim() || "1024x1024"
  const quality = stringifyOptionalField(payload.quality)?.trim() || "auto"
  const outputCount = parseOutputCount(payload.outputCount)
  const branchMode = parseBranchMode(payload.branchMode)
  const parentAssetId = stringifyOptionalField(payload.parentAssetId)?.trim() || null

  if (!conversationId) {
    return { error: "conversationId 不能为空。" } as const
  }

  const validationError = validateTaskShape({ prompt, model, size, quality })

  if (validationError) {
    return { error: validationError } as const
  }

  return {
    conversationId,
    prompt,
    model,
    size,
    quality,
    outputCount,
    branchMode: parentAssetId ? branchMode : null,
    parentAssetId,
  } satisfies CreateTaskInput
}

function parseGenerateImageInput(payload: Record<string, unknown>) {
  const prompt = stringifyField(payload.prompt).trim()
  const model = stringifyOptionalField(payload.model)?.trim() || "gpt-image-2"
  const size = stringifyOptionalField(payload.size)?.trim() || "1024x1024"
  const quality = stringifyOptionalField(payload.quality)?.trim() || "auto"

  const validationError = validateTaskShape({ prompt, model, size, quality })

  if (validationError) {
    return { error: validationError } as const
  }

  return {
    prompt,
    model,
    size,
    quality,
  } satisfies GenerateImageInput
}

function validateTaskShape(input: {
  prompt: string
  model: string
  size: string
  quality: string
}) {
  if (!input.prompt) {
    return "prompt 不能为空。"
  }

  if (input.prompt.length > 2400) {
    return "prompt 长度不能超过 2400。"
  }

  if (!["gpt-image-2", "gpt-image-1.5", "gpt-image-1"].includes(input.model)) {
    return "model 不支持。"
  }

  if (!["1024x1024", "1536x1024", "1024x1536", "auto"].includes(input.size)) {
    return "size 不支持。"
  }

  if (!["auto", "high", "medium", "low"].includes(input.quality)) {
    return "quality 不支持。"
  }

  return null
}

function parseOutputCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1
  }

  return Math.max(1, Math.min(Math.trunc(value), 4))
}

function parseBranchMode(value: unknown): BranchMode | null {
  if (typeof value !== "string") {
    return null
  }

  return branchModes.includes(value as BranchMode) ? (value as BranchMode) : null
}

function resolveGeneratedImageSize(size: string) {
  if (size === "1536x1024") {
    return { width: 1536, height: 1024 }
  }

  if (size === "1024x1536") {
    return { width: 1024, height: 1536 }
  }

  return { width: 1024, height: 1024 }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return defaultOpenAIBaseUrl
  }

  return trimmed.replace(/\/+$/, "")
}

function isValidHttpBaseUrl(value: string) {
  return /^https?:\/\//.test(value)
}

function buildDefaultProviderConfig(): ProviderConfig {
  return {
    apiKey: "mock-api-key",
    baseUrl: defaultOpenAIBaseUrl,
    hasApiKey: true,
    updatedAt: nowIso(),
  }
}

function cloneProviderConfig(config: ProviderConfig): ProviderConfig {
  return { ...config }
}

function cloneConversation(conversation: Conversation): Conversation {
  return { ...conversation }
}

function cloneMessages(messages: ConversationMessage[]) {
  return messages.map((message) => ({
    ...message,
    assets: message.assets.map(cloneAsset),
    task: message.task ? cloneTask(message.task) : undefined,
  }))
}

function cloneTask(task: DrawTaskRecord): DrawTaskRecord {
  return {
    ...task,
    assets: task.assets.map(cloneAsset),
  }
}

function cloneAsset(asset: ImageAsset): ImageAsset {
  return { ...asset }
}

async function readJsonRecord(request: Request, optional = false) {
  const contentType = request.headers.get("content-type") || ""

  if (!contentType.includes("application/json")) {
    if (optional) {
      return null
    }

    return {}
  }

  try {
    const payload = await request.json()

    return isRecord(payload) ? payload : {}
  } catch {
    return optional ? null : {}
  }
}

function stringifyField(value: unknown) {
  return typeof value === "string" ? value : ""
}

function stringifyOptionalField(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function conversationNotFoundResponse() {
  return errorResponse("会话不存在。", 404, "CONVERSATION_NOT_FOUND")
}

function errorResponse(error: string, status: number, code?: string) {
  return NextResponse.json({ error, ...(code ? { code } : {}) }, { status })
}

function buildId(prefix: string) {
  return `${prefix}_${nanoid(10)}`
}

function nowIso() {
  return new Date().toISOString()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isErrorResult<T extends string>(value: { error: T } | unknown): value is {
  error: T
} {
  return isRecord(value) && typeof value.error === "string"
}
