import { proxyWorkerRequest } from "@/lib/worker-proxy"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(request: Request) {
  return proxyWorkerRequest({
    path: "/images/generate",
    method: "POST",
    request,
  })
}
