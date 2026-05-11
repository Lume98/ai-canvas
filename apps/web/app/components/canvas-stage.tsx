"use client"

import { useRef, useState } from "react"
import { ImageIcon, LoaderCircle } from "lucide-react"
import Image from "next/image"

import { ImageResult } from "./canvas-types"

type CanvasStageProps = {
  activeResult?: ImageResult
  isGenerating: boolean
}

export function CanvasStage({
  activeResult,
  isGenerating,
}: CanvasStageProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeResult ? (
          <DraggableCanvasImage
            key={activeResult.id}
            activeResult={activeResult}
            isGenerating={isGenerating}
          />
        ) : (
          <EmptyCanvas isGenerating={isGenerating} />
        )}
      </div>
    </section>
  )
}

function DraggableCanvasImage({
  activeResult,
  isGenerating,
}: {
  activeResult: ImageResult
  isGenerating: boolean
}) {
  const dragStartRef = useRef({
    pointerId: -1,
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || dragStartRef.current.pointerId !== event.pointerId) {
      return
    }

    const dragStart = dragStartRef.current

    setPan({
      x: dragStart.panX + event.clientX - dragStart.x,
      y: dragStart.panY + event.clientY - dragStart.y,
    })
  }

  function stopDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartRef.current.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragStartRef.current.pointerId = -1
    setIsDragging(false)
  }

  return (
    <div
      className={[
        canvasSurfaceClass,
        isDragging ? "cursor-grabbing" : "cursor-grab",
      ].join(" ")}
      onPointerCancel={stopDragging}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
        }}
      >
        <Image
          className="pointer-events-none object-contain"
          fill
          draggable={false}
          unoptimized
          src={activeResult.url}
          alt={activeResult.prompt}
        />
      </div>

      <GeneratingOverlay isGenerating={isGenerating} />
    </div>
  )
}

function EmptyCanvas({ isGenerating }: { isGenerating: boolean }) {
  return (
    <div className={canvasSurfaceClass}>
      <div className="flex max-w-sm flex-col items-center px-8 text-center">
        <ImageIcon className="size-12 text-[oklch(0.58_0.16_42)]" />
        <p className="mt-4 text-lg font-semibold">空画布</p>
        <p className="mt-2 text-sm leading-6 text-[oklch(0.42_0.025_245)]">
          配置 API Key 并输入提示词后生成第一张图。接口调用经由本项目服务端代理完成。
        </p>
      </div>

      <GeneratingOverlay isGenerating={isGenerating} />
    </div>
  )
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

const canvasSurfaceClass =
  "relative flex size-full touch-none select-none items-center justify-center overflow-hidden bg-[linear-gradient(45deg,oklch(0.92_0.012_88)_25%,transparent_25%),linear-gradient(-45deg,oklch(0.92_0.012_88)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,oklch(0.92_0.012_88)_75%),linear-gradient(-45deg,transparent_75%,oklch(0.92_0.012_88)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]"
