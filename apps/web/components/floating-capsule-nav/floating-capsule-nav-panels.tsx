import { ReactNode, useMemo } from "react"
import {
  History,
  ListChecks,
  LogOut,
  MessageSquareQuote,
  Settings,
  User,
  X,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { CanvasHistory } from "@/components/canvas/canvas-history"
import { ConversationTimeline } from "@/components/conversation/conversation-timeline"
import {
  GeneratedImageView,
  HistoryResult,
} from "@/components/generated-image/generated-image-types"
import { ImageAsset } from "@/components/domain/asset-types"
import {
  ConversationMessage,
  DrawTaskRecord,
} from "@/components/conversation/conversation-types"
import {
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
} from "@/components/generated-image/generated-image-display-presets"

export const floatingPanels = [
  "profile",
  "conversation",
  "history",
  "prompts",
] as const

export type FloatingPanelKey = (typeof floatingPanels)[number]

export type PanelRenderContext = {
  conversationMessages: ConversationMessage[]
  imagesByMessageId: Record<string, GeneratedImageView[]>
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  initial: string
  isBusy: boolean
  isConversationLoading: boolean
  onAssetSelect: (asset: ImageAsset) => void
  onMessageSelect: (message: ConversationMessage) => void
  onOpenSettings: () => void
  onPromptSelect: (prompt: string) => void
  onResultSelect: (result: HistoryResult) => void
  onRetryTask: (task: DrawTaskRecord) => void
  onUseAssetAsGenerationSource: (asset: ImageAsset) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
  profileStatus: string
  prompts: string[]
  results: HistoryResult[]
  selectedMessageId: string | null
  setProfileStatus: (status: string) => void
  userName: string
}

export type FloatingPanelConfig = {
  ariaLabel: string
  eyebrow: string
  icon: ReactNode
  key: FloatingPanelKey
  navLabel: string
  order: number
  placement: "leading" | "main"
  render: ReactNode
  title: string
}

type FloatingCapsulePanelsOptions = {
  conversationMessages: ConversationMessage[]
  imagesByMessageId: Record<string, GeneratedImageView[]>
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  initial: string
  isBusy: boolean
  isConversationLoading: boolean
  onAssetSelect: (asset: ImageAsset) => void
  onMessageSelect: (message: ConversationMessage) => void
  onOpenSettings: () => void
  onPromptSelect: (prompt: string) => void
  onResultSelect: (result: HistoryResult) => void
  onRetryTask: (task: DrawTaskRecord) => void
  onUseAssetAsGenerationSource: (asset: ImageAsset) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
  profileStatus: string
  prompts: string[]
  results: HistoryResult[]
  selectedMessageId: string | null
  setProfileStatus: (status: string) => void
  userName: string
}

type FloatingCapsulePanelsModel = {
  leadingPanels: FloatingPanelConfig[]
  mainPanels: FloatingPanelConfig[]
  panelRegistry: Record<FloatingPanelKey, FloatingPanelConfig>
}

type FloatingPanelSchema = {
  ariaLabel: string
  eyebrow: string
  icon: (context: PanelRenderContext) => ReactNode
  isVisible?: (context: PanelRenderContext) => boolean
  navLabel: string
  order: number
  placement: "leading" | "main"
  render: (context: PanelRenderContext) => ReactNode
  title: string
}

const capsulePanelClassName =
  "pointer-events-auto flex max-h-[min(560px,calc(100svh-32px))] w-[min(344px,calc(100vw-94px))] flex-col overflow-hidden rounded-[28px] border border-[oklch(0.88_0.012_245)] bg-white shadow-[0_26px_70px_oklch(0.18_0.025_245_/_0.16)] ring-1 ring-white/80"

const panelHeaderClassName =
  "flex shrink-0 items-center justify-between gap-3 border-b border-[oklch(0.9_0.01_245)] bg-white px-5 py-4"

const panelBodyClassName = "min-h-0 flex-1 overflow-y-auto bg-white p-4"

const panelCardClassName =
  "rounded-lg border border-[oklch(0.9_0.01_245)] bg-white shadow-[0_8px_20px_oklch(0.22_0.02_245_/_0.06)]"

const panelSchema: Record<FloatingPanelKey, FloatingPanelSchema> = {
  profile: {
    ariaLabel: "用户头像",
    eyebrow: "Profile",
    icon: (context) => (
      <span className="flex size-8 items-center justify-center rounded-full border border-white/50 bg-[oklch(0.22_0.03_245)] text-[11px] font-semibold text-white shadow-[0_8px_18px_oklch(0.18_0.03_245_/_0.22)]">
        {context.initial || <User className="size-4" />}
      </span>
    ),
    navLabel: "我的",
    order: 0,
    placement: "leading",
    render: (context) => (
      <ProfilePanelContent
        initial={context.initial}
        profileStatus={context.profileStatus}
        userName={context.userName}
        onLogoutClick={() => context.setProfileStatus("暂未接入登录系统")}
        onOpenSettings={context.onOpenSettings}
      />
    ),
    title: "用户头像",
  },
  conversation: {
    ariaLabel: "当前会话",
    eyebrow: "Conversation",
    icon: () => <MessageSquareQuote className="size-5" />,
    navLabel: "会话",
    order: 10,
    placement: "main",
    render: (context) => (
      <div className="h-[min(520px,calc(100svh-152px))]">
        <ConversationTimeline
          className="rounded-lg border border-[oklch(0.88_0.012_245)]"
          imagesByMessageId={context.imagesByMessageId}
          imageDisplayFields={context.imageDisplayFields}
          imageDisplayPreset={context.imageDisplayPreset}
          isBusy={context.isBusy}
          isLoading={context.isConversationLoading}
          messages={context.conversationMessages}
          selectedMessageId={context.selectedMessageId}
          variant="panel"
          onAssetSelect={context.onAssetSelect}
          onMessageSelect={context.onMessageSelect}
          onRetryTask={context.onRetryTask}
          onUseAssetAsGenerationSource={context.onUseAssetAsGenerationSource}
          onUseTaskAsDraft={context.onUseTaskAsDraft}
        />
      </div>
    ),
    title: "当前会话",
  },
  history: {
    ariaLabel: "展示历史任务",
    eyebrow: "History",
    icon: () => <History className="size-5" />,
    navLabel: "历史",
    order: 20,
    placement: "main",
    render: (context) => (
      <div className="h-[min(430px,calc(100svh-152px))]">
        <CanvasHistory
          imageDisplayFields={context.imageDisplayFields}
          imageDisplayPreset={context.imageDisplayPreset}
          results={context.results}
          onSelectResult={context.onResultSelect}
        />
      </div>
    ),
    title: "历史任务",
  },
  prompts: {
    ariaLabel: "提示词列表",
    eyebrow: "Prompts",
    icon: () => <ListChecks className="size-5" />,
    navLabel: "提示",
    order: 30,
    placement: "main",
    render: (context) => (
      <PromptsPanelContent
        prompts={context.prompts}
        onSelectPrompt={context.onPromptSelect}
      />
    ),
    title: "提示词列表",
  },
}

export function buildPanelRegistry(
  context: PanelRenderContext
): Record<FloatingPanelKey, FloatingPanelConfig> {
  return Object.fromEntries(
    floatingPanels
      .filter((panel) => panelSchema[panel].isVisible?.(context) ?? true)
      .map((panel) => {
        const schema = panelSchema[panel]

        return [
          panel,
          {
            ariaLabel: schema.ariaLabel,
            eyebrow: schema.eyebrow,
            icon: schema.icon(context),
            key: panel,
            navLabel: schema.navLabel,
            order: schema.order,
            placement: schema.placement,
            render: schema.render(context),
            title: schema.title,
          },
        ]
      })
  ) as Record<FloatingPanelKey, FloatingPanelConfig>
}

export function useFloatingCapsulePanels(
  options: FloatingCapsulePanelsOptions
): FloatingCapsulePanelsModel {
  return useMemo(() => {
    const panelContext: PanelRenderContext = {
      conversationMessages: options.conversationMessages,
      imagesByMessageId: options.imagesByMessageId,
      imageDisplayFields: options.imageDisplayFields,
      imageDisplayPreset: options.imageDisplayPreset,
      initial: options.initial,
      isBusy: options.isBusy,
      isConversationLoading: options.isConversationLoading,
      onAssetSelect: options.onAssetSelect,
      onMessageSelect: options.onMessageSelect,
      onOpenSettings: options.onOpenSettings,
      onPromptSelect: options.onPromptSelect,
      onResultSelect: options.onResultSelect,
      onRetryTask: options.onRetryTask,
      onUseAssetAsGenerationSource: options.onUseAssetAsGenerationSource,
      onUseTaskAsDraft: options.onUseTaskAsDraft,
      profileStatus: options.profileStatus,
      prompts: options.prompts,
      results: options.results,
      selectedMessageId: options.selectedMessageId,
      setProfileStatus: options.setProfileStatus,
      userName: options.userName,
    }

    const panelRegistry = buildPanelRegistry(panelContext)
    const allPanels = Object.values(panelRegistry).sort(
      (left, right) => left.order - right.order
    )

    return {
      leadingPanels: allPanels.filter((panel) => panel.placement === "leading"),
      mainPanels: allPanels.filter((panel) => panel.placement === "main"),
      panelRegistry,
    }
  }, [
    options.conversationMessages,
    options.imagesByMessageId,
    options.imageDisplayFields,
    options.imageDisplayPreset,
    options.initial,
    options.isBusy,
    options.isConversationLoading,
    options.onAssetSelect,
    options.onMessageSelect,
    options.onOpenSettings,
    options.onPromptSelect,
    options.onResultSelect,
    options.onRetryTask,
    options.onUseAssetAsGenerationSource,
    options.onUseTaskAsDraft,
    options.profileStatus,
    options.prompts,
    options.results,
    options.selectedMessageId,
    options.setProfileStatus,
    options.userName,
  ])
}

export function FloatingCapsulePanel({
  children,
  panelConfig,
  onClose,
}: {
  children: ReactNode
  panelConfig: FloatingPanelConfig
  onClose: () => void
}) {
  return (
    <aside className={capsulePanelClassName}>
      <header className={panelHeaderClassName}>
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-[oklch(0.42_0.045_168)] uppercase">
            {panelConfig.eyebrow}
          </p>
          <h2 className="mt-1 text-base font-semibold text-[oklch(0.22_0.025_245)]">
            {panelConfig.title}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          className="text-[oklch(0.38_0.018_245)] hover:bg-[oklch(0.96_0.004_245)] hover:text-[oklch(0.18_0.025_245)]"
          aria-label="关闭面板"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className={panelBodyClassName}>{children}</div>
    </aside>
  )
}

function ProfilePanelContent({
  initial,
  onLogoutClick,
  onOpenSettings,
  profileStatus,
  userName,
}: {
  initial: string
  onLogoutClick: () => void
  onOpenSettings: () => void
  profileStatus: string
  userName: string
}) {
  return (
    <div>
      <div
        className={cn(panelCardClassName, "flex items-center gap-3 px-4 py-4")}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[oklch(0.2_0.03_245)] text-sm font-semibold text-white shadow-[0_10px_24px_oklch(0.18_0.03_245_/_0.22)]">
          {initial || <User className="size-4" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[oklch(0.22_0.025_245)]">
            {userName}
          </p>
          <p className="mt-1 text-xs text-[oklch(0.45_0.025_245)]">
            本地画布用户
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        <Button
          className={cn(
            panelCardClassName,
            "h-11 justify-start px-4 shadow-none hover:border-[oklch(0.82_0.016_245)] hover:bg-[oklch(0.985_0.002_245)]"
          )}
          variant="outline"
          type="button"
          onClick={onOpenSettings}
        >
          <Settings className="size-4" />
          设置
        </Button>
        <Button
          className={cn(
            panelCardClassName,
            "h-11 justify-start px-4 text-[oklch(0.42_0.12_28)] shadow-none hover:border-[oklch(0.82_0.05_28)] hover:bg-[oklch(0.985_0.008_28)]"
          )}
          variant="ghost"
          type="button"
          onClick={onLogoutClick}
        >
          <LogOut className="size-4" />
          退出登录
        </Button>
      </div>
      {profileStatus ? (
        <p className="mt-3 text-xs leading-5 text-[oklch(0.45_0.025_245)]">
          {profileStatus}
        </p>
      ) : null}
    </div>
  )
}

function PromptsPanelContent({
  onSelectPrompt,
  prompts,
}: {
  onSelectPrompt: (prompt: string) => void
  prompts: string[]
}) {
  return (
    <div className="grid gap-2">
      {prompts.map((item) => (
        <button
          className={cn(
            panelCardClassName,
            "px-3 py-2 text-left text-xs leading-5 text-[oklch(0.34_0.025_245)] transition hover:border-[oklch(0.52_0.1_168)] hover:bg-[oklch(0.985_0.004_168)]"
          )}
          key={item}
          type="button"
          onClick={() => onSelectPrompt(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
