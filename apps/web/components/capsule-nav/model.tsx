import { ReactNode, useMemo } from "react"
import { History, ListChecks, MessageSquareQuote } from "lucide-react"

import { GeneratedImageDisplayFieldOverrides } from "@/components/generated-image/generated-image-display-presets"
import { GeneratedImageDisplayPresetKey } from "@/components/generated-image/generated-image-display-presets"
import { GeneratedImageView } from "@/components/generated-image/generated-image-types"
import { HistoryResult } from "@/components/generated-image/generated-image-types"
import { ImageAsset } from "@/components/domain/asset-types"
import { ConversationMessage } from "@/components/conversation/conversation-types"
import { DrawTaskRecord } from "@/components/conversation/conversation-types"
import { ConversationPanelContent } from "./content/conversation-panel-content"
import { HistoryPanelContent } from "./content/history-panel-content"
import { ProfilePanelContent } from "./content/profile-panel-content"
import { PromptsPanelContent } from "./content/prompts-panel-content"

export const capsulePanels = [
  "profile",
  "conversation",
  "history",
  "prompts",
] as const

export type CapsulePanelKey = (typeof capsulePanels)[number]

export type CapsuleNavPanelContext = {
  conversation: {
    imagesByMessageId: Record<string, GeneratedImageView[]>
    isBusy: boolean
    isLoading: boolean
    messages: ConversationMessage[]
    selectedMessageId: string | null
  }
  display: {
    imageDisplayFields: GeneratedImageDisplayFieldOverrides
    imageDisplayPreset: GeneratedImageDisplayPresetKey
  }
  history: {
    results: HistoryResult[]
  }
  prompts: {
    items: string[]
  }
  user: {
    name?: string
  }
  actions: {
    onAssetSelect: (asset: ImageAsset) => void
    onMessageSelect: (message: ConversationMessage) => void
    onPromptSelect: (prompt: string) => void
    onResultSelect: (result: HistoryResult) => void
    onRetryTask: (task: DrawTaskRecord) => void
    onUseAssetAsGenerationSource: (asset: ImageAsset) => void
    onUseTaskAsDraft: (task: DrawTaskRecord) => void
  }
}

export type CapsuleNavRenderContext = {
  panelContext: CapsuleNavPanelContext
  shell: {
    onOpenSettings: () => void
  }
  profile: {
    initial: string
    status: string
    setStatus: (status: string) => void
  }
}

export type CapsulePanelDefinition = {
  ariaLabel: string
  eyebrow: string
  icon: (context: CapsuleNavRenderContext) => ReactNode
  key: CapsulePanelKey
  navLabel: string
  order: number
  placement: "leading" | "main"
  render: (context: CapsuleNavRenderContext) => ReactNode
  title: string
}

type CapsulePanelMap = Record<CapsulePanelKey, CapsulePanelDefinition>

type CapsulePanelsModel = {
  panelMap: CapsulePanelMap
  panels: CapsulePanelDefinition[]
}

const panelDefinitions: CapsulePanelMap = {
  profile: {
    ariaLabel: "用户头像",
    eyebrow: "Profile",
    icon: (context) => (
      <span className="flex size-8 items-center justify-center rounded-full border border-white/70 bg-[linear-gradient(180deg,oklch(0.99_0.004_110),oklch(0.93_0.01_245))] text-[11px] font-semibold text-[oklch(0.28_0.02_245)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_12px_oklch(0.22_0.015_245_/_0.08)]">
        {context.profile.initial}
      </span>
    ),
    key: "profile",
    navLabel: "我的",
    order: 0,
    placement: "leading",
    render: (context) => (
      <ProfilePanelContent
        initial={context.profile.initial}
        profileStatus={context.profile.status}
        userName={context.panelContext.user.name ?? "Canvas User"}
        onLogoutClick={() => context.profile.setStatus("暂未接入登录系统")}
        onOpenSettings={context.shell.onOpenSettings}
      />
    ),
    title: "用户头像",
  },
  conversation: {
    ariaLabel: "当前会话",
    eyebrow: "Conversation",
    icon: () => <MessageSquareQuote className="size-[18px]" />,
    key: "conversation",
    navLabel: "会话",
    order: 10,
    placement: "main",
    render: (context) => (
      <ConversationPanelContent
        imagesByMessageId={context.panelContext.conversation.imagesByMessageId}
        imageDisplayFields={context.panelContext.display.imageDisplayFields}
        imageDisplayPreset={context.panelContext.display.imageDisplayPreset}
        isBusy={context.panelContext.conversation.isBusy}
        isConversationLoading={context.panelContext.conversation.isLoading}
        messages={context.panelContext.conversation.messages}
        selectedMessageId={context.panelContext.conversation.selectedMessageId}
        onAssetSelect={context.panelContext.actions.onAssetSelect}
        onMessageSelect={context.panelContext.actions.onMessageSelect}
        onRetryTask={context.panelContext.actions.onRetryTask}
        onUseAssetAsGenerationSource={
          context.panelContext.actions.onUseAssetAsGenerationSource
        }
        onUseTaskAsDraft={context.panelContext.actions.onUseTaskAsDraft}
      />
    ),
    title: "当前会话",
  },
  history: {
    ariaLabel: "展示历史任务",
    eyebrow: "History",
    icon: () => <History className="size-[18px]" />,
    key: "history",
    navLabel: "历史",
    order: 20,
    placement: "main",
    render: (context) => (
      <HistoryPanelContent
        imageDisplayFields={context.panelContext.display.imageDisplayFields}
        imageDisplayPreset={context.panelContext.display.imageDisplayPreset}
        results={context.panelContext.history.results}
        onResultSelect={context.panelContext.actions.onResultSelect}
      />
    ),
    title: "历史任务",
  },
  prompts: {
    ariaLabel: "提示词列表",
    eyebrow: "Prompts",
    icon: () => <ListChecks className="size-[18px]" />,
    key: "prompts",
    navLabel: "提示",
    order: 30,
    placement: "main",
    render: (context) => (
      <PromptsPanelContent
        prompts={context.panelContext.prompts.items}
        onSelectPrompt={context.panelContext.actions.onPromptSelect}
      />
    ),
    title: "提示词列表",
  },
}

export function useCapsulePanels(): CapsulePanelsModel {
  return useMemo(
    () => ({
      panelMap: panelDefinitions,
      panels: [...capsulePanels]
        .map((panel) => panelDefinitions[panel])
        .sort((left, right) => left.order - right.order),
    }),
    []
  )
}
