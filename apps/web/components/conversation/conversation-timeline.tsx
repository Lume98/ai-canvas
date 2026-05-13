"use client"

import {
  GitBranchPlus,
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
} from "@/components/conversation/conversation-types"
import {
  buildFailedImagePlaceholderForMessage,
  buildPendingImagePlaceholdersForMessage,
} from "@/components/conversation/conversation-placeholders"
import type { ImageAsset } from "@/components/domain/asset-types"
import {
  GeneratedImageView,
} from "@/components/generated-image/generated-image-types"
import {
  FailedGeneratedImageCard,
  GeneratedImagePlaceholderCard,
  GeneratedImagePresetCard,
} from "@/components/generated-image/generated-image-card"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "@/components/generated-image/generated-image-display-presets"

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
  onUseAssetAsGenerationSource: (asset: ImageAsset) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
}

type MessageStatusPresentation = {
  actionAvailability: {
    retry: boolean
    useDraft: boolean
  }
  accentTextClassName: string
  assetStatusLabel: string
  icon: React.ComponentType<{ className?: string }>
  iconContainerClassName: string
  iconClassName?: string
  kindLabel: string
  statusLabel: string
}

type AssistantBodyContext = {
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  images: GeneratedImageView[]
  message: ConversationMessage
  onAssetSelect: (asset: ImageAsset) => void
  onUseAssetAsGenerationSource: (asset: ImageAsset) => void
  presentation: MessageStatusPresentation
}

const assistantStatusPresentations: Record<
  Exclude<ConversationMessage["status"], "failed"> | "failed",
  MessageStatusPresentation
> = {
  pending: {
    actionAvailability: {
      retry: false,
      useDraft: true,
    },
    accentTextClassName: "text-[oklch(0.48_0.05_82)]",
    assetStatusLabel: "等待执行",
    icon: LoaderCircle,
    iconClassName: "animate-spin",
    iconContainerClassName:
      "border-[oklch(0.8_0.03_88)] bg-[oklch(0.978_0.012_92)] text-[oklch(0.45_0.06_82)]",
    kindLabel: "Result",
    statusLabel: "等待执行",
  },
  running: {
    actionAvailability: {
      retry: false,
      useDraft: true,
    },
    accentTextClassName: "text-[oklch(0.46_0.08_168)]",
    assetStatusLabel: "正在生成",
    icon: LoaderCircle,
    iconClassName: "animate-spin",
    iconContainerClassName:
      "border-[oklch(0.78_0.035_168)] bg-[oklch(0.968_0.02_168)] text-[oklch(0.42_0.08_168)]",
    kindLabel: "Result",
    statusLabel: "生成中",
  },
  failed: {
    actionAvailability: {
      retry: true,
      useDraft: true,
    },
    accentTextClassName: "text-[oklch(0.5_0.08_28)]",
    assetStatusLabel: "失败",
    icon: TriangleAlert,
    iconContainerClassName:
      "border-[oklch(0.78_0.08_28)] bg-[oklch(0.975_0.022_28)] text-[oklch(0.42_0.14_28)]",
    kindLabel: "Result",
    statusLabel: "生成失败",
  },
  succeeded: {
    actionAvailability: {
      retry: true,
      useDraft: true,
    },
    accentTextClassName: "text-[oklch(0.44_0.03_245)]",
    assetStatusLabel: "结果已返回",
    icon: Sparkles,
    iconContainerClassName:
      "border-[oklch(0.83_0.02_245)] bg-[oklch(0.97_0.008_245)] text-[oklch(0.42_0.04_245)]",
    kindLabel: "Result",
    statusLabel: "结果已返回",
  },
}

const userMessagePresentation: MessageStatusPresentation = {
  actionAvailability: {
    retry: false,
    useDraft: false,
  },
  accentTextClassName: "text-[oklch(0.42_0.03_245)]",
  assetStatusLabel: "",
  icon: MessageSquareQuote,
  iconContainerClassName:
    "border-[oklch(0.72_0.04_72)] bg-[oklch(0.97_0.018_88)] text-[oklch(0.45_0.05_68)]",
  kindLabel: "Prompt",
  statusLabel: "用户输入",
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
  onUseAssetAsGenerationSource,
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
                onUseAssetAsGenerationSource={onUseAssetAsGenerationSource}
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
  onUseAssetAsGenerationSource,
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
  onUseAssetAsGenerationSource: (asset: ImageAsset) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
}) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const presentation = getMessageStatusPresentation(message)
  const HeaderIcon = presentation.icon
  const isRetryDisabled = isBusy || !presentation.actionAvailability.retry
  const isUseDraftDisabled = !presentation.actionAvailability.useDraft
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
                presentation.iconContainerClassName,
              ].join(" ")}
            >
              <HeaderIcon
                className={[
                  "size-4",
                  presentation.iconClassName ?? "",
                ].join(" ")}
              />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-[oklch(0.42_0.03_245)] uppercase">
                {presentation.kindLabel}
              </p>
              <p className={["mt-0.5 text-[11px]", presentation.accentTextClassName].join(" ")}>
                {presentation.statusLabel}
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
            disabled={isRetryDisabled}
            icon={RotateCcw}
            label="重试本轮"
            onClick={() => onRetryTask(message.task!)}
          />
          <ActionButton
            disabled={isUseDraftDisabled}
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
          onUseAssetAsGenerationSource={onUseAssetAsGenerationSource}
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
  onUseAssetAsGenerationSource,
}: {
  message: ConversationMessage
  images: GeneratedImageView[]
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  onAssetSelect: (asset: ImageAsset) => void
  onUseAssetAsGenerationSource: (asset: ImageAsset) => void
}) {
  const presentation = getMessageStatusPresentation(message)
  const context: AssistantBodyContext = {
    imageDisplayFields,
    imageDisplayPreset,
    images,
    message,
    onAssetSelect,
    onUseAssetAsGenerationSource,
    presentation,
  }

  return renderAssistantBodyByStatus(context)
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

function getMessageStatusPresentation(
  message: ConversationMessage,
): MessageStatusPresentation {
  if (message.role === "user") {
    return userMessagePresentation
  }

  return assistantStatusPresentations[message.status]
}

function renderAssistantBodyByStatus(context: AssistantBodyContext) {
  const renderer = assistantBodyRenderers[context.message.status]

  return renderer(context)
}

const assistantBodyRenderers: Record<
  ConversationMessage["status"],
  (context: AssistantBodyContext) => React.ReactNode
> = {
  pending: renderPendingAssistantBody,
  running: renderPendingAssistantBody,
  failed: renderFailedAssistantBody,
  succeeded: renderSucceededAssistantBody,
}

function renderFailedAssistantBody({
  message,
  presentation,
}: AssistantBodyContext) {
  const failedPlaceholder = buildFailedImagePlaceholderForMessage(message)

  if (!failedPlaceholder) {
    return null
  }

  return (
    <div className="mt-4 space-y-3">
      <AssistantAssetsHeader
        accentTextClassName={presentation.accentTextClassName}
        statusLabel={presentation.assetStatusLabel}
      />
      <FailedGeneratedImageCard
        autoSizeHint={failedPlaceholder.isAutoSize}
        errorMessage={failedPlaceholder.errorMessage}
        model={failedPlaceholder.model}
        prompt={failedPlaceholder.prompt}
        quality={failedPlaceholder.quality}
        ratio={failedPlaceholder.ratio}
        size={failedPlaceholder.sizeLabel}
        title={failedPlaceholder.title}
        variant="timeline"
      />
    </div>
  )
}

function renderPendingAssistantBody({
  message,
  presentation,
}: AssistantBodyContext) {
  const placeholders = buildPendingImagePlaceholdersForMessage(message)

  return (
    <div className="mt-4 space-y-3">
      <AssistantAssetsHeader
        accentTextClassName={presentation.accentTextClassName}
        statusLabel={presentation.assetStatusLabel}
      />
      <div className="grid grid-cols-2 gap-2">
        {placeholders.map((placeholder) => (
          <GeneratedImagePlaceholderCard
            autoSizeHint={placeholder.isAutoSize}
            detail={placeholder.detail}
            indexLabel={placeholder.indexLabel}
            key={placeholder.id}
            model={placeholder.model}
            prompt={placeholder.prompt}
            quality={placeholder.quality}
            ratio={placeholder.ratio}
            size={placeholder.sizeLabel}
            status={placeholder.status}
            title={placeholder.title}
            variant="timeline"
          />
        ))}
      </div>
    </div>
  )
}

function renderSucceededAssistantBody({
  imageDisplayFields,
  imageDisplayPreset,
  images,
  onAssetSelect,
  onUseAssetAsGenerationSource,
}: AssistantBodyContext) {
  if (images.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-[oklch(0.8_0.02_245)] bg-[oklch(0.985_0.006_245)] px-3 py-3 text-xs leading-5 text-[oklch(0.44_0.02_245)]">
        此轮没有返回可展示图片。
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <AssistantAssetsHeader statusLabel={`${images.length} 张`} />
      <div className="grid grid-cols-2 gap-2">
        {images.map((image) => (
          <div className="space-y-1.5" key={image.id}>
            <button
              className="group block w-full rounded-md text-left transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[oklch(0.55_0.14_168/0.28)] focus-visible:outline-none"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onAssetSelect(image.asset)
              }}
            >
              <div className="relative aspect-square">
                <GeneratedImagePresetCard
                  fieldOverrides={imageDisplayFields}
                  image={image}
                  preset={imageDisplayPreset}
                />
              </div>
            </button>
            <button
              className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-[oklch(0.8_0.03_168)] bg-[oklch(0.97_0.015_168)] px-2 py-1.5 text-[11px] font-medium text-[oklch(0.28_0.07_168)] transition hover:border-[oklch(0.55_0.12_168)] hover:bg-white"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onUseAssetAsGenerationSource(image.asset)
              }}
            >
              <GitBranchPlus className="size-3.5" />
              基于此图继续
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AssistantAssetsHeader({
  accentTextClassName = "text-[oklch(0.44_0.03_245)]",
  statusLabel,
}: {
  accentTextClassName?: string
  statusLabel: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p
        className={[
          "text-[11px] font-semibold tracking-[0.12em] uppercase",
          accentTextClassName,
        ].join(" ")}
      >
        Assets
      </p>
      <p className={["text-[11px]", accentTextClassName].join(" ")}>
        {statusLabel}
      </p>
    </div>
  )
}
