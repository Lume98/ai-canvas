import { useRef, useState } from "react"

import type { CanvasItem } from "@/components/canvas/canvas-types"

type UseCanvasItemDragParams = {
  isSpacePressed: boolean
  onCanvasItemsChange: React.Dispatch<React.SetStateAction<CanvasItem[]>>
  onSelectedItemChange: (itemId: string | null) => void
  onPanPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onStopPan: (event: React.PointerEvent<HTMLDivElement>) => void
  viewportScale: number
}

type UseCanvasItemDragResult = {
  handleItemPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    item: CanvasItem
  ) => void
  handleStagePointerEnd: (event: React.PointerEvent<HTMLDivElement>) => void
  handleStagePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  isDraggingItem: boolean
}

export function useCanvasItemDrag({
  isSpacePressed,
  onCanvasItemsChange,
  onSelectedItemChange,
  onPanPointerMove,
  onStopPan,
  viewportScale,
}: UseCanvasItemDragParams): UseCanvasItemDragResult {
  const itemDragStartRef = useRef({
    itemId: "",
    pointerId: -1,
    x: 0,
    y: 0,
    itemX: 0,
    itemY: 0,
  })
  const [isDraggingItem, setIsDraggingItem] = useState(false)

  function handleStagePointerMove(event: React.PointerEvent<HTMLDivElement>) {
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
                x: dragStart.itemX + (event.clientX - dragStart.x) / viewportScale,
                y: dragStart.itemY + (event.clientY - dragStart.y) / viewportScale,
              }
            : item
        )
      )
      return
    }

    onPanPointerMove(event)
  }

  function handleStagePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (itemDragStartRef.current.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      itemDragStartRef.current.pointerId = -1
      itemDragStartRef.current.itemId = ""
      setIsDraggingItem(false)
      return
    }

    onStopPan(event)
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

  return {
    handleItemPointerDown,
    handleStagePointerEnd,
    handleStagePointerMove,
    isDraggingItem,
  }
}
