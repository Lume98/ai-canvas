import { createDrawTask, listDrawTasks } from "@/lib/mock-api"

export const runtime = "nodejs"

export async function GET() {
  return listDrawTasks()
}

export async function POST(request: Request) {
  return createDrawTask(request)
}
