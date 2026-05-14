import { readConversationMessages } from "@/lib/server/ai-canvas-backend"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    conversationId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { conversationId } = await context.params

  return readConversationMessages(conversationId)
}
