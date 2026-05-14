export type AiProviderConfig = {
  apiKey: string
  baseUrl: string
  hasApiKey: boolean
  updatedAt: string | null
}

type ProviderConfigResponse = {
  config?: Partial<AiProviderConfig>
  error?: string
}

export const defaultOpenAIBaseUrl = "https://api.openai.com/v1"

export const defaultAiProviderConfig: AiProviderConfig = {
  apiKey: "",
  baseUrl: defaultOpenAIBaseUrl,
  hasApiKey: false,
  updatedAt: null,
}

export async function readAiProviderConfig() {
  const response = await fetch("/api/provider-config", {
    cache: "no-store",
  })
  const payload = (await response.json()) as ProviderConfigResponse

  if (!response.ok) {
    throw new Error(payload.error || "读取接口配置失败。")
  }

  return parseAiProviderConfig(payload.config)
}

export async function writeAiProviderConfig(config: {
  apiKey: string
  baseUrl: string
}) {
  const response = await fetch("/api/provider-config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: config.apiKey.trim(),
      baseUrl: normalizeBaseUrl(config.baseUrl),
    }),
  })
  const payload = (await response.json()) as ProviderConfigResponse

  if (!response.ok) {
    throw new Error(payload.error || "保存接口配置失败。")
  }

  return parseAiProviderConfig(payload.config)
}

export async function clearAiProviderConfig() {
  const response = await fetch("/api/provider-config", {
    method: "DELETE",
  })
  const payload = (await response.json()) as ProviderConfigResponse

  if (!response.ok) {
    throw new Error(payload.error || "清空接口配置失败。")
  }

  return parseAiProviderConfig(payload.config)
}

export function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) return defaultOpenAIBaseUrl

  return trimmed.replace(/\/+$/, "")
}

function parseAiProviderConfig(
  config: Partial<AiProviderConfig> | undefined
): AiProviderConfig {
  return {
    apiKey: typeof config?.apiKey === "string" ? config.apiKey : "",
    baseUrl:
      typeof config?.baseUrl === "string"
        ? config.baseUrl
        : defaultOpenAIBaseUrl,
    hasApiKey:
      typeof config?.hasApiKey === "boolean"
        ? config.hasApiKey
        : typeof config?.apiKey === "string" && config.apiKey.length > 0,
    updatedAt: typeof config?.updatedAt === "string" ? config.updatedAt : null,
  }
}
