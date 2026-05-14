import { readDrawTask } from "@/lib/server/ai-canvas-backend"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    taskId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { taskId } = await context.params

  return readDrawTask(taskId)
}
