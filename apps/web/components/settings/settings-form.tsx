"use client"

import { FormEvent, useEffect, useState } from "react"
import { RotateCcw, Save } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import {
  AiProviderConfig,
  clearAiProviderConfig,
  defaultAiProviderConfig,
  defaultOpenAIBaseUrl,
  readAiProviderConfig,
  writeAiProviderConfig,
} from "@/components/ai-canvas/ai-config"
import {
  CanvasDisplayPreferences,
  clearCanvasDisplayPreferences,
  defaultCanvasDisplayPreferences,
  readCanvasDisplayPreferences,
  resolveCanvasDisplayFieldStates,
  writeCanvasDisplayPreferences,
} from "@/components/ai-canvas/display-preferences"
import {
  GeneratedImageDisplayFieldKey,
  generatedImageDisplayPresetKeys,
} from "@/components/ai-canvas/generated-image-display-presets"

const inputClass =
  "w-full rounded-md border border-[oklch(0.74_0.035_75)] bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-[oklch(0.56_0.025_245)] focus:border-[oklch(0.49_0.12_168)] focus:ring-3 focus:ring-[oklch(0.72_0.11_168_/_0.28)]"

type SettingsFormProps = {
  onConfigChange?: (config: AiProviderConfig) => void
  onDisplayPreferencesChange?: (preferences: CanvasDisplayPreferences) => void
}

export function SettingsForm({
  onConfigChange,
  onDisplayPreferencesChange,
}: SettingsFormProps) {
  const [apiKey, setApiKey] = useState(defaultAiProviderConfig.apiKey)
  const [baseUrl, setBaseUrl] = useState(defaultAiProviderConfig.baseUrl)
  const [imageDisplayPreset, setImageDisplayPreset] = useState(
    defaultCanvasDisplayPreferences.imageDisplayPreset,
  )
  const [imageDisplayFields, setImageDisplayFields] = useState(
    defaultCanvasDisplayPreferences.imageDisplayFields,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState("")
  const resolvedDisplayFields = resolveCanvasDisplayFieldStates({
    imageDisplayFields,
    imageDisplayPreset,
  })

  useEffect(() => {
    let isMounted = true

    async function loadConfig() {
      try {
        const config = await readAiProviderConfig()

        if (!isMounted) return

        setApiKey(config.apiKey)
        setBaseUrl(config.baseUrl)
        const displayPreferences = readCanvasDisplayPreferences()
        setImageDisplayPreset(displayPreferences.imageDisplayPreset)
        setImageDisplayFields(displayPreferences.imageDisplayFields)
        onConfigChange?.(config)
        onDisplayPreferencesChange?.(displayPreferences)
      } catch (caughtError) {
        if (!isMounted) return

        setStatus(
          caughtError instanceof Error
            ? caughtError.message
            : "读取接口配置失败。"
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadConfig()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setIsSaving(true)
    setStatus("")

    try {
      const config = await writeAiProviderConfig({
        apiKey,
        baseUrl,
      })
      const displayPreferences = writeCanvasDisplayPreferences({
        imageDisplayFields,
        imageDisplayPreset,
      })

      setApiKey(config.apiKey)
      setBaseUrl(config.baseUrl)
      setImageDisplayPreset(displayPreferences.imageDisplayPreset)
      setImageDisplayFields(displayPreferences.imageDisplayFields)
      onConfigChange?.(config)
      onDisplayPreferencesChange?.(displayPreferences)
      setStatus("配置已保存")
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error ? caughtError.message : "保存接口配置失败。"
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReset() {
    setIsSaving(true)
    setStatus("")

    try {
      const config = await clearAiProviderConfig()
      const displayPreferences = clearCanvasDisplayPreferences()

      setApiKey(config.apiKey)
      setBaseUrl(config.baseUrl)
      setImageDisplayPreset(displayPreferences.imageDisplayPreset)
      setImageDisplayFields(displayPreferences.imageDisplayFields)
      onConfigChange?.(config)
      onDisplayPreferencesChange?.(displayPreferences)
      setStatus("已恢复默认配置")
    } catch (caughtError) {
      setStatus(
        caughtError instanceof Error ? caughtError.message : "清空接口配置失败。"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-medium">API Key</span>
        <input
          className={`${inputClass} mt-2`}
          value={apiKey}
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={isLoading || isSaving}
          onChange={(event) => {
            setApiKey(event.target.value)
            setStatus("")
          }}
          placeholder="sk-..."
        />
        <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
          当前保存在 Web 端 mock 配置中，用于本地联调和界面演示。
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Base URL</span>
        <input
          className={`${inputClass} mt-2`}
          value={baseUrl}
          type="url"
          spellCheck={false}
          disabled={isLoading || isSaving}
          onChange={(event) => {
            setBaseUrl(event.target.value)
            setStatus("")
          }}
          placeholder={defaultOpenAIBaseUrl}
        />
        <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
          默认是 OpenAI 官方地址。兼容代理或 OpenAI-compatible
          服务时，填写到 API 版本根路径，例如 https://api.openai.com/v1。
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">图片展示模式</span>
        <div className="mt-2">
          <Select
            disabled={isLoading || isSaving}
            value={imageDisplayPreset}
            onValueChange={(value) => {
              setImageDisplayPreset(value as typeof imageDisplayPreset)
              setStatus("")
            }}
          >
            <SelectTrigger className="w-full rounded-md border-[oklch(0.74_0.035_75)] bg-white/80">
              <SelectValue placeholder="选择展示模式" />
            </SelectTrigger>
            <SelectContent>
              {generatedImageDisplayPresetKeys.map((item) => (
                <SelectItem key={item} value={item}>
                  {displayPresetLabelMap[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
          仅影响本地界面的图片信息展示，不会写入 mock API 配置。
        </span>
      </label>

      <fieldset className="block">
        <legend className="text-sm font-medium">图片信息字段</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {displayFieldOptions.map((item) => {
            const checked = resolvedDisplayFields[item.value]

            return (
              <button
                aria-pressed={checked}
                className={cn(
                  "h-10 rounded-md border px-3 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-55",
                  checked
                    ? "border-[oklch(0.49_0.12_168)] bg-[oklch(0.95_0.035_168)] text-[oklch(0.28_0.08_168)]"
                    : "border-[oklch(0.76_0.028_75)] bg-white/70 text-[oklch(0.42_0.025_245)]",
                )}
                disabled={isLoading || isSaving}
                key={item.value}
                type="button"
                onClick={() => {
                  setImageDisplayFields((current) => ({
                    ...current,
                    [item.value]: !checked,
                  }))
                  setStatus("")
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
          字段开关会覆盖当前展示模式的默认字段组合。
        </span>
      </fieldset>

      {status ? (
        <div className="rounded-md border border-[oklch(0.72_0.11_168)] bg-[oklch(0.95_0.035_168)] px-3 py-2 text-sm text-[oklch(0.32_0.09_168)]">
          {status}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          type="button"
          disabled={isLoading || isSaving}
          onClick={handleReset}
        >
          <RotateCcw className="size-4" />
          恢复默认
        </Button>
        <Button
          className="bg-[oklch(0.22_0.04_245)] text-white hover:bg-[oklch(0.29_0.05_245)]"
          disabled={isLoading || isSaving}
          type="submit"
        >
          <Save className="size-4" />
          {isSaving ? "保存中" : "保存配置"}
        </Button>
      </div>
    </form>
  )
}

const displayPresetLabelMap: Record<
  CanvasDisplayPreferences["imageDisplayPreset"],
  string
> = {
  timeline: "时间线模式",
  history: "历史模式",
  canvas: "画布模式",
}

const displayFieldOptions: Array<{
  label: string
  value: GeneratedImageDisplayFieldKey
}> = [
  { label: "生成顺序", value: "order" },
  { label: "提示词", value: "prompt" },
  { label: "图片尺寸", value: "dimensions" },
  { label: "模型", value: "model" },
  { label: "规格", value: "size" },
  { label: "质量", value: "quality" },
]
