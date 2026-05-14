"use client"

import type { PointerEvent } from "react"

import type { CanvasItem } from "@/components/canvas/canvas-types"
import type { ImageAsset } from "@/components/domain/asset-types"
import {
  GeneratedImagePresetCard,
} from "@/components/generated-image/generated-image-card"
import type {
  GeneratedImageView,
} from "@/components/generated-image/generated-image-types"
import type {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "@/components/generated-image/generated-image-display-presets"

type CanvasImageItemProps = {
  image: GeneratedImageView
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  isDragging: boolean
  isSelected: boolean
  item: CanvasItem
  onPointerDown: (event: PointerEvent<HTMLDivElement>, item: CanvasItem) => void
  onAssetSelect?: (asset: ImageAsset) => void
}

export function CanvasImageItem({
  image,
  imageDisplayFields,
  imageDisplayPreset,
  isDragging,
  isSelected,
  item,
  onPointerDown,
  onAssetSelect,
}: CanvasImageItemProps) {
  return (
    <div
      className={[
        "absolute z-10 max-w-none rounded-md border bg-transparent",
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
