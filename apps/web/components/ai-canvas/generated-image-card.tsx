"use client"

import { ReactNode } from "react"
import Image from "next/image"
import { CircleDashed, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import {
  PendingImagePlaceholder,
  GeneratedImageView,
} from "./canvas-types"
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

export function GeneratedImagePlaceholderCard({
  autoSizeHint = false,
  className,
  detail,
  indexLabel,
  model,
  prompt,
  quality,
  ratio = "1 / 1",
  size,
  status = "running",
  title = "图像占位",
  variant = "timeline",
}: {
  autoSizeHint?: boolean
  className?: string
  detail?: string
  indexLabel?: string
  model?: string
  prompt?: string | null
  quality?: string
  ratio?: string
  size?: string
  status?: PendingImagePlaceholder["status"]
  title?: string
  variant?: GeneratedImageDisplayVariant
}) {
  const frameModel = generatedImageFrameModels[variant]
  const isRunning = status === "running"
  const statusLabel = isRunning ? "生成中" : "排队中"
  const detailText =
    detail ??
    (isRunning ? "正在合成最终图像，返回后自动替换。" : "任务已进入队列，等待执行。")

  return (
    <figure
      aria-busy="true"
      aria-label={title}
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
        style={{ aspectRatio: ratio }}
      >
        <div
          className={cn(
            "absolute inset-0",
            isRunning
              ? "bg-[linear-gradient(135deg,oklch(0.975_0.016_170)_0%,oklch(0.94_0.026_168)_52%,oklch(0.975_0.012_170)_100%)]"
              : "bg-[linear-gradient(135deg,oklch(0.986_0.012_92)_0%,oklch(0.954_0.022_88)_52%,oklch(0.986_0.012_92)_100%)]"
          )}
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_18%,oklch(1_0_0_/_0.68)_46%,transparent_72%)] bg-[length:220%_100%] animate-[canvas-shimmer_2.8s_linear_infinite]" />
        <div className="absolute inset-[7%] rounded-[10px] border border-white/70 bg-white/18 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.5)] backdrop-blur-[1px]" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur",
              isRunning
                ? "border-[oklch(0.72_0.06_168)] bg-white/90 text-[oklch(0.28_0.08_168)]"
                : "border-[oklch(0.78_0.04_88)] bg-white/90 text-[oklch(0.36_0.06_82)]"
            )}
          >
            {isRunning ? (
              <LoaderCircle className="size-3 animate-spin text-[oklch(0.46_0.08_168)]" />
            ) : (
              <CircleDashed className="size-3 text-[oklch(0.52_0.07_82)]" />
            )}
            {statusLabel}
          </span>
          {indexLabel ? (
            <span className="rounded-full border border-white/70 bg-white/74 px-2 py-1 text-[10px] font-medium text-[oklch(0.38_0.03_245)] shadow-sm">
              {indexLabel}
            </span>
          ) : (
            <Sparkles
              className={cn(
                "size-4",
                isRunning
                  ? "text-[oklch(0.55_0.1_168)]"
                  : "text-[oklch(0.62_0.11_82)]"
              )}
            />
          )}
        </div>
        <div className="absolute inset-x-4 bottom-4 space-y-2.5">
          <div className="h-2.5 w-3/4 rounded-full bg-white/84" />
          <div className="h-2.5 w-1/2 rounded-full bg-white/66" />
          <div className="flex gap-1.5">
            <div className="h-6 w-[4.5rem] rounded-full bg-white/58" />
            <div className="h-6 w-[3.5rem] rounded-full bg-white/46" />
            <div className="h-6 w-[5rem] rounded-full bg-white/34" />
          </div>
        </div>
      </div>

      <figcaption className={cn("shrink-0", frameModel.infoClassName)}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex max-w-full truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
              isRunning
                ? "border-[oklch(0.68_0.08_168)] bg-[oklch(0.93_0.045_168)] text-[oklch(0.28_0.08_168)]"
                : "border-[oklch(0.76_0.045_82)] bg-[oklch(0.95_0.03_88)] text-[oklch(0.34_0.06_82)]"
            )}
          >
            结果预占位
          </span>
          <span className="text-[10px] text-[oklch(0.48_0.025_245)]">{detailText}</span>
        </div>
        <div className={variant === "canvas" ? "mt-2" : "mt-1.5"}>
          <p
            className={cn(
              "line-clamp-2 text-[oklch(0.22_0.022_245)]",
              variant === "canvas"
                ? "text-[13px] leading-5"
                : "text-xs leading-[1.45]"
            )}
          >
            {prompt?.trim() || "结果生成后将自动替换此占位内容。"}
          </p>
          <GeneratedImageMetaRow
            items={[
              size && (autoSizeHint ? `${size} · 比例待定` : size),
              quality,
              model,
            ]}
            variant={variant}
          />
        </div>
      </figcaption>
    </figure>
  )
}

export function FailedGeneratedImageCard({
  autoSizeHint = false,
  className,
  errorMessage,
  model,
  prompt,
  quality,
  ratio = "1 / 1",
  size,
  title = "生成失败",
  variant = "timeline",
}: {
  autoSizeHint?: boolean
  className?: string
  errorMessage: string
  model?: string
  prompt?: string | null
  quality?: string
  ratio?: string
  size?: string
  title?: string
  variant?: GeneratedImageDisplayVariant
}) {
  const frameModel = generatedImageFrameModels[variant]

  return (
    <figure
      aria-label={title}
      className={cn(
        "group flex h-full min-h-0 w-full flex-col overflow-hidden",
        frameModel.rootClassName,
        "border-[oklch(0.8_0.07_28)] bg-[oklch(0.995_0.01_28)]",
        className
      )}
    >
      <div
        className={cn(
          "relative min-h-0 overflow-hidden",
          frameModel.imageFrameClassName
        )}
        style={{ aspectRatio: ratio }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,oklch(0.985_0.018_28)_0%,oklch(0.95_0.038_24)_52%,oklch(0.985_0.018_28)_100%)]" />
        <div className="absolute inset-[7%] rounded-[10px] border border-white/55 bg-white/18 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.35)] backdrop-blur-[1px]" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.72_0.12_28)] bg-white/92 px-2 py-1 text-[10px] font-medium text-[oklch(0.4_0.14_28)] shadow-sm backdrop-blur">
            <TriangleAlert className="size-3 text-[oklch(0.52_0.17_28)]" />
            生成失败
          </span>
          <span className="rounded-full border border-white/65 bg-white/78 px-2 py-1 text-[10px] font-medium text-[oklch(0.42_0.04_28)] shadow-sm">
            待重试
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4 rounded-xl border border-[oklch(0.8_0.06_28/0.7)] bg-white/74 px-3 py-2 text-[11px] leading-5 text-[oklch(0.38_0.12_28)] shadow-sm backdrop-blur">
          {errorMessage}
        </div>
      </div>

      <figcaption className={cn("shrink-0", frameModel.infoClassName)}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex max-w-full truncate rounded-full border border-[oklch(0.78_0.06_28)] bg-[oklch(0.95_0.03_28)] px-1.5 py-0.5 text-[9px] font-medium text-[oklch(0.36_0.12_28)]">
            失败结果卡
          </span>
          <span className="text-[10px] text-[oklch(0.52_0.05_28)]">
            任务未产出图片
          </span>
        </div>
        <div className={variant === "canvas" ? "mt-2" : "mt-1.5"}>
          <p
            className={cn(
              "line-clamp-2 text-[oklch(0.24_0.03_28)]",
              variant === "canvas"
                ? "text-[13px] leading-5"
                : "text-xs leading-[1.45]"
            )}
          >
            {prompt?.trim() || "本轮任务执行失败，可回填参数后重试。"}
          </p>
          <GeneratedImageMetaRow
            items={[
              size && (autoSizeHint ? `${size} · 比例待定` : size),
              quality,
              model,
            ]}
            variant={variant}
          />
        </div>
      </figcaption>
    </figure>
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
