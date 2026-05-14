import { GeneratedImagePlaceholderCard } from "@/components/generated-image/generated-image-card"

import type { PendingImagePlaceholder } from "./placeholder-utils"
import { getPendingPlaceholderPosition } from "./placeholder-utils"

type CanvasPendingPlaceholderLayerProps = {
  pendingPlaceholders: PendingImagePlaceholder[]
  startIndex: number
  runningDetail: string
  pendingDetail: string
}

export function CanvasPendingPlaceholderLayer({
  pendingPlaceholders,
  startIndex,
  runningDetail,
  pendingDetail,
}: CanvasPendingPlaceholderLayerProps) {
  return pendingPlaceholders.map((placeholder, index) => {
    const placeholderPosition = getPendingPlaceholderPosition(
      startIndex + index,
      placeholder.size
    )

    return (
      <div
        className="absolute max-w-none"
        key={placeholder.id}
        style={{
          width: placeholder.size.width,
          height: placeholder.size.height,
          transform: `translate3d(${placeholderPosition.x}px, ${placeholderPosition.y}px, 0)`,
        }}
      >
        <GeneratedImagePlaceholderCard
          autoSizeHint={placeholder.isAutoSize}
          className="h-full w-full"
          detail={
            placeholder.status === "pending"
              ? pendingDetail
              : runningDetail
          }
          indexLabel={placeholder.indexLabel}
          model={placeholder.model}
          prompt={placeholder.prompt}
          quality={placeholder.quality}
          ratio={placeholder.ratio}
          size={placeholder.sizeLabel}
          status={placeholder.status}
          title="待生成图像占位"
          variant="canvas"
        />
      </div>
    )
  })
}
