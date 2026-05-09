import { proxyWorkerRequest } from "@/lib/worker-proxy"

export const runtime = "nodejs"

export async function GET() {
  return proxyWorkerRequest({
    path: "/draw-tasks",
    method: "GET",
  })
}

export async function POST(request: Request) {
  return proxyWorkerRequest({
    path: "/draw-tasks",
    method: "POST",
    request,
  })
}
