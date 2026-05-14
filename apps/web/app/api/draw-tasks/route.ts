import { createDrawTask, listDrawTasks } from "@/lib/server/ai-canvas-backend"

export const runtime = "nodejs"

export async function GET() {
  return listDrawTasks()
}

export async function POST(request: Request) {
  return createDrawTask(request)
}
