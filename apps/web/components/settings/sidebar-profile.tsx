"use client"

import { useEffect, useId, useState } from "react"
import { LogOut, Settings, User, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { SettingsForm } from "@/components/settings/settings-form"

import { AiProviderConfig } from "@/components/settings/ai-config"

type SidebarProfileProps = {
  onConfigChange?: (config: AiProviderConfig) => void
  userName?: string
}

export function SidebarProfile({
  onConfigChange,
  userName = "Canvas User",
}: SidebarProfileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [status, setStatus] = useState("")
  const initial = userName.trim().charAt(0).toUpperCase() || "C"
  const settingsTitleId = useId()

  useEffect(() => {
    if (!isSettingsOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false)
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isSettingsOpen])

  return (
    <div className="relative border-t border-[oklch(0.78_0.028_75)] pt-4">
      {isOpen ? (
        <div className="absolute right-0 bottom-full left-0 mb-3 rounded-lg border border-[oklch(0.78_0.028_75)] bg-white p-2 shadow-lg">
          <Button
            className="w-full justify-start"
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setIsSettingsOpen(true)
              setIsOpen(false)
              setStatus("")
            }}
          >
            <Settings className="size-4" />
            设置
          </Button>
          <Button
            className="mt-1 w-full justify-start text-[oklch(0.42_0.12_28)]"
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setStatus("暂未接入登录系统")}
          >
            <LogOut className="size-4" />
            退出登录
          </Button>
          {status ? (
            <p className="px-2 pt-2 text-xs leading-5 text-[oklch(0.45_0.025_245)]">
              {status}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        className="flex w-full items-center gap-3 rounded-lg border border-[oklch(0.78_0.028_75)] bg-white/60 px-3 py-3 text-left transition hover:border-[oklch(0.49_0.12_168)] hover:bg-white"
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current)
          setStatus("")
        }}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[oklch(0.22_0.04_245)] text-sm font-semibold text-white">
          {initial || <User className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{userName}</span>
          <span className="mt-1 block text-xs text-[oklch(0.45_0.025_245)]">
            本地画布用户
          </span>
        </span>
      </button>

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
    </div>
  )
}
