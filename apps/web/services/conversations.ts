/**
 * 会话管理服务
 *
 * 提供会话（Conversation）的 CRUD 操作，以及会话内消息的查询功能。
 * 会话是绘图任务和消息的顶层容器，每个会话包含一组有序的消息。
 *
 * 对外暴露的 API：
 * - POST   /api/conversations          — 创建新会话
 * - GET    /api/conversations          — 列出所有会话（按更新时间倒序）
 * - GET    /api/conversations/:id      — 获取单个会话详情
 * - GET    /api/conversations/:id/messages — 获取会话内的全部消息（含关联资源和任务）
 */

import { NextResponse } from "next/server"

import { initDatabase, prisma } from "@/db"
import { createConversationInputSchema } from "@/lib/validations/ai-canvas"

import { apiError, errorResponse } from "./errors"
import { buildId } from "./ids"
import { readJson } from "./request"
import {
  listAssetsByMessageIds,
  listTasksByReplyMessageIds,
  serializeConversation,
  serializeMessage,
} from "./serializers"

/** 会话不存在时的业务错误码，供前端精确匹配 */
export const CONVERSATION_NOT_FOUND_CODE = "CONVERSATION_NOT_FOUND"

/**
 * 创建新会话
 * 请求体中可选 title 字段，不提供或校验失败时使用默认标题 "未命名会话"
 */
export async function createConversation(request: Request) {
  const result = createConversationInputSchema.safeParse(await readJson(request))
  const title = result.success ? result.data.title : "未命名会话"
  const conversationId = buildId("conversation")
  await initDatabase()
  const row = await prisma.conversation.create({
    data: { id: conversationId, title },
  })

  return NextResponse.json({ conversation: serializeConversation(row) }, { status: 201 })
}

/** 列出所有会话，按更新时间倒序排列 */
export async function listConversations() {
  await initDatabase()
  const rows = await prisma.conversation.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  })

  return NextResponse.json({
    conversations: rows.map(serializeConversation),
  })
}

/**
 * 获取单个会话详情
 * @param conversationId - 会话 ID
 */
export async function readConversation(conversationId: string) {
  await initDatabase()
  const row = await prisma.conversation.findUnique({ where: { id: conversationId } })

  if (!row) {
    return errorResponse(apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE))
  }

  return NextResponse.json({ conversation: serializeConversation(row) })
}

/**
 * 获取会话内的全部消息
 *
 * 返回消息列表，每条消息包含：
 * - 关联的图片资源（assets）
 * - 关联的绘图任务（task，仅 assistant 回复消息有）
 *
 * 资源和任务通过批量查询预加载，避免 N+1 问题。
 * @param conversationId - 会话 ID
 */
export async function readConversationMessages(conversationId: string) {
  await initDatabase()
  const conversationExists = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })

  if (!conversationExists) {
    return errorResponse(apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE))
  }

  const messageRows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  })

  // 并行加载所有消息的关联资源和任务
  const messageIds = messageRows.map((row) => row.id)
  const [assetsByMessageId, tasksByReplyMessageId] = await Promise.all([
    listAssetsByMessageIds(messageIds),
    listTasksByReplyMessageIds(messageIds),
  ])

  return NextResponse.json({
    messages: messageRows.map((row) =>
      serializeMessage(
        row,
        assetsByMessageId.get(row.id) ?? [],
        tasksByReplyMessageId.get(row.id),
      ),
    ),
  })
}
