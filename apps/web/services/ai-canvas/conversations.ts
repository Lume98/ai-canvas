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

export const CONVERSATION_NOT_FOUND_CODE = "CONVERSATION_NOT_FOUND"

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

export async function listConversations() {
  await initDatabase()
  const rows = await prisma.conversation.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  })

  return NextResponse.json({
    conversations: rows.map(serializeConversation),
  })
}

export async function readConversation(conversationId: string) {
  await initDatabase()
  const row = await prisma.conversation.findUnique({ where: { id: conversationId } })

  if (!row) {
    return errorResponse(apiError("会话不存在。", 404, CONVERSATION_NOT_FOUND_CODE))
  }

  return NextResponse.json({ conversation: serializeConversation(row) })
}

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
