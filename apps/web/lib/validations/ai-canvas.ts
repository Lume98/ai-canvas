import { z } from "zod"

import { branchModes } from "@/components/domain/branch-mode"

export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"

export const imageModels = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"] as const
export const imageSizes = ["1024x1024", "1536x1024", "1024x1536", "auto"] as const
export const imageQualities = ["auto", "high", "medium", "low"] as const
export const branchSourceCompatibleModels = ["gpt-image-1.5", "gpt-image-1"] as const

export const allowedBranchModes = new Set<string>(branchModes)

const imageModelSet = new Set<string>(imageModels)
const imageSizeSet = new Set<string>(imageSizes)
const imageQualitySet = new Set<string>(imageQualities)
const branchSourceCompatibleModelSet = new Set<string>(branchSourceCompatibleModels)

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value
}

export function normalizeBaseUrl(value: unknown) {
  const baseUrl = typeof value === "string" ? value.trim().replace(/\/+$/, "") : ""
  return baseUrl || DEFAULT_OPENAI_BASE_URL
}

export function isValidHttpBaseUrl(baseUrl: string) {
  try {
    const parsed = new URL(baseUrl)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

const requiredTrimmedString = (message: string) =>
  z.preprocess(
    trimString,
    z.string({
      required_error: message,
      invalid_type_error: message,
    }).min(1, message),
  )

const optionalTrimmedString = z.preprocess(
  trimString,
  z.string().optional().nullable(),
)

const imageModelSchema = z
  .preprocess(
    (value) => trimString(value ?? "gpt-image-2"),
    z.string({
      invalid_type_error: "不支持的图像模型。",
      required_error: "不支持的图像模型。",
    }),
  )
  .refine((value): value is (typeof imageModels)[number] => imageModelSet.has(value), {
    message: "不支持的图像模型。",
  })

const imageSizeSchema = z
  .preprocess(
    (value) => trimString(value ?? "1024x1024"),
    z.string({
      invalid_type_error: "不支持的图像尺寸。",
      required_error: "不支持的图像尺寸。",
    }),
  )
  .refine((value): value is (typeof imageSizes)[number] => imageSizeSet.has(value), {
    message: "不支持的图像尺寸。",
  })

const imageQualitySchema = z
  .preprocess(
    (value) => trimString(value ?? "auto"),
    z.string({
      invalid_type_error: "不支持的图像质量。",
      required_error: "不支持的图像质量。",
    }),
  )
  .refine((value): value is (typeof imageQualities)[number] => imageQualitySet.has(value), {
    message: "不支持的图像质量。",
  })

const branchModeSchema = z
  .preprocess((value) => {
    const trimmed = trimString(value)
    return typeof trimmed === "string" && trimmed ? trimmed : null
  }, z.union([z.string(), z.null()]))
  .refine(
    (value): value is (typeof branchModes)[number] | null =>
      value === null || allowedBranchModes.has(value),
    { message: "不支持的分支模式。" },
  )

export const providerConfigInputSchema = z.object(
  {
    apiKey: requiredTrimmedString("API Key 不能为空。"),
    baseUrl: z
      .preprocess(normalizeBaseUrl, z.string())
      .refine(isValidHttpBaseUrl, "Base URL 无效，仅支持 http 或 https 地址。"),
  },
  { invalid_type_error: "请求体不是有效对象。" },
)

export const standaloneImageInputSchema = z.object(
  {
    prompt: requiredTrimmedString("提示词不能为空。").pipe(
      z.string().max(2400, "提示词过长，请控制在 2400 个字符以内。"),
    ),
    model: imageModelSchema,
    size: imageSizeSchema,
    quality: imageQualitySchema,
  },
  { invalid_type_error: "请求体不是有效对象。" },
)

export const drawTaskInputSchema = standaloneImageInputSchema
  .extend({
    conversationId: requiredTrimmedString("conversationId 不能为空。"),
    outputCount: z
      .number({
        invalid_type_error: "输出图片数量仅支持 1 到 4。",
        required_error: "输出图片数量仅支持 1 到 4。",
      })
      .int("输出图片数量仅支持 1 到 4。")
      .min(1, "输出图片数量仅支持 1 到 4。")
      .max(4, "输出图片数量仅支持 1 到 4。")
      .default(1),
    branchMode: branchModeSchema.default(null),
    parentAssetId: optionalTrimmedString.transform((value) => value || null),
  })
  .superRefine((input, context) => {
    if (
      input.parentAssetId &&
      !branchSourceCompatibleModelSet.has(input.model)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "当前模型不支持基于来源图继续生成，请切换到 GPT Image 1.5 或 GPT Image 1。",
        path: ["model"],
      })
    }
  })
  .transform((input) => ({
    ...input,
    branchMode: input.parentAssetId ? input.branchMode : null,
  }))

export const createConversationInputSchema = z
  .object(
    {
      title: optionalTrimmedString.transform((value) => value || "未命名会话"),
    },
    { invalid_type_error: "请求体不是有效对象。" },
  )
  .default({ title: "未命名会话" })

export type ProviderConfigInput = z.infer<typeof providerConfigInputSchema>
export type StandaloneImageInput = z.infer<typeof standaloneImageInputSchema>
export type DrawTaskInput = z.infer<typeof drawTaskInputSchema>
