import { createConversation, listConversations } from "@/lib/mock-api"

export const runtime = "nodejs"

export async function GET() {
  return listConversations()
}

export async function POST(request: Request) {
  return createConversation(request)
}
