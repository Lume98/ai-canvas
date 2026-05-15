import { NextResponse } from "next/server"

import { initDatabase, prisma } from "@/db"
import { DEFAULT_OPENAI_BASE_URL } from "@/lib/validations/ai-canvas"

import { errorResponse } from "./errors"
import { readJson, validateProviderConfigInput } from "./request"
import { serializeDate } from "./serializers"
import type { ProviderConfigRecord } from "./types"

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

export async function getProviderConfig() {
  return NextResponse.json({ config: await getProviderConfigRecord() })
}

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

export async function clearProviderConfig() {
  await initDatabase()
  await prisma.providerConfig.deleteMany({ where: { id: 1 } })
  return NextResponse.json({ config: await getProviderConfigRecord() })
}
