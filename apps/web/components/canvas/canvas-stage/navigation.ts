import { useCallback, useEffect, useRef, useState } from "react"

import {
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_SENSITIVITY,
} from "./constants"
import type { CanvasZoomGesture, ViewportTransform } from "./types"

type UseCanvasNavigationResult = {
  handlePanPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handlePanPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  isPanning: boolean
  isSpacePressed: boolean
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>
  stopPan: (event: React.PointerEvent<HTMLDivElement>) => void
  viewport: ViewportTransform
  zoomFromWheel: (gesture: CanvasZoomGesture) => void
}

export function useCanvasNavigation(
  containerRef: React.RefObject<HTMLDivElement | null>
): UseCanvasNavigationResult {
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

  const zoomFromWheel = useCallback(
    ({ clientX, clientY, deltaY }: CanvasZoomGesture) => {
      const container = containerRef.current

      if (!container) return

      setViewport((current) =>
        applyWheelZoom(current, container.getBoundingClientRect(), {
          clientX,
          clientY,
          deltaY,
        })
      )
    },
    [containerRef]
  )

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
