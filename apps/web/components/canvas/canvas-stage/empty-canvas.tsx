import { forwardRef, useImperativeHandle, useRef } from "react"
import { ImageIcon } from "lucide-react"

import { CanvasDotGrid } from "../canvas-dot-grid"
import { buildPendingImagePlaceholders } from "@/components/conversation/conversation-placeholders"
import type { ConversationMessage } from "@/components/conversation/conversation-types"
import type { CanvasSurfaceHandle } from "./types"
import { useCanvasNavigation } from "./navigation"
import { CanvasPendingPlaceholderLayer } from "./pending-placeholder-layer"
import {
  CanvasGenerationStatus,
  CanvasSurfaceBackdrop,
  CanvasViewportContent,
  CanvasZoomBadge,
  getCanvasSurfaceStyle,
} from "./surface-overlays"

type EmptyCanvasProps = {
  isGenerating: boolean
  pendingMessages: ConversationMessage[]
}

export const EmptyCanvas = forwardRef<CanvasSurfaceHandle, EmptyCanvasProps>(
  function EmptyCanvas({ isGenerating, pendingMessages }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const pendingPlaceholders = buildPendingImagePlaceholders(pendingMessages)
    const {
      handlePanPointerDown,
      handlePanPointerMove,
      isPanning,
      isSpacePressed,
      stopPan,
      viewport,
      zoomFromWheel,
    } = useCanvasNavigation(containerRef)

    useImperativeHandle(
      ref,
      () => ({
        zoomFromWheel,
      }),
      [zoomFromWheel]
    )

    return (
      <CanvasDotGrid
        ref={containerRef}
        className={[
          isPanning
            ? "cursor-grabbing"
            : isSpacePressed
              ? "cursor-grab"
              : "cursor-default",
        ].join(" ")}
        onPointerCancel={stopPan}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={stopPan}
        showBackground={false}
        style={getCanvasSurfaceStyle(viewport)}
      >
        <CanvasSurfaceBackdrop viewport={viewport} />

        {pendingPlaceholders.length > 0 ? (
          <CanvasViewportContent viewport={viewport}>
            <CanvasPendingPlaceholderLayer
              pendingDetail="首批结果已排队，等待执行。"
              pendingPlaceholders={pendingPlaceholders}
              runningDetail="首张结果正在生成，返回后替换此卡。"
              startIndex={0}
            />
          </CanvasViewportContent>
        ) : (
          <EmptyCanvasHint />
        )}

        <CanvasZoomBadge viewport={viewport} />
        <CanvasGenerationStatus
          isGenerating={isGenerating}
          pendingPlaceholders={pendingPlaceholders}
        />
      </CanvasDotGrid>
    )
  }
)

function EmptyCanvasHint() {
  return (
    <div className="pointer-events-none absolute top-[calc(50%+5.5rem)] left-1/2 z-20 flex w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 flex-col items-center rounded-md border border-[oklch(0.84_0.018_245)] bg-white/86 px-5 py-4 text-center text-[oklch(0.22_0.022_245)] shadow-[0_10px_30px_oklch(0.22_0.025_245/0.08)] backdrop-blur">
      <ImageIcon className="size-9 text-[oklch(0.5_0.12_168)]" />
      <p className="mt-3 text-sm font-semibold">空画布</p>
      <p className="mt-1.5 max-w-[22rem] text-xs leading-5 text-[oklch(0.42_0.025_245)]">
        坐标轴已默认开启。配置 API Key 并输入提示词后，首张图会落在原点附近。
      </p>
    </div>
  )
}
