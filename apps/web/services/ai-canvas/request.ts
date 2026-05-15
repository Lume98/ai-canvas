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

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown
  } catch {
    return {}
  }
}

export function validateProviderConfigInput(
  payload: unknown,
): ProviderConfigInput | ApiError {
  const result = providerConfigInputSchema.safeParse(payload)
  return result.success ? result.data : apiError(firstValidationMessage(result.error))
}

export function validateStandaloneImageInput(
  payload: unknown,
): StandaloneImageInput | ApiError {
  const result = standaloneImageInputSchema.safeParse(payload)
  return result.success ? result.data : apiError(firstValidationMessage(result.error))
}

export function validateDrawTaskInput(payload: unknown): DrawTaskInput | ApiError {
  const result = drawTaskInputSchema.safeParse(payload)
  return result.success ? result.data : apiError(firstValidationMessage(result.error))
}
