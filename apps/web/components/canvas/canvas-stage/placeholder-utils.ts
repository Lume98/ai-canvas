import type { buildPendingImagePlaceholders } from "@/components/conversation/conversation-placeholders"

export type PendingImagePlaceholder =
  ReturnType<typeof buildPendingImagePlaceholders>[number]

export function getPendingPlaceholderPosition(
  itemCount: number,
  size: { width: number; height: number }
) {
  return getNextTimelinePlaceholderPosition(itemCount, size)
}

export function describePendingPlaceholderSummary(
  pendingPlaceholders: PendingImagePlaceholder[]
) {
  if (pendingPlaceholders.length === 0) {
    return "结果生成中，画布位置已预留"
  }

  const runningCount = pendingPlaceholders.filter(
    (placeholder) => placeholder.status === "running"
  ).length
  const pendingCount = pendingPlaceholders.length - runningCount

  if (runningCount > 0 && pendingCount > 0) {
    return `已预留 ${pendingPlaceholders.length} 个结果位，${runningCount} 个生成中`
  }

  if (runningCount > 0) {
    return `已预留 ${pendingPlaceholders.length} 个结果位，正在生成`
  }

  return `已预留 ${pendingPlaceholders.length} 个结果位，等待执行`
}

function getNextTimelinePlaceholderPosition(
  itemCount: number,
  size: { width: number; height: number }
) {
  const columnSpacing = 760
  const rowSpacing = 720
  const columns = 3
  const column = itemCount % columns
  const row = Math.floor(itemCount / columns)
  const x = column * columnSpacing - ((columns - 1) * columnSpacing) / 2
  const y = row * rowSpacing

  return {
    x: x - size.width / 2,
    y: y - size.height / 2,
  }
}
