import type { BranchMode } from "@/components/domain/branch-mode"

export type ProviderConfigRecord = {
  apiKey: string
  baseUrl: string
  hasApiKey: boolean
  updatedAt: string | null
}

export type DrawTaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"
export type MessageStatus = "pending" | "running" | "succeeded" | "failed"

export type ConversationRecord = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type ImageAssetRecord = {
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

export type ConversationMessageRecord = {
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

export type PersistedImage = {
  filename: string
  width: number
  height: number
}
