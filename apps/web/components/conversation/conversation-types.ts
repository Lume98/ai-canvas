import type { ImageAsset } from "@/components/domain/asset-types"
import type { BranchMode } from "@/components/domain/branch-mode"

export type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
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

export const promptSeeds = [
  "一张极简产品海报，磨砂玻璃香水瓶放在石材台面上，柔和晨光，商业摄影",
  "未来感城市屋顶花园，雨后夜景，霓虹反射，电影级广角构图",
  "为 AI 画布应用设计一个干净的应用图标，白底，精致几何形态",
]
