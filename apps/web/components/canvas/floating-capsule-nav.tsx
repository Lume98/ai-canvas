"use client"

import { type RefObject, useEffect, useId, useRef, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"

import { AiProviderConfig } from "@/components/settings/ai-config"
import { CanvasDisplayPreferences } from "@/components/settings/display-preferences"
import { FloatingCapsuleNavButton } from "./floating-capsule-nav-button"
import { useCapsuleNavFootprint } from "./floating-capsule-nav-layout"
import {
  FloatingCapsulePanel,
  type FloatingPanelKey,
  useFloatingCapsulePanels,
} from "./floating-capsule-nav-panels"
import { FloatingCapsuleSettingsDialog } from "@/components/settings/floating-capsule-settings-dialog"
import { GeneratedImageDisplayPresetKey } from "@/components/generated-image/generated-image-display-presets"
import { aiCanvasCapsuleRailPositionClassName } from "./layout-tokens"
import { GeneratedImageView, HistoryResult } from "@/components/generated-image/generated-image-types"
import { ImageAsset } from "@/components/domain/asset-types"
import { ConversationMessage, DrawTaskRecord } from "@/components/conversation/conversation-types"

type FloatingPanel = FloatingPanelKey | null

const capsuleRailClassName =
  "pointer-events-none fixed top-1/2 z-40 flex -translate-y-1/2 items-center"

const capsuleNavClassName =
  "pointer-events-auto relative flex flex-col items-center gap-2 rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,oklch(0.995_0.006_95_/0.94)_0%,oklch(0.955_0.02_88_/0.9)_100%)] p-2 shadow-[0_20px_54px_oklch(0.22_0.03_245_/_0.18)] ring-1 ring-[oklch(0.84_0.02_88_/_0.65)] backdrop-blur-xl"

type FloatingCapsuleNavProps = {
  conversationMessages: ConversationMessage[]
  imageDisplayFields: CanvasDisplayPreferences["imageDisplayFields"]
  imageDisplayPreset: GeneratedImageDisplayPresetKey
  imagesByMessageId: Record<string, GeneratedImageView[]>
  isBusy: boolean
  isConversationLoading: boolean
  prompts: string[]
  results: HistoryResult[]
  selectedMessageId: string | null
  onAssetSelect: (asset: ImageAsset) => void
  onConfigChange: (config: AiProviderConfig) => void
  onDisplayPreferencesChange: (preferences: CanvasDisplayPreferences) => void
  onMessageSelect: (message: ConversationMessage) => void
  onPromptSelect: (prompt: string) => void
  onResultSelect: (result: HistoryResult) => void
  onRetryTask: (task: DrawTaskRecord) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
  layoutRootRef: RefObject<HTMLElement | null>
  userName?: string
}

export function FloatingCapsuleNav({
  conversationMessages,
  imageDisplayFields,
  imageDisplayPreset,
  imagesByMessageId,
  isBusy,
  isConversationLoading,
  prompts,
  results,
  selectedMessageId,
  onAssetSelect,
  onConfigChange,
  onDisplayPreferencesChange,
  layoutRootRef,
  onMessageSelect,
  onPromptSelect,
  onResultSelect,
  onRetryTask,
  onUseTaskAsDraft,
  userName = "Canvas User",
}: FloatingCapsuleNavProps) {
  const [activePanel, setActivePanel] = useState<FloatingPanel>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [profileStatus, setProfileStatus] = useState("")
  const navRef = useRef<HTMLElement | null>(null)
  const settingsTitleId = useId()
  const initial = userName.trim().charAt(0).toUpperCase() || "C"
  const { leadingPanels, mainPanels, panelRegistry } =
    useFloatingCapsulePanels({
      conversationMessages,
      imageDisplayFields,
      imageDisplayPreset,
      imagesByMessageId,
      initial,
      isBusy,
      isConversationLoading,
      onAssetSelect,
      onMessageSelect,
      onOpenSettings: () => {
        setIsSettingsOpen(true)
        setActivePanel(null)
      },
      onPromptSelect: (prompt) => {
        onPromptSelect(prompt)
        setActivePanel(null)
      },
      onResultSelect: (result) => {
        onResultSelect(result)
        setActivePanel(null)
      },
      onRetryTask: (task) => {
        onRetryTask(task)
        setActivePanel(null)
      },
      onUseTaskAsDraft: (task) => {
        onUseTaskAsDraft(task)
        setActivePanel(null)
      },
      profileStatus,
      prompts,
      results,
      selectedMessageId,
      setProfileStatus,
      userName,
    })

  useCapsuleNavFootprint({
    layoutRootRef,
    navRef,
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePanel(null)
        setIsSettingsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  function togglePanel(panel: FloatingPanelKey) {
    setActivePanel((current) => (current === panel ? null : panel))
    setProfileStatus("")
  }

  return (
    <>
      {activePanel ? (
        <button
          className="fixed inset-0 z-35 bg-transparent"
          type="button"
          aria-label="关闭快捷面板"
          onClick={() => setActivePanel(null)}
        />
      ) : null}

      <div
        className={cn(
          capsuleRailClassName,
          aiCanvasCapsuleRailPositionClassName,
        )}
      >
        <nav
          ref={navRef}
          className={capsuleNavClassName}
          aria-label="画布快捷入口"
        >
          <div className="pointer-events-none absolute inset-x-2 top-2 h-14 rounded-full bg-[linear-gradient(180deg,oklch(1_0_0_/_0.92)_0%,oklch(1_0_0_/_0)_100%)]" />
          {leadingPanels.map((panel) => (
            <FloatingCapsuleNavButton
              ariaLabel={panel.ariaLabel}
              key={panel.key}
              label={panel.navLabel}
              isActive={activePanel === panel.key}
              onClick={() => togglePanel(panel.key)}
            >
              {panel.icon}
            </FloatingCapsuleNavButton>
          ))}
          <div className="h-px w-8 bg-[linear-gradient(90deg,oklch(0.84_0.02_88_/_0)_0%,oklch(0.84_0.02_88_/_1)_50%,oklch(0.84_0.02_88_/_0)_100%)]" />
          {mainPanels.map((panel) => (
            <FloatingCapsuleNavButton
              ariaLabel={panel.ariaLabel}
              key={panel.key}
              label={panel.navLabel}
              isActive={activePanel === panel.key}
              onClick={() => togglePanel(panel.key)}
            >
              {panel.icon}
            </FloatingCapsuleNavButton>
          ))}
        </nav>

        {activePanel ? (
          <FloatingCapsulePanel
            panelConfig={panelRegistry[activePanel]}
            onClose={() => setActivePanel(null)}
          >
            {panelRegistry[activePanel].render}
          </FloatingCapsulePanel>
        ) : null}
      </div>

      <FloatingCapsuleSettingsDialog
        isOpen={isSettingsOpen}
        titleId={settingsTitleId}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChange={onConfigChange}
        onDisplayPreferencesChange={onDisplayPreferencesChange}
      />
    </>
  )
}
