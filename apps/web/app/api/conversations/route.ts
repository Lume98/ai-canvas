import { proxyWorkerRequest } from "@/lib/worker-proxy"

export const runtime = "nodejs"

export async function POST(request: Request) {
  return proxyWorkerRequest({
    path: "/conversations",
    method: "POST",
    request,
  })
}
