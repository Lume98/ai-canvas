"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { ImageIcon } from "lucide-react"

import { CanvasDotGrid } from "./canvas-dot-grid"
import {
  ConversationMessage,
} from "@/components/conversation/conversation-types"
import { buildPendingImagePlaceholders } from "@/components/conversation/conversation-placeholders"
import type { CanvasItem } from "@/components/canvas/canvas-types"
import type { ImageAsset } from "@/components/domain/asset-types"
import type {
  GeneratedImageView,
} from "@/components/generated-image/generated-image-types"
import {
  GeneratedImagePlaceholderCard,
  GeneratedImagePresetCard,
} from "@/components/generated-image/generated-image-card"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "@/components/generated-image/generated-image-display-presets"

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const ZOOM_SENSITIVITY = 0.0015
const GRID_SIZE = 22
const MAJOR_GRID_INTERVAL = 5
const AXIS_STEP = 500
const AXIS_VISIBLE_RADIUS = 4200

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

type CanvasSurfaceStyle = React.CSSProperties & {
  "--canvas-grid-size": string
  "--canvas-grid-x": string
  "--canvas-grid-y": string
  "--canvas-major-grid-size": string
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
  pendingMessages?: ConversationMessage[]
  selectedItemId: string | null
  onCanvasItemsChange: React.Dispatch<React.SetStateAction<CanvasItem[]>>
  onAssetSelect?: (asset: ImageAsset) => void
  onSelectedItemChange: (itemId: string | null) => void
}

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
  pendingMessages: ConversationMessage[]
  onCanvasItemsChange: React.Dispatch<React.SetStateAction<CanvasItem[]>>
  onAssetSelect?: (asset: ImageAsset) => void
  onSelectedItemChange: (itemId: string | null) => void
  selectedItemId: string | null
}

const InfiniteCanvas = forwardRef<CanvasSurfaceHandle, InfiniteCanvasProps>(
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
    const pendingPlaceholders = buildPendingImagePlaceholders(pendingMessages)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const itemDragStartRef = useRef({
      itemId: "",
      pointerId: -1,
      x: 0,
      y: 0,
      itemX: 0,
      itemY: 0,
    })
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
    const [isDraggingItem, setIsDraggingItem] = useState(false)

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

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
      handlePanPointerDown(event)
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
                    dragStart.itemX +
                    (event.clientX - dragStart.x) / viewport.scale,
                  y:
                    dragStart.itemY +
                    (event.clientY - dragStart.y) / viewport.scale,
                }
              : item
          )
        )
        return
      }

      handlePanPointerMove(event)
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

      stopPan(event)
    }

    function handleItemPointerDown(
      event: React.PointerEvent<HTMLDivElement>,
      item: CanvasItem
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
          isPanning
            ? "cursor-grabbing"
            : isSpacePressed
              ? "cursor-grab"
              : "cursor-default",
        ].join(" ")}
        onPointerCancel={stopDragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        showBackground={false}
        style={getCanvasSurfaceStyle(viewport)}
      >
        <CanvasSurfaceBackdrop viewport={viewport} />
        <CanvasViewportContent viewport={viewport}>
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
          {pendingPlaceholders.map((placeholder, index) => {
            const placeholderPosition = getPendingPlaceholderPosition(
              canvasItems.length + index,
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
                      ? "任务已进入队列，正在等待执行。"
                      : "结果返回后将自动替换此卡。"
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
          })}
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
    item: CanvasItem
  ) => void
  onAssetSelect?: (asset: ImageAsset) => void
}) {
  return (
    <div
      className={[
        "absolute max-w-none rounded-md border bg-transparent",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        isSelected
          ? "border-[oklch(0.55_0.14_168)] ring-2 ring-[oklch(0.55_0.14_168/0.24)]"
          : "border-transparent",
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
  const worldCenter = {
    x: -viewport.pan.x / viewport.scale,
    y: -viewport.pan.y / viewport.scale,
  }
  const visibleWorldRadius = AXIS_VISIBLE_RADIUS / viewport.scale
  const xTicks = createAxisTicks(
    worldCenter.x - visibleWorldRadius,
    worldCenter.x + visibleWorldRadius
  ).filter((value) => value !== 0)
  const yTicks = createAxisTicks(
    worldCenter.y - visibleWorldRadius,
    worldCenter.y + visibleWorldRadius
  ).filter((value) => value !== 0)

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden text-[10px] font-medium text-[oklch(0.38_0.03_245)]">
      <div
        className="absolute h-px bg-[oklch(0.42_0.08_245/0.48)] shadow-[0_0_0_1px_oklch(1_0_0/0.64)]"
        style={{
          left: 0,
          right: 0,
          top: `calc(50% + ${viewport.pan.y}px)`,
        }}
      />
      <div
        className="absolute w-px bg-[oklch(0.42_0.08_245/0.48)] shadow-[0_0_0_1px_oklch(1_0_0/0.64)]"
        style={{
          bottom: 0,
          left: `calc(50% + ${viewport.pan.x}px)`,
          top: 0,
        }}
      />
      <OriginMarker viewport={viewport} />
      {xTicks.map((value) => (
        <AxisTick
          axis="x"
          key={`x-${value}`}
          scale={viewport.scale}
          value={value}
          viewport={viewport}
        />
      ))}
      {yTicks.map((value) => (
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
        <span className="h-2.5 w-px bg-[oklch(0.42_0.08_245/0.46)]" />
        <span className="rounded-[4px] border border-[oklch(0.86_0.016_245)] bg-white/78 px-1.5 py-0.5 shadow-sm backdrop-blur">
          {value}
        </span>
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
      <span className="rounded-[4px] border border-[oklch(0.86_0.016_245)] bg-white/78 px-1.5 py-0.5 text-right shadow-sm backdrop-blur">
        {value}
      </span>
      <span className="h-px w-2.5 bg-[oklch(0.42_0.08_245/0.46)]" />
    </div>
  )
}

function OriginMarker({ viewport }: { viewport: ViewportTransform }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `calc(50% + ${viewport.pan.x}px)`,
        top: `calc(50% + ${viewport.pan.y}px)`,
      }}
    >
      <span className="block size-2.5 rounded-full border border-white bg-[oklch(0.52_0.13_168)] shadow-[0_0_0_3px_oklch(0.52_0.13_168/0.16)]" />
      <span className="absolute top-2 left-3 rounded-[4px] border border-[oklch(0.78_0.04_168)] bg-white/86 px-1.5 py-0.5 text-[10px] text-[oklch(0.28_0.08_168)] shadow-sm backdrop-blur">
        0,0
      </span>
    </div>
  )
}

function createAxisTicks(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []

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

function getCanvasSurfaceStyle(
  viewport: ViewportTransform
): CanvasSurfaceStyle {
  const gridSize = Math.max(GRID_SIZE * viewport.scale, 4)

  return {
    "--canvas-grid-size": `${gridSize}px`,
    "--canvas-grid-x": `calc(50% + ${viewport.pan.x}px)`,
    "--canvas-grid-y": `calc(50% + ${viewport.pan.y}px)`,
    "--canvas-major-grid-size": `${gridSize * MAJOR_GRID_INTERVAL}px`,
  }
}

function useCanvasNavigation(
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const dragStartRef = useRef({
    pointerId: -1,
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  })
  const [viewport, setViewport] = useState<ViewportTransform>({
    pan: { x: 0, y: 0 },
    scale: 1,
  })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  function zoomFromWheel({ clientX, clientY, deltaY }: CanvasZoomGesture) {
    const container = containerRef.current

    if (!container) return

    setViewport((current) =>
      applyWheelZoom(current, container.getBoundingClientRect(), {
        clientX,
        clientY,
        deltaY,
      })
    )
  }

  useEffect(() => {
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
      setIsPanning(false)
      dragStartRef.current.pointerId = -1
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

  useEffect(() => {
    const container = containerRef.current

    if (!container) return

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      zoomFromWheel({
        clientX: event.clientX,
        clientY: event.clientY,
        deltaY: event.deltaY,
      })
    }

    container.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      container.removeEventListener("wheel", handleWheel)
    }
  }, [containerRef, zoomFromWheel])

  function handlePanPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !isSpacePressed) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: viewport.pan.x,
      panY: viewport.pan.y,
    }
    setIsPanning(true)
  }

  function handlePanPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartRef.current.pointerId !== event.pointerId) return

    const dragStart = dragStartRef.current

    setViewport((current) => ({
      ...current,
      pan: {
        x: dragStart.panX + event.clientX - dragStart.x,
        y: dragStart.panY + event.clientY - dragStart.y,
      },
    }))
  }

  function stopPan(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartRef.current.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragStartRef.current.pointerId = -1
    setIsPanning(false)
  }

  return {
    handlePanPointerDown,
    handlePanPointerMove,
    isPanning,
    isSpacePressed,
    setViewport,
    stopPan,
    viewport,
    zoomFromWheel,
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']")
  )
}

const EmptyCanvas = forwardRef<
  CanvasSurfaceHandle,
  { isGenerating: boolean; pendingMessages: ConversationMessage[] }
>(function EmptyCanvas({ isGenerating, pendingMessages }, ref) {
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
          {pendingPlaceholders.map((placeholder, index) => {
            const position = getPendingPlaceholderPosition(
              index,
              placeholder.size
            )

            return (
              <div
                className="absolute max-w-none"
                key={placeholder.id}
                style={{
                  width: placeholder.size.width,
                  height: placeholder.size.height,
                  transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                }}
              >
                <GeneratedImagePlaceholderCard
                  autoSizeHint={placeholder.isAutoSize}
                  className="h-full w-full"
                  detail={
                    placeholder.status === "pending"
                      ? "首批结果已排队，等待执行。"
                      : "首张结果正在生成，返回后替换此卡。"
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
          })}
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
})

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

function CanvasSurfaceBackdrop({ viewport }: { viewport: ViewportTransform }) {
  return (
    <>
      <div
        className={[
          "absolute inset-0 bg-[oklch(0.992_0.003_245)]",
          "bg-[radial-gradient(circle,oklch(0.78_0.018_245)_1px,transparent_1.25px)]",
          "bg-[position:var(--canvas-grid-x)_var(--canvas-grid-y)]",
          "bg-[length:var(--canvas-grid-size)_var(--canvas-grid-size)]",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-0 opacity-75",
          "bg-[linear-gradient(to_right,oklch(0.73_0.018_245/0.26)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.73_0.018_245/0.26)_1px,transparent_1px)]",
          "bg-[position:var(--canvas-grid-x)_var(--canvas-grid-y)]",
          "bg-[length:var(--canvas-major-grid-size)_var(--canvas-major-grid-size)]",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0_42%,oklch(0.94_0.006_245/0.84)_100%)]"
      />
      <CoordinateOverlay viewport={viewport} />
    </>
  )
}

function CanvasViewportContent({
  children,
  viewport,
}: {
  children: React.ReactNode
  viewport: ViewportTransform
}) {
  return (
    <div
      className="absolute inset-0 z-20 will-change-transform"
      style={{
        transform: `translate3d(${viewport.pan.x}px, ${viewport.pan.y}px, 0) scale(${viewport.scale})`,
        transformOrigin: "center",
      }}
    >
      {children}
    </div>
  )
}

function CanvasZoomBadge({ viewport }: { viewport: ViewportTransform }) {
  return (
    <div className="pointer-events-none absolute top-4 right-4 z-30 flex items-center gap-2 rounded-md border border-[oklch(0.82_0.025_245)] bg-white/90 px-2.5 py-1 text-xs font-medium text-[oklch(0.35_0.025_245)] shadow-sm backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.14_168)]" />
      {Math.round(viewport.scale * 100)}%
    </div>
  )
}

function CanvasGenerationStatus({
  isGenerating,
  pendingPlaceholders,
}: {
  isGenerating: boolean
  pendingPlaceholders: ReturnType<typeof buildPendingImagePlaceholders>
}) {
  if (!isGenerating) return null

  return (
    <div className="pointer-events-none absolute inset-x-6 bottom-8 z-30 flex justify-center">
      <div className="rounded-full border border-[oklch(0.8_0.022_75)] bg-white/90 px-3 py-1.5 text-xs font-medium text-[oklch(0.34_0.025_245)] shadow-sm backdrop-blur">
        {describePendingPlaceholderSummary(pendingPlaceholders)}
      </div>
    </div>
  )
}

function applyWheelZoom(
  viewport: ViewportTransform,
  bounds: DOMRect,
  gesture: CanvasZoomGesture
): ViewportTransform {
  const cursor = {
    x: gesture.clientX - bounds.left - bounds.width / 2,
    y: gesture.clientY - bounds.top - bounds.height / 2,
  }
  const nextScale = clamp(
    viewport.scale * Math.exp(-gesture.deltaY * ZOOM_SENSITIVITY),
    MIN_SCALE,
    MAX_SCALE
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

function getPendingPlaceholderPosition(
  itemCount: number,
  size: { width: number; height: number }
) {
  return getNextGridPosition(itemCount, size)
}

function describePendingPlaceholderSummary(
  pendingPlaceholders: ReturnType<typeof buildPendingImagePlaceholders>
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

function getNextGridPosition(
  itemCount: number,
  size: { width: number; height: number }
) {
  const gap = 180
  const columns = 3
  const baseCellSize = 520
  const column = itemCount % columns
  const row = Math.floor(itemCount / columns)
  const cellWidth = baseCellSize + gap
  const cellHeight = baseCellSize + gap
  const x = column * cellWidth - ((columns - 1) * cellWidth) / 2
  const y = row * cellHeight

  return {
    x: x - size.width / 2,
    y: y - size.height / 2,
  }
}
