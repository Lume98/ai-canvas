import type { z } from "zod"

export function firstValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "请求参数无效。"
}
