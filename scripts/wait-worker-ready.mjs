const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_INTERVAL_MS = 1_000
const defaultHealthUrl = "http://127.0.0.1:8766/v1/health"

function resolveTimeoutMs() {
  const raw = process.env.AI_CANVAS_WORKER_WAIT_TIMEOUT_MS

  if (!raw) {
    return DEFAULT_TIMEOUT_MS
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

function resolveIntervalMs() {
  const raw = process.env.AI_CANVAS_WORKER_WAIT_INTERVAL_MS

  if (!raw) {
    return DEFAULT_INTERVAL_MS
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS
}

async function waitForWorkerReady() {
  const healthUrl = process.env.AI_CANVAS_WORKER_HEALTH_URL || defaultHealthUrl
  const timeoutMs = resolveTimeoutMs()
  const intervalMs = resolveIntervalMs()
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, { cache: "no-store" })

      if (response.ok) {
        console.log(`[wait-worker-ready] Worker is ready at ${healthUrl}`)
        return
      }
    } catch {
      // Worker not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  console.error(
    `[wait-worker-ready] Timed out after ${timeoutMs}ms waiting for ${healthUrl}`
  )
  process.exit(1)
}

await waitForWorkerReady()
