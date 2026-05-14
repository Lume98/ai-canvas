"use client"

import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react"

import { EmptyCanvas, InfiniteCanvas } from "./canvas-stage/index"
import type {
  CanvasStageHandle,
  CanvasStageProps,
  CanvasSurfaceHandle,
} from "./canvas-stage/index"

export type { CanvasStageHandle } from "./canvas-stage/index"

export const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(
  function CanvasStage(
    {
      images,
      imageDisplayFields,
      imageDisplayPreset,
      canvasItems,
      focusRequest,
      isGenerating,
      pendingMessages = [],
      onCanvasItemsChange,
      onAssetSelect,
      onSelectedItemChange,
      selectedItemId,
    },
    ref
  ) {
    const surfaceRef = useRef<CanvasSurfaceHandle | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        zoomFromWheel(gesture) {
          surfaceRef.current?.zoomFromWheel(gesture)
        },
      }),
      []
    )

    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          {images.length > 0 || pendingMessages.length > 0 ? (
            <InfiniteCanvas
              ref={surfaceRef}
              images={images}
              imageDisplayFields={imageDisplayFields}
              imageDisplayPreset={imageDisplayPreset}
              canvasItems={canvasItems}
              focusRequest={focusRequest}
              isGenerating={isGenerating}
              pendingMessages={pendingMessages}
              onCanvasItemsChange={onCanvasItemsChange}
              onAssetSelect={onAssetSelect}
              onSelectedItemChange={onSelectedItemChange}
              selectedItemId={selectedItemId}
            />
          ) : (
            <EmptyCanvas
              ref={surfaceRef}
              isGenerating={isGenerating}
              pendingMessages={pendingMessages}
            />
          )}
        </div>
      </section>
    )
  }
)
