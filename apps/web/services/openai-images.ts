/**
 * OpenAI 图片生成接口封装
 *
 * 封装与 OpenAI Images API 的交互逻辑，支持两种调用方式：
 * - **文生图**：调用 `images/generations` 端点，根据文本提示词生成图片
 * - **图生图**：调用 `images/edits` 端点，基于参考图进行二次创作
 *
 * 还支持三种延展模式（branchMode）：
 * - evolve   — 在保留整体风格的前提下延展变化
 * - preserve — 保持主体不变，仅做局部修改
 * - transform — 大幅改造，但仍与参考图保持视觉关联
 */

import type { BranchMode } from "@/components/domain/branch-mode"
import {
  isValidHttpBaseUrl,
  normalizeBaseUrl,
  type StandaloneImageInput,
} from "@/lib/validations/ai-canvas"

import { apiError, type ApiError } from "./errors"
import { getPngSize } from "./image-storage"
import type { ProviderConfigRecord } from "./types"

/** 各延展模式对应的系统提示词，引导 AI 理解用户意图 */
const BRANCH_MODE_INSTRUCTIONS: Record<BranchMode, string> = {
  evolve:
    "请基于参考图继续延展，保留整体视觉气质、材质语言与系列感，允许调整构图、镜头、细节与陪体，但不要无关地替换主题。",
  preserve:
    "请严格围绕参考图中的主体进行修改，尽量保持主体身份、核心轮廓、关键造型与辨识特征，仅按提示词做局部调整、补充或润饰。",
  transform:
    "请把参考图作为创作起点进行大幅改造，可以重构场景、风格、色彩与表现手法，但仍应与参考图存在可追溯的视觉关联。",
}

/**
 * 将延展模式指令与用户提示词合并
 * 无延展模式时直接返回用户原始提示词
 */
function compileBranchPrompt(prompt: string, branchMode: BranchMode | null) {
  if (!branchMode) return prompt.trim()
  return `${BRANCH_MODE_INSTRUCTIONS[branchMode]}\n\n用户目标：${prompt.trim()}`
}

/**
 * 调用 OpenAI Images API 生成图片
 *
 * 根据 `sourceImageBytes` 是否存在自动选择端点：
 * - 有参考图 → `images/edits`（图生图，multipart/form-data）
 * - 无参考图 → `images/generations`（文生图，JSON）
 *
 * @param input - 生成参数，包含提示词、模型、尺寸、质量、数量等
 * @param providerConfig - 当前供应商配置（API Key + Base URL）
 * @param sourceImageBytes - 可选的参考图字节数据，用于图生图
 * @returns 生成的图片字节数组（Uint8Array[]），每个元素为一张 PNG 图片
 * @throws 缺少 API Key、URL 无效、或 OpenAI 返回错误时抛出 ApiError
 */
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

  // 根据是否携带参考图选择不同的 API 端点
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

  // 将 base64 编码的图片数据解码为字节数组，并校验 PNG 格式
  return payload.data.map((item) => {
    if (!item.b64_json) {
      throw apiError("OpenAI 响应中没有图像数据。", 502)
    }

    const imageBytes = Uint8Array.from(Buffer.from(item.b64_json, "base64"))
    getPngSize(imageBytes)
    return imageBytes
  })
}

/**
 * 发送图生图请求（multipart/form-data）
 *
 * OpenAI 的 images/edits 端点要求使用 FormData 格式，
 * 参考图作为 `image` 字段以 PNG 文件形式上传。
 */
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

/**
 * 解析 OpenAI API 的错误响应
 *
 * 尝试从 JSON 响应体中提取 `error.message`，若无法解析
 * 则使用通用的 HTTP 状态码描述。
 */
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
