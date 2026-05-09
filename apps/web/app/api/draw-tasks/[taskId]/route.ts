import { proxyWorkerRequest } from "@/lib/worker-proxy"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { taskId } = await context.params

  return proxyWorkerRequest({
    path: `/draw-tasks/${encodeURIComponent(taskId)}`,
    method: "GET",
  })
}
