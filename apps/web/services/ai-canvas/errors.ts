import { NextResponse } from "next/server"

export type ApiError = {
  message: string
  status: number
  code?: string
}

export function apiError(message: string, status = 400, code?: string): ApiError {
  return { message, status, code }
}

export function errorResponse(error: ApiError) {
  return NextResponse.json(
    { error: error.message, ...(error.code ? { code: error.code } : {}) },
    { status: error.status },
  )
}

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
