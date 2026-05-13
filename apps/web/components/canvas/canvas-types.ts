export type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type ImageAsset = {
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

export type GeneratedImageView = {
  id: string
  asset: ImageAsset
  messageId: string
  taskId: string
  url: string
  width: number
  height: number
  prompt: string
  model: string
  size: string
  quality: string
  status: "pending" | "running" | "succeeded" | "failed"
  generationOrder: number
  imageOrder: number
}

export type DrawTaskRecord = {
  id: string
  conversationId: string | null
  requestMessageId: string | null
  replyMessageId: string | null
  prompt: string
  model: string
  size: string
  quality: string
  outputCount: number
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

export type ConversationMessage = {
  id: string
  conversationId: string
  role: "user" | "assistant"
  type: "prompt" | "image_result" | "error"
  text: string | null
  status: "pending" | "running" | "succeeded" | "failed"
  sortOrder?: number
  createdAt: string
  updatedAt: string
  assets: ImageAsset[]
  task?: DrawTaskRecord
}

export type HistoryResult = GeneratedImageView

export type CanvasItem = {
  id: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
}

export type PendingImagePlaceholder = {
  detail: string
  id: string
  imageIndex: number
  indexLabel?: string
  isAutoSize: boolean
  model: string
  outputCount: number
  prompt: string | null
  quality: string
  ratio: string
  size: {
    width: number
    height: number
  }
  sizeLabel: string
  status: "pending" | "running"
  title: string
}

export type FailedImagePlaceholder = {
  errorMessage: string
  isAutoSize: boolean
  model: string
  prompt: string | null
  quality: string
  ratio: string
  sizeLabel: string
  title: string
}

export const models = [
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gpt-image-1", label: "GPT Image 1" },
]

export const sizes = ["1024x1024", "1536x1024", "1024x1536", "auto"]
export const qualities = ["auto", "high", "medium", "low"]
const DEFAULT_CANVAS_MAX_DISPLAY_EDGE = 520

export const promptSeeds = [
  "一张极简产品海报，磨砂玻璃香水瓶放在石材台面上，柔和晨光，商业摄影",
  "未来感城市屋顶花园，雨后夜景，霓虹反射，电影级广角构图",
  "为 AI 画布应用设计一个干净的应用图标，白底，精致几何形态",
]

export function resolveGeneratedImageSize(size?: string) {
  if (size === "1536x1024") {
    return { width: 1536, height: 1024 }
  }

  if (size === "1024x1536") {
    return { width: 1024, height: 1536 }
  }

  return { width: 1024, height: 1024 }
}

export function resolveGeneratedImageAspectRatio(size?: string) {
  const dimensions = resolveGeneratedImageSize(size)

  return `${dimensions.width} / ${dimensions.height}`
}

export function resolveCanvasDisplaySize(
  width: number,
  height: number,
  maxEdge = DEFAULT_CANVAS_MAX_DISPLAY_EDGE,
) {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const longestEdge = Math.max(safeWidth, safeHeight)
  const scale = Math.min(1, maxEdge / longestEdge)

  return {
    width: Math.max(120, Math.round(safeWidth * scale)),
    height: Math.max(120, Math.round(safeHeight * scale)),
  }
}

export function buildPendingImagePlaceholders(
  messages: ConversationMessage[],
): PendingImagePlaceholder[] {
  return messages.flatMap((message) => buildPendingImagePlaceholdersForMessage(message))
}

export function buildPendingImagePlaceholdersForMessage(
  message: ConversationMessage,
): PendingImagePlaceholder[] {
  if (
    message.role !== "assistant" ||
    (message.status !== "pending" && message.status !== "running") ||
    !message.task
  ) {
    return []
  }

  const count = Math.max(message.task.outputCount ?? 1, 1)
  const sizeLabel = message.task.size || "auto"
  const generatedSize = resolveGeneratedImageSize(message.task.size)
  const size = resolveCanvasDisplaySize(generatedSize.width, generatedSize.height)
  const ratio = resolveGeneratedImageAspectRatio(message.task.size)
  const prompt = message.task.prompt ?? message.text
  const status = message.status === "running" ? "running" : "pending"

  return Array.from({ length: count }, (_, index) => ({
    detail:
      status === "pending"
        ? "任务已创建，等待调度。"
        : "结果会自动回填到这条消息。",
    id: `${message.id}-${index}`,
    imageIndex: index + 1,
    indexLabel: count > 1 ? `图 ${index + 1} / ${count}` : undefined,
    isAutoSize: sizeLabel === "auto",
    model: message.task?.model ?? "",
    outputCount: count,
    prompt,
    quality: message.task?.quality ?? "",
    ratio,
    size,
    sizeLabel,
    status,
    title: `第 ${index + 1} 张图像占位`,
  }))
}

export function buildFailedImagePlaceholderForMessage(
  message: ConversationMessage,
): FailedImagePlaceholder | null {
  if (message.role !== "assistant" || message.status !== "failed" || !message.task) {
    return null
  }

  return {
    errorMessage: message.task.errorMessage || "任务执行失败。",
    isAutoSize: (message.task.size || "auto") === "auto",
    model: message.task.model ?? "",
    prompt: message.task.prompt ?? message.text,
    quality: message.task.quality ?? "",
    ratio: resolveGeneratedImageAspectRatio(message.task.size),
    sizeLabel: message.task.size || "auto",
    title: "生成失败结果卡",
  }
}
