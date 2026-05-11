import { proxyWorkerRequest } from "@/lib/worker-proxy"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    conversationId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { conversationId } = await context.params

  return proxyWorkerRequest({
    path: `/conversations/${encodeURIComponent(conversationId)}/messages`,
    method: "GET",
  })
}
