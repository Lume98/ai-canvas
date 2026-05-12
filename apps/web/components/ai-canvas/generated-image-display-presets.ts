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

export type GeneratedImageOverlayPreset = {
  promptLines?: 2 | 3
  showDimensions?: boolean
  showModel?: boolean
  showPrompt?: boolean
  showQuality?: boolean
  showSize?: boolean
}

export type GeneratedImageDisplayPreset = {
  bottomOverlay?: GeneratedImageOverlayPreset
  showOrderBadges?: boolean
  variant: GeneratedImageDisplayVariant
}

export type ResolvedGeneratedImageOverlayPreset = {
  promptLines: 2 | 3
  showDimensions: boolean
  showModel: boolean
  showPrompt: boolean
  showQuality: boolean
  showSize: boolean
}

export type ResolvedGeneratedImageDisplayPreset = {
  bottomOverlay: ResolvedGeneratedImageOverlayPreset | null
  showOrderBadges: boolean
  variant: GeneratedImageDisplayVariant
}

const defaultOverlayPreset: ResolvedGeneratedImageOverlayPreset = {
  promptLines: 2,
  showDimensions: true,
  showModel: true,
  showPrompt: true,
  showQuality: false,
  showSize: false,
}

const generatedImageDisplayPresetRegistry = {
  timeline: {
    bottomOverlay: {
      showModel: true,
      showQuality: false,
      showSize: false,
    },
    showOrderBadges: true,
    variant: "timeline",
  },
  history: {
    bottomOverlay: {
      showModel: false,
      showQuality: true,
      showSize: true,
    },
    showOrderBadges: true,
    variant: "history",
  },
  canvas: {
    bottomOverlay: {
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
  generatedImageDisplayPresetRegistry,
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
  value: string,
): value is GeneratedImageDisplayPresetKey {
  return value in generatedImageDisplayPresetRegistry
}

export function getGeneratedImageDisplayPreset(
  value: string,
  fallback: GeneratedImageDisplayPresetKey = "timeline",
): GeneratedImageDisplayPreset {
  const presetKey = isGeneratedImageDisplayPresetKey(value)
    ? value
    : fallback

  return generatedImageDisplayPresets[presetKey]
}

export function resolveGeneratedImageDisplayPreset(
  preset: GeneratedImageDisplayPreset,
  fieldOverrides: GeneratedImageDisplayFieldOverrides = {},
): ResolvedGeneratedImageDisplayPreset {
  return {
    variant: preset.variant,
    showOrderBadges: fieldOverrides.order ?? preset.showOrderBadges ?? false,
    bottomOverlay: preset.bottomOverlay
      ? resolveGeneratedImageOverlayPreset(preset.bottomOverlay, fieldOverrides)
      : null,
  }
}

export function resolveGeneratedImageOverlayPreset(
  preset: GeneratedImageOverlayPreset,
  fieldOverrides: GeneratedImageDisplayFieldOverrides = {},
): ResolvedGeneratedImageOverlayPreset {
  return {
    promptLines: preset.promptLines ?? defaultOverlayPreset.promptLines,
    showDimensions:
      fieldOverrides.dimensions ??
      preset.showDimensions ??
      defaultOverlayPreset.showDimensions,
    showModel:
      fieldOverrides.model ?? preset.showModel ?? defaultOverlayPreset.showModel,
    showPrompt:
      fieldOverrides.prompt ??
      preset.showPrompt ??
      defaultOverlayPreset.showPrompt,
    showQuality:
      fieldOverrides.quality ??
      preset.showQuality ??
      defaultOverlayPreset.showQuality,
    showSize:
      fieldOverrides.size ?? preset.showSize ?? defaultOverlayPreset.showSize,
  }
}
