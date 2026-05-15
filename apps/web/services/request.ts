/**
 * 请求解析与输入校验工具
 *
 * 封装 HTTP 请求的 JSON 解析和基于 Zod Schema 的参数校验逻辑。
 * 校验失败时直接返回 ApiError，调用方可通过 `"message" in result` 判断
 * 是否校验成功，从而统一错误处理流程。
 */

import { firstValidationMessage } from "@/lib/validation-error"
import {
  drawTaskInputSchema,
  providerConfigInputSchema,
  standaloneImageInputSchema,
  type DrawTaskInput,
  type ProviderConfigInput,
  type StandaloneImageInput,
} from "@/lib/validations/ai-canvas"

import { apiError, type ApiError } from "./errors"

/**
 * 安全地从请求体中解析 JSON
 * 解析失败时返回空对象 `{}`，而非抛出异常
 */
export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown
  } catch {
    return {}
  }
}

/**
 * 校验供应商配置输入（API Key + Base URL）
 * @returns 校验通过返回结构化数据，失败返回 ApiError
 */
export function validateProviderConfigInput(
  payload: unknown,
): ProviderConfigInput | ApiError {
  const result = providerConfigInputSchema.safeParse(payload)
  return result.success ? result.data : apiError(firstValidationMessage(result.error))
}

/**
 * 校验独立图片生成输入（不关联会话的单次生成）
 * @returns 校验通过返回结构化数据，失败返回 ApiError
 */
export function validateStandaloneImageInput(
  payload: unknown,
): StandaloneImageInput | ApiError {
  const result = standaloneImageInputSchema.safeParse(payload)
  return result.success ? result.data : apiError(firstValidationMessage(result.error))
}

/**
 * 校验绘图任务输入（关联会话的完整生成流程）
 * @returns 校验通过返回结构化数据，失败返回 ApiError
 */
export function validateDrawTaskInput(payload: unknown): DrawTaskInput | ApiError {
  const result = drawTaskInputSchema.safeParse(payload)
  return result.success ? result.data : apiError(firstValidationMessage(result.error))
}
