import {
  Conversation,
  ConversationMessage,
  DrawTaskRecord,
} from "@/components/conversation/conversation-types"
import type { BranchMode } from "@/components/domain/branch-mode"

type ApiErrorPayload = {
  error?: string
  code?: string
}

type ConversationResponse = {
  conversation?: Conversation
} & ApiErrorPayload

type ConversationsResponse = {
  conversations?: Conversation[]
} & ApiErrorPayload

type MessagesResponse = {
  messages?: ConversationMessage[]
} & ApiErrorPayload

type DrawTaskResponse = {
  task?: DrawTaskRecord
} & ApiErrorPayload

const conversationNotFoundCode = "CONVERSATION_NOT_FOUND"

export class ConversationApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ConversationApiError"
    this.status = status
    this.code = code ?? null
  }
}

export function isConversationNotFoundError(error: unknown) {
  return (
    error instanceof ConversationApiError &&
    error.status === 404 &&
    error.code === conversationNotFoundCode
  )
}

function throwApiError(
  response: Response,
  payload: ApiErrorPayload,
  fallbackMessage: string,
): never {
  throw new ConversationApiError(
    payload.error || fallbackMessage,
    response.status,
    payload.code,
  )
}

export async function createConversation(title?: string) {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(title ? { title } : {}),
  })
  const payload = (await response.json()) as ConversationResponse

  if (!response.ok || !payload.conversation) {
    throwApiError(response, payload, "创建会话失败。")
  }

  return payload.conversation
}

export async function listConversations() {
  const response = await fetch("/api/conversations", {
    cache: "no-store",
  })
  const payload = (await response.json()) as ConversationsResponse

  if (!response.ok || !payload.conversations) {
    throwApiError(response, payload, "读取会话列表失败。")
  }

  return payload.conversations
}

export async function readConversation(conversationId: string) {
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
    cache: "no-store",
  })
  const payload = (await response.json()) as ConversationResponse

  if (!response.ok || !payload.conversation) {
    throwApiError(response, payload, "读取会话失败。")
  }

  return payload.conversation
}

export async function readConversationMessages(conversationId: string) {
  const response = await fetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      cache: "no-store",
    }
  )
  const payload = (await response.json()) as MessagesResponse

  if (!response.ok || !payload.messages) {
    throwApiError(response, payload, "读取消息失败。")
  }

  return payload.messages
}

export async function createConversationDrawTask(input: {
  conversationId: string
  prompt: string
  model: string
  size: string
  quality: string
  outputCount?: number
  branchMode?: BranchMode
  parentAssetId?: string | null
}) {
  const response = await fetch("/api/draw-tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId: input.conversationId,
      prompt: input.prompt,
      model: input.model,
      size: input.size,
      quality: input.quality,
      outputCount: input.outputCount ?? 1,
      branchMode: input.branchMode ?? null,
      parentAssetId: input.parentAssetId ?? null,
    }),
  })
  const payload = (await response.json()) as DrawTaskResponse

  if (!response.ok || !payload.task) {
    throwApiError(response, payload, "创建绘图任务失败。")
  }

  return payload.task
}

export async function readDrawTask(taskId: string) {
  const response = await fetch(`/api/draw-tasks/${encodeURIComponent(taskId)}`, {
    cache: "no-store",
  })
  const payload = (await response.json()) as DrawTaskResponse

  if (!response.ok || !payload.task) {
    throwApiError(response, payload, "读取绘图任务失败。")
  }

  return payload.task
}
