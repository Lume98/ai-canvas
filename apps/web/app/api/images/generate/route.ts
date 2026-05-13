import { generateImage } from "@/lib/mock-api"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  return generateImage(request)
}
