import type { ImageAsset } from "@/components/domain/asset-types"

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

export type HistoryResult = GeneratedImageView

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
const DEFAULT_DISPLAY_MAX_EDGE = 520

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

export function resolveGeneratedImageDisplaySize(
  width: number,
  height: number,
  maxEdge = DEFAULT_DISPLAY_MAX_EDGE,
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
