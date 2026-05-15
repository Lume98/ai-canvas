/**
 * 数据序列化器
 *
 * 将 Prisma ORM 返回的数据库行对象转换为面向 API 响应的纯对象（types.ts 中定义的 Record 类型）。
 * 职责包括：
 * - 日期字段统一转为 ISO 字符串
 * - 构建图片资源的访问 URL
 * - 处理可空字段的类型安全转换
 * - 批量查询关联资源（图片、任务）并按 ID 分组
 */

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

/**
 * 将日期值序列化为 ISO 字符串
 * 接受 Date、string、null、undefined，统一输出 string | null
 */
export function serializeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.toISOString()
  return typeof value === "string" && value ? new Date(value).toISOString() : null
}

/**
 * 将不可为空的日期值序列化为 ISO 字符串
 * 理论上不应为 null，兜底返回 Unix 纪元时间
 */
export function serializeRequiredDate(value: Date | string) {
  return serializeDate(value) ?? new Date(0).toISOString()
}

/** 序列化会话记录 */
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

/**
 * 序列化绘图任务记录
 * @param row - Prisma 查询返回的原始任务行
 * @param assets - 任务关联的图片资源列表（需预先查询）
 */
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

/** 序列化图片资源记录，自动构建访问 URL */
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

/**
 * 序列化会话消息记录
 * @param row - Prisma 查询返回的原始消息行
 * @param assets - 消息关联的图片资源列表
 * @param task - 消息关联的绘图任务（仅 assistant 回复消息有）
 */
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

/**
 * 将值安全地转换为可空字符串
 * 空字符串也视为 null，避免数据库中存入无意义的空值
 */
export function toNullableString(value: unknown) {
  return typeof value === "string" && value ? value : null
}

/**
 * 将值安全地转换为可空 BranchMode
 * 仅当值在允许列表中时返回，否则返回 null
 */
function toNullableBranchMode(value: unknown) {
  return typeof value === "string" && allowedBranchModes.has(value as BranchMode)
    ? (value as BranchMode)
    : null
}

/**
 * 批量查询指定任务 ID 关联的图片资源，按任务 ID 分组
 * @returns Map<taskId, ImageAssetRecord[]>
 */
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

/**
 * 批量查询指定消息 ID 关联的图片资源，按消息 ID 分组
 * @returns Map<messageId, ImageAssetRecord[]>
 */
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

/**
 * 批量查询指定回复消息 ID 关联的绘图任务，按回复消息 ID 分组
 * 同时预加载每个任务的图片资源，避免 N+1 查询
 * @returns Map<replyMessageId, DrawTaskRecord>
 */
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
