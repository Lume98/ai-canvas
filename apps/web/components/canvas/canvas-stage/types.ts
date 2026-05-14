import type { CSSProperties, Dispatch, SetStateAction } from "react"

import type { CanvasItem } from "@/components/canvas/canvas-types"
import type { ConversationMessage } from "@/components/conversation/conversation-types"
import type { ImageAsset } from "@/components/domain/asset-types"
import type {
  GeneratedImageView,
} from "@/components/generated-image/generated-image-types"
import type {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "@/components/generated-image/generated-image-display-presets"

export type CanvasZoomGesture = {
  clientX: number
  clientY: number
  deltaY: number
}

export type CanvasStageHandle = {
  zoomFromWheel: (gesture: CanvasZoomGesture) => void
}

export type CanvasSurfaceHandle = CanvasStageHandle

export type ViewportTransform = {
  pan: {
    x: number
    y: number
  }
  scale: number
}

export type FocusRequest = {
  centerX: number
  centerY: number
  requestId: number
}

export type CanvasSurfaceStyle = CSSProperties & {
  "--canvas-grid-size": string
  "--canvas-grid-x": string
  "--canvas-grid-y": string
  "--canvas-major-grid-size": string
}

export type CanvasStageProps = {
  images: GeneratedImageView[]
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  canvasItems: CanvasItem[]
  focusRequest: FocusRequest | null
  isGenerating: boolean
  pendingMessages?: ConversationMessage[]
  selectedItemId: string | null
  onCanvasItemsChange: Dispatch<SetStateAction<CanvasItem[]>>
  onAssetSelect?: (asset: ImageAsset) => void
  onSelectedItemChange: (itemId: string | null) => void
}

export type InfiniteCanvasProps = {
  images: GeneratedImageView[]
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  canvasItems: CanvasItem[]
  focusRequest: FocusRequest | null
  isGenerating: boolean
  pendingMessages: ConversationMessage[]
  onCanvasItemsChange: Dispatch<SetStateAction<CanvasItem[]>>
  onAssetSelect?: (asset: ImageAsset) => void
  onSelectedItemChange: (itemId: string | null) => void
  selectedItemId: string | null
}
