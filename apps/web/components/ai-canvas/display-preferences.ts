import {
  GeneratedImageDisplayFieldKey,
  GeneratedImageDisplayFieldOverrides,
  GeneratedImageDisplayPresetKey,
  generatedImageDisplayFieldKeys,
  getGeneratedImageDisplayPreset,
  isGeneratedImageDisplayPresetKey,
  resolveGeneratedImageDisplayPreset,
} from "./generated-image-display-presets"

export type CanvasDisplayPreferences = {
  imageDisplayFields: GeneratedImageDisplayFieldOverrides
  imageDisplayPreset: GeneratedImageDisplayPresetKey
}

type StoredCanvasDisplayPreferences = {
  imageDisplayFields?: Partial<Record<string, unknown>>
  imageDisplayPreset?: string
}

export const defaultCanvasDisplayPreferences: CanvasDisplayPreferences = {
  imageDisplayFields: {},
  imageDisplayPreset: "timeline",
}

const DISPLAY_PREFERENCES_STORAGE_KEY = "ai-canvas/display-preferences"

export function parseCanvasDisplayPreferences(
  value: StoredCanvasDisplayPreferences | null | undefined,
): CanvasDisplayPreferences {
  const presetValue = value?.imageDisplayPreset

  return {
    imageDisplayFields: parseImageDisplayFields(value?.imageDisplayFields),
    imageDisplayPreset:
      typeof presetValue === "string" && isGeneratedImageDisplayPresetKey(presetValue)
        ? presetValue
        : defaultCanvasDisplayPreferences.imageDisplayPreset,
  }
}

export function readCanvasDisplayPreferences(): CanvasDisplayPreferences {
  if (typeof window === "undefined") {
    return defaultCanvasDisplayPreferences
  }

  try {
    const raw = window.localStorage.getItem(DISPLAY_PREFERENCES_STORAGE_KEY)

    if (!raw) {
      return defaultCanvasDisplayPreferences
    }

    const parsed = JSON.parse(raw) as StoredCanvasDisplayPreferences
    return parseCanvasDisplayPreferences(parsed)
  } catch {
    return defaultCanvasDisplayPreferences
  }
}

export function writeCanvasDisplayPreferences(
  input: Partial<CanvasDisplayPreferences>,
): CanvasDisplayPreferences {
  const nextPreferences = parseCanvasDisplayPreferences({
    ...readCanvasDisplayPreferences(),
    ...input,
  })

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(nextPreferences),
    )
  }

  return nextPreferences
}

export function clearCanvasDisplayPreferences(): CanvasDisplayPreferences {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DISPLAY_PREFERENCES_STORAGE_KEY)
  }

  return defaultCanvasDisplayPreferences
}

export function normalizeImageDisplayPreset(
  value: string,
): GeneratedImageDisplayPresetKey {
  return getGeneratedImageDisplayPreset(value).variant
}

export function resolveCanvasDisplayFieldStates(
  preferences: CanvasDisplayPreferences,
): Record<GeneratedImageDisplayFieldKey, boolean> {
  const resolvedPreset = resolveGeneratedImageDisplayPreset(
    getGeneratedImageDisplayPreset(preferences.imageDisplayPreset),
    preferences.imageDisplayFields,
  )
  const bottomOverlay = resolvedPreset.bottomOverlay

  return {
    dimensions: bottomOverlay?.showDimensions ?? false,
    model: bottomOverlay?.showModel ?? false,
    order: resolvedPreset.showOrderBadges,
    prompt: bottomOverlay?.showPrompt ?? false,
    quality: bottomOverlay?.showQuality ?? false,
    size: bottomOverlay?.showSize ?? false,
  }
}

function parseImageDisplayFields(
  value: Partial<Record<string, unknown>> | undefined,
): GeneratedImageDisplayFieldOverrides {
  const fields: GeneratedImageDisplayFieldOverrides = {}

  if (!value) return fields

  for (const key of generatedImageDisplayFieldKeys) {
    const nextValue = value[key]

    if (typeof nextValue === "boolean") {
      fields[key as GeneratedImageDisplayFieldKey] = nextValue
    }
  }

  return fields
}
