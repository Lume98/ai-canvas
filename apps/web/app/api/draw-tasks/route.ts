import { createDrawTask, listDrawTasks } from "@/services/ai-canvas"

export const runtime = "nodejs"

export async function GET() {
  return listDrawTasks()
}

export async function POST(request: Request) {
  return createDrawTask(request)
}
