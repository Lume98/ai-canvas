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

export type HistoryResult = {
  id: string
  messageId: string
  taskId: string
  url: string
  prompt: string
  model: string
  size: string
  quality: string
  status: ConversationMessage["status"]
}

export type CanvasItem = {
  id: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
}

export const models = [
  { value: "gpt-image-2", label: "GPT Image 2" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5" },
  { value: "gpt-image-1", label: "GPT Image 1" },
]

export const sizes = ["1024x1024", "1536x1024", "1024x1536", "auto"]
export const qualities = ["auto", "high", "medium", "low"]

export const promptSeeds = [
  "一张极简产品海报，磨砂玻璃香水瓶放在石材台面上，柔和晨光，商业摄影",
  "未来感城市屋顶花园，雨后夜景，霓虹反射，电影级广角构图",
  "为 AI 画布应用设计一个干净的应用图标，白底，精致几何形态",
]
