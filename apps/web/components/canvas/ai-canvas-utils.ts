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
import { readDrawTask } from "@/components/conversation/conversation-api"

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

  for (const message of messages) {
    if (message.role !== "assistant" || !message.task) continue

    generationOrder += 1

    for (const asset of message.assets) {
      if (!asset.url) continue

      images.push({
        id: asset.id,
        asset,
        messageId: message.id,
        taskId: asset.taskId,
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

export function syncCanvasItemsWithAssets(
  assets: ImageAsset[],
  setCanvasItems: Dispatch<SetStateAction<CanvasItem[]>>,
) {
  setCanvasItems((current) => {
    const currentByAssetId = new Map(current.map((item) => [item.assetId, item]))
    const nextItems: CanvasItem[] = []

    for (const [index, asset] of assets.entries()) {
      const existing = currentByAssetId.get(asset.id)
      const displaySize = resolveGeneratedImageDisplaySize(asset.width, asset.height)

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
        assetId: asset.id,
        width: displaySize.width,
        height: displaySize.height,
        ...getNextCanvasItemPosition(index, displaySize),
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

function getNextCanvasItemPosition(
  itemCount: number,
  size: { width: number; height: number },
) {
  const gap = 180
  const columns = 3
  const baseCellSize = 520
  const column = itemCount % columns
  const row = Math.floor(itemCount / columns)
  const cellWidth = baseCellSize + gap
  const cellHeight = baseCellSize + gap
  const x = column * cellWidth - ((columns - 1) * cellWidth) / 2
  const y = row * cellHeight

  return {
    x: x - size.width / 2,
    y: y - size.height / 2,
  }
}

export function applySetStateAction<T>(current: T, next: SetStateAction<T>): T {
  return typeof next === "function"
    ? (next as (value: T) => T)(current)
    : next
}

export function existingConversationErrorNeedsReset(error: unknown) {
  return error instanceof Error && /会话不存在/.test(error.message)
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

function wait(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

export async function pollConversationTaskUntilSettled(
  taskId: string,
  conversationId: string,
  options: {
    onSettled: (task: Awaited<ReturnType<typeof readDrawTask>>) => Promise<void>
  },
) {
  while (true) {
    const task = await readDrawTask(taskId)

    if (task.conversationId && task.conversationId !== conversationId) return

    if (task.status === "queued" || task.status === "running") {
      await wait(1200)
      continue
    }

    await options.onSettled(task)
    return
  }
}
