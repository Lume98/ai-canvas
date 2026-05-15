import { prisma } from "@/db"
import type {
  Conversation as PrismaConversation,
  DrawTask as PrismaDrawTask,
  ImageAsset as PrismaImageAsset,
  Message as PrismaMessage,
} from "@/generated/prisma/client"
import { allowedBranchModes } from "@/lib/validations/ai-canvas"

import type { BranchMode } from "@/components/domain/branch-mode"

import { buildGeneratedImageUrl } from "./image-storage"
import type {
  ConversationMessageRecord,
  ConversationRecord,
  DrawTaskRecord,
  DrawTaskStatus,
  ImageAssetRecord,
  MessageStatus,
} from "./types"

export function serializeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.toISOString()
  return typeof value === "string" && value ? new Date(value).toISOString() : null
}

export function serializeRequiredDate(value: Date | string) {
  return serializeDate(value) ?? new Date(0).toISOString()
}

export function serializeConversation(
  row: PrismaConversation,
): ConversationRecord {
  return {
    id: row.id,
    title: row.title,
    createdAt: serializeRequiredDate(row.createdAt),
    updatedAt: serializeRequiredDate(row.updatedAt),
  }
}

export function serializeTask(
  row: PrismaDrawTask,
  assets: ImageAssetRecord[],
): DrawTaskRecord {
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

export function serializeAsset(row: PrismaImageAsset): ImageAssetRecord {
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

export function serializeMessage(
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

export function toNullableString(value: unknown) {
  return typeof value === "string" && value ? value : null
}

function toNullableBranchMode(value: unknown) {
  return typeof value === "string" && allowedBranchModes.has(value as BranchMode)
    ? (value as BranchMode)
    : null
}

export async function listAssetsByTaskIds(taskIds: string[]) {
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

export async function listAssetsByMessageIds(messageIds: string[]) {
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

export async function listTasksByReplyMessageIds(replyMessageIds: string[]) {
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
