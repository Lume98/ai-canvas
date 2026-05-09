import { proxyWorkerRequest } from "@/lib/worker-proxy"

export const runtime = "nodejs"

export async function GET() {
  return proxyWorkerRequest({
    path: "/provider-config",
    method: "GET",
  })
}

export async function POST(request: Request) {
  return proxyWorkerRequest({
    path: "/provider-config",
    method: "POST",
    request,
  })
}

export async function DELETE() {
  return proxyWorkerRequest({
    path: "/provider-config",
    method: "DELETE",
  })
}
