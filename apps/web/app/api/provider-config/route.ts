import {
  clearProviderConfig,
  getProviderConfig,
  saveProviderConfig,
} from "@/app/api/_internal/ai-canvas-backend"

export const runtime = "nodejs"

export async function GET() {
  return getProviderConfig()
}

export async function POST(request: Request) {
  return saveProviderConfig(request)
}

export async function DELETE() {
  return clearProviderConfig()
}
