import type { BranchMode } from "@/components/domain/branch-mode"
import {
  isValidHttpBaseUrl,
  normalizeBaseUrl,
  type StandaloneImageInput,
} from "@/lib/validations/ai-canvas"

import { apiError, type ApiError } from "./errors"
import { getPngSize } from "./image-storage"
import type { ProviderConfigRecord } from "./types"

const BRANCH_MODE_INSTRUCTIONS: Record<BranchMode, string> = {
  evolve:
    "请基于参考图继续延展，保留整体视觉气质、材质语言与系列感，允许调整构图、镜头、细节与陪体，但不要无关地替换主题。",
  preserve:
    "请严格围绕参考图中的主体进行修改，尽量保持主体身份、核心轮廓、关键造型与辨识特征，仅按提示词做局部调整、补充或润饰。",
  transform:
    "请把参考图作为创作起点进行大幅改造，可以重构场景、风格、色彩与表现手法，但仍应与参考图存在可追溯的视觉关联。",
}

function compileBranchPrompt(prompt: string, branchMode: BranchMode | null) {
  if (!branchMode) return prompt.trim()
  return `${BRANCH_MODE_INSTRUCTIONS[branchMode]}\n\n用户目标：${prompt.trim()}`
}

export async function generateOpenAiImages(
  input: StandaloneImageInput & {
    outputCount: number
    branchMode?: BranchMode | null
    parentAssetId?: string | null
  },
  providerConfig: ProviderConfigRecord,
  sourceImageBytes?: Uint8Array,
) {
  if (!providerConfig.apiKey) {
    throw apiError("缺少 OpenAI API Key，请先在页面左侧配置。", 401)
  }

  const baseUrl = normalizeBaseUrl(providerConfig.baseUrl)
  if (!isValidHttpBaseUrl(baseUrl)) {
    throw apiError("Base URL 无效，仅支持 http 或 https 地址。", 400)
  }

  const endpoint = new URL(
    sourceImageBytes ? "images/edits" : "images/generations",
    `${baseUrl}/`,
  )
  const prompt = compileBranchPrompt(input.prompt, input.branchMode ?? null)

  const response = sourceImageBytes
    ? await postEditRequest(endpoint, providerConfig.apiKey, {
        model: input.model,
        prompt,
        n: input.outputCount,
        size: input.size,
        quality: input.quality,
        image: sourceImageBytes,
      })
    : await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          prompt,
          n: input.outputCount,
          size: input.size,
          quality: input.quality,
          output_format: "png",
          response_format: "b64_json",
        }),
      })

  if (!response.ok) {
    throw await parseOpenAiError(response)
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string | null }>
  }

  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    throw apiError("OpenAI 响应中没有图像数据。", 502)
  }

  return payload.data.map((item) => {
    if (!item.b64_json) {
      throw apiError("OpenAI 响应中没有图像数据。", 502)
    }

    const imageBytes = Uint8Array.from(Buffer.from(item.b64_json, "base64"))
    getPngSize(imageBytes)
    return imageBytes
  })
}

async function postEditRequest(
  endpoint: URL,
  apiKey: string,
  input: {
    model: string
    prompt: string
    n: number
    size: string
    quality: string
    image: Uint8Array
  },
) {
  const formData = new FormData()
  formData.set("model", input.model)
  formData.set("prompt", input.prompt)
  formData.set("n", String(input.n))
  formData.set("size", input.size)
  formData.set("quality", input.quality)
  formData.set("output_format", "png")
  formData.set("response_format", "b64_json")
  formData.set(
    "image",
    new File([Buffer.from(input.image)], "source.png", { type: "image/png" }),
  )

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })
}

async function parseOpenAiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as { error?: { message?: string } }
    const message = payload.error?.message
    if (typeof message === "string" && message) {
      return apiError(message, response.status)
    }
  } catch {
    // Fall through to generic HTTP status message.
  }

  return apiError(`OpenAI 接口返回 ${response.status}。`, response.status)
}
