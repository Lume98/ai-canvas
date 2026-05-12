"use client"

import {
  LoaderCircle,
  MessageSquareQuote,
  PencilLine,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react"

import {
  ConversationMessage,
  DrawTaskRecord,
  GeneratedImageView,
  ImageAsset,
} from "./canvas-types"
import { GeneratedImagePresetCard } from "./generated-image-card"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "./generated-image-display-presets"

type ConversationTimelineProps = {
  className?: string
  imagesByMessageId: Record<string, GeneratedImageView[]>
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  variant?: "docked" | "panel"
  isBusy: boolean
  isLoading: boolean
  messages: ConversationMessage[]
  selectedMessageId: string | null
  onAssetSelect: (asset: ImageAsset) => void
  onMessageSelect: (message: ConversationMessage) => void
  onRetryTask: (task: DrawTaskRecord) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
}

export function ConversationTimeline({
  className,
  imagesByMessageId,
  imageDisplayFields,
  imageDisplayPreset,
  isBusy,
  isLoading,
  messages,
  selectedMessageId,
  variant = "docked",
  onAssetSelect,
  onMessageSelect,
  onRetryTask,
  onUseTaskAsDraft,
}: ConversationTimelineProps) {
  const containerClassName = [
    "flex h-full min-h-0 w-full flex-col overflow-hidden bg-[linear-gradient(180deg,oklch(0.985_0.01_92)_0%,oklch(0.972_0.012_92)_100%)]",
    variant === "docked"
      ? "max-w-[360px] border-r border-[oklch(0.84_0.018_240)]"
      : "max-w-none",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <aside className={containerClassName}>
      <header className="shrink-0 border-b border-[oklch(0.83_0.02_82)] bg-white/70 px-5 py-5 backdrop-blur">
        <p className="text-[10px] font-semibold tracking-[0.24em] text-[oklch(0.46_0.08_168)] uppercase">
          Conversation
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl tracking-[-0.03em] text-[oklch(0.2_0.02_245)]">
              当前出图会话
            </h2>
            <p className="mt-1 text-xs leading-5 text-[oklch(0.44_0.02_245)]">
              每轮提示词、任务状态与结果都在这里聚合。
            </p>
          </div>
          <div className="rounded-full border border-[oklch(0.8_0.022_75)] bg-white px-3 py-1 text-[11px] font-medium text-[oklch(0.34_0.025_245)] shadow-sm">
            {messages.length} 条
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyTimeline isLoading={isLoading} />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageCard
                images={imagesByMessageId[message.id] ?? []}
                imageDisplayFields={imageDisplayFields}
                imageDisplayPreset={imageDisplayPreset}
                isBusy={isBusy}
                key={message.id}
                isSelected={selectedMessageId === message.id}
                message={message}
                onAssetSelect={onAssetSelect}
                onMessageSelect={onMessageSelect}
                onRetryTask={onRetryTask}
                onUseTaskAsDraft={onUseTaskAsDraft}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function MessageCard({
  images,
  imageDisplayFields,
  imageDisplayPreset,
  isBusy,
  isSelected,
  message,
  onAssetSelect,
  onMessageSelect,
  onRetryTask,
  onUseTaskAsDraft,
}: {
  images: GeneratedImageView[]
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  isBusy: boolean
  isSelected: boolean
  message: ConversationMessage
  onAssetSelect: (asset: ImageAsset) => void
  onMessageSelect: (message: ConversationMessage) => void
  onRetryTask: (task: DrawTaskRecord) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
}) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const cardClassName = [
    "rounded-[22px] border px-4 py-4 text-left shadow-sm transition",
    isUser
      ? "border-[oklch(0.73_0.04_72)] bg-[linear-gradient(180deg,oklch(0.985_0.02_88)_0%,oklch(0.965_0.022_90)_100%)]"
      : "border-[oklch(0.82_0.016_245)] bg-white/88 backdrop-blur",
    isSelected
      ? "ring-2 ring-[oklch(0.55_0.14_168/0.22)] border-[oklch(0.55_0.14_168)]"
      : "hover:border-[oklch(0.65_0.06_168)]",
  ].join(" ")

  return (
    <article className={cardClassName}>
      <button
        className="block w-full text-left"
        type="button"
        onClick={() => onMessageSelect(message)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={[
                "flex size-8 items-center justify-center rounded-full border",
                isUser
                  ? "border-[oklch(0.72_0.04_72)] bg-[oklch(0.97_0.018_88)] text-[oklch(0.45_0.05_68)]"
                  : "border-[oklch(0.83_0.02_245)] bg-[oklch(0.97_0.008_245)] text-[oklch(0.42_0.04_245)]",
              ].join(" ")}
            >
              {isUser ? (
                <MessageSquareQuote className="size-4" />
              ) : message.status === "failed" ? (
                <TriangleAlert className="size-4" />
              ) : message.status === "pending" || message.status === "running" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[oklch(0.42_0.03_245)] uppercase">
                {isUser ? "Prompt" : "Result"}
              </p>
              <p className="mt-0.5 text-[11px] text-[oklch(0.5_0.02_245)]">
                {formatStatusLabel(message)}
              </p>
            </div>
          </div>

          <p className="shrink-0 text-[11px] text-[oklch(0.56_0.02_245)]">
            #{message.sortOrder ?? "?"}
          </p>
        </div>

        {message.text ? (
          <p className="mt-3 text-sm leading-6 text-[oklch(0.24_0.022_245)]">
            {message.text}
          </p>
        ) : null}
      </button>

      {isAssistant && message.task ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton
            disabled={isBusy}
            icon={RotateCcw}
            label="重试本轮"
            onClick={() => onRetryTask(message.task!)}
          />
          <ActionButton
            disabled={false}
            icon={PencilLine}
            label="回填参数"
            onClick={() => onUseTaskAsDraft(message.task!)}
          />
        </div>
      ) : null}

      {isAssistant ? (
        <AssistantMessageBody
          images={images}
          imageDisplayFields={imageDisplayFields}
          imageDisplayPreset={imageDisplayPreset}
          message={message}
          onAssetSelect={onAssetSelect}
        />
      ) : null}
    </article>
  )
}

function ActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  disabled: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.81_0.018_245)] bg-[oklch(0.985_0.008_245)] px-3 py-1.5 text-[11px] font-medium text-[oklch(0.3_0.02_245)] transition hover:border-[oklch(0.55_0.12_168)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function AssistantMessageBody({
  message,
  images,
  imageDisplayFields,
  imageDisplayPreset,
  onAssetSelect,
}: {
  message: ConversationMessage
  images: GeneratedImageView[]
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  onAssetSelect: (asset: ImageAsset) => void
}) {
  if (message.status === "failed") {
    return (
      <div className="mt-3 rounded-2xl border border-[oklch(0.82_0.06_28)] bg-[oklch(0.97_0.03_28)] px-3 py-2 text-xs leading-5 text-[oklch(0.4_0.12_28)]">
        {message.task?.errorMessage || "任务执行失败。"}
      </div>
    )
  }

  if (message.status === "pending" || message.status === "running") {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-[oklch(0.8_0.02_245)] bg-[oklch(0.985_0.006_245)] px-3 py-3 text-xs leading-5 text-[oklch(0.44_0.02_245)]">
        正在生成图像，结果会自动回填到这条消息。
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-[oklch(0.8_0.02_245)] bg-[oklch(0.985_0.006_245)] px-3 py-3 text-xs leading-5 text-[oklch(0.44_0.02_245)]">
        此轮没有返回可展示图片。
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[oklch(0.44_0.03_245)] uppercase">
          Assets
        </p>
        <p className="text-[11px] text-[oklch(0.54_0.02_245)]">
          {images.length} 张
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {images.map((image) => (
          <button
            key={image.id}
            className="group overflow-hidden rounded-2xl border border-[oklch(0.82_0.018_245)] bg-[oklch(0.985_0.008_245)] shadow-sm transition hover:-translate-y-0.5 hover:border-[oklch(0.55_0.12_168)]"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onAssetSelect(image.asset)
            }}
          >
            <div className="relative aspect-[4/4] overflow-hidden">
              <GeneratedImagePresetCard
                fieldOverrides={imageDisplayFields}
                image={image}
                preset={imageDisplayPreset}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyTimeline({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[oklch(0.8_0.02_245)] bg-white/65 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-[oklch(0.82_0.02_245)] bg-[oklch(0.985_0.008_245)] text-[oklch(0.45_0.05_168)]">
        {isLoading ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <Sparkles className="size-5" />
        )}
      </div>
      <p className="mt-4 font-serif text-xl tracking-[-0.03em] text-[oklch(0.22_0.02_245)]">
        {isLoading ? "正在载入会话" : "还没有消息"}
      </p>
      <p className="mt-2 text-sm leading-6 text-[oklch(0.44_0.02_245)]">
        {isLoading
          ? "正在恢复当前会话与任务状态。"
          : "发送第一条提示词后，这里会展示每轮输入与对应的图片结果。"}
      </p>
    </div>
  )
}

function formatStatusLabel(message: ConversationMessage) {
  if (message.role === "user") {
    return "用户输入"
  }

  if (message.status === "pending") {
    return "等待执行"
  }

  if (message.status === "running") {
    return "生成中"
  }

  if (message.status === "failed") {
    return "生成失败"
  }

  return "结果已返回"
}
