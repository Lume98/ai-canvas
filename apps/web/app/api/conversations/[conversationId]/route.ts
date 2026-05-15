import { readConversation } from "@/services/ai-canvas"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    conversationId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { conversationId } = await context.params

  return readConversation(conversationId)
}
