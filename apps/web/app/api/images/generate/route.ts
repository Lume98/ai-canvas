import { generateImage } from "@/lib/server/ai-canvas-backend"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  return generateImage(request)
}
