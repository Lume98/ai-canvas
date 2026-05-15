import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import { dataDir } from "@/db"

import { apiError } from "./errors"
import { buildId } from "./ids"
import type { PersistedImage } from "./types"

const PNG_SIGNATURE = "\x89PNG\r\n\x1a\n"
const GENERATED_IMAGE_FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.png$/

const generatedImagesDir = path.join(dataDir, "generated-images")

export function getPngSize(imageBytes: Uint8Array) {
  const signature = Buffer.from(imageBytes.subarray(0, 8)).toString("latin1")
  if (signature !== PNG_SIGNATURE) {
    throw apiError("OpenAI 响应中的图像不是 PNG 格式。", 502)
  }

  const width = Buffer.from(imageBytes.subarray(16, 20)).readUInt32BE(0)
  const height = Buffer.from(imageBytes.subarray(20, 24)).readUInt32BE(0)
  return { width, height }
}

export async function saveGeneratedImage(
  imageBytes: Uint8Array,
): Promise<PersistedImage> {
  await mkdir(generatedImagesDir, { recursive: true })

  const { width, height } = getPngSize(imageBytes)
  const filename = `${buildId("image")}.png`
  const filePath = path.join(generatedImagesDir, filename)

  await writeFile(filePath, imageBytes)
  return { filename, width, height }
}

export function buildGeneratedImageUrl(filename: string) {
  return `/api/generated-images/${encodeURIComponent(filename)}`
}

export function resolveGeneratedImagePath(filename: string) {
  if (!GENERATED_IMAGE_FILENAME_PATTERN.test(filename)) return null
  const resolvedPath = path.resolve(generatedImagesDir, filename)
  if (!resolvedPath.startsWith(path.resolve(generatedImagesDir) + path.sep)) return null
  return resolvedPath
}

export async function readGeneratedImageFile(filename: string) {
  const filePath = resolveGeneratedImagePath(filename)
  if (!filePath) {
    throw apiError("图片不存在。", 404)
  }

  try {
    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) {
      throw apiError("图片不存在。", 404)
    }

    return await readFile(filePath)
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error) {
      throw error
    }
    throw apiError("图片不存在。", 404)
  }
}

export async function readImageFile(filename: string) {
  const filePath = resolveGeneratedImagePath(filename)
  if (!filePath) {
    throw apiError("来源图片不存在，无法继续生成。", 404)
  }

  try {
    return new Uint8Array(await readFile(filePath))
  } catch {
    throw apiError("来源图片文件不存在，无法继续生成。", 404)
  }
}
