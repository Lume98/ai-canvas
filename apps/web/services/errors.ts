/**
 * 统一错误处理工具
 *
 * 为服务层提供标准化的错误创建与响应格式。
 * 所有 API 路由通过 errorResponse() 返回 JSON 错误响应，
 * 确保前端收到的错误结构一致：`{ error: string, code?: string }`。
 */

import { NextResponse } from "next/server"

/** 标准化 API 错误结构 */
export type ApiError = {
  /** 人类可读的错误描述 */
  message: string
  /** HTTP 状态码 */
  status: number
  /** 可选的业务错误码，供前端精确匹配（如 `CONVERSATION_NOT_FOUND`） */
  code?: string
}

/**
 * 创建一个标准 API 错误对象
 * @param message - 错误描述
 * @param status  - HTTP 状态码，默认 400
 * @param code    - 可选业务错误码
 */
export function apiError(message: string, status = 400, code?: string): ApiError {
  return { message, status, code }
}

/**
 * 将 ApiError 转换为 Next.js JSON 响应
 * 响应体格式：`{ error: string, code?: string }`
 */
export function errorResponse(error: ApiError) {
  return NextResponse.json(
    { error: error.message, ...(error.code ? { code: error.code } : {}) },
    { status: error.status },
  )
}

/**
 * 将任意抛出的错误归一化为 ApiError
 *
 * 识别优先级：
 * 1. 已经是 ApiError 结构（含 message + status 字段）→ 直接返回
 * 2. Error 实例 → 取其 message，状态码 500
 * 3. 其他未知类型 → 返回通用 "请求失败。"，状态码 500
 */
export function normalizeError(error: unknown): ApiError {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "status" in error &&
    typeof error.message === "string" &&
    typeof error.status === "number"
  ) {
    return error as ApiError
  }

  if (error instanceof Error) {
    return apiError(error.message || "请求失败。", 500)
  }

  return apiError("请求失败。", 500)
}
