import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"

import { CanvasDotGrid } from "../canvas-dot-grid"
import { CanvasImageItem } from "../canvas-image-item"
import { buildCanvasConnectionSegments } from "../ai-canvas-utils"
import { buildPendingImagePlaceholders } from "@/components/conversation/conversation-placeholders"
import { CanvasConnectionLayer } from "./connection-layer"
import type {
  CanvasSurfaceHandle,
  InfiniteCanvasProps,
} from "./types"
import { useCanvasNavigation } from "./navigation"
import { CanvasPendingPlaceholderLayer } from "./pending-placeholder-layer"
import {
  CanvasGenerationStatus,
  CanvasSurfaceBackdrop,
  CanvasViewportContent,
  CanvasZoomBadge,
  getCanvasSurfaceStyle,
} from "./surface-overlays"
import { useCanvasItemDrag } from "./use-canvas-item-drag"

export const InfiniteCanvas = forwardRef<CanvasSurfaceHandle, InfiniteCanvasProps>(
  function InfiniteCanvas(
    {
      images,
      imageDisplayFields,
      imageDisplayPreset,
      canvasItems,
      focusRequest,
      isGenerating,
      pendingMessages,
      onCanvasItemsChange,
      onAssetSelect,
      onSelectedItemChange,
      selectedItemId,
    },
    ref
  ) {
    const imagesByAssetId = new Map(
      images.map((image) => [image.asset.id, image])
    )
    const connectionSegments = buildCanvasConnectionSegments(images, canvasItems)
    const pendingPlaceholders = buildPendingImagePlaceholders(pendingMessages)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const {
      handlePanPointerDown,
      handlePanPointerMove,
      isPanning,
      isSpacePressed,
      setViewport,
      stopPan,
      viewport,
      zoomFromWheel,
    } = useCanvasNavigation(containerRef)
    const {
      handleItemPointerDown,
      handleStagePointerEnd,
      handleStagePointerMove,
      isDraggingItem,
    } = useCanvasItemDrag({
      isSpacePressed,
      onCanvasItemsChange,
      onPanPointerMove: handlePanPointerMove,
      onSelectedItemChange,
      onStopPan: stopPan,
      viewportScale: viewport.scale,
    })

    useImperativeHandle(
      ref,
      () => ({
        zoomFromWheel,
      }),
      [zoomFromWheel]
    )

    useEffect(() => {
      if (!focusRequest) return

      queueMicrotask(() => {
        setViewport((current) => ({
          ...current,
          pan: {
            x: -focusRequest.centerX * current.scale,
            y: -focusRequest.centerY * current.scale,
          },
        }))
      })
    }, [focusRequest, setViewport])

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
        onPointerCancel={handleStagePointerEnd}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerEnd}
        showBackground={false}
        style={getCanvasSurfaceStyle(viewport)}
      >
        <CanvasSurfaceBackdrop viewport={viewport} />
        <CanvasViewportContent viewport={viewport}>
          <CanvasConnectionLayer
            segments={connectionSegments}
            selectedItemId={selectedItemId}
          />
          {canvasItems.map((item) => {
            const image = imagesByAssetId.get(item.assetId)

            if (!image) return null

            return (
              <CanvasImageItem
                image={image}
                imageDisplayFields={imageDisplayFields}
                imageDisplayPreset={imageDisplayPreset}
                isDragging={isDraggingItem && selectedItemId === item.id}
                isSelected={selectedItemId === item.id}
                item={item}
                key={item.id}
                onAssetSelect={onAssetSelect}
                onPointerDown={handleItemPointerDown}
              />
            )
          })}
          <CanvasPendingPlaceholderLayer
            pendingDetail="任务已进入队列，正在等待执行。"
            pendingPlaceholders={pendingPlaceholders}
            runningDetail="结果返回后将自动替换此卡。"
            startIndex={canvasItems.length}
          />
        </CanvasViewportContent>

        <CanvasZoomBadge viewport={viewport} />
        <CanvasGenerationStatus
          isGenerating={isGenerating}
          pendingPlaceholders={pendingPlaceholders}
        />
      </CanvasDotGrid>
    )
  }
)
