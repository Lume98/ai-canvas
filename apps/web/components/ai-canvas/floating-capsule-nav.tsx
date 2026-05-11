"use client"

import { ReactNode, useEffect, useId, useState } from "react"
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

import { SettingsForm } from "@/components/settings/settings-form"

import { AiProviderConfig } from "./ai-config"
import { CanvasHistory } from "./canvas-history"
import { ConversationTimeline } from "./conversation-timeline"
import { HistoryResult } from "./canvas-types"
import { ConversationMessage, DrawTaskRecord, ImageAsset } from "./canvas-types"

type FloatingPanel = "profile" | "conversation" | "history" | "prompts" | null

type FloatingCapsuleNavProps = {
  conversationMessages: ConversationMessage[]
  isBusy: boolean
  isConversationLoading: boolean
  prompts: string[]
  results: HistoryResult[]
  selectedMessageId: string | null
  onAssetSelect: (asset: ImageAsset) => void
  onConfigChange: (config: AiProviderConfig) => void
  onMessageSelect: (message: ConversationMessage) => void
  onPromptSelect: (prompt: string) => void
  onResultSelect: (result: HistoryResult) => void
  onRetryTask: (task: DrawTaskRecord) => void
  onUseTaskAsDraft: (task: DrawTaskRecord) => void
  userName?: string
}

export function FloatingCapsuleNav({
  conversationMessages,
  isBusy,
  isConversationLoading,
  prompts,
  results,
  selectedMessageId,
  onAssetSelect,
  onConfigChange,
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
  const settingsTitleId = useId()
  const initial = userName.trim().charAt(0).toUpperCase() || "C"

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

  useEffect(() => {
    if (!isSettingsOpen) return

    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = ""
    }
  }, [isSettingsOpen])

  function togglePanel(panel: Exclude<FloatingPanel, null>) {
    setActivePanel((current) => (current === panel ? null : panel))
    setProfileStatus("")
  }

  return (
    <>
      <nav
        className="fixed top-1/2 left-2.5 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full border border-[oklch(0.78_0.028_75)] bg-white/82 px-1.5 py-2 shadow-[0_14px_34px_oklch(0.35_0.04_245_/_0.16)] backdrop-blur md:left-4"
        aria-label="画布快捷入口"
      >
        <CapsuleButton
          ariaLabel="用户头像"
          isActive={activePanel === "profile"}
          onClick={() => togglePanel("profile")}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-[oklch(0.22_0.04_245)] text-[10px] font-semibold text-white">
            {initial || <User className="size-4" />}
          </span>
        </CapsuleButton>
        <CapsuleButton
          ariaLabel="当前会话"
          isActive={activePanel === "conversation"}
          onClick={() => togglePanel("conversation")}
        >
          <MessageSquareQuote className="size-5" />
        </CapsuleButton>
        <CapsuleButton
          ariaLabel="展示历史任务"
          isActive={activePanel === "history"}
          onClick={() => togglePanel("history")}
        >
          <History className="size-5" />
        </CapsuleButton>
        <CapsuleButton
          ariaLabel="提示词列表"
          isActive={activePanel === "prompts"}
          onClick={() => togglePanel("prompts")}
        >
          <ListChecks className="size-5" />
        </CapsuleButton>
      </nav>

      {activePanel ? (
        <aside className="fixed top-1/2 left-[60px] z-40 flex max-h-[min(560px,calc(100svh-32px))] w-[min(330px,calc(100vw-76px))] -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-[oklch(0.78_0.028_75)] bg-[oklch(0.965_0.018_88)] shadow-2xl md:left-[74px]">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[oklch(0.83_0.025_75)] bg-white/70 px-4 py-3">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.46_0.08_168)] uppercase">
                {panelMeta[activePanel].eyebrow}
              </p>
              <h2 className="mt-1 text-base font-semibold">
                {panelMeta[activePanel].title}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="关闭面板"
              onClick={() => setActivePanel(null)}
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activePanel === "profile" ? (
              <div>
                <div className="flex items-center gap-3 rounded-md border border-[oklch(0.78_0.028_75)] bg-white/75 px-3 py-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[oklch(0.22_0.04_245)] text-sm font-semibold text-white">
                    {initial || <User className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    <p className="mt-1 text-xs text-[oklch(0.45_0.025_245)]">
                      本地画布用户
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <Button
                    className="justify-start"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(true)
                      setActivePanel(null)
                    }}
                  >
                    <Settings className="size-4" />
                    设置
                  </Button>
                  <Button
                    className="justify-start text-[oklch(0.42_0.12_28)]"
                    variant="ghost"
                    type="button"
                    onClick={() => setProfileStatus("暂未接入登录系统")}
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
            ) : null}

            {activePanel === "conversation" ? (
              <div className="h-[min(520px,calc(100svh-152px))]">
                <ConversationTimeline
                  className="rounded-md border border-[oklch(0.82_0.02_245)]"
                  isBusy={isBusy}
                  isLoading={isConversationLoading}
                  messages={conversationMessages}
                  selectedMessageId={selectedMessageId}
                  variant="panel"
                  onAssetSelect={(asset) => {
                    onAssetSelect(asset)
                    setActivePanel(null)
                  }}
                  onMessageSelect={(message) => {
                    onMessageSelect(message)
                    setActivePanel(null)
                  }}
                  onRetryTask={(task) => {
                    onRetryTask(task)
                    setActivePanel(null)
                  }}
                  onUseTaskAsDraft={(task) => {
                    onUseTaskAsDraft(task)
                    setActivePanel(null)
                  }}
                />
              </div>
            ) : null}

            {activePanel === "history" ? (
              <div className="h-[min(430px,calc(100svh-152px))]">
                <CanvasHistory
                  results={results}
                  onSelectResult={(result) => {
                    onResultSelect(result)
                    setActivePanel(null)
                  }}
                />
              </div>
            ) : null}

            {activePanel === "prompts" ? (
              <div className="grid gap-2">
                {prompts.map((item) => (
                  <button
                    className="rounded-md border border-[oklch(0.78_0.028_75)] bg-white/72 px-3 py-2 text-left text-xs leading-5 text-[oklch(0.34_0.025_245)] transition hover:border-[oklch(0.49_0.12_168)] hover:bg-white"
                    key={item}
                    type="button"
                    onClick={() => {
                      onPromptSelect(item)
                      setActivePanel(null)
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}

      {isSettingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.17_0.018_245_/_0.45)] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={settingsTitleId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsOpen(false)
            }
          }}
        >
          <div className="flex max-h-[min(720px,calc(100svh-32px))] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[oklch(0.78_0.028_75)] bg-[oklch(0.965_0.018_88)] shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[oklch(0.83_0.025_75)] bg-white/65 px-5 py-4">
              <div>
                <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.46_0.08_168)] uppercase">
                  Provider Settings
                </p>
                <h2 id={settingsTitleId} className="mt-2 text-xl font-semibold">
                  AI 接口配置
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                aria-label="关闭设置"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <SettingsForm onConfigChange={onConfigChange} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function CapsuleButton({
  ariaLabel,
  children,
  isActive,
  onClick,
}: {
  ariaLabel: string
  children: ReactNode
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      className="flex size-9 items-center justify-center rounded-full text-[oklch(0.28_0.025_245)] transition hover:bg-[oklch(0.91_0.035_88)] aria-expanded:bg-[oklch(0.22_0.04_245)] aria-expanded:text-white md:size-10"
      type="button"
      aria-label={ariaLabel}
      aria-expanded={isActive}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const panelMeta = {
  profile: {
    eyebrow: "Profile",
    title: "用户头像",
  },
  conversation: {
    eyebrow: "Conversation",
    title: "当前会话",
  },
  history: {
    eyebrow: "History",
    title: "历史任务",
  },
  prompts: {
    eyebrow: "Prompts",
    title: "提示词列表",
  },
}
