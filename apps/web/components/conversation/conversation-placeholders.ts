import type { ConversationMessage } from "@/components/conversation/conversation-types"
import type {
  FailedImagePlaceholder,
  PendingImagePlaceholder,
} from "@/components/generated-image/generated-image-types"
import {
  resolveGeneratedImageAspectRatio,
  resolveGeneratedImageDisplaySize,
  resolveGeneratedImageSize,
} from "@/components/generated-image/generated-image-types"

export function buildPendingImagePlaceholders(
  messages: ConversationMessage[],
): PendingImagePlaceholder[] {
  return messages.flatMap((message) => buildPendingImagePlaceholdersForMessage(message))
}

export function buildPendingImagePlaceholdersForMessage(
  message: ConversationMessage,
): PendingImagePlaceholder[] {
  if (
    message.role !== "assistant" ||
    (message.status !== "pending" && message.status !== "running") ||
    !message.task
  ) {
    return []
  }

  const count = Math.max(message.task.outputCount ?? 1, 1)
  const sizeLabel = message.task.size || "auto"
  const generatedSize = resolveGeneratedImageSize(message.task.size)
  const size = resolveGeneratedImageDisplaySize(generatedSize.width, generatedSize.height)
  const ratio = resolveGeneratedImageAspectRatio(message.task.size)
  const prompt = message.task.prompt ?? message.text
  const status = message.status === "running" ? "running" : "pending"

  return Array.from({ length: count }, (_, index) => ({
    detail:
      status === "pending"
        ? "任务已创建，等待调度。"
        : "结果会自动回填到这条消息。",
    id: `${message.id}-${index}`,
    imageIndex: index + 1,
    indexLabel: count > 1 ? `图 ${index + 1} / ${count}` : undefined,
    isAutoSize: sizeLabel === "auto",
    model: message.task?.model ?? "",
    outputCount: count,
    prompt,
    quality: message.task?.quality ?? "",
    ratio,
    size,
    sizeLabel,
    status,
    title: `第 ${index + 1} 张图像占位`,
  }))
}

export function buildFailedImagePlaceholderForMessage(
  message: ConversationMessage,
): FailedImagePlaceholder | null {
  if (message.role !== "assistant" || message.status !== "failed" || !message.task) {
    return null
  }

  return {
    errorMessage: message.task.errorMessage || "任务执行失败。",
    isAutoSize: (message.task.size || "auto") === "auto",
    model: message.task.model ?? "",
    prompt: message.task.prompt ?? message.text,
    quality: message.task.quality ?? "",
    ratio: resolveGeneratedImageAspectRatio(message.task.size),
    sizeLabel: message.task.size || "auto",
    title: "生成失败结果卡",
  }
}
