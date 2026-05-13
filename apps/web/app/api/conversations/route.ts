import { createConversation } from "@/lib/mock-api"

export const runtime = "nodejs"

export async function POST(request: Request) {
  return createConversation(request)
}
