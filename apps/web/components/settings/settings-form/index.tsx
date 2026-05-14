"use client"

import { FormEvent, useEffect, useRef } from "react"
import { RotateCcw, Save } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import {
  defaultOpenAIBaseUrl,
  type AiProviderConfig,
} from "@/components/settings/config/ai-provider-config"
import { type CanvasDisplayPreferences } from "@/components/settings/config/display-preferences"
import { SettingsFormView } from "@/components/settings/settings-form/settings-form-view"
import { useSettingsFormState } from "@/components/settings/settings-form/use-settings-form-state"

type SettingsFormProps = {
  onConfigChange?: (config: AiProviderConfig) => void
  onDisplayPreferencesChange?: (preferences: CanvasDisplayPreferences) => void
  onSaveSuccess?: () => void
}

export function SettingsForm({
  onConfigChange,
  onDisplayPreferencesChange,
  onSaveSuccess,
}: SettingsFormProps) {
  const closeTimerRef = useRef<number | null>(null)
  const {
    apiKey,
    baseUrl,
    imageDisplayPreset,
    isLoading,
    isSaving,
    status,
    resolvedDisplayFields,
    setApiKey,
    setBaseUrl,
    setImageDisplayPreset,
    setImageDisplayFields,
    setStatus,
    saveSettings,
    resetSettings,
  } = useSettingsFormState({
    onConfigChange,
    onDisplayPreferencesChange,
  })

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const isSaved = await saveSettings()
    if (!isSaved) return

    toast.success("配置已保存")

    if (onSaveSuccess) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }

      closeTimerRef.current = window.setTimeout(() => {
        onSaveSuccess()
        closeTimerRef.current = null
      }, 900)
    }
  }

  const formId = "settings-form"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <form id={formId} className="space-y-6" onSubmit={handleSubmit}>
          <SettingsFormView
            apiKey={apiKey}
            baseUrl={baseUrl}
            imageDisplayPreset={imageDisplayPreset}
            isLoading={isLoading}
            isSaving={isSaving}
            status={status}
            resolvedDisplayFields={resolvedDisplayFields}
            defaultBaseUrlPlaceholder={defaultOpenAIBaseUrl}
            onApiKeyChange={(value) => {
              setApiKey(value)
              setStatus("")
            }}
            onBaseUrlChange={(value) => {
              setBaseUrl(value)
              setStatus("")
            }}
            onImageDisplayPresetChange={(value) => {
              setImageDisplayPreset(value)
              setStatus("")
            }}
            onToggleDisplayField={(key, checked) => {
              setImageDisplayFields((current) => ({
                ...current,
                [key]: !checked,
              }))
              setStatus("")
            }}
          />
        </form>
      </div>
      <footer className="shrink-0 border-t border-[oklch(0.83_0.025_75)] bg-white px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            type="button"
            disabled={isLoading || isSaving}
            onClick={resetSettings}
          >
            <RotateCcw className="size-4" />
            恢复默认
          </Button>
          <Button
            className="bg-[oklch(0.22_0.04_245)] text-white hover:bg-[oklch(0.29_0.05_245)]"
            disabled={isLoading || isSaving}
            type="submit"
            form={formId}
          >
            <Save className="size-4" />
            {isSaving ? "保存中" : "保存配置"}
          </Button>
        </div>
      </footer>
    </div>
  )
}
