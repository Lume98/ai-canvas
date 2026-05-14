import { type GeneratedImageDisplayFieldKey } from "@/components/generated-image/generated-image-display-presets"
import { type CanvasDisplayPreferences } from "@/components/settings/config/display-preferences"

export const inputClass =
  "w-full rounded-md border border-[oklch(0.74_0.035_75)] bg-white/80 px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-[oklch(0.56_0.025_245)] focus:border-[oklch(0.49_0.12_168)] focus:ring-3 focus:ring-[oklch(0.72_0.11_168_/_0.28)]"

export const displayPresetLabelMap: Record<
  CanvasDisplayPreferences["imageDisplayPreset"],
  string
> = {
  timeline: "时间线模式",
  history: "历史模式",
  canvas: "画布模式",
}

export const displayFieldOptions: Array<{
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
