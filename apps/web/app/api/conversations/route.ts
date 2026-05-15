import { createConversation, listConversations } from "@/services/ai-canvas"

export const runtime = "nodejs"

export async function GET() {
  return listConversations()
}

export async function POST(request: Request) {
  return createConversation(request)
}
