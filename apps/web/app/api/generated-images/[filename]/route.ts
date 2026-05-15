import { readGeneratedImage } from "@/services"

export const runtime = "nodejs"

type RouteContext = {
  params: Promise<{
    filename: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { filename } = await context.params

  return readGeneratedImage(filename)
}
