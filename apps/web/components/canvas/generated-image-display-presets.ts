export type GeneratedImageDisplayVariant = "timeline" | "history" | "canvas"
export type GeneratedImageDisplayFieldKey =
  | "dimensions"
  | "model"
  | "order"
  | "prompt"
  | "quality"
  | "size"

export type GeneratedImageDisplayFieldOverrides = Partial<
  Record<GeneratedImageDisplayFieldKey, boolean>
>

export type GeneratedImageInfoPreset = {
  promptLines?: 1 | 2 | 3
  showDimensions?: boolean
  showModel?: boolean
  showPrompt?: boolean
  showQuality?: boolean
  showSize?: boolean
}

export type GeneratedImageDisplayPreset = {
  infoPanel?: GeneratedImageInfoPreset
  showOrderBadges?: boolean
  variant: GeneratedImageDisplayVariant
}

export type ResolvedGeneratedImageInfoPreset = {
  promptLines: 1 | 2 | 3
  showDimensions: boolean
  showModel: boolean
  showPrompt: boolean
  showQuality: boolean
  showSize: boolean
}

export type ResolvedGeneratedImageDisplayPreset = {
  infoPanel: ResolvedGeneratedImageInfoPreset | null
  showOrderBadges: boolean
  variant: GeneratedImageDisplayVariant
}

const defaultInfoPreset: ResolvedGeneratedImageInfoPreset = {
  promptLines: 2,
  showDimensions: true,
  showModel: true,
  showPrompt: true,
  showQuality: false,
  showSize: false,
}

const generatedImageDisplayPresetRegistry = {
  timeline: {
    infoPanel: {
      showModel: true,
      showQuality: false,
      showSize: false,
    },
    showOrderBadges: true,
    variant: "timeline",
  },
  history: {
    infoPanel: {
      promptLines: 1,
      showModel: false,
      showQuality: true,
      showSize: true,
    },
    showOrderBadges: true,
    variant: "history",
  },
  canvas: {
    infoPanel: {
      promptLines: 3,
      showModel: true,
      showQuality: true,
      showSize: true,
    },
    showOrderBadges: true,
    variant: "canvas",
  },
} satisfies Record<string, GeneratedImageDisplayPreset>

export type GeneratedImageDisplayPresetKey =
  keyof typeof generatedImageDisplayPresetRegistry

export const generatedImageDisplayPresets: Record<
  GeneratedImageDisplayPresetKey,
  GeneratedImageDisplayPreset
> = generatedImageDisplayPresetRegistry

export const generatedImageDisplayPresetKeys = Object.keys(
  generatedImageDisplayPresetRegistry
) as GeneratedImageDisplayPresetKey[]

export const generatedImageDisplayFieldKeys = [
  "order",
  "prompt",
  "dimensions",
  "model",
  "size",
  "quality",
] as const satisfies GeneratedImageDisplayFieldKey[]

export function isGeneratedImageDisplayPresetKey(
  value: string
): value is GeneratedImageDisplayPresetKey {
  return value in generatedImageDisplayPresetRegistry
}

export function getGeneratedImageDisplayPreset(
  value: string,
  fallback: GeneratedImageDisplayPresetKey = "timeline"
): GeneratedImageDisplayPreset {
  const presetKey = isGeneratedImageDisplayPresetKey(value) ? value : fallback

  return generatedImageDisplayPresets[presetKey]
}

export function resolveGeneratedImageDisplayPreset(
  preset: GeneratedImageDisplayPreset,
  fieldOverrides: GeneratedImageDisplayFieldOverrides = {}
): ResolvedGeneratedImageDisplayPreset {
  return {
    variant: preset.variant,
    showOrderBadges: fieldOverrides.order ?? preset.showOrderBadges ?? false,
    infoPanel: preset.infoPanel
      ? resolveGeneratedImageInfoPreset(preset.infoPanel, fieldOverrides)
      : null,
  }
}

export function resolveGeneratedImageInfoPreset(
  preset: GeneratedImageInfoPreset,
  fieldOverrides: GeneratedImageDisplayFieldOverrides = {}
): ResolvedGeneratedImageInfoPreset {
  return {
    promptLines: preset.promptLines ?? defaultInfoPreset.promptLines,
    showDimensions:
      fieldOverrides.dimensions ??
      preset.showDimensions ??
      defaultInfoPreset.showDimensions,
    showModel:
      fieldOverrides.model ?? preset.showModel ?? defaultInfoPreset.showModel,
    showPrompt:
      fieldOverrides.prompt ??
      preset.showPrompt ??
      defaultInfoPreset.showPrompt,
    showQuality:
      fieldOverrides.quality ??
      preset.showQuality ??
      defaultInfoPreset.showQuality,
    showSize:
      fieldOverrides.size ?? preset.showSize ?? defaultInfoPreset.showSize,
  }
}
