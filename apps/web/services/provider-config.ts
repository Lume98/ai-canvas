/**
 * AI 供应商配置管理
 *
 * 管理 OpenAI 兼容接口的连接配置（API Key 和 Base URL）。
 * 配置存储在数据库的单行记录中（id 固定为 1），使用 upsert 保证幂等。
 * 对外暴露 GET / POST / DELETE 三个操作，均返回最新的完整配置。
 */

import { NextResponse } from "next/server"

import { initDatabase, prisma } from "@/db"
import { DEFAULT_OPENAI_BASE_URL } from "@/lib/validations/ai-canvas"

import { errorResponse } from "./errors"
import { readJson, validateProviderConfigInput } from "./request"
import { serializeDate } from "./serializers"
import type { ProviderConfigRecord } from "./types"

/**
 * 读取当前供应商配置记录
 * 若数据库中无配置（首次使用），返回带默认值的空配置
 */
export async function getProviderConfigRecord() {
  await initDatabase()
  const row = await prisma.providerConfig.findUnique({ where: { id: 1 } })

  if (!row) {
    return {
      apiKey: "",
      baseUrl: DEFAULT_OPENAI_BASE_URL,
      hasApiKey: false,
      updatedAt: null,
    } satisfies ProviderConfigRecord
  }

  return {
    apiKey: row.apiKey,
    baseUrl: row.baseUrl,
    hasApiKey: true,
    updatedAt: serializeDate(row.updatedAt),
  } satisfies ProviderConfigRecord
}

/** 获取供应商配置 — GET /api/provider-config */
export async function getProviderConfig() {
  return NextResponse.json({ config: await getProviderConfigRecord() })
}

/**
 * 保存供应商配置 — POST /api/provider-config
 * 使用 upsert 确保无论是否存在旧配置都能正确写入
 */
export async function saveProviderConfig(request: Request) {
  const payload = await readJson(request)
  const input = validateProviderConfigInput(payload)
  if ("message" in input) return errorResponse(input)

  await initDatabase()
  await prisma.providerConfig.upsert({
    where: { id: 1 },
    create: { id: 1, apiKey: input.apiKey, baseUrl: input.baseUrl },
    update: { apiKey: input.apiKey, baseUrl: input.baseUrl },
  })

  return NextResponse.json({ config: await getProviderConfigRecord() })
}

/**
 * 清除供应商配置 — DELETE /api/provider-config
 * 删除后返回空配置（默认 Base URL，无 API Key）
 */
export async function clearProviderConfig() {
  await initDatabase()
  await prisma.providerConfig.deleteMany({ where: { id: 1 } })
  return NextResponse.json({ config: await getProviderConfigRecord() })
}
