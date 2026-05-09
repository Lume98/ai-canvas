import { NextResponse } from "next/server"

const defaultWorkerBaseUrl = "http://127.0.0.1:8766"

type ProxyOptions = {
  path: string
  method: "GET" | "POST" | "DELETE"
  request?: Request
}

const generatedImageJsonKeys = new Set(["image", "resultUrl"])

export async function proxyWorkerRequest(options: ProxyOptions) {
  const headers = new Headers()

  if (options.request) {
    copyHeader(options.request, headers, "content-type")
  }

  try {
    const response = await fetch(resolveWorkerUrl(options.path), {
      method: options.method,
      headers,
      body:
        options.method === "POST" && options.request
          ? await options.request.text()
          : undefined,
      cache: "no-store",
    })
    const contentType =
      response.headers.get("content-type") || "application/json"
    const rawBody = await response.text()
    const body = contentType.includes("application/json")
      ? rewriteWorkerJson(rawBody)
      : rawBody

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Worker 服务不可用，请确认 Python worker 已启动。" },
      { status: 502 }
    )
  }
}

export async function proxyWorkerAssetRequest(path: string) {
  try {
    const response = await fetch(resolveWorkerUrl(path), {
      method: "GET",
      cache: "no-store",
    })
    const body = await response.arrayBuffer()
    const headers = new Headers()

    copyResponseHeader(response, headers, "content-type")
    copyResponseHeader(response, headers, "cache-control")
    copyResponseHeader(response, headers, "x-content-type-options")

    return new NextResponse(body, {
      status: response.status,
      headers,
    })
  } catch {
    return NextResponse.json(
      { error: "Worker 服务不可用，请确认 Python worker 已启动。" },
      { status: 502 }
    )
  }
}

function resolveWorkerUrl(path: string) {
  const baseUrl = (
    process.env.AI_CANVAS_WORKER_URL || defaultWorkerBaseUrl
  ).replace(/\/+$/, "")

  return `${baseUrl}${path}`
}

function rewriteWorkerJson(body: string) {
  try {
    return JSON.stringify(rewriteGeneratedImageUrls(JSON.parse(body)))
  } catch {
    return body
  }
}

function rewriteGeneratedImageUrls(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return key && generatedImageJsonKeys.has(key)
      ? toWebGeneratedImageUrl(value)
      : value
  }

  if (Array.isArray(value)) {
    return value.map((item) => rewriteGeneratedImageUrls(item))
  }

  if (value && typeof value === "object") {
    const rewritten: Record<string, unknown> = {}

    for (const [entryKey, entryValue] of Object.entries(value)) {
      rewritten[entryKey] = rewriteGeneratedImageUrls(entryValue, entryKey)
    }

    return rewritten
  }

  return value
}

function toWebGeneratedImageUrl(value: string) {
  if (value.startsWith("/api/generated-images/")) {
    return value
  }

  if (value.startsWith("/generated-images/")) {
    return `/api${value}`
  }

  return value
}

function copyHeader(source: Request, target: Headers, name: string) {
  const value = source.headers.get(name)

  if (value) {
    target.set(name, value)
  }
}

function copyResponseHeader(source: Response, target: Headers, name: string) {
  const value = source.headers.get(name)

  if (value) {
    target.set(name, value)
  }
}
