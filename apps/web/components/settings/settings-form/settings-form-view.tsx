import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import {
  type GeneratedImageDisplayFieldKey,
  generatedImageDisplayPresetKeys,
} from "@/components/generated-image/generated-image-display-presets"
import { type CanvasDisplayPreferences } from "@/components/settings/config/display-preferences"
import {
  displayFieldOptions,
  displayPresetLabelMap,
  inputClass,
} from "@/components/settings/settings-form/settings-form-constants"

type SettingsFormViewProps = {
  apiKey: string
  baseUrl: string
  imageDisplayPreset: CanvasDisplayPreferences["imageDisplayPreset"]
  isLoading: boolean
  isSaving: boolean
  status: string
  resolvedDisplayFields: Record<GeneratedImageDisplayFieldKey, boolean>
  defaultBaseUrlPlaceholder: string
  onApiKeyChange: (value: string) => void
  onBaseUrlChange: (value: string) => void
  onImageDisplayPresetChange: (
    value: CanvasDisplayPreferences["imageDisplayPreset"],
  ) => void
  onToggleDisplayField: (key: GeneratedImageDisplayFieldKey, checked: boolean) => void
}

export function SettingsFormView({
  apiKey,
  baseUrl,
  imageDisplayPreset,
  isLoading,
  isSaving,
  status,
  resolvedDisplayFields,
  defaultBaseUrlPlaceholder,
  onApiKeyChange,
  onBaseUrlChange,
  onImageDisplayPresetChange,
  onToggleDisplayField,
}: SettingsFormViewProps) {
  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-sm font-medium">Base URL</span>
        <input
          className={`${inputClass} mt-2`}
          value={baseUrl}
          type="url"
          spellCheck={false}
          disabled={isLoading || isSaving}
          onChange={(event) => onBaseUrlChange(event.target.value)}
          placeholder={defaultBaseUrlPlaceholder}
        />
        <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
          默认是 OpenAI 官方地址。兼容代理或 OpenAI-compatible
          服务时，填写到 API 版本根路径，例如 https://api.openai.com/v1。
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">API Key</span>
        <input
          className={`${inputClass} mt-2`}
          value={apiKey}
          type="password"
          autoComplete="off"
          spellCheck={false}
          disabled={isLoading || isSaving}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder="sk-..."
        />
        <span className="mt-2 block text-xs leading-5 text-[oklch(0.45_0.025_245)]">
          当前保存在 Web 端 mock 配置中，用于本地联调和界面演示。
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">图片展示模式</span>
        <div className="mt-2">
          <Select
            disabled={isLoading || isSaving}
            value={imageDisplayPreset}
            onValueChange={(value) => {
              onImageDisplayPresetChange(
                value as CanvasDisplayPreferences["imageDisplayPreset"],
              )
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
                onClick={() => onToggleDisplayField(item.value, checked)}
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
    </div>
  )
}
