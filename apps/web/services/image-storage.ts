/**
 * 图片存储管理
 *
 * 负责生成图片的文件系统持久化与读取操作，包括：
 * - 将 AI 生成的图片字节数据保存为本地 PNG 文件
 * - 从 PNG 二进制头中解析图片尺寸
 * - 安全地解析文件路径（防止路径穿越攻击）
 * - 构建前端可访问的图片 URL
 *
 * 所有图片保存在 `{dataDir}/generated-images/` 目录下。
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import { dataDir } from "@/db"

import { apiError } from "./errors"
import { buildId } from "./ids"
import type { PersistedImage } from "./types"

/** PNG 文件的 8 字节签名，用于校验图片格式 */
const PNG_SIGNATURE = "\x89PNG\r\n\x1a\n"

/** 合法的生成图片文件名模式（防止路径穿越） */
const GENERATED_IMAGE_FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.png$/

/** 生成图片的本地存储目录 */
const generatedImagesDir = path.join(dataDir, "generated-images")

/**
 * 从 PNG 二进制数据的 IHDR 块中读取图片尺寸
 * PNG 格式：前 8 字节为签名，第 16–24 字节为大端序的宽高
 * @throws 如果数据不是有效的 PNG 格式
 */
export function getPngSize(imageBytes: Uint8Array) {
  const signature = Buffer.from(imageBytes.subarray(0, 8)).toString("latin1")
  if (signature !== PNG_SIGNATURE) {
    throw apiError("OpenAI 响应中的图像不是 PNG 格式。", 502)
  }

  const width = Buffer.from(imageBytes.subarray(16, 20)).readUInt32BE(0)
  const height = Buffer.from(imageBytes.subarray(20, 24)).readUInt32BE(0)
  return { width, height }
}

/**
 * 将图片字节数据保存到本地文件系统
 *
 * 自动创建存储目录（如不存在），文件名使用唯一 ID 生成。
 * 保存前会校验 PNG 格式并提取尺寸信息。
 * @param imageBytes - AI 返回的原始图片字节数据
 * @returns 包含文件名和尺寸的持久化元数据
 */
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

/**
 * 根据文件名构建前端可访问的图片 URL
 * @param filename - 本地文件名
 * @returns 如 `/api/generated-images/image_xxx.png` 的 API 路径
 */
export function buildGeneratedImageUrl(filename: string) {
  return `/api/generated-images/${encodeURIComponent(filename)}`
}

/**
 * 安全地解析生成图片的本地文件路径
 *
 * 执行两重安全检查：
 * 1. 文件名必须匹配 `[a-zA-Z0-9_-]+.png` 模式
 * 2. 解析后的绝对路径必须在 generatedImagesDir 下（防止 `../` 穿越）
 * @returns 安全的绝对路径，校验失败返回 null
 */
export function resolveGeneratedImagePath(filename: string) {
  if (!GENERATED_IMAGE_FILENAME_PATTERN.test(filename)) return null
  const resolvedPath = path.resolve(generatedImagesDir, filename)
  if (!resolvedPath.startsWith(path.resolve(generatedImagesDir) + path.sep)) return null
  return resolvedPath
}

/**
 * 读取生成图片文件并返回 Buffer（用于 API 响应）
 * @param filename - 本地文件名
 * @returns 图片文件的 Buffer 数据
 * @throws 文件不存在或路径不合法时抛出 404 错误
 */
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

/**
 * 读取来源图片文件并返回 Uint8Array（用于二次生成时的请求体）
 * 与 readGeneratedImageFile 不同，此函数返回 Uint8Array 以便直接传给 OpenAI API。
 * @param filename - 本地文件名
 * @returns 图片文件的 Uint8Array 数据
 * @throws 文件不存在或路径不合法时抛出 404 错误
 */
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
