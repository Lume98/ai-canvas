import { NextResponse } from "next/server"

import { apiError, errorResponse, normalizeError } from "./errors"
import { buildGeneratedImageUrl, readGeneratedImageFile, saveGeneratedImage } from "./image-storage"
import { generateOpenAiImages } from "./openai-images"
import { getProviderConfigRecord } from "./provider-config"
import { readJson, validateStandaloneImageInput } from "./request"

export async function generateImage(request: Request) {
  const payload = await readJson(request)
  const input = validateStandaloneImageInput(payload)
  if ("message" in input) return errorResponse(input)

  try {
    const providerConfig = await getProviderConfigRecord()
    const [imageBytes] = await generateOpenAiImages(
      { ...input, outputCount: 1 },
      providerConfig,
    )

    if (!imageBytes) {
      return errorResponse(apiError("未生成任何图片。", 502))
    }

    const image = await saveGeneratedImage(imageBytes)
    return NextResponse.json({ image: buildGeneratedImageUrl(image.filename) })
  } catch (error) {
    return errorResponse(normalizeError(error))
  }
}

export async function readGeneratedImage(filename: string) {
  try {
    const imageBuffer = await readGeneratedImageFile(filename)
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(imageBuffer.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    return errorResponse(normalizeError(error))
  }
}
