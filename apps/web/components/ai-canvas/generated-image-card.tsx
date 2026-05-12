"use client"

import { ReactNode } from "react"
import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import { GeneratedImageView } from "./canvas-types"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
  getGeneratedImageDisplayPreset,
  resolveGeneratedImageDisplayPreset,
} from "./generated-image-display-presets"

type GeneratedImageCardProps = {
  className?: string
  image: GeneratedImageView
  bottomOverlay?: ReactNode
  topOverlay?: ReactNode
  variant?: GeneratedImageDisplayPresetKey
}

type GeneratedImagePresetCardProps = {
  className?: string
  fieldOverrides?: GeneratedImageDisplayFieldOverrides
  image: GeneratedImageView
  preset: GeneratedImageDisplayPresetKey | string
}

export function GeneratedImageCard({
  bottomOverlay,
  className,
  image,
  topOverlay,
  variant = "timeline",
}: GeneratedImageCardProps) {
  const compact = variant === "history"
  const canvas = variant === "canvas"

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        canvas
          ? "rounded-[inherit] bg-[oklch(0.96_0.008_245)]"
          : "rounded-[inherit] bg-[linear-gradient(180deg,oklch(0.992_0.006_245)_0%,oklch(0.972_0.01_245)_100%)]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0",
          !canvas && "transition duration-300 group-hover:scale-[1.03]",
        )}
      >
        <Image
          fill
          alt={image.prompt}
          className={cn(
            canvas ? "object-contain" : "object-cover",
            compact && "object-cover",
          )}
          draggable={false}
          src={image.url}
          unoptimized
        />
      </div>

      {topOverlay ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 p-2.5">
          {topOverlay}
        </div>
      ) : null}

      {bottomOverlay ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent_0%,oklch(0.14_0.015_245/0.88)_36%,oklch(0.14_0.015_245/0.94)_100%)] p-3 text-white",
            compact && "p-2.5",
            canvas && "p-4",
          )}
        >
          {bottomOverlay}
        </div>
      ) : null}
    </div>
  )
}

export function GeneratedImagePresetCard({
  className,
  fieldOverrides,
  image,
  preset,
}: GeneratedImagePresetCardProps) {
  const config = resolveGeneratedImageDisplayPreset(
    getGeneratedImageDisplayPreset(preset),
    fieldOverrides,
  )

  return (
    <GeneratedImageCard
      className={className}
      image={image}
      variant={config.variant}
      topOverlay={
        config.showOrderBadges ? <GeneratedImageOrderBadges image={image} /> : null
      }
      bottomOverlay={
        config.bottomOverlay ? (
          <GeneratedImageDefaultBottomOverlay
            image={image}
            {...config.bottomOverlay}
          />
        ) : null
      }
    />
  )
}

export function GeneratedImageOrderBadges({
  image,
}: {
  image: GeneratedImageView
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <Badge>第 {image.generationOrder} 次生成</Badge>
      <Badge subtle>图 {image.imageOrder}</Badge>
    </div>
  )
}

export function GeneratedImagePromptOverlay({
  image,
  promptLines = 2,
}: {
  image: GeneratedImageView
  promptLines?: 2 | 3
}) {
  return (
    <div>
      <p
        className={cn(
          "text-xs leading-5 text-white/92",
          promptLines === 2 ? "line-clamp-2" : "line-clamp-3 text-[13px]",
        )}
      >
        {image.prompt}
      </p>
    </div>
  )
}

export function GeneratedImageMetaRow({
  items,
}: {
  items: Array<ReactNode | false | null | undefined>
}) {
  const visibleItems = items.filter(Boolean)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/72">
      {visibleItems.map((item, index) => (
        <span key={index}>{item}</span>
      ))}
    </div>
  )
}

export function GeneratedImageDefaultBottomOverlay({
  image,
  promptLines = 2,
  showModel = true,
  showPrompt = true,
  showQuality = false,
  showSize = false,
  showDimensions = true,
}: {
  image: GeneratedImageView
  promptLines?: 2 | 3
  showDimensions?: boolean
  showModel?: boolean
  showPrompt?: boolean
  showQuality?: boolean
  showSize?: boolean
}) {
  return (
    <div>
      {showPrompt ? (
        <GeneratedImagePromptOverlay image={image} promptLines={promptLines} />
      ) : null}
      <GeneratedImageMetaRow
        items={[
          showDimensions && `${image.width}×${image.height}`,
          showSize && image.size,
          showQuality && image.quality,
          showModel && image.model,
        ]}
      />
    </div>
  )
}

function Badge({
  children,
  subtle = false,
}: {
  children: ReactNode
  subtle?: boolean
}) {
  return (
    <span
      className={cn(
        "rounded-full border border-white/65 px-2 py-1 text-[10px] backdrop-blur-md",
        subtle
          ? "bg-[oklch(0.18_0.018_245/0.6)] font-medium text-white/92"
          : "bg-[oklch(0.18_0.018_245/0.72)] font-semibold tracking-[0.08em] text-white",
      )}
    >
      {children}
    </span>
  )
}
