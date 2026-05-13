"use client"

import { ReactNode } from "react"
import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import { GeneratedImageView } from "./canvas-types"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
  GeneratedImageDisplayVariant,
  ResolvedGeneratedImageInfoPreset,
  getGeneratedImageDisplayPreset,
  resolveGeneratedImageDisplayPreset,
} from "./generated-image-display-presets"

type GeneratedImageCardProps = {
  className?: string
  image: GeneratedImageView
  infoPanel?: ReactNode
  orderBadges?: ReactNode
  variant?: GeneratedImageDisplayVariant
}

type GeneratedImagePresetCardProps = {
  className?: string
  fieldOverrides?: GeneratedImageDisplayFieldOverrides
  image: GeneratedImageView
  preset: GeneratedImageDisplayPresetKey | string
}

type GeneratedImageFrameModel = {
  imageFrameClassName: string
  imageObjectClassName: string
  infoClassName: string
  rootClassName: string
}

const generatedImageFrameModels: Record<
  GeneratedImageDisplayVariant,
  GeneratedImageFrameModel
> = {
  timeline: {
    rootClassName:
      "rounded-md border border-[oklch(0.82_0.018_245)] bg-white shadow-sm",
    imageFrameClassName: "m-2 flex-1 rounded-[6px] bg-[oklch(0.965_0.008_245)]",
    imageObjectClassName: "object-contain",
    infoClassName:
      "border-t border-[oklch(0.9_0.012_245)] bg-white px-3 pt-2.5 pb-3",
  },
  history: {
    rootClassName:
      "rounded-md border border-[oklch(0.8_0.024_75)] bg-white shadow-sm",
    imageFrameClassName:
      "m-1.5 flex-1 rounded-[5px] bg-[oklch(0.965_0.008_245)]",
    imageObjectClassName: "object-contain",
    infoClassName:
      "border-t border-[oklch(0.9_0.014_75)] bg-white px-2.5 pt-2 pb-2.5",
  },
  canvas: {
    rootClassName:
      "rounded-md border border-[oklch(0.82_0.025_245)] bg-white shadow-[0_10px_28px_oklch(0.2_0.025_245/0.12)]",
    imageFrameClassName:
      "m-3 flex-1 rounded-[6px] bg-[linear-gradient(135deg,oklch(0.975_0.006_245)_0%,oklch(0.948_0.01_245)_100%)]",
    imageObjectClassName: "object-contain",
    infoClassName:
      "border-t border-[oklch(0.88_0.016_245)] bg-white px-3.5 pt-2.5 pb-3.5",
  },
}

export function GeneratedImageCard({
  className,
  image,
  infoPanel,
  orderBadges,
  variant = "timeline",
}: GeneratedImageCardProps) {
  const frameModel = generatedImageFrameModels[variant]

  return (
    <figure
      className={cn(
        "group flex h-full min-h-0 w-full flex-col overflow-hidden",
        frameModel.rootClassName,
        className
      )}
    >
      <div
        className={cn(
          "relative min-h-0 overflow-hidden",
          frameModel.imageFrameClassName
        )}
      >
        <Image
          fill
          alt={image.prompt}
          className={frameModel.imageObjectClassName}
          draggable={false}
          sizes="(max-width: 640px) 50vw, 360px"
          src={image.url}
          unoptimized
        />
      </div>

      {orderBadges || infoPanel ? (
        <figcaption className={cn("shrink-0", frameModel.infoClassName)}>
          {orderBadges ? <div>{orderBadges}</div> : null}
          {infoPanel}
        </figcaption>
      ) : null}
    </figure>
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
    fieldOverrides
  )

  return (
    <GeneratedImageCard
      className={className}
      image={image}
      variant={config.variant}
      orderBadges={
        config.showOrderBadges ? (
          <GeneratedImageOrderBadges image={image} variant={config.variant} />
        ) : null
      }
      infoPanel={
        config.infoPanel ? (
          <GeneratedImageInfoPanel
            config={config.infoPanel}
            image={image}
            variant={config.variant}
          />
        ) : null
      }
    />
  )
}

export function GeneratedImageOrderBadges({
  image,
  variant = "timeline",
}: {
  image: GeneratedImageView
  variant?: GeneratedImageDisplayVariant
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Badge variant={variant}>第 {image.generationOrder} 次生成</Badge>
      <Badge subtle variant={variant}>
        图 {image.imageOrder}
      </Badge>
    </div>
  )
}

export function GeneratedImagePromptText({
  image,
  promptLines = 2,
  variant = "timeline",
}: {
  image: GeneratedImageView
  promptLines?: 1 | 2 | 3
  variant?: GeneratedImageDisplayVariant
}) {
  return (
    <p
      className={cn(
        "text-[oklch(0.22_0.022_245)]",
        variant === "canvas"
          ? "text-[13px] leading-5"
          : "text-xs leading-[1.45]",
        promptLines === 1 && "line-clamp-1",
        promptLines === 2 && "line-clamp-2",
        promptLines === 3 && "line-clamp-3"
      )}
    >
      {image.prompt}
    </p>
  )
}

export function GeneratedImageMetaRow({
  items,
  variant = "timeline",
}: {
  items: Array<ReactNode | false | null | undefined>
  variant?: GeneratedImageDisplayVariant
}) {
  const visibleItems = items.filter(Boolean)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        variant === "canvas" ? "mt-2" : "mt-1.5"
      )}
    >
      {visibleItems.map((item, index) => (
        <li
          className={cn(
            "max-w-full rounded-full border bg-[oklch(0.985_0.006_245)]",
            "border-[oklch(0.86_0.018_245)] text-[oklch(0.43_0.025_245)]",
            variant === "canvas"
              ? "px-2 py-1 text-[10px]"
              : "px-1.5 py-0.5 text-[9px]"
          )}
          key={index}
        >
          <span className="truncate">{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function GeneratedImageInfoPanel({
  config,
  image,
  variant = "timeline",
}: {
  config: ResolvedGeneratedImageInfoPreset
  image: GeneratedImageView
  variant?: GeneratedImageDisplayVariant
}) {
  return (
    <div className={variant === "canvas" ? "mt-2" : "mt-1.5"}>
      {config.showPrompt ? (
        <GeneratedImagePromptText
          image={image}
          promptLines={config.promptLines}
          variant={variant}
        />
      ) : null}
      <GeneratedImageMetaRow
        items={[
          config.showDimensions && `${image.width}×${image.height}`,
          config.showSize && image.size,
          config.showQuality && image.quality,
          config.showModel && image.model,
        ]}
        variant={variant}
      />
    </div>
  )
}

function Badge({
  children,
  subtle = false,
  variant = "timeline",
}: {
  children: ReactNode
  subtle?: boolean
  variant?: GeneratedImageDisplayVariant
}) {
  return (
    <span
      className={cn(
        "max-w-full truncate rounded-full border font-medium",
        variant === "canvas"
          ? "px-2 py-1 text-[10px]"
          : "px-1.5 py-0.5 text-[9px]",
        subtle
          ? "border-[oklch(0.82_0.02_245)] bg-[oklch(0.97_0.008_245)] text-[oklch(0.42_0.025_245)]"
          : "border-[oklch(0.68_0.08_168)] bg-[oklch(0.93_0.045_168)] text-[oklch(0.28_0.08_168)]"
      )}
    >
      {children}
    </span>
  )
}
