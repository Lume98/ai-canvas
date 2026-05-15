import { generateImage } from "@/services/ai-canvas"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  return generateImage(request)
}
