import { createConversation, listConversations } from "@/services"

export const runtime = "nodejs"

export async function GET() {
  return listConversations()
}

export async function POST(request: Request) {
  return createConversation(request)
}
