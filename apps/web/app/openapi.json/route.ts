import { NextResponse } from "next/server"

import { getOpenApiDocument } from "@/lib/openapi"

export const runtime = "nodejs"

export async function GET(): Promise<Response> {
  return NextResponse.json(getOpenApiDocument())
}
