"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { ImageIcon, LoaderCircle } from "lucide-react"

import { CanvasDotGrid } from "./canvas-dot-grid"
import { CanvasItem, GeneratedImageView, ImageAsset } from "./canvas-types"
import { GeneratedImagePresetCard } from "./generated-image-card"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "./generated-image-display-presets"

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const ZOOM_SENSITIVITY = 0.0015
const GRID_SIZE = 22
const AXIS_STEP = 500

type CanvasZoomGesture = {
  clientX: number
  clientY: number
  deltaY: number
}

export type CanvasStageHandle = {
  zoomFromWheel: (gesture: CanvasZoomGesture) => void
}

type CanvasSurfaceHandle = CanvasStageHandle

type ViewportTransform = {
  pan: {
    x: number
    y: number
  }
  scale: number
}

type CanvasStageProps = {
  images: GeneratedImageView[]
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  canvasItems: CanvasItem[]
  focusRequest: {
    centerX: number
    centerY: number
    requestId: number
  } | null
  isGenerating: boolean
  selectedItemId: string | null
  onCanvasItemsChange: React.Dispatch<React.SetStateAction<CanvasItem[]>>
  onAssetSelect?: (asset: ImageAsset) => void
  onSelectedItemChange: (itemId: string | null) => void
}

export const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(function CanvasStage({
  images,
  imageDisplayFields,
  imageDisplayPreset,
  canvasItems,
  focusRequest,
  isGenerating,
  onCanvasItemsChange,
  onAssetSelect,
  onSelectedItemChange,
  selectedItemId,
}, ref) {
  const surfaceRef = useRef<CanvasSurfaceHandle | null>(null)

  useImperativeHandle(ref, () => ({
    zoomFromWheel(gesture) {
      surfaceRef.current?.zoomFromWheel(gesture)
    },
  }), [])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        {images.length > 0 ? (
          <InfiniteCanvas
            ref={surfaceRef}
            images={images}
            imageDisplayFields={imageDisplayFields}
            imageDisplayPreset={imageDisplayPreset}
            canvasItems={canvasItems}
            focusRequest={focusRequest}
            isGenerating={isGenerating}
            onCanvasItemsChange={onCanvasItemsChange}
            onAssetSelect={onAssetSelect}
            onSelectedItemChange={onSelectedItemChange}
            selectedItemId={selectedItemId}
          />
        ) : (
          <EmptyCanvas
            ref={surfaceRef}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </section>
  )
})

type InfiniteCanvasProps = {
  images: GeneratedImageView[]
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  canvasItems: CanvasItem[]
  focusRequest: {
    centerX: number
    centerY: number
    requestId: number
  } | null
  isGenerating: boolean
  onCanvasItemsChange: React.Dispatch<React.SetStateAction<CanvasItem[]>>
  onAssetSelect?: (asset: ImageAsset) => void
  onSelectedItemChange: (itemId: string | null) => void
  selectedItemId: string | null
}

const InfiniteCanvas = forwardRef<CanvasSurfaceHandle, InfiniteCanvasProps>(function InfiniteCanvas({
  images,
  imageDisplayFields,
  imageDisplayPreset,
  canvasItems,
  focusRequest,
  isGenerating,
  onCanvasItemsChange,
  onAssetSelect,
  onSelectedItemChange,
  selectedItemId,
}, ref) {
  const imagesByAssetId = new Map(images.map((image) => [image.asset.id, image]))
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef({
    pointerId: -1,
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  })
  const itemDragStartRef = useRef({
    itemId: "",
    pointerId: -1,
    x: 0,
    y: 0,
    itemX: 0,
    itemY: 0,
  })
  const [viewport, setViewport] = useState<ViewportTransform>({
    pan: { x: 0, y: 0 },
    scale: 1,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingItem, setIsDraggingItem] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  function zoomFromWheel({ clientX, clientY, deltaY }: CanvasZoomGesture) {
    const container = containerRef.current

    if (!container) return

    setViewport((current) =>
      applyWheelZoom(current, container.getBoundingClientRect(), {
        clientX,
        clientY,
        deltaY,
      }),
    )
  }

  useImperativeHandle(ref, () => ({
    zoomFromWheel,
  }), [])

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
  }, [focusRequest])

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false

      return Boolean(
        target.closest("input, textarea, select, [contenteditable='true']"),
      )
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || isEditableTarget(event.target)) return

      event.preventDefault()
      setIsSpacePressed(true)
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== "Space") return

      event.preventDefault()
      setIsSpacePressed(false)
    }

    function handleBlur() {
      setIsSpacePressed(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !isSpacePressed) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: viewport.pan.x,
      panY: viewport.pan.y,
    }
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (
      isDraggingItem &&
      itemDragStartRef.current.pointerId === event.pointerId
    ) {
      const dragStart = itemDragStartRef.current

      onCanvasItemsChange((current) =>
        current.map((item) =>
          item.id === dragStart.itemId
            ? {
                ...item,
                x:
                  dragStart.itemX + (event.clientX - dragStart.x) / viewport.scale,
                y:
                  dragStart.itemY + (event.clientY - dragStart.y) / viewport.scale,
              }
            : item,
        ),
      )
      return
    }

    if (!isDragging || dragStartRef.current.pointerId !== event.pointerId) {
      return
    }

    const dragStart = dragStartRef.current

    setViewport((current) => ({
      ...current,
      pan: {
        x: dragStart.panX + event.clientX - dragStart.x,
        y: dragStart.panY + event.clientY - dragStart.y,
      },
    }))
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey) {
      return
    }

    event.preventDefault()
    zoomFromWheel({
      clientX: event.clientX,
      clientY: event.clientY,
      deltaY: event.deltaY,
    })
  }

  function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (itemDragStartRef.current.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      itemDragStartRef.current.pointerId = -1
      itemDragStartRef.current.itemId = ""
      setIsDraggingItem(false)
      return
    }

    if (dragStartRef.current.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragStartRef.current.pointerId = -1
    setIsDragging(false)
  }

  function handleItemPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    item: CanvasItem,
  ) {
    if (event.button !== 0 || isSpacePressed) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    itemDragStartRef.current = {
      itemId: item.id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      itemX: item.x,
      itemY: item.y,
    }
    onSelectedItemChange(item.id)
    setIsDraggingItem(true)
  }

  return (
    <CanvasDotGrid
      ref={containerRef}
      className={[
        isDragging
          ? "cursor-grabbing"
          : isSpacePressed
            ? "cursor-grab"
            : "cursor-default",
      ].join(" ")}
      onPointerCancel={stopDragging}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onWheel={handleWheel}
      showBackground={false}
      style={
        {
          "--canvas-grid-size": `${GRID_SIZE * viewport.scale}px`,
          "--canvas-grid-x": `calc(50% + ${viewport.pan.x}px)`,
          "--canvas-grid-y": `calc(50% + ${viewport.pan.y}px)`,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 bg-white bg-[radial-gradient(circle,oklch(0.78_0.018_245)_1px,transparent_1px)] bg-[position:var(--canvas-grid-x)_var(--canvas-grid-y)] bg-[length:var(--canvas-grid-size)_var(--canvas-grid-size)]" />
      <CoordinateOverlay viewport={viewport} />
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${viewport.pan.x}px, ${viewport.pan.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: "center",
        }}
      >
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
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-md border border-[oklch(0.82_0.025_245)] bg-white/88 px-2.5 py-1 text-xs font-medium text-[oklch(0.35_0.025_245)] shadow-sm backdrop-blur">
        {Math.round(viewport.scale * 100)}%
      </div>

      <GeneratingOverlay isGenerating={isGenerating} />
    </CanvasDotGrid>
  )
})

function CanvasImageItem({
  image,
  imageDisplayFields,
  imageDisplayPreset,
  isDragging,
  isSelected,
  item,
  onPointerDown,
  onAssetSelect,
}: {
  image: GeneratedImageView
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  isDragging: boolean
  isSelected: boolean
  item: CanvasItem
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    item: CanvasItem,
  ) => void
  onAssetSelect?: (asset: ImageAsset) => void
}) {
  return (
    <div
      className={[
        "absolute max-w-none overflow-hidden rounded-md border bg-white shadow-sm",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        isSelected
          ? "border-[oklch(0.55_0.14_168)] ring-2 ring-[oklch(0.55_0.14_168/0.22)]"
          : "border-[oklch(0.82_0.025_245)]",
      ].join(" ")}
      onPointerDown={(event) => onPointerDown(event, item)}
      style={{
        width: item.width,
        height: item.height,
        transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
      }}
      onDoubleClick={() => onAssetSelect?.(image.asset)}
    >
      <GeneratedImagePresetCard
        fieldOverrides={imageDisplayFields}
        image={image}
        preset={imageDisplayPreset}
      />
    </div>
  )
}

function CoordinateOverlay({ viewport }: { viewport: ViewportTransform }) {
  const visibleWorld = 6000 / viewport.scale
  const min = -visibleWorld / 2
  const max = visibleWorld / 2
  const ticks = createAxisTicks(min, max)

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden text-[10px] font-medium text-[oklch(0.42_0.025_245)]">
      <div
        className="absolute h-px bg-[oklch(0.45_0.08_245/0.42)]"
        style={{
          left: 0,
          right: 0,
          top: `calc(50% + ${viewport.pan.y}px)`,
        }}
      />
      <div
        className="absolute w-px bg-[oklch(0.45_0.08_245/0.42)]"
        style={{
          bottom: 0,
          left: `calc(50% + ${viewport.pan.x}px)`,
          top: 0,
        }}
      />
      {ticks.map((value) => (
        <AxisTick
          axis="x"
          key={`x-${value}`}
          scale={viewport.scale}
          value={value}
          viewport={viewport}
        />
      ))}
      {ticks.map((value) => (
        <AxisTick
          axis="y"
          key={`y-${value}`}
          scale={viewport.scale}
          value={value}
          viewport={viewport}
        />
      ))}
    </div>
  )
}

function AxisTick({
  axis,
  scale,
  value,
  viewport,
}: {
  axis: "x" | "y"
  scale: number
  value: number
  viewport: ViewportTransform
}) {
  if (axis === "x") {
    return (
      <div
        className="absolute flex -translate-x-1/2 flex-col items-center gap-1"
        style={{
          left: `calc(50% + ${viewport.pan.x + value * scale}px)`,
          top: `calc(50% + ${viewport.pan.y}px)`,
        }}
      >
        <span className="h-2 w-px bg-[oklch(0.45_0.08_245/0.42)]" />
        <span>{value}</span>
      </div>
    )
  }

  return (
    <div
      className="absolute flex -translate-y-1/2 items-center gap-1"
      style={{
        left: `calc(50% + ${viewport.pan.x}px)`,
        top: `calc(50% + ${viewport.pan.y + value * scale}px)`,
      }}
    >
      <span className="w-8 text-right">{value}</span>
      <span className="h-px w-2 bg-[oklch(0.45_0.08_245/0.42)]" />
    </div>
  )
}

function createAxisTicks(min: number, max: number) {
  const start = Math.ceil(min / AXIS_STEP) * AXIS_STEP
  const ticks: number[] = []

  for (let value = start; value <= max; value += AXIS_STEP) {
    ticks.push(value)
  }

  return ticks
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const EmptyCanvas = forwardRef<CanvasSurfaceHandle, { isGenerating: boolean }>(
function EmptyCanvas({ isGenerating }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<ViewportTransform>({
    pan: { x: 0, y: 0 },
    scale: 1,
  })

  function zoomFromWheel({ clientX, clientY, deltaY }: CanvasZoomGesture) {
    const container = containerRef.current

    if (!container) return

    setViewport((current) =>
      applyWheelZoom(current, container.getBoundingClientRect(), {
        clientX,
        clientY,
        deltaY,
      }),
    )
  }

  useImperativeHandle(ref, () => ({
    zoomFromWheel,
  }), [])

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey) {
      return
    }

    event.preventDefault()
    zoomFromWheel({
      clientX: event.clientX,
      clientY: event.clientY,
      deltaY: event.deltaY,
    })
  }

  return (
    <CanvasDotGrid
      ref={containerRef}
      onWheel={handleWheel}
      style={
        {
          "--canvas-grid-size": `${GRID_SIZE * viewport.scale}px`,
          "--canvas-grid-x": `calc(50% + ${viewport.pan.x}px)`,
          "--canvas-grid-y": `calc(50% + ${viewport.pan.y}px)`,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 bg-white bg-[radial-gradient(circle,oklch(0.78_0.018_245)_1px,transparent_1px)] bg-[position:var(--canvas-grid-x)_var(--canvas-grid-y)] bg-[length:var(--canvas-grid-size)_var(--canvas-grid-size)]" />
      <div className="flex max-w-sm flex-col items-center px-8 text-center">
        <ImageIcon className="size-12 text-[oklch(0.58_0.16_42)]" />
        <p className="mt-4 text-lg font-semibold">空画布</p>
        <p className="mt-2 text-sm leading-6 text-[oklch(0.42_0.025_245)]">
          配置 API Key 并输入提示词后生成第一张图。接口调用经由本项目服务端代理完成。
        </p>
      </div>

      <GeneratingOverlay isGenerating={isGenerating} />
    </CanvasDotGrid>
  )
})

function applyWheelZoom(
  viewport: ViewportTransform,
  bounds: DOMRect,
  gesture: CanvasZoomGesture,
): ViewportTransform {
  const cursor = {
    x: gesture.clientX - bounds.left - bounds.width / 2,
    y: gesture.clientY - bounds.top - bounds.height / 2,
  }
  const nextScale = clamp(
    viewport.scale * Math.exp(-gesture.deltaY * ZOOM_SENSITIVITY),
    MIN_SCALE,
    MAX_SCALE,
  )
  const scaleRatio = nextScale / viewport.scale

  return {
    scale: nextScale,
    pan: {
      x: cursor.x - (cursor.x - viewport.pan.x) * scaleRatio,
      y: cursor.y - (cursor.y - viewport.pan.y) * scaleRatio,
    },
  }
}

function GeneratingOverlay({ isGenerating }: { isGenerating: boolean }) {
  if (!isGenerating) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-md border border-[oklch(0.78_0.028_75)] bg-white px-4 py-3 text-sm shadow-sm">
        <LoaderCircle className="size-4 animate-spin text-[oklch(0.46_0.08_168)]" />
        正在生成
      </div>
    </div>
  )
}
