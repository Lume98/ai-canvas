"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { SettingsForm } from "@/components/settings/settings-form"

import { type AiProviderConfig } from "@/components/settings/config/ai-provider-config"
import { type CanvasDisplayPreferences } from "@/components/settings/config/display-preferences"

type CapsuleSettingsDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfigChange: (config: AiProviderConfig) => void
  onDisplayPreferencesChange: (preferences: CanvasDisplayPreferences) => void
  titleId: string
}

export function CapsuleSettingsDialog({
  isOpen,
  onClose,
  onConfigChange,
  onDisplayPreferencesChange,
  titleId,
}: CapsuleSettingsDialogProps) {
  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.17_0.018_245_/_0.45)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="flex max-h-[min(720px,calc(100svh-32px))] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[oklch(0.78_0.028_75)] bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[oklch(0.83_0.025_75)] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.46_0.08_168)] uppercase">
              Provider Settings
            </p>
            <h2 id={titleId} className="mt-2 text-xl font-semibold">
              AI 接口配置
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="关闭设置"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </header>
        <SettingsForm
          onConfigChange={onConfigChange}
          onDisplayPreferencesChange={onDisplayPreferencesChange}
          onSaveSuccess={onClose}
        />
      </div>
    </div>
  )
}
