import { ConversationTimeline } from "@/components/conversation/conversation-timeline"
import { ConversationMessage } from "@/components/conversation/conversation-types"
import { DrawTaskRecord } from "@/components/conversation/conversation-types"
import { ImageAsset } from "@/components/domain/asset-types"
import { GeneratedImageDisplayFieldOverrides } from "@/components/generated-image/generated-image-display-presets"
import { GeneratedImageDisplayPresetKey } from "@/components/generated-image/generated-image-display-presets"
import { GeneratedImageView } from "@/components/generated-image/generated-image-types"

export function ConversationPanelContent({
  imagesByMessageId,
  imageDisplayFields,
  imageDisplayPreset,
  isBusy,
  isConversationLoading,
  messages,
  selectedMessageId,
  onAssetSelect,
  onMessageSelect,
  onRetryTask,
  onUseAssetAsGenerationSource,
  onUseTaskAsDraft,
}: {
  imagesByMessageId: Record<string, GeneratedImageView[]>
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  isBusy: boolean
  isConversationLoading: boolean
  messages: ConversationMessage[]
  selectedMessageId: string | null
  onAssetSelect: (asset: ImageAsset) => void
  onMessageSelect: (message: ConversationMessage) => void
  onRetryTask: (task: DrawTaskRecord) => void
  onUseAssetAsGenerationSource: (asset: ImageAsset) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
}) {
  return (
    <div className="rounded-[22px] border border-[oklch(0.9_0.007_245)] bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="h-[min(540px,calc(100svh-156px))] overflow-hidden rounded-[18px]">
        <ConversationTimeline
          className="h-full rounded-[18px] border border-[oklch(0.9_0.007_245)] bg-[oklch(0.985_0.003_245)]"
          imagesByMessageId={imagesByMessageId}
          imageDisplayFields={imageDisplayFields}
          imageDisplayPreset={imageDisplayPreset}
          isBusy={isBusy}
          isLoading={isConversationLoading}
          messages={messages}
          selectedMessageId={selectedMessageId}
          variant="panel"
          onAssetSelect={onAssetSelect}
          onMessageSelect={onMessageSelect}
          onRetryTask={onRetryTask}
          onUseAssetAsGenerationSource={onUseAssetAsGenerationSource}
          onUseTaskAsDraft={onUseTaskAsDraft}
        />
      </div>
    </div>
  )
}
