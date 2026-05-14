import { Dispatch, SetStateAction } from "react"

import {
  ConversationMessage,
} from "@/components/conversation/conversation-types"
import {
  GeneratedImageView,
  HistoryResult,
  resolveGeneratedImageDisplaySize,
} from "@/components/generated-image/generated-image-types"
import type { ImageAsset } from "@/components/domain/asset-types"
import { CanvasItem } from "@/components/canvas/canvas-types"
import {
  isConversationNotFoundError,
} from "@/components/conversation/conversation-api"

export function collectConversationAssets(messages: ConversationMessage[]): ImageAsset[] {
  return messages.flatMap((message) =>
    message.assets.filter((asset) => Boolean(asset.url))
  )
}

export function buildGeneratedImageViews(
  messages: ConversationMessage[],
): GeneratedImageView[] {
  let generationOrder = 0
  const images: GeneratedImageView[] = []

  for (const message of [...messages].sort(compareConversationMessagesBySequence)) {
    if (message.role !== "assistant" || !message.task) continue

    generationOrder += 1

    for (const asset of [...message.assets].sort(compareImageAssetsBySequence)) {
      if (!asset.url) continue

      images.push({
        id: asset.id,
        asset,
        messageId: message.id,
        taskId: asset.taskId,
        parentAssetId: message.task.parentAssetId,
        url: asset.url,
        width: asset.width,
        height: asset.height,
        prompt: message.task.prompt,
        model: message.task.model,
        size: message.task.size,
        quality: message.task.quality,
        status: message.status,
        generationOrder,
        imageOrder: asset.sortOrder + 1,
      })
    }
  }

  return images
}

export type CanvasConnectionSegment = {
  id: string
  order: number
  fromItemId: string
  toItemId: string
  from: {
    x: number
    y: number
  }
  to: {
    x: number
    y: number
  }
}

export function buildHistoryResults(images: GeneratedImageView[]): HistoryResult[] {
  return [...images].reverse()
}

export function groupImagesByMessageId(images: GeneratedImageView[]) {
  const grouped: Record<string, GeneratedImageView[]> = {}

  for (const image of images) {
    const messageImages = grouped[image.messageId] ?? []
    messageImages.push(image)
    grouped[image.messageId] = messageImages
  }

  return grouped
}

export function buildCanvasConnectionSegments(
  images: GeneratedImageView[],
  canvasItems: CanvasItem[],
): CanvasConnectionSegment[] {
  if (images.length < 2 || canvasItems.length < 2) return []

  const imagesByAssetId = new Map(images.map((image) => [image.asset.id, image]))
  const itemsByAssetId = new Map(canvasItems.map((item) => [item.assetId, item]))
  const segments: CanvasConnectionSegment[] = []

  for (const image of [...images].sort(compareGeneratedImagesBySequence)) {
    if (!image.parentAssetId) continue

    const parentImage = imagesByAssetId.get(image.parentAssetId)
    if (!parentImage) continue

    const parentItem = itemsByAssetId.get(parentImage.asset.id)
    const currentItem = itemsByAssetId.get(image.asset.id)
    if (!parentItem || !currentItem) continue

    segments.push({
      id: `${parentImage.asset.id}->${image.asset.id}`,
      order: image.generationOrder * 100 + image.imageOrder,
      fromItemId: parentItem.id,
      toItemId: currentItem.id,
      from: getCanvasItemAnchor(parentItem, getCanvasItemCenter(currentItem)),
      to: getCanvasItemAnchor(currentItem, getCanvasItemCenter(parentItem)),
    })
  }

  return segments
}

export function syncCanvasItemsWithAssets(
  images: GeneratedImageView[],
  setCanvasItems: Dispatch<SetStateAction<CanvasItem[]>>,
) {
  setCanvasItems((current) => {
    const currentByAssetId = new Map(current.map((item) => [item.assetId, item]))
    const layoutPlan = buildCanvasTimelineLayout(images)
    const nextItems: CanvasItem[] = []

    for (const image of images) {
      const existing = currentByAssetId.get(image.asset.id)
      const displaySize = resolveGeneratedImageDisplaySize(image.asset.width, image.asset.height)

      if (existing) {
        nextItems.push({
          ...existing,
          width: displaySize.width,
          height: displaySize.height,
        })
        continue
      }

      nextItems.push({
        id: crypto.randomUUID(),
        assetId: image.asset.id,
        width: displaySize.width,
        height: displaySize.height,
        ...resolveCanvasTimelinePosition(image.asset.id, displaySize, layoutPlan),
      })
    }

    if (current.length !== nextItems.length) return nextItems

    for (const [index, item] of nextItems.entries()) {
      const currentItem = current[index]
      if (
        !currentItem ||
        currentItem.id !== item.id ||
        currentItem.assetId !== item.assetId ||
        currentItem.x !== item.x ||
        currentItem.y !== item.y ||
        currentItem.width !== item.width ||
        currentItem.height !== item.height
      ) {
        return nextItems
      }
    }

    return current
  })
}

export function applySetStateAction<T>(current: T, next: SetStateAction<T>): T {
  return typeof next === "function"
    ? (next as (value: T) => T)(current)
    : next
}

export function existingConversationErrorNeedsReset(error: unknown) {
  return isConversationNotFoundError(error)
}

export function resolveNextSelectedMessageId(
  currentSelectedMessageId: string | null,
  nextMessages: ConversationMessage[],
) {
  if (currentSelectedMessageId) {
    const selectedMessageStillExists = nextMessages.some(
      (message) => message.id === currentSelectedMessageId,
    )

    if (selectedMessageStillExists) return currentSelectedMessageId
  }

  return nextMessages.at(-1)?.id ?? null
}

function compareConversationMessagesBySequence(
  left: ConversationMessage,
  right: ConversationMessage,
) {
  if (
    typeof left.sortOrder === "number" &&
    typeof right.sortOrder === "number" &&
    left.sortOrder !== right.sortOrder
  ) {
    return left.sortOrder - right.sortOrder
  }

  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
}

function compareImageAssetsBySequence(left: ImageAsset, right: ImageAsset) {
  return left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)
}

function compareGeneratedImagesBySequence(left: GeneratedImageView, right: GeneratedImageView) {
  return (
    left.generationOrder - right.generationOrder ||
    left.imageOrder - right.imageOrder ||
    left.asset.createdAt.localeCompare(right.asset.createdAt)
  )
}

type CanvasTimelineLayout = {
  positionByAssetId: Map<
    string,
    {
      x: number
      y: number
    }
  >
}

function buildCanvasTimelineLayout(images: GeneratedImageView[]): CanvasTimelineLayout {
  const orderedImages = [...images].sort(compareGeneratedImagesBySequence)
  const imageByAssetId = new Map(orderedImages.map((image) => [image.asset.id, image]))
  const childAssetIdsByParent = new Map<string, string[]>()
  const rootAssetIds: string[] = []

  for (const image of orderedImages) {
    const parentAssetId = image.parentAssetId

    if (parentAssetId && imageByAssetId.has(parentAssetId)) {
      const children = childAssetIdsByParent.get(parentAssetId) ?? []
      children.push(image.asset.id)
      childAssetIdsByParent.set(parentAssetId, children)
      continue
    }

    rootAssetIds.push(image.asset.id)
  }

  const rootSpacingX = 760
  const rowSpacingY = 720
  const siblingSpacingX = 640
  const positionByAssetId = new Map<string, { x: number; y: number }>()
  const subtreeWidthByAssetId = new Map<string, number>()

  function measureSubtree(assetId: string): number {
    const cached = subtreeWidthByAssetId.get(assetId)
    if (cached) return cached

    const children = childAssetIdsByParent.get(assetId) ?? []
    const width = children.length
      ? Math.max(
          children.reduce((sum, childAssetId, index) => {
            const childWidth = measureSubtree(childAssetId)
            return sum + childWidth + (index > 0 ? siblingSpacingX : 0)
          }, 0),
          rootSpacingX
        )
      : rootSpacingX

    subtreeWidthByAssetId.set(assetId, width)
    return width
  }

  for (const rootAssetId of rootAssetIds) {
    measureSubtree(rootAssetId)
  }

  const totalWidth =
    rootAssetIds.reduce((sum, rootAssetId, index) => {
      const rootWidth = subtreeWidthByAssetId.get(rootAssetId) ?? rootSpacingX
      return sum + rootWidth + (index > 0 ? siblingSpacingX : 0)
    }, 0) || rootSpacingX

  let cursorX = -totalWidth / 2

  function placeSubtree(assetId: string, centerX: number, row: number) {
    positionByAssetId.set(assetId, {
      x: centerX,
      y: row * rowSpacingY,
    })

    const children = childAssetIdsByParent.get(assetId) ?? []
    if (children.length === 0) return

    const totalChildrenWidth = children.reduce((sum, childAssetId, index) => {
      const childWidth = subtreeWidthByAssetId.get(childAssetId) ?? rootSpacingX
      return sum + childWidth + (index > 0 ? siblingSpacingX : 0)
    }, 0)
    let childCursorX = centerX - totalChildrenWidth / 2

    for (const childAssetId of children) {
      const childWidth = subtreeWidthByAssetId.get(childAssetId) ?? rootSpacingX
      const childCenterX = childCursorX + childWidth / 2
      placeSubtree(childAssetId, childCenterX, row + 1)
      childCursorX += childWidth + siblingSpacingX
    }
  }

  for (const rootAssetId of rootAssetIds) {
    const rootWidth = subtreeWidthByAssetId.get(rootAssetId) ?? rootSpacingX
    const centerX = cursorX + rootWidth / 2
    placeSubtree(rootAssetId, centerX, 0)
    cursorX += rootWidth + siblingSpacingX
  }

  return {
    positionByAssetId,
  }
}

function resolveCanvasTimelinePosition(
  assetId: string,
  size: { width: number; height: number },
  layout: CanvasTimelineLayout,
) {
  const position = layout.positionByAssetId.get(assetId) ?? { x: 0, y: 0 }

  return {
    x: position.x - size.width / 2,
    y: position.y - size.height / 2,
  }
}

function getCanvasItemCenter(item: CanvasItem) {
  return {
    x: item.x + item.width / 2,
    y: item.y + item.height / 2,
  }
}

function getCanvasItemAnchor(
  item: CanvasItem,
  targetCenter: {
    x: number
    y: number
  },
) {
  const center = getCanvasItemCenter(item)
  const deltaX = targetCenter.x - center.x
  const deltaY = targetCenter.y - center.y

  if (deltaX === 0 && deltaY === 0) return center

  const halfWidth = Math.max(item.width / 2, 1)
  const halfHeight = Math.max(item.height / 2, 1)
  const divisor = Math.max(
    Math.abs(deltaX) / halfWidth,
    Math.abs(deltaY) / halfHeight,
    1,
  )
  const scale = 1 / divisor

  return {
    x: center.x + deltaX * scale,
    y: center.y + deltaY * scale,
  }
}
