/**
 * 独立图片生成服务
 *
 * 处理不关联会话的单次图片生成和读取，用于快速预览场景。
 * 与 draw-tasks 模块不同，此模块不创建消息、任务等持久化记录，
 * 仅生成图片文件并返回 URL。
 *
 * 对外暴露的 API：
 * - POST /api/images/generate          — 根据提示词生成单张图片
 * - GET  /api/generated-images/:name   — 读取已生成的图片文件
 */

import { NextResponse } from "next/server"

import { apiError, errorResponse, normalizeError } from "./errors"
import { buildGeneratedImageUrl, readGeneratedImageFile, saveGeneratedImage } from "./image-storage"
import { generateOpenAiImages } from "./openai-images"
import { getProviderConfigRecord } from "./provider-config"
import { readJson, validateStandaloneImageInput } from "./request"

/**
 * 根据提示词独立生成单张图片
 * 固定 outputCount = 1，返回图片的访问 URL
 */
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

/**
 * 读取已生成的图片文件并返回 HTTP 响应
 *
 * 设置了长期缓存头（Cache-Control: immutable, max-age=1年），
 * 因为生成图片的文件名包含 UUID，内容永远不会变化。
 * @param filename - 图片文件名
 */
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
